type AccessEnv = { RADAR_ADMIN_PASSWORD?: string };

export async function isRadarOwner(request: Request, env: AccessEnv): Promise<boolean> {
  const password = env.RADAR_ADMIN_PASSWORD;
  if (!password || password.length < 16) return false;
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.length > 2048) return false;
  let received = "";
  if (authorization.startsWith("Basic ")) {
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(atob(authorization.slice(6)), char => char.charCodeAt(0)));
      if (!decoded.startsWith("admin:")) return false;
      received = decoded.slice(6);
    } catch { return false; }
  } else if (authorization.startsWith("Bearer ")) {
    received = authorization.slice(7);
  } else return false;
  const encode = new TextEncoder();
  const [expectedHash, receivedHash] = await Promise.all([password, received].map(value =>
    crypto.subtle.digest("SHA-256", encode.encode(value)).then(buffer => new Uint8Array(buffer))));
  let difference = 0;
  for (let i = 0; i < expectedHash.length; i++) difference |= expectedHash[i] ^ receivedHash[i];
  return difference === 0;
}

export async function radarAccessResponse(request: Request, env: AccessEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) {
    url.protocol = "https:";
    return Response.redirect(url.href, 308);
  }
  const owner = await isRadarOwner(request, env);
  if (url.pathname === "/api/access") {
    if (request.method !== "GET") return new Response(null, { status: 405 });
    return Response.json({ owner, configured: !!env.RADAR_ADMIN_PASSWORD && env.RADAR_ADMIN_PASSWORD.length >= 16 },
      { headers: { "Cache-Control": "no-store" } });
  }
  const readOnly = ["GET", "HEAD"].includes(request.method);
  if (readOnly && url.pathname !== "/admin" && !url.pathname.startsWith("/mcp")) return null;
  if (!readOnly && (request.headers.get("sec-fetch-site") === "cross-site" ||
    (request.headers.get("origin") && request.headers.get("origin") !== url.origin))) {
    return Response.json({ error: "Nicht erlaubter Ursprung" }, { status: 403 });
  }
  if (!owner) {
    return Response.json({ error: "Bitte zuerst die Verwaltung unter /admin anmelden." }, {
      status: 401,
      headers: { "Cache-Control": "no-store", ...(url.pathname === "/admin"
        ? { "WWW-Authenticate": 'Basic realm="Drop Radar", charset="UTF-8"' } : {}) },
    });
  }
  if (url.pathname === "/admin") return new Response(null, {
    status: 303, headers: { Location: "/", "Cache-Control": "no-store" },
  });
  return null;
}
