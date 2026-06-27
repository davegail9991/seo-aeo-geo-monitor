const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

function getDatabase(env) {
  const database = env.seo_monitor_db || env.DB;
  if (!database) {
    throw new Error("D1 binding is missing. Bind the database as seo_monitor_db or DB.");
  }
  return database;
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function getTargets(env) {
  const db = getDatabase(env);
  const { results } = await db.prepare(
    `
      SELECT
        id,
        url,
        keyword,
        status,
        created_at,
        updated_at
      FROM targets
      ORDER BY updated_at DESC, id DESC
    `,
  ).all();

  return jsonResponse({ ok: true, targets: results });
}

async function createTarget(request, env) {
  const db = getDatabase(env);
  const body = await readJson(request);
  const url = normalizeUrl(body?.url);
  const keyword = String(body?.keyword || "").trim();

  if (!url) return errorResponse("A valid url is required.", 422);
  if (!keyword) return errorResponse("keyword is required.", 422);

  try {
    const result = await db.prepare(
      `
        INSERT INTO targets (url, keyword, status, created_at, updated_at)
        VALUES (?, ?, 'pending', datetime('now'), datetime('now'))
      `,
    )
      .bind(url, keyword)
      .run();

    return jsonResponse(
      {
        ok: true,
        target: {
          id: result.meta.last_row_id,
          url,
          keyword,
          status: "pending",
        },
      },
      201,
    );
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) {
      return errorResponse("This url is already being monitored.", 409);
    }

    return errorResponse("Unable to create target.", 500);
  }
}

async function getLogs(env) {
  const db = getDatabase(env);
  const { results } = await db.prepare(
    `
      SELECT
        monitor_logs.id,
        monitor_logs.target_id,
        targets.url,
        targets.keyword,
        targets.status AS target_status,
        monitor_logs.platform,
        monitor_logs.rank_or_mention,
        monitor_logs.response_snippet,
        monitor_logs.checked_at
      FROM monitor_logs
      INNER JOIN targets ON targets.id = monitor_logs.target_id
      ORDER BY monitor_logs.checked_at DESC, monitor_logs.id DESC
      LIMIT 500
    `,
  ).all();

  return jsonResponse({ ok: true, logs: results });
}

async function fetchAndAnalyze(target) {
  // Standard asynchronous I/O shape for future real integrations:
  // const serp = await fetch(`https://search.example/api?q=${encodeURIComponent(target.keyword)}`);
  // const ai = await fetch("https://ai.example/analyze", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ url: target.url, keyword: target.keyword }),
  // });
  // const analysis = await ai.json();

  await Promise.resolve();

  const host = new URL(target.url).hostname;
  const keyword = target.keyword || "target keyword";

  return {
    platform: "google",
    rank_or_mention: "simulated-position-3",
    response_snippet: `Detected ${host} as a monitored candidate for "${keyword}".`,
  };
}

async function processNextPendingTarget(env) {
  const db = getDatabase(env);
  const target = await db.prepare(
    `
      SELECT id, url, keyword, status
      FROM targets
      WHERE status = 'pending'
      ORDER BY updated_at ASC, id ASC
      LIMIT 1
    `,
  ).first();

  if (!target) {
    return { processed: false, reason: "No pending target." };
  }

  const claim = await db.prepare(
    `
      UPDATE targets
      SET status = 'processing', updated_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `,
  )
    .bind(target.id)
    .run();

  if (!claim.success || claim.meta.changes !== 1) {
    return { processed: false, reason: "Target was already claimed." };
  }

  try {
    const analysis = await fetchAndAnalyze(target);

    await db.batch([
      db.prepare(
        `
          INSERT INTO monitor_logs (
            target_id,
            platform,
            rank_or_mention,
            response_snippet,
            checked_at
          )
          VALUES (?, ?, ?, ?, datetime('now'))
        `,
      ).bind(
        target.id,
        analysis.platform,
        analysis.rank_or_mention,
        analysis.response_snippet,
      ),
      db.prepare(
        `
          UPDATE targets
          SET status = 'completed', updated_at = datetime('now')
          WHERE id = ?
        `,
      ).bind(target.id),
    ]);

    return { processed: true, target_id: target.id };
  } catch (error) {
    await db.prepare(
      `
        UPDATE targets
        SET status = 'pending', updated_at = datetime('now')
        WHERE id = ?
      `,
    )
      .bind(target.id)
      .run();

    throw error;
  }
}

async function routeRequest(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method === "GET" && pathname === "/api/targets") {
    return getTargets(env);
  }

  if (request.method === "POST" && pathname === "/api/targets") {
    return createTarget(request, env);
  }

  if (request.method === "GET" && pathname === "/api/logs") {
    return getLogs(env);
  }

  if (request.method === "GET" && pathname === "/health") {
    return jsonResponse({ ok: true, service: "seo-aeo-geo-monitor" });
  }

  return errorResponse("Not found.", 404);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await routeRequest(request, env, ctx);
    } catch (error) {
      return errorResponse(error?.message || "Internal server error.", 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(processNextPendingTarget(env));
  },
};
