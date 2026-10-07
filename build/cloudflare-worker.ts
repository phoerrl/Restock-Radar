import handler from "vinext/server/fetch-handler";
import { radarAccessResponse } from "../lib/cloudflare-access";
import { runBackground } from "../lib/background";

export default {
  async fetch(request: Request, env: Cloudflare.Env & { RADAR_ADMIN_PASSWORD?: string }, ctx: ExecutionContext) {
    const access = await radarAccessResponse(request, env);
    return access ?? handler.fetch(request, env, ctx);
  },
  async scheduled() {
    try { await runBackground(); }
    catch (error) { console.error("Radar background failed", error instanceof Error ? error.message : "Unknown failure"); throw error; }
  },
};
