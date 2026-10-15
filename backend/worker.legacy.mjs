var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400"
};
var KNOWN_PROFILES = /* @__PURE__ */ new Set(["vad", "tatka"]);
var DEFAULT_PROFILE = "vad";
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json", ...CORS }
}), "json");
var text = /* @__PURE__ */ __name((msg, status = 200) => new Response(msg, { status, headers: { "Content-Type": "text/plain", ...CORS } }), "text");

// ADD THIS FUNCTION (only once, before resolveProfile):
function getCurrentWeek(startWeek, startDateStr) {
  const startDate = new Date(startDateStr);
  const now = new Date();
  const diffMs = now - startDate;
 const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));

  return startWeek + diffWeeks;
}

function resolveProfile(url) {
  const p = (url.searchParams.get("profile") || DEFAULT_PROFILE).toLowerCase();
  return KNOWN_PROFILES.has(p) ? p : null;
}
__name(resolveProfile, "resolveProfile");

var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (path === "/api/health") return json({ ok: true, ts: Date.now() });
    
    // ADD THIS ROUTE (only once, after health check):
    if (path === "/api/current-week" && method === "GET") {
      const currentWeek = getCurrentWeek(33, "2026-08-11");
      return json({ week: currentWeek, startDate: "2026-08-11", baseWeek: 33 });
    }
    
    const profile = resolveProfile(url);
    if (!profile) return json({ error: "unknown profile" }, 400);

    // Public GET endpoints — no auth required
    const isPublicGet = method === "GET" && (
      path === "/api/programmes" ||
      path === "/api/programme" ||
      path === "/api/health" ||
      path === "/api/snapshot" ||
      path === "/api/current-week"
    );

    // Check auth for non-public requests
    if (!isPublicGet) {
      const auth = req.headers.get("Authorization") || "";
      if (auth !== `Bearer ${env.API_TOKEN}`) return text("Unauthorized", 401);
    }

    try {
      if (path === "/api/programmes" && method === "GET") {
        const r = await env.DB.prepare(
          "SELECT week, data, updated_at FROM programmes WHERE profile = ? ORDER BY week DESC"
        ).bind(profile).all();
        const list = (r.results || []).map((row) => {
          const d = JSON.parse(row.data);
          return {
            week: row.week,
            dayCount: Object.keys(d.days || {}).length,
            updatedAt: row.updated_at
          };
        });
        return json(list);
      }
      if (path === "/api/programme" && method === "GET") {
        const week = parseInt(url.searchParams.get("week"), 10);
        if (!Number.isFinite(week)) return json({ error: "week required" }, 400);
        const row = await env.DB.prepare(
          "SELECT data, updated_at FROM programmes WHERE profile = ? AND week = ?"
        ).bind(profile, week).first();
        if (!row) return json({ error: "not found" }, 404);
        const d = JSON.parse(row.data);
        return json({ week, days: d.days, updatedAt: row.updated_at });
      }
      if (path === "/api/programme" && method === "PUT") {
        const body = await req.json();
        const week = parseInt(body.week, 10);
        if (!Number.isFinite(week) || !body.days)
          return json({ error: "week and days required" }, 400);
        const data = JSON.stringify({ days: body.days });
        const now = Date.now();
        await env.DB.prepare(
          "INSERT INTO programmes (profile, week, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(profile, week) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
        ).bind(profile, week, data, now).run();
        return json({ week, days: body.days, updatedAt: now });
      }
      if (path === "/api/programme" && method === "DELETE") {
        const week = parseInt(url.searchParams.get("week"), 10);
        if (!Number.isFinite(week)) return json({ error: "week required" }, 400);
        await env.DB.prepare("DELETE FROM programmes WHERE profile = ? AND week = ?").bind(profile, week).run();
        return json({ ok: true });
      }
      if (path === "/api/results" && method === "GET") {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "500", 10), 1e3);
        const r = await env.DB.prepare(
          "SELECT id, block_id, block_name, week, day_idx, date, value, created_at FROM results WHERE profile = ? ORDER BY created_at DESC LIMIT ?"
        ).bind(profile, limit).all();
        const list = (r.results || []).map((row) => ({
          id: row.id,
          blockId: row.block_id,
          blockName: row.block_name,
          week: row.week,
          dayIdx: row.day_idx,
          date: row.date,
          value: JSON.parse(row.value),
          createdAt: row.created_at
        }));
        return json(list);
      }
      if (path === "/api/results" && method === "POST") {
        const body = await req.json();
        if (!body.blockId || !body.blockName || !body.value)
          return json({ error: "blockId, blockName, value required" }, 400);
        const id = body.id || "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const date = body.date || (/* @__PURE__ */ new Date()).toISOString();
        const now = Date.now();
        await env.DB.prepare(
          "INSERT OR REPLACE INTO results (id, profile, block_id, block_name, week, day_idx, date, value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          id,
          profile,
          body.blockId,
          body.blockName,
          body.week ?? 0,
          body.dayIdx ?? 0,
          date,
          JSON.stringify(body.value),
          now
        ).run();
        return json({
          id,
          blockId: body.blockId,
          blockName: body.blockName,
          week: body.week ?? 0,
          dayIdx: body.dayIdx ?? 0,
          date,
          value: body.value,
          createdAt: now
        });
      }
      const resultIdMatch = path.match(/^\/api\/results\/([^/]+)$/);
      if (resultIdMatch && method === "DELETE") {
        await env.DB.prepare("DELETE FROM results WHERE id = ? AND profile = ?").bind(resultIdMatch[1], profile).run();
        return json({ ok: true });
      }
      if (path === "/api/generator" && method === "GET") {
        const row = await env.DB.prepare(
          "SELECT value FROM settings WHERE profile = ? AND key = ?"
        ).bind(profile, "generator").first();
        return json(row ? JSON.parse(row.value) : null);
      }
      if (path === "/api/generator" && method === "PUT") {
        const body = await req.json();
        await env.DB.prepare(
          "INSERT INTO settings (profile, key, value) VALUES (?, ?, ?) ON CONFLICT(profile, key) DO UPDATE SET value = excluded.value"
        ).bind(profile, "generator", JSON.stringify(body)).run();
        return json(body);
      }
      if (path === "/api/migrate" && method === "POST") {
        const body = await req.json();
        let progCount = 0;
        let resCount = 0;
        if (body.programme && typeof body.programme === "object") {
          for (const weekKey of Object.keys(body.programme)) {
            const w = parseInt(weekKey, 10);
            if (!Number.isFinite(w)) continue;
            await env.DB.prepare(
              "INSERT INTO programmes (profile, week, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(profile, week) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
            ).bind(profile, w, JSON.stringify({ days: body.programme[weekKey] }), Date.now()).run();
            progCount++;
          }
        }
        if (Array.isArray(body.results)) {
          for (const r of body.results) {
            if (!r.id || !r.blockId) continue;
            await env.DB.prepare(
              "INSERT OR REPLACE INTO results (id, profile, block_id, block_name, week, day_idx, date, value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(
              r.id,
              profile,
              r.blockId,
              r.blockName || "",
              r.week ?? 0,
              r.dayIdx ?? 0,
              r.date || (/* @__PURE__ */ new Date()).toISOString(),
              JSON.stringify(r.value || {}),
              Date.now()
            ).run();
            resCount++;
          }
        }
        if (body.generator) {
          await env.DB.prepare(
            "INSERT INTO settings (profile, key, value) VALUES (?, ?, ?) ON CONFLICT(profile, key) DO UPDATE SET value = excluded.value"
          ).bind(profile, "generator", JSON.stringify(body.generator)).run();
        }
        return json({ ok: true, migrated: { programmes: progCount, results: resCount } });
      }
      if (path === "/api/snapshot" && method === "GET") {
        const [progs, results, gen] = await Promise.all([
          env.DB.prepare("SELECT week, data FROM programmes WHERE profile = ?").bind(profile).all(),
          env.DB.prepare(
            "SELECT id, block_id, block_name, week, day_idx, date, value, created_at FROM results WHERE profile = ? ORDER BY created_at DESC LIMIT 1000"
          ).bind(profile).all(),
          env.DB.prepare("SELECT value FROM settings WHERE profile = ? AND key = ?").bind(profile, "generator").first()
        ]);
        const programme = {};
        for (const row of progs.results || []) {
          const d = JSON.parse(row.data);
          programme[row.week] = d.days;
        }
        const resultList = (results.results || []).map((row) => ({
          id: row.id,
          blockId: row.block_id,
          blockName: row.block_name,
          week: row.week,
          dayIdx: row.day_idx,
          date: row.date,
          value: JSON.parse(row.value),
          createdAt: row.created_at
        }));
        return json({
          profile,
          programme,
          results: resultList,
          generator: gen ? JSON.parse(gen.value) : null
        });
      }
      return text("Not found", 404);
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 500);
    }
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
