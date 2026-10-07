import { z } from "zod";
import { env } from "cloudflare:workers";
import { publicPush, PushRequestError } from "@/lib/public-push";
export const dynamic = "force-dynamic";
const input = z.object({
  action: z.enum(["subscribe", "unsubscribe", "test"]),
  subscription: z.object({ endpoint: z.string().url().max(2000), expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: z.string().max(90), auth: z.string().max(24) }) }),
});
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site")
    return Response.json({ error: "Nicht erlaubter Ursprung." }, { status: 403 });
  const vars = env as unknown as Record<string, string | undefined>;
  if (!vars.VAPID_PUBLIC_KEY || !vars.VAPID_PRIVATE_KEY || !vars.VAPID_SUBJECT)
    return Response.json({ error: "Push wird noch eingerichtet. Bitte später erneut öffnen." }, { status: 503 });
  try {
    if (Number(request.headers.get("content-length")) > 5000) throw new PushRequestError("Anfrage zu groß.", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new PushRequestError("Leere Anfrage.");
    const decoder = new TextDecoder(); let size = 0, text = "";
    try {
      for (;;) { const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.length; if (size > 5000) throw new PushRequestError("Anfrage zu groß.", 413);
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally { await reader.cancel().catch(() => {}); }
    const data = input.parse(JSON.parse(text));
    const result = await publicPush(data.action, {...data.subscription,expirationTime:data.subscription.expirationTime??null}, `${vars.VAPID_PRIVATE_KEY}:${request.headers.get("cf-connecting-ip") ?? "local"}`);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof PushRequestError ? error.message : "Push-Anfrage fehlgeschlagen. Bitte erneut versuchen." },
      { status: error instanceof PushRequestError ? error.status : 400 });
  }
}
