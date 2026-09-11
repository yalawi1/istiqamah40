import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// Istiqamah 40 API. Deployed as Supabase Edge Function "istiqamah40" (verify_jwt off) on project dogwqotaagjmytffitlj.
// The deployed copy has the real link key inlined. Never commit the real key: this repo is public.
const KEY = "REPLACE_WITH_LINK_KEY";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PLAYERS = new Set(["melan", "yousef"]);
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "x-key, content-type",
  "access-control-max-age": "86400",
};

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: SRK, Authorization: "Bearer " + SRK, "content-type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error("rest " + r.status + " " + await r.text());
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("istiqamah40");
  const sub = i >= 0 ? (parts[i + 1] || "") : "";
  const key = req.headers.get("x-key") || url.searchParams.get("k");
  if (key !== KEY) return json({ error: "not found" }, 404);

  try {
    if (sub === "state" && req.method === "GET") {
      const [s, c, m] = await Promise.all([
        rest("istiqamah_settings?id=eq.1&select=value"),
        rest("istiqamah_checkins?select=player,day,data"),
        rest("istiqamah_comments?select=id,player,body,created_at&order=created_at.desc&limit=30"),
      ]);
      return json({ settings: s?.[0]?.value ?? null, checkins: c ?? [], comments: m ?? [] });
    }
    if (sub === "checkin" && req.method === "POST") {
      const { player, day, patch } = await req.json();
      if (!PLAYERS.has(player) || !/^\d{4}-\d{2}-\d{2}$/.test(day) || typeof patch !== "object" || patch === null) return json({ error: "bad request" }, 400);
      const clean: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(patch)) if (/^[a-z]{1,20}$/.test(k) && typeof v === "boolean") clean[k] = v;
      const ex = await rest(`istiqamah_checkins?player=eq.${player}&day=eq.${day}&select=data`);
      const data = { ...(ex?.[0]?.data || {}), ...clean };
      await rest("istiqamah_checkins?on_conflict=player,day", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ player, day, data, updated_at: new Date().toISOString() }),
      });
      return json({ ok: true, data });
    }
    if (sub === "comment" && req.method === "POST") {
      const { player, body } = await req.json();
      const text = typeof body === "string" ? body.trim().slice(0, 500) : "";
      if (!PLAYERS.has(player) || !text) return json({ error: "bad request" }, 400);
      const rows = await rest("istiqamah_comments", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ player, body: text }),
      });
      return json({ ok: true, comment: rows?.[0] ?? null });
    }
    if (sub === "settings" && req.method === "POST") {
      const { value } = await req.json();
      if (typeof value !== "object" || value === null) return json({ error: "bad request" }, 400);
      const v = {
        startDate: /^\d{4}-\d{2}-\d{2}$/.test(value.startDate) ? value.startDate : "2026-09-14",
        rollover: /^\d{2}:\d{2}$/.test(value.rollover) ? value.rollover : "05:00",
        penalty: Number.isFinite(value.penalty) && value.penalty > 0 ? Math.round(value.penalty) : 20,
        poolMode: value.poolMode === "winner" ? "winner" : "charity",
        charity: String(value.charity || "").slice(0, 120),
      };
      await rest("istiqamah_settings?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: 1, value: v, updated_at: new Date().toISOString() }),
      });
      return json({ ok: true });
    }
    return json({ error: "not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "server error" }, 500);
  }
});
