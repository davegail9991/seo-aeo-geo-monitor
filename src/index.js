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

const STOP_WORDS = new Set([
  "about", "above", "after", "again", "all", "also", "and", "are", "because", "been", "before", "being", "below",
  "between", "both", "but", "can", "cannot", "click", "contact", "copyright", "could", "details", "does", "doing",
  "down", "each", "from", "get", "have", "having", "here", "home", "into", "its", "just", "learn", "login",
  "menu", "more", "now", "only", "other", "our", "page", "please", "privacy", "read", "search", "site", "some",
  "such", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "those", "through",
  "too", "under", "using", "view", "was", "were", "what", "when", "where", "which", "while", "with", "your",
]);

const PLATFORM_PATTERNS = [
  ["facebook", /facebook\.com/i],
  ["instagram", /instagram\.com/i],
  ["x-twitter", /(twitter\.com|x\.com)/i],
  ["linkedin", /linkedin\.com/i],
  ["youtube", /youtube\.com/i],
  ["tiktok", /tiktok\.com/i],
  ["telegram", /t\.me|telegram\.me/i],
  ["pinterest", /pinterest\.com/i],
  ["reddit", /reddit\.com/i],
  ["medium", /medium\.com/i],
  ["github", /github\.com/i],
  ["trustpilot", /trustpilot\.com/i],
  ["crunchbase", /crunchbase\.com/i],
  ["wikipedia", /wikipedia\.org/i],
];

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, ...extraHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function htmlResponse(markup, status = 200) {
  return new Response(markup, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

function getDatabase(env) {
  const database = env.seo_monitor_db || env.DB;
  if (!database) throw new Error("D1 binding is missing. Bind the database as seo_monitor_db or DB.");
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
  const prefix = `${name}=`;
  const match = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
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
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function ensureTables(env) {
  const db = getDatabase(env);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS targets (
      id INTEGER PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      keyword TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS monitor_logs (
      id INTEGER PRIMARY KEY,
      target_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      rank_or_mention TEXT NOT NULL,
      response_snippet TEXT,
      checked_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_targets_updated_at ON targets(updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_monitor_logs_target_id ON monitor_logs(target_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_monitor_logs_checked_at ON monitor_logs(checked_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS domain_audits (
      id INTEGER PRIMARY KEY,
      target_id INTEGER,
      url TEXT NOT NULL,
      normalized_host TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE SET NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_domain_audits_host ON domain_audits(normalized_host)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_domain_audits_created_at ON domain_audits(created_at)"),
  ]);

  const existing = await db.prepare("SELECT id FROM admin_users LIMIT 1").first();
  if (!existing) {
    await db.prepare("INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'owner')")
      .bind(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD_SHA256)
      .run();
  }
}

async function getAuthenticatedUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  await ensureTables(env);
  const db = getDatabase(env);
  const session = await db.prepare(
    `SELECT username FROM auth_sessions WHERE token_hash = ? AND expires_at > datetime('now') LIMIT 1`,
  ).bind(await sha256Hex(token)).first();
  return session ? { username: session.username } : null;
}

async function requireAuth(request, env) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) return { ok: false, response: errorResponse("Unauthorized.", 401) };
  return { ok: true, user };
}

async function login(request, env) {
  await ensureTables(env);
  const body = await readJson(request);
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  if (!username || !password) return errorResponse("Username and password are required.", 422);

  const db = getDatabase(env);
  const admin = await db.prepare("SELECT username, password_hash FROM admin_users WHERE lower(username) = lower(?) LIMIT 1")
    .bind(username)
    .first();
  if (!admin) return errorResponse("Invalid login.", 401);

  const passwordHash = await sha256Hex(`${PASSWORD_SALT}:${password}`);
  if (!secureCompare(passwordHash, String(admin.password_hash).toLowerCase())) return errorResponse("Invalid login.", 401);

  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = base64Url(tokenBytes);
  await db.prepare(
    `INSERT INTO auth_sessions (token_hash, username, created_at, expires_at)
     VALUES (?, ?, datetime('now'), datetime('now', '+12 hours'))`,
  ).bind(await sha256Hex(token), admin.username).run();

  return jsonResponse(
    { ok: true, user: { username: admin.username } },
    200,
    { "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax` },
  );
}

async function logout(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    await ensureTables(env);
    await getDatabase(env).prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  }
  return jsonResponse({ ok: true }, 200, {
    "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  });
}

async function session(request, env) {
  const user = await getAuthenticatedUser(request, env);
  return jsonResponse({ ok: true, authenticated: Boolean(user), user });
}

async function listAdmins(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;
  await ensureTables(env);
  const { results } = await getDatabase(env).prepare(
    "SELECT id, username, role, created_at FROM admin_users ORDER BY id ASC",
  ).all();
  return jsonResponse({ ok: true, admins: results });
}

async function createAdmin(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  if (!username || !username.includes("@")) return errorResponse("A valid admin email is required.", 422);
  if (password.length < 10) return errorResponse("Password must be at least 10 characters.", 422);
  await ensureTables(env);
  const hash = await sha256Hex(`${PASSWORD_SALT}:${password}`);
  try {
    await getDatabase(env).prepare("INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'admin')")
      .bind(username, hash)
      .run();
    return jsonResponse({ ok: true, admin: { username, role: "admin" } }, 201);
  } catch {
    return errorResponse("This admin already exists.", 409);
  }
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function firstMatch(html, regex) {
  const match = html.match(regex);
  return match ? stripTags(match[1] || match[2] || "") : "";
}

function attrValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escaped}\\s*=\\s*["']([^"']+)["']`, "i");
  return decodeEntities((tag.match(regex) || [])[1] || "");
}

function metaContent(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const lower = String(name).toLowerCase();
  for (const tag of tags) {
    if (attrValue(tag, "name").toLowerCase() === lower || attrValue(tag, "property").toLowerCase() === lower) {
      return attrValue(tag, "content");
    }
  }
  return "";
}

function extractMany(html, regex, limit = 30) {
  const values = [];
  let match;
  while ((match = regex.exec(html)) && values.length < limit) {
    const text = stripTags(match[1]);
    if (text) values.push(text);
  }
  return values;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  const host = new URL(baseUrl).hostname.replace(/^www\./, "");
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) && links.length < 350) {
    const rawHref = decodeEntities(match[1]);
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) continue;
    try {
      const url = new URL(rawHref, baseUrl);
      url.hash = "";
      const href = url.toString().replace(/\/$/, "");
      if (seen.has(href)) continue;
      seen.add(href);
      links.push({
        href,
        text: stripTags(match[2]).slice(0, 120),
        external: url.hostname.replace(/^www\./, "") !== host,
      });
    } catch {
      continue;
    }
  }
  return links;
}

function extractSchemas(html) {
  const scripts = [];
  const types = new Set();
  const regex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) && scripts.length < 20) {
    const raw = decodeEntities(match[1].trim());
    scripts.push(raw.slice(0, 5000));
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const type = item?.["@type"] || item?.type;
        if (Array.isArray(type)) type.forEach((entry) => types.add(String(entry)));
        else if (type) types.add(String(type));
      }
    } catch {
      types.add("Invalid JSON-LD");
    }
  }
  return { count: scripts.length, types: [...types].slice(0, 20), samples: scripts.slice(0, 3) };
}

function keywordCloud({ title, description, h1, h2, h3, bodyText }) {
  const buckets = [
    [title, 6, "title"],
    [description, 3, "meta"],
    [h1.join(" "), 4, "h1"],
    [[...h2, ...h3].join(" "), 2.5, "heading"],
    [bodyText, 1, "body"],
  ];
  const map = new Map();
  for (const [text, weight, location] of buckets) {
    const words = String(text || "").toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [];
    for (const word of words) {
      if (STOP_WORDS.has(word) || word.length > 28) continue;
      const item = map.get(word) || { text: word, value: 0, score: 0, locations: new Set() };
      item.value += 1;
      item.score += weight;
      item.locations.add(location);
      map.set(word, item);
    }
  }
  return [...map.values()]
    .map((item) => ({
      text: item.text,
      value: item.value,
      score: Number(item.score.toFixed(1)),
      location_bias: item.locations.has("title") || item.locations.has("h1") ? "title_h1" : item.locations.has("meta") ? "metadata" : "body",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);
}

function scoreAudit(data) {
  let score = 100;
  const checks = [];
  const add = (condition, penalty, message, level = "warning") => {
    if (!condition) {
      score -= penalty;
      checks.push({ level, message });
    }
  };
  add(data.seo.title.length >= 25 && data.seo.title.length <= 65, 10, "Title length should be 25-65 characters.");
  add(data.seo.description.length >= 70 && data.seo.description.length <= 160, 10, "Meta description should be 70-160 characters.");
  add(data.seo.h1.length === 1, 10, "Use exactly one clear H1.");
  add(Boolean(data.technical.canonical), 8, "Add a canonical tag.");
  add(Boolean(data.technical.robots), 4, "Add a robots meta tag.");
  add(data.schema.types.length > 0, 12, "Add JSON-LD schema markup for AEO/GEO readiness.");
  add(data.openGraph.present, 8, "Add OpenGraph metadata for social and entity clarity.");
  add(data.content.wordCount >= 300, 10, "Homepage visible body content is thin; aim for 300+ meaningful words.");
  add(data.content.topKeywords.length >= 8, 6, "Keyword footprint is too narrow.");
  add(data.links.external.length >= 3, 4, "Add trustworthy external/entity references.");
  return { score: Math.max(0, Math.min(100, score)), checks };
}

function recommendations(data) {
  const missing = [];
  const actionPlan = [];
  const schemas = data.schema.types.map((type) => type.toLowerCase());

  if (!data.schema.types.length) missing.push("Organization/WebSite/BreadcrumbList JSON-LD schema");
  if (!schemas.some((type) => type.includes("organization"))) actionPlan.push("Add Organization schema with legal name, logo, sameAs social profiles, and contact points.");
  if (!schemas.some((type) => type.includes("website"))) actionPlan.push("Add WebSite schema with SearchAction if the site has search.");
  if (!data.technical.canonical) actionPlan.push("Add canonical URL on the homepage to consolidate ranking signals.");
  if (!data.seo.description) actionPlan.push("Write a benefit-driven meta description using the primary service and market.");
  if (data.seo.h1.length !== 1) actionPlan.push("Use one H1 that describes the brand/category clearly.");
  if (data.platforms.length < 3) actionPlan.push("Register and link brand profiles on Facebook, Instagram, LinkedIn, YouTube, X/Twitter, and Trustpilot where relevant.");
  if (data.content.wordCount < 300) actionPlan.push("Add a richer homepage intro, FAQ, trust sections, product/category summaries, and internal links.");

  const topTerms = data.content.topKeywords.slice(0, 10).map((item) => item.text);
  const report = [
    `Primary keyword focus detected: ${topTerms.length ? topTerms.join(", ") : "not enough readable content detected"}.`,
    `Entity visibility: ${data.platforms.length ? `found ${data.platforms.map((p) => p.platform).join(", ")}` : "no major social/entity platforms detected on the page"}.`,
    `AEO readiness: ${data.schema.types.length ? `schema found (${data.schema.types.join(", ")})` : "weak; schema markup is missing"}.`,
    `GEO readiness: ${data.openGraph.present && data.schema.types.length ? "good foundation for AI citation parsing" : "needs stronger structured entity signals"}.`,
  ];

  return { missing, actionPlan: actionPlan.slice(0, 12), summary: report };
}

async function fetchText(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEO-AEO-GEO-Monitor/1.0; +https://seomonitor-api.davegail9991.workers.dev)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, finalUrl: response.url, text: text.slice(0, 450000) };
  } finally {
    clearTimeout(timeout);
  }
}

async function auditDomain(inputUrl) {
  const url = normalizeUrl(inputUrl);
  if (!url) throw new Error("A valid domain or URL is required.");
  const started = Date.now();
  const page = await fetchText(url);
  const html = page.text || "";
  const baseUrl = page.finalUrl || url;
  const normalizedHost = new URL(baseUrl).hostname.replace(/^www\./, "");
  const bodyHtml = firstMatch(html, /<body\b[^>]*>([\s\S]*?)<\/body>/i) || html;
  const bodyText = stripTags(
    String(bodyHtml)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " "),
  );

  const title = firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const description = metaContent(html, "description");
  const keywords = metaContent(html, "keywords");
  const canonicalTag = (html.match(/<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i) || [])[0] || "";
  const ogTags = (html.match(/<meta\b[^>]*(property|name)=["']og:[^"']+["'][^>]*>/gi) || []).length;
  const twitterTags = (html.match(/<meta\b[^>]*(property|name)=["']twitter:[^"']+["'][^>]*>/gi) || []).length;
  const h1 = extractMany(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, 12);
  const h2 = extractMany(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, 30);
  const h3 = extractMany(html, /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, 30);
  const links = extractLinks(html, baseUrl);
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  const imagesMissingAlt = imageTags.filter((tag) => !attrValue(tag, "alt")).length;
  const schema = extractSchemas(html);
  const platforms = [];
  for (const [platform, regex] of PLATFORM_PATTERNS) {
    const matches = links.filter((link) => regex.test(link.href)).slice(0, 5);
    if (matches.length) platforms.push({ platform, urls: matches.map((m) => m.href) });
  }

  const result = {
    url,
    finalUrl: baseUrl,
    normalizedHost,
    fetchedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    httpStatus: page.status,
    seo: {
      title,
      titleLength: title.length,
      description,
      descriptionLength: description.length,
      keywords,
      h1,
      h2,
      h3,
    },
    technical: {
      canonical: canonicalTag ? attrValue(canonicalTag, "href") || true : "",
      robots: metaContent(html, "robots"),
      viewport: metaContent(html, "viewport"),
      charset: firstMatch(html, /<meta\b[^>]*charset=["']?([^"'\s>]+)/i),
      images: imageTags.length,
      imagesMissingAlt,
    },
    openGraph: {
      present: ogTags > 0,
      ogTags,
      twitterTags,
      title: metaContent(html, "og:title"),
      description: metaContent(html, "og:description"),
      image: metaContent(html, "og:image"),
    },
    schema,
    links: {
      internal: links.filter((link) => !link.external).slice(0, 80),
      external: links.filter((link) => link.external).slice(0, 80),
    },
    platforms,
    content: {
      wordCount: (bodyText.match(/[a-z0-9][a-z0-9-]{2,}/gi) || []).length,
      topKeywords: keywordCloud({ title, description, h1, h2, h3, bodyText }),
    },
  };

  const scoring = scoreAudit(result);
  const advice = recommendations(result);
  return { ...result, score: scoring.score, issues: scoring.checks, recommendations: advice };
}

async function upsertTarget(db, url, keyword = "") {
  const normalized = normalizeUrl(url);
  const existing = await db.prepare("SELECT id FROM targets WHERE url = ?").bind(normalized).first();
  if (existing) {
    await db.prepare("UPDATE targets SET keyword = ?, status = 'processing', updated_at = datetime('now') WHERE id = ?")
      .bind(keyword, existing.id)
      .run();
    return existing.id;
  }
  const result = await db.prepare(
    `INSERT INTO targets (url, keyword, status, created_at, updated_at)
     VALUES (?, ?, 'processing', datetime('now'), datetime('now'))`,
  ).bind(normalized, keyword).run();
  return result.meta.last_row_id;
}

async function runAuditForUrl(env, url, keyword = "") {
  await ensureTables(env);
  const db = getDatabase(env);
  const targetId = await upsertTarget(db, url, keyword);
  try {
    const report = await auditDomain(url);
    await db.batch([
      db.prepare(
        `INSERT INTO domain_audits (target_id, url, normalized_host, status, score, report_json, created_at)
         VALUES (?, ?, ?, 'completed', ?, ?, datetime('now'))`,
      ).bind(targetId, report.finalUrl, report.normalizedHost, report.score, JSON.stringify(report)),
      db.prepare("UPDATE targets SET status = 'completed', updated_at = datetime('now') WHERE id = ?").bind(targetId),
      db.prepare(
        `INSERT INTO monitor_logs (target_id, platform, rank_or_mention, response_snippet, checked_at)
         VALUES (?, 'site-audit', ?, ?, datetime('now'))`,
      ).bind(targetId, `score-${report.score}`, report.recommendations.summary.join(" ")),
    ]);
    return report;
  } catch (error) {
    await db.prepare("UPDATE targets SET status = 'failed', updated_at = datetime('now') WHERE id = ?").bind(targetId).run();
    throw error;
  }
}

async function createTarget(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  const url = normalizeUrl(body?.url || body?.domain);
  const keyword = String(body?.keyword || "").trim();
  if (!url) return errorResponse("A valid domain or URL is required.", 422);
  const report = await runAuditForUrl(env, url, keyword);
  return jsonResponse({ ok: true, report }, 201);
}

async function getTargets(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;
  await ensureTables(env);
  const { results } = await getDatabase(env).prepare(
    `SELECT targets.id, targets.url, targets.keyword, targets.status, targets.created_at, targets.updated_at,
      (SELECT score FROM domain_audits WHERE domain_audits.target_id = targets.id ORDER BY id DESC LIMIT 1) AS latest_score,
      (SELECT id FROM domain_audits WHERE domain_audits.target_id = targets.id ORDER BY id DESC LIMIT 1) AS latest_report_id
     FROM targets ORDER BY updated_at DESC, id DESC`,
  ).all();
  return jsonResponse({ ok: true, targets: results });
}

async function getLogs(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;
  await ensureTables(env);
  const { results } = await getDatabase(env).prepare(
    `SELECT monitor_logs.id, monitor_logs.target_id, targets.url, targets.keyword, targets.status AS target_status,
      monitor_logs.platform, monitor_logs.rank_or_mention, monitor_logs.response_snippet, monitor_logs.checked_at
     FROM monitor_logs INNER JOIN targets ON targets.id = monitor_logs.target_id
     ORDER BY monitor_logs.checked_at DESC, monitor_logs.id DESC LIMIT 500`,
  ).all();
  return jsonResponse({ ok: true, logs: results });
}

async function listReports(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;
  await ensureTables(env);
  const { results } = await getDatabase(env).prepare(
    `SELECT id, target_id, url, normalized_host, status, score, created_at
     FROM domain_audits ORDER BY id DESC LIMIT 100`,
  ).all();
  return jsonResponse({ ok: true, reports: results });
}

async function getReport(request, env, id) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;
  await ensureTables(env);
  const row = await getDatabase(env).prepare("SELECT * FROM domain_audits WHERE id = ?").bind(id).first();
  if (!row) return errorResponse("Report not found.", 404);
  return jsonResponse({ ok: true, report: { ...row, data: JSON.parse(row.report_json) } });
}

async function processNextPendingTarget(env) {
  await ensureTables(env);
  const db = getDatabase(env);
  const target = await db.prepare("SELECT id, url, keyword FROM targets WHERE status = 'pending' ORDER BY updated_at ASC LIMIT 1").first();
  if (!target) return { processed: false };
  await runAuditForUrl(env, target.url, target.keyword);
  return { processed: true, target_id: target.id };
}

function appHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SEO / AEO / GEO Monitor</title>
  <style>
    :root{color-scheme:dark;--bg:#020617;--panel:rgba(15,23,42,.86);--line:rgba(148,163,184,.18);--text:#e5e7eb;--muted:#94a3b8;--accent:#deff9a;--cyan:#22d3ee;--danger:#fb7185;--ok:#34d399}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top left,rgba(34,211,238,.16),transparent 30rem),radial-gradient(circle at bottom right,rgba(222,255,154,.12),transparent 30rem),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input{font:inherit}.hidden{display:none!important}
    .login-wrap{min-height:100vh;display:grid;place-items:center;padding:1.5rem}.login-card{width:min(28rem,100%);border:1px solid rgba(222,255,154,.22);background:rgba(15,23,42,.88);border-radius:1rem;padding:1.4rem;box-shadow:0 0 70px rgba(34,211,238,.12)}
    .shell{min-height:100vh;display:grid;grid-template-columns:18rem 1fr}aside{border-right:1px solid var(--line);background:rgba(2,6,23,.78);padding:1.5rem}.brand{display:flex;align-items:center;gap:.75rem;margin-bottom:2rem;font-weight:900;letter-spacing:.08em}.mark{width:2.25rem;height:2.25rem;display:grid;place-items:center;border:1px solid rgba(222,255,154,.45);border-radius:.5rem;color:var(--accent);box-shadow:0 0 24px rgba(222,255,154,.2)}nav button{width:100%;border:1px solid transparent;border-radius:.5rem;background:transparent;color:#bfdbfe;margin-bottom:.5rem;padding:.72rem .85rem;text-align:left;cursor:pointer}nav button.active{border-color:rgba(222,255,154,.35);background:rgba(222,255,154,.08);color:#fff}
    main{padding:2rem}.topbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}h1{font-size:clamp(1.75rem,4vw,3rem);margin:0 0 .25rem}h2{margin:.2rem 0 1rem}.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:minmax(18rem,.75fr) minmax(22rem,1.25fr);gap:1rem}.panel{border:1px solid var(--line);background:var(--panel);border-radius:.85rem;padding:1.15rem;box-shadow:0 24px 90px rgba(0,0,0,.32);backdrop-filter:blur(18px)}label{display:block;color:var(--muted);font-size:.78rem;font-weight:800;letter-spacing:.08em;margin:0 0 .45rem;text-transform:uppercase}input{width:100%;border:1px solid rgba(148,163,184,.22);border-radius:.55rem;background:rgba(2,6,23,.72);color:var(--text);outline:none;padding:.8rem .9rem}input:focus{border-color:rgba(34,211,238,.7);box-shadow:0 0 0 3px rgba(34,211,238,.12)}.field{margin-top:1rem}.btn{border:1px solid rgba(222,255,154,.5);border-radius:.55rem;background:linear-gradient(135deg,rgba(222,255,154,.92),rgba(34,211,238,.86));color:#04111f;cursor:pointer;font-weight:900;padding:.78rem 1rem}.btn.secondary{background:rgba(15,23,42,.72);color:var(--text);border-color:var(--line)}.btn:disabled{cursor:wait;opacity:.65}
    table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid var(--line);padding:.8rem .6rem;text-align:left;vertical-align:top}th{color:var(--muted);font-size:.74rem;letter-spacing:.08em;text-transform:uppercase}.badge{display:inline-flex;border:1px solid rgba(34,211,238,.3);border-radius:999px;color:var(--cyan);padding:.22rem .5rem;font-size:.78rem}.score{font-weight:900;color:var(--accent)}.error{color:var(--danger);min-height:1.2rem;margin-top:.75rem}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin-bottom:1rem}.metric{border:1px solid var(--line);border-radius:.75rem;padding:1rem;background:rgba(2,6,23,.45)}.metric b{display:block;font-size:1.8rem}.wordcloud{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}.word{border:1px solid rgba(148,163,184,.16);border-radius:999px;padding:.25rem .55rem;background:rgba(2,6,23,.35)}.report-list{display:grid;gap:.75rem}.report-item{border:1px solid var(--line);border-radius:.75rem;padding:.9rem;background:rgba(2,6,23,.35);cursor:pointer}.report-item:hover{border-color:rgba(34,211,238,.45)}pre{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#b9fbc0}.split{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.section{display:none}.section.active{display:block}
    @media(max-width:1000px){.shell,.grid,.split,.cards{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid var(--line)}}
  </style>
</head>
<body>
  <section id="loginView" class="login-wrap">
    <form id="loginForm" class="login-card">
      <div class="brand"><div class="mark">SEO</div><div>MONITOR ACCESS</div></div>
      <h1>Secure Login</h1><p class="muted">Cloudflare Worker SEO / AEO / GEO intelligence console.</p>
      <div class="field"><label>Username</label><input id="username" autocomplete="username" required></div>
      <div class="field"><label>Password</label><input id="password" type="password" autocomplete="current-password" required></div>
      <div class="field"><button id="loginButton" class="btn" type="submit">Enter Monitor</button></div>
      <div id="loginError" class="error"></div>
    </form>
  </section>
  <section id="appView" class="shell hidden">
    <aside><div class="brand"><div class="mark">SEO</div><div>AEO / GEO</div></div><nav>
      <button data-view="dashboard" class="active">Dashboard</button>
      <button data-view="audit">Domain Audit</button>
      <button data-view="reports">Reports</button>
      <button data-view="admins">Admins</button>
    </nav></aside>
    <main>
      <div class="topbar"><div><h1>SEO Monitor</h1><div class="muted">Domain crawler, entity signals, keyword cloud, and optimization reports</div></div><button id="logoutButton" class="btn secondary">Logout</button></div>
      <section id="dashboard" class="section active">
        <div class="cards"><div class="metric"><span class="muted">Targets</span><b id="mTargets">0</b></div><div class="metric"><span class="muted">Reports</span><b id="mReports">0</b></div><div class="metric"><span class="muted">Latest Score</span><b id="mScore">-</b></div><div class="metric"><span class="muted">Latest Status</span><b id="mStatus">-</b></div></div>
        <div class="grid"><div class="panel"><h2>Run Domain Audit</h2><form id="targetForm"><div class="field"><label>Domain / URL</label><input id="targetUrl" placeholder="https://example.com" required></div><div class="field"><label>Optional Keyword</label><input id="targetKeyword" placeholder="brand or money keyword"></div><div class="field"><button id="targetButton" class="btn" type="submit">Analyze Domain</button></div><div id="targetError" class="error"></div></form></div><div class="panel"><h2>Targets</h2><table><thead><tr><th>URL</th><th>Keyword</th><th>Status</th><th>Score</th></tr></thead><tbody id="targetsBody"></tbody></table></div></div>
        <div class="panel" style="margin-top:1rem"><h2>Monitor Logs</h2><table><thead><tr><th>Checked</th><th>Target</th><th>Platform</th><th>Result</th></tr></thead><tbody id="logsBody"></tbody></table></div>
      </section>
      <section id="audit" class="section"><div class="panel"><h2>Latest Domain Intelligence</h2><div id="latestReport">Run an audit to generate a report.</div></div></section>
      <section id="reports" class="section"><div class="split"><div class="panel"><h2>Saved Reports</h2><div id="reportsList" class="report-list"></div></div><div class="panel"><h2>Report Detail</h2><div id="reportDetail" class="muted">Select a report.</div></div></div></section>
      <section id="admins" class="section"><div class="grid"><div class="panel"><h2>Create Admin Login</h2><form id="adminForm"><div class="field"><label>Email</label><input id="adminEmail" placeholder="admin@example.com"></div><div class="field"><label>Password</label><input id="adminPassword" type="password" placeholder="10+ characters"></div><div class="field"><button class="btn">Create Admin</button></div><div id="adminError" class="error"></div></form></div><div class="panel"><h2>Admins</h2><table><thead><tr><th>User</th><th>Role</th><th>Created</th></tr></thead><tbody id="adminsBody"></tbody></table></div></div></section>
    </main>
  </section>
  <script>
    const $ = (id) => document.getElementById(id);
    const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
    async function api(path, options = {}) {
      const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Request failed");
      return payload;
    }
    function showApp(){ $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden"); }
    function showLogin(){ $("appView").classList.add("hidden"); $("loginView").classList.remove("hidden"); }
    function nav(view){ document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view)); document.querySelectorAll(".section").forEach(s=>s.classList.toggle("active",s.id===view)); }
    document.querySelectorAll("nav button").forEach((b)=>b.addEventListener("click",()=>nav(b.dataset.view)));
    function renderReport(data){
      if(!data) return "No report yet.";
      return \`<div class="cards"><div class="metric"><span class="muted">Score</span><b class="score">\${data.score}</b></div><div class="metric"><span class="muted">Words</span><b>\${data.content.wordCount}</b></div><div class="metric"><span class="muted">Schemas</span><b>\${data.schema.types.length}</b></div><div class="metric"><span class="muted">Platforms</span><b>\${data.platforms.length}</b></div></div>
      <div class="split"><div><h3>SEO Snapshot</h3><p><b>Title:</b> \${escapeHtml(data.seo.title || "Missing")} (\${data.seo.titleLength})</p><p><b>Description:</b> \${escapeHtml(data.seo.description || "Missing")} (\${data.seo.descriptionLength})</p><p><b>H1:</b> \${escapeHtml(data.seo.h1.join(" | ") || "Missing")}</p><p><b>Canonical:</b> \${escapeHtml(data.technical.canonical || "Missing")}</p><p><b>Schema:</b> \${escapeHtml(data.schema.types.join(", ") || "Missing")}</p><p><b>Platforms:</b> \${escapeHtml(data.platforms.map(p=>p.platform).join(", ") || "None detected")}</p></div>
      <div><h3>Optimization Report</h3><ul>\${data.recommendations.actionPlan.map(x=>\`<li>\${escapeHtml(x)}</li>\`).join("")}</ul><h3>Issues</h3><ul>\${data.issues.map(x=>\`<li>\${escapeHtml(x.message)}</li>\`).join("")}</ul></div></div>
      <h3>Keyword Density Cloud</h3><div class="wordcloud">\${data.content.topKeywords.map(w=>\`<span class="word" title="score \${w.score}, count \${w.value}">\${escapeHtml(w.text)} <small>\${w.score}</small></span>\`).join("")}</div>
      <h3>Detected Platform URLs</h3><pre>\${escapeHtml(data.platforms.flatMap(p=>p.urls.map(u=>p.platform+": "+u)).join("\\n") || "No major platform links detected.")}</pre>\`;
    }
    async function loadData(){
      const [targets, logs, reports, admins] = await Promise.all([api("/api/targets"), api("/api/logs"), api("/api/reports"), api("/api/admin/users")]);
      $("mTargets").textContent = targets.targets.length; $("mReports").textContent = reports.reports.length; $("mScore").textContent = reports.reports[0]?.score ?? "-"; $("mStatus").textContent = reports.reports[0]?.status ?? "-";
      $("targetsBody").innerHTML = targets.targets.length ? targets.targets.map(t=>\`<tr><td>\${escapeHtml(t.url)}</td><td>\${escapeHtml(t.keyword || "-")}</td><td><span class="badge">\${escapeHtml(t.status)}</span></td><td class="score">\${t.latest_score ?? "-"}</td></tr>\`).join("") : '<tr><td colspan="4" class="muted">No targets yet.</td></tr>';
      $("logsBody").innerHTML = logs.logs.length ? logs.logs.map(l=>\`<tr><td>\${escapeHtml(l.checked_at)}</td><td>\${escapeHtml(l.url)}</td><td><span class="badge">\${escapeHtml(l.platform)}</span></td><td>\${escapeHtml(l.rank_or_mention)}<br><span class="muted">\${escapeHtml(l.response_snippet)}</span></td></tr>\`).join("") : '<tr><td colspan="4" class="muted">No monitor logs yet.</td></tr>';
      $("reportsList").innerHTML = reports.reports.length ? reports.reports.map(r=>\`<div class="report-item" data-id="\${r.id}"><b>\${escapeHtml(r.normalized_host)}</b><div class="muted">\${escapeHtml(r.created_at)} | score \${r.score}</div></div>\`).join("") : '<div class="muted">No reports yet.</div>';
      document.querySelectorAll(".report-item").forEach(el=>el.addEventListener("click", async()=>{ const res=await api("/api/reports/"+el.dataset.id); $("reportDetail").innerHTML=renderReport(res.report.data); nav("reports"); }));
      $("adminsBody").innerHTML = admins.admins.map(a=>\`<tr><td>\${escapeHtml(a.username)}</td><td>\${escapeHtml(a.role)}</td><td>\${escapeHtml(a.created_at)}</td></tr>\`).join("");
      if (reports.reports[0]) { const res = await api("/api/reports/"+reports.reports[0].id); $("latestReport").innerHTML = renderReport(res.report.data); }
    }
    $("loginForm").addEventListener("submit",async(e)=>{e.preventDefault();$("loginError").textContent="";$("loginButton").disabled=true;try{await api("/api/login",{method:"POST",body:JSON.stringify({username:$("username").value,password:$("password").value})});showApp();await loadData();}catch(err){$("loginError").textContent=err.message;}finally{$("loginButton").disabled=false;}});
    $("targetForm").addEventListener("submit",async(e)=>{e.preventDefault();$("targetError").textContent="";$("targetButton").disabled=true;try{const res=await api("/api/targets",{method:"POST",body:JSON.stringify({url:$("targetUrl").value,keyword:$("targetKeyword").value})});$("targetForm").reset();$("latestReport").innerHTML=renderReport(res.report);nav("audit");await loadData();}catch(err){$("targetError").textContent=err.message;}finally{$("targetButton").disabled=false;}});
    $("adminForm").addEventListener("submit",async(e)=>{e.preventDefault();$("adminError").textContent="";try{await api("/api/admin/users",{method:"POST",body:JSON.stringify({username:$("adminEmail").value,password:$("adminPassword").value})});$("adminForm").reset();await loadData();}catch(err){$("adminError").textContent=err.message;}});
    $("logoutButton").addEventListener("click",async()=>{await api("/api/logout",{method:"POST",body:"{}"});showLogin();});
    (async()=>{try{const s=await api("/api/session");if(s.authenticated){showApp();await loadData();}else showLogin();}catch{showLogin();}})();
  </script>
</body>
</html>`;
}

async function routeRequest(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method === "GET" && pathname === "/") return htmlResponse(appHtml());
  if (request.method === "POST" && pathname === "/api/login") return login(request, env);
  if (request.method === "POST" && pathname === "/api/logout") return logout(request, env);
  if (request.method === "GET" && pathname === "/api/session") return session(request, env);
  if (request.method === "GET" && pathname === "/api/targets") return getTargets(request, env);
  if (request.method === "POST" && pathname === "/api/targets") return createTarget(request, env);
  if (request.method === "GET" && pathname === "/api/logs") return getLogs(request, env);
  if (request.method === "GET" && pathname === "/api/reports") return listReports(request, env);
  if (request.method === "GET" && pathname.startsWith("/api/reports/")) return getReport(request, env, pathname.split("/").pop());
  if (request.method === "GET" && pathname === "/api/admin/users") return listAdmins(request, env);
  if (request.method === "POST" && pathname === "/api/admin/users") return createAdmin(request, env);
  if (request.method === "GET" && pathname === "/health") return jsonResponse({ ok: true, service: "seo-aeo-geo-monitor" });
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
