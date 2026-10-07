import { database, pushEndpoint, sendPush } from "./radar.ts";
import { Buffer } from "node:buffer";
import type { PushSubscription } from "@block65/webcrypto-web-push";

export class PushRequestError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

async function sameKeys(a: string, b: string) {
  const encode = new TextEncoder();
  const hashes = await Promise.all([a, b].map(value => crypto.subtle.digest("SHA-256", encode.encode(value))));
  const first = new Uint8Array(hashes[0]), second = new Uint8Array(hashes[1]);
  let difference = 0;
  for (let i = 0; i < first.length; i++) difference |= first[i] ^ second[i];
  return difference === 0;
}

export async function publicPush(action: "subscribe" | "unsubscribe" | "test", subscription: PushSubscription, client: string) {
  pushEndpoint(subscription.endpoint);
  if (!/^[\w-]{86,90}$/.test(subscription.keys?.p256dh) || !/^[\w-]{20,24}$/.test(subscription.keys?.auth))
    throw new PushRequestError("Ungültiges Push-Abonnement.");
  const db = database(), now = Date.now();
  const row = await db.prepare("SELECT subscription FROM devices WHERE endpoint=?").bind(subscription.endpoint).first<{subscription:string}>();
  if (row) {
    const saved = JSON.parse(row.subscription) as PushSubscription;
    if (!await sameKeys(`${saved.keys.p256dh}:${saved.keys.auth}`, `${subscription.keys.p256dh}:${subscription.keys.auth}`))
      throw new PushRequestError("Dieses Abonnement gehört nicht zu diesem Gerät.", 403);
  } else if (action !== "subscribe") throw new PushRequestError("Bitte dieses Gerät zuerst verbinden.", 404);

  if (action === "unsubscribe") {
    await db.prepare("DELETE FROM devices WHERE endpoint=? AND subscription=?").bind(subscription.endpoint, row!.subscription).run();
    return { connected: false };
  }
  const key = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${client}:${Math.floor(now / 3600000)}`))).toString("hex");
  const rate = await db.prepare("INSERT INTO push_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<20 RETURNING count")
    .bind(key, now + 7200000).first();
  if (!rate) throw new PushRequestError("Zu viele Push-Anfragen. Bitte später erneut versuchen.", 429);
  if (action === "subscribe") {
    const count = await db.prepare("SELECT COUNT(*) AS n FROM devices").first<{n:number}>();
    if (!row && (count?.n ?? 0) >= 200) throw new PushRequestError("Der Radar hat sein Gerätelimit erreicht.", 503);
    // A conflicting endpoint is never overwritten by a different device's keys.
    await db.prepare("INSERT OR IGNORE INTO devices (endpoint,subscription,created_at) VALUES (?,?,?)")
      .bind(subscription.endpoint, JSON.stringify(subscription), now).run();
    const saved = await db.prepare("SELECT subscription FROM devices WHERE endpoint=?").bind(subscription.endpoint).first<{subscription:string}>();
    const actual = JSON.parse(saved!.subscription) as PushSubscription;
    if (!await sameKeys(`${actual.keys.p256dh}:${actual.keys.auth}`, `${subscription.keys.p256dh}:${subscription.keys.auth}`))
      throw new PushRequestError("Abonnement konnte nicht verbunden werden.", 409);
    return { connected: true };
  }
  const lease = await db.prepare("UPDATE devices SET last_test_at=? WHERE endpoint=? AND last_test_at<? AND subscription=?")
    .bind(now, subscription.endpoint, now - 60000, row!.subscription).run();
  if (!lease.meta.changes) throw new PushRequestError("Eine Testmeldung pro Minute ist möglich.", 429);
  return sendPush({ title: "Drop Radar · Testnachricht", body: "Push-Verbindungstest. Dies ist keine Restock- oder Bestandsmeldung.", url: "/", tag: "connection-test" }, subscription.endpoint);
}
