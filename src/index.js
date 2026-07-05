const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const SESSION_COOKIE = "seo_monitor_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_SALT = "seo-monitor-admin-v1";
const DEFAULT_ADMIN_USERNAME = "admin@seomonitor.app";
const DEFAULT_ADMIN_PASSWORD_SHA256 = "b0e7d521a39a77a1cbcd37fefd979919bb33f38dbe948edfb6be2d7cb76cdf02";

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function htmlResponse(markup, status = 200) {
  return new Response(markup, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
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

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const parts = cookie.split(";").map((part) => part.trim());
  const prefix = `${name}=`;
  const match = parts.find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function secureCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

async function ensureAuthTables(env) {
  const db = getDatabase(env);
  await db.batch([
    db.prepare(
      `
        CREATE TABLE IF NOT EXISTS auth_sessions (
          token_hash TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        )
      `,
    ),
    db.prepare(
      `
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
        ON auth_sessions(expires_at)
      `,
    ),
  ]);
}

async function getAuthenticatedUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;

  await ensureAuthTables(env);
  const db = getDatabase(env);
  const tokenHash = await sha256Hex(token);
  const session = await db.prepare(
    `
      SELECT username, expires_at
      FROM auth_sessions
      WHERE token_hash = ? AND expires_at > datetime('now')
      LIMIT 1
    `,
  )
    .bind(tokenHash)
    .first();

  return session ? { username: session.username } : null;
}

async function requireAuth(request, env) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) return { ok: false, response: errorResponse("Unauthorized.", 401) };
  return { ok: true, user };
}

function getAdminConfig(env) {
  return {
    username: String(env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME),
    passwordHash: String(env.ADMIN_PASSWORD_SHA256 || DEFAULT_ADMIN_PASSWORD_SHA256).toLowerCase(),
    password: env.ADMIN_PASSWORD ? String(env.ADMIN_PASSWORD) : "",
  };
}

async function login(request, env) {
  const body = await readJson(request);
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  const admin = getAdminConfig(env);

  if (!username || !password) return errorResponse("Username and password are required.", 422);
  if (username.toLowerCase() !== admin.username.toLowerCase()) return errorResponse("Invalid login.", 401);

  const passwordHash = await sha256Hex(`${PASSWORD_SALT}:${password}`);
  const envPasswordHash = admin.password ? await sha256Hex(`${PASSWORD_SALT}:${admin.password}`) : admin.passwordHash;
  if (!secureCompare(passwordHash, envPasswordHash)) return errorResponse("Invalid login.", 401);

  await ensureAuthTables(env);
  const db = getDatabase(env);
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = base64Url(tokenBytes);
  const tokenHash = await sha256Hex(token);

  await db.prepare(
    `
      INSERT INTO auth_sessions (token_hash, username, created_at, expires_at)
      VALUES (?, ?, datetime('now'), datetime('now', '+12 hours'))
    `,
  )
    .bind(tokenHash, admin.username)
    .run();

  return jsonResponse(
    { ok: true, user: { username: admin.username } },
    200,
    {
      "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
    },
  );
}

async function logout(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    await ensureAuthTables(env);
    const db = getDatabase(env);
    await db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  }

  return jsonResponse(
    { ok: true },
    200,
    {
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    },
  );
}

async function session(request, env) {
  const user = await getAuthenticatedUser(request, env);
  return jsonResponse({ ok: true, authenticated: Boolean(user), user });
}

async function getTargets(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;

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
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;

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

async function getLogs(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;

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

function appHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SEO / AEO / GEO Monitor</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #020617;
        --panel: rgba(15, 23, 42, 0.82);
        --line: rgba(148, 163, 184, 0.18);
        --text: #e5e7eb;
        --muted: #94a3b8;
        --accent: #deff9a;
        --cyan: #22d3ee;
        --danger: #fb7185;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(34, 211, 238, 0.18), transparent 32rem),
          radial-gradient(circle at bottom right, rgba(222, 255, 154, 0.12), transparent 30rem),
          var(--bg);
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      button, input {
        font: inherit;
      }
      .shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 18rem 1fr;
      }
      aside {
        border-right: 1px solid var(--line);
        background: rgba(2, 6, 23, 0.78);
        padding: 1.5rem;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 2rem;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      .mark {
        width: 2.25rem;
        height: 2.25rem;
        display: grid;
        place-items: center;
        border: 1px solid rgba(222, 255, 154, 0.45);
        border-radius: 0.5rem;
        color: var(--accent);
        box-shadow: 0 0 24px rgba(222, 255, 154, 0.2);
      }
      nav div {
        border: 1px solid transparent;
        border-radius: 0.5rem;
        color: var(--muted);
        margin-bottom: 0.5rem;
        padding: 0.72rem 0.85rem;
      }
      nav div.active {
        border-color: rgba(222, 255, 154, 0.35);
        background: rgba(222, 255, 154, 0.08);
        color: #fff;
      }
      main {
        padding: 2rem;
      }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      h1 {
        font-size: clamp(1.75rem, 4vw, 3rem);
        margin: 0 0 0.25rem;
        letter-spacing: 0;
      }
      .muted {
        color: var(--muted);
      }
      .grid {
        display: grid;
        grid-template-columns: minmax(18rem, 0.75fr) minmax(22rem, 1.25fr);
        gap: 1rem;
      }
      .panel {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 0.85rem;
        padding: 1.15rem;
        box-shadow: 0 24px 90px rgba(0, 0, 0, 0.32);
        backdrop-filter: blur(18px);
      }
      .login-wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
      }
      .login-card {
        width: min(28rem, 100%);
        border: 1px solid rgba(222, 255, 154, 0.22);
        background: rgba(15, 23, 42, 0.88);
        border-radius: 1rem;
        padding: 1.4rem;
        box-shadow: 0 0 70px rgba(34, 211, 238, 0.12);
      }
      label {
        display: block;
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        margin: 0 0 0.45rem;
        text-transform: uppercase;
      }
      input {
        width: 100%;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 0.55rem;
        background: rgba(2, 6, 23, 0.72);
        color: var(--text);
        outline: none;
        padding: 0.8rem 0.9rem;
      }
      input:focus {
        border-color: rgba(34, 211, 238, 0.7);
        box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
      }
      .field {
        margin-top: 1rem;
      }
      .btn {
        border: 1px solid rgba(222, 255, 154, 0.5);
        border-radius: 0.55rem;
        background: linear-gradient(135deg, rgba(222, 255, 154, 0.92), rgba(34, 211, 238, 0.86));
        color: #04111f;
        cursor: pointer;
        font-weight: 900;
        padding: 0.78rem 1rem;
      }
      .btn.secondary {
        background: rgba(15, 23, 42, 0.72);
        color: var(--text);
        border-color: var(--line);
      }
      .btn:disabled {
        cursor: wait;
        opacity: 0.65;
      }
      .row {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 0.75rem;
        align-items: end;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border-bottom: 1px solid var(--line);
        padding: 0.8rem 0.6rem;
        text-align: left;
        vertical-align: top;
      }
      th {
        color: var(--muted);
        font-size: 0.74rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .badge {
        display: inline-flex;
        border: 1px solid rgba(34, 211, 238, 0.3);
        border-radius: 999px;
        color: var(--cyan);
        padding: 0.22rem 0.5rem;
        font-size: 0.78rem;
      }
      .error {
        color: var(--danger);
        min-height: 1.2rem;
        margin-top: 0.75rem;
      }
      .hidden {
        display: none;
      }
      @media (max-width: 900px) {
        .shell { grid-template-columns: 1fr; }
        aside { border-right: 0; border-bottom: 1px solid var(--line); }
        .grid, .row { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <section id="loginView" class="login-wrap">
      <form id="loginForm" class="login-card">
        <div class="brand"><div class="mark">SEO</div><div>MONITOR ACCESS</div></div>
        <h1>Secure Login</h1>
        <p class="muted">Cloudflare Worker control panel for SEO / AEO / GEO visibility tracking.</p>
        <div class="field">
          <label for="username">Username</label>
          <input id="username" name="username" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>
        </div>
        <div class="field">
          <button id="loginButton" class="btn" type="submit">Enter Monitor</button>
        </div>
        <div id="loginError" class="error"></div>
      </form>
    </section>

    <section id="appView" class="shell hidden">
      <aside>
        <div class="brand"><div class="mark">SEO</div><div>AEO / GEO</div></div>
        <nav>
          <div class="active">Dashboard</div>
          <div>Targets</div>
          <div>Monitor Logs</div>
        </nav>
      </aside>
      <main>
        <div class="topbar">
          <div>
            <h1>SEO Monitor</h1>
            <div class="muted">Cloudflare Worker + D1 production console</div>
          </div>
          <button id="logoutButton" class="btn secondary">Logout</button>
        </div>
        <div class="grid">
          <section class="panel">
            <h2>Add Target</h2>
            <form id="targetForm">
              <div class="field">
                <label for="targetUrl">Target URL</label>
                <input id="targetUrl" placeholder="https://example.com" required>
              </div>
              <div class="field">
                <label for="targetKeyword">Keyword</label>
                <input id="targetKeyword" placeholder="brand keyword" required>
              </div>
              <div class="field">
                <button id="targetButton" class="btn" type="submit">Queue Monitor</button>
              </div>
              <div id="targetError" class="error"></div>
            </form>
          </section>
          <section class="panel">
            <h2>Targets</h2>
            <div style="overflow:auto">
              <table>
                <thead><tr><th>URL</th><th>Keyword</th><th>Status</th></tr></thead>
                <tbody id="targetsBody"></tbody>
              </table>
            </div>
          </section>
        </div>
        <section class="panel" style="margin-top:1rem">
          <h2>Monitor Logs</h2>
          <div style="overflow:auto">
            <table>
              <thead><tr><th>Checked</th><th>Target</th><th>Platform</th><th>Result</th></tr></thead>
              <tbody id="logsBody"></tbody>
            </table>
          </div>
        </section>
      </main>
    </section>

    <script>
      const loginView = document.getElementById("loginView");
      const appView = document.getElementById("appView");
      const loginForm = document.getElementById("loginForm");
      const targetForm = document.getElementById("targetForm");
      const loginError = document.getElementById("loginError");
      const targetError = document.getElementById("targetError");

      function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[char]));
      }

      async function api(path, options = {}) {
        const response = await fetch(path, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
          }
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Request failed");
        return payload;
      }

      function showApp() {
        loginView.classList.add("hidden");
        appView.classList.remove("hidden");
      }

      function showLogin() {
        appView.classList.add("hidden");
        loginView.classList.remove("hidden");
      }

      async function loadData() {
        const [targets, logs] = await Promise.all([
          api("/api/targets"),
          api("/api/logs")
        ]);
        document.getElementById("targetsBody").innerHTML = targets.targets.length
          ? targets.targets.map((target) => \`
            <tr>
              <td>\${escapeHtml(target.url)}</td>
              <td>\${escapeHtml(target.keyword)}</td>
              <td><span class="badge">\${escapeHtml(target.status)}</span></td>
            </tr>
          \`).join("")
          : '<tr><td colspan="3" class="muted">No targets yet.</td></tr>';

        document.getElementById("logsBody").innerHTML = logs.logs.length
          ? logs.logs.map((log) => \`
            <tr>
              <td>\${escapeHtml(log.checked_at)}</td>
              <td>\${escapeHtml(log.url)}</td>
              <td><span class="badge">\${escapeHtml(log.platform)}</span></td>
              <td>\${escapeHtml(log.rank_or_mention)}<br><span class="muted">\${escapeHtml(log.response_snippet)}</span></td>
            </tr>
          \`).join("")
          : '<tr><td colspan="4" class="muted">No monitor logs yet.</td></tr>';
      }

      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        loginError.textContent = "";
        document.getElementById("loginButton").disabled = true;
        try {
          await api("/api/login", {
            method: "POST",
            body: JSON.stringify({
              username: document.getElementById("username").value,
              password: document.getElementById("password").value
            })
          });
          showApp();
          await loadData();
        } catch (error) {
          loginError.textContent = error.message;
        } finally {
          document.getElementById("loginButton").disabled = false;
        }
      });

      targetForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        targetError.textContent = "";
        document.getElementById("targetButton").disabled = true;
        try {
          await api("/api/targets", {
            method: "POST",
            body: JSON.stringify({
              url: document.getElementById("targetUrl").value,
              keyword: document.getElementById("targetKeyword").value
            })
          });
          targetForm.reset();
          await loadData();
        } catch (error) {
          targetError.textContent = error.message;
        } finally {
          document.getElementById("targetButton").disabled = false;
        }
      });

      document.getElementById("logoutButton").addEventListener("click", async () => {
        await api("/api/logout", { method: "POST", body: "{}" });
        showLogin();
      });

      (async function boot() {
        try {
          const session = await api("/api/session");
          if (session.authenticated) {
            showApp();
            await loadData();
          } else {
            showLogin();
          }
        } catch {
          showLogin();
        }
      })();
    </script>
  </body>
</html>`;
}

async function routeRequest(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method === "GET" && pathname === "/") {
    return htmlResponse(appHtml());
  }

  if (request.method === "POST" && pathname === "/api/login") {
    return login(request, env);
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    return logout(request, env);
  }

  if (request.method === "GET" && pathname === "/api/session") {
    return session(request, env);
  }

  if (request.method === "GET" && pathname === "/api/targets") {
    return getTargets(request, env);
  }

  if (request.method === "POST" && pathname === "/api/targets") {
    return createTarget(request, env);
  }

  if (request.method === "GET" && pathname === "/api/logs") {
    return getLogs(request, env);
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
