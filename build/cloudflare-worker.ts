import handler from "vinext/server/fetch-handler";
import { radarAccessResponse } from "../lib/cloudflare-access";

export default {
  async fetch(request: Request, env: Cloudflare.Env & { RADAR_ADMIN_PASSWORD?: string }, ctx: ExecutionContext) {
    const access = await radarAccessResponse(request, env);
    return access ?? handler.fetch(request, env, ctx);
  },
};
