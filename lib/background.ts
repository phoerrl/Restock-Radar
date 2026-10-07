import { database, meta, scan, setMeta, storeSettings } from "./radar.ts";
import { refreshCommunity } from "./signals-store.ts";

export async function runBackground(now = Date.now(), scheduledAt = now) {
  const db = database();
  await db.prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('backgroundLease','0')").run();
  const lock = await db.prepare("UPDATE meta SET value=? WHERE key='backgroundLease' AND CAST(value AS INTEGER) < ?")
    .bind(String(now + 180000), now).run();
  if (!lock.meta.changes) return { busy: true };
  try {
    const settings = storeSettings(await meta("settings", "{}"));
    await setMeta("schedule", JSON.stringify({ enabled: true, interval: 2 }));
    const previous = Number(await meta("backgroundDueAt", await meta("schedulerAt")));
    if (previous && scheduledAt - previous < settings.interval * 1000 && settings.auto) return { due: false };
    await setMeta("backgroundStartedAt", String(now));
    await db.prepare("DELETE FROM push_limits WHERE expires_at<?").bind(now).run();
    const result = settings.auto
      ? { stock: await scan(true), community: await refreshCommunity(true) }
      : { paused: true };
    await setMeta("backgroundResult", JSON.stringify(result));
    await setMeta("backgroundError", "");
    await setMeta("backgroundDueAt", String(scheduledAt));
    await setMeta("schedulerAt", String(Date.now()));
    return result;
  } catch (error) {
    await setMeta("backgroundError", "Hintergrundlauf fehlgeschlagen; letzte erfolgreiche Prüfung bleibt erhalten.");
    throw error;
  } finally {
    await db.prepare("UPDATE meta SET value='0' WHERE key='backgroundLease' AND value=?")
      .bind(String(now + 180000)).run();
  }
}
