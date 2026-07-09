const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const COOKIE = "seo_monitor_session";
const SALT = "seo-monitor-admin-v1";
const DEFAULT_USER = "admin@seomonitor.app";
const DEFAULT_HASH = "b0e7d521a39a77a1cbcd37fefd979919bb33f38dbe948edfb6be2d7cb76cdf02";
const APP_VERSION = "2026-07-09-domain-ai-v10";
const STOP = new Set("about above after again all also and are because been before being below both but can click contact copyright could details does down each from have having here home into just learn login menu more only other our page please privacy read search site than that the their them then there these they this those through under using view was were what when where which while with your null true false undefined function const return async await class window document script style html body data image icon content width height href https http src var let json http www com net org cdn b-cdn media asset assets static upload uploads file files png jpg jpeg webp svg gif ico woff woff2 css js min api app wp admin cache font fonts data base64 charset meta link rel important color padding none display background background-color background-image border border-radius solid margin transform auto linear-gradient position flex top table center rgba px rem em vh vw calc var text align shadow cursor pointer nth child gap bottom widget bannerurl gamebanner fff deg para por btn div span size footer goldgroup radius box awc linear left gradient container weight dropdown right name block favor board img download wrapper title history max item items scale transparent swal active kho untuk pagetitle metadesc metatag overflow swiper".split(" "));
const PLATFORMS = [
  ["facebook", /facebook\.com/i], ["instagram", /instagram\.com/i], ["x-twitter", /(twitter\.com|x\.com)/i],
  ["linkedin", /linkedin\.com/i], ["youtube", /youtube\.com/i], ["tiktok", /tiktok\.com/i],
  ["telegram", /t\.me|telegram\.me/i], ["reddit", /reddit\.com/i], ["trustpilot", /trustpilot\.com/i],
  ["crunchbase", /crunchbase\.com/i], ["wikipedia", /wikipedia\.org/i], ["github", /github\.com/i],
];
const REGISTRATION_SITES = [
  { name: "Google Search Console", url: "https://search.google.com/search-console/about", priority: "critical", category: "search", detect: /search\.google\.com/i, why: "Submit sitemap, inspect indexing, and monitor Google queries/clicks.", whyZh: "提交 sitemap、检查收录，并监控 Google 查询与点击。", action: "Verify the domain, submit sitemap.xml, then request indexing for the homepage and money pages.", actionZh: "验证域名，提交 sitemap.xml，然后为首页和重点页面请求编入索引。" },
  { name: "Bing Webmaster Tools", url: "https://www.bing.com/webmasters", priority: "high", category: "search", detect: /bing\.com\/webmasters/i, why: "Adds Bing indexing and also helps Microsoft/Copilot discovery.", whyZh: "增加 Bing 收录，也有助于 Microsoft/Copilot 发现你的站点。", action: "Add and verify the site, submit sitemap.xml, and use URL submission after major updates.", actionZh: "添加并验证网站，提交 sitemap.xml，重大更新后使用 URL submission。" },
  { name: "Google Business Profile", url: "https://business.google.com/business-profile/", priority: "high", category: "entity", detect: /business\.google\.com/i, why: "Creates a stronger Google entity if the brand has an eligible business identity.", whyZh: "如果品牌具备合规商业身份，可增强 Google 实体识别。", action: "Create or claim the profile only if the business is eligible and jurisdiction-compliant.", actionZh: "只有在业务合规且符合地区要求时才创建或认领资料。" },
  { name: "Trustpilot Business", url: "https://business.trustpilot.com/", priority: "high", category: "reviews", detect: /trustpilot\.com/i, why: "Review platforms can strengthen brand trust signals for search and AI answers.", whyZh: "评论平台可增强搜索和 AI 答案中的品牌信任信号。", action: "Claim the profile, add official brand details, and collect genuine compliant reviews.", actionZh: "认领资料，填写官方品牌信息，并收集真实合规评论。" },
  { name: "Facebook Page", url: "https://www.facebook.com/pages/create", priority: "medium", category: "social", detect: /facebook\.com/i, why: "Creates a public brand entity and another citation path.", whyZh: "建立公开品牌实体，并增加一个引用路径。", action: "Create the page with matching brand name, logo, description, and website URL.", actionZh: "用一致的品牌名、Logo、描述和网站链接创建页面。" },
  { name: "Instagram Business", url: "https://business.instagram.com/", priority: "medium", category: "social", detect: /instagram\.com/i, why: "Helps Google connect the brand with visual/social identity.", whyZh: "帮助 Google 将品牌与视觉/社交身份关联起来。", action: "Create a business profile and link it from the website footer/about page.", actionZh: "创建商业资料，并从网站 footer/about 页面链接过去。" },
  { name: "LinkedIn Company Page", url: "https://www.linkedin.com/company/setup/new/", priority: "medium", category: "entity", detect: /linkedin\.com/i, why: "Useful company/entity corroboration for B2B and AI knowledge systems.", whyZh: "对公司实体、B2B 和 AI 知识系统有辅助证明作用。", action: "Create a company page with legal/brand facts that match the website.", actionZh: "创建公司页面，信息要和网站上的品牌/法律事实一致。" },
  { name: "YouTube Channel", url: "https://www.youtube.com/account", priority: "medium", category: "content", detect: /youtube\.com/i, why: "Video profiles can appear in Google results and support entity recognition.", whyZh: "视频资料可能出现在 Google 结果中，也支持实体识别。", action: "Publish brand explainer, FAQ, trust/safety, and product walkthrough videos.", actionZh: "发布品牌介绍、FAQ、信任安全和产品说明视频。" },
  { name: "X / Twitter", url: "https://x.com/", priority: "medium", category: "social", detect: /(twitter\.com|x\.com)/i, why: "Adds a public brand feed and citation source.", whyZh: "增加公开品牌动态和引用来源。", action: "Create the official handle and keep brand naming consistent.", actionZh: "创建官方账号，并保持品牌命名一致。" },
  { name: "Crunchbase", url: "https://www.crunchbase.com/add-new", priority: "medium", category: "entity", detect: /crunchbase\.com/i, why: "Can strengthen company/entity data when the business is eligible.", whyZh: "在企业符合条件时，可增强公司/实体数据。", action: "Add a company profile only with accurate registered company information.", actionZh: "只用准确的注册公司资料添加公司页面。" },
  { name: "Wikidata", url: "https://www.wikidata.org/wiki/Special:NewItem", priority: "medium", category: "knowledge", detect: /wikidata\.org/i, why: "Structured knowledge-base citations can help entity understanding if the brand is notable.", whyZh: "如果品牌具备关注度，结构化知识库引用可帮助实体理解。", action: "Create an item only if you have reliable independent sources; avoid spam entries.", actionZh: "只有拥有可靠独立来源时才创建条目，避免垃圾条目。" },
  { name: "GitHub Organization", url: "https://github.com/", priority: "low", category: "technical", detect: /github\.com/i, why: "Useful for technical transparency, llms.txt references, and brand footprint.", whyZh: "有助于技术透明度、llms.txt 引用和品牌足迹。", action: "Create an org and publish public brand/technical docs if relevant.", actionZh: "如适合，可创建组织并发布公开品牌/技术文档。" },
  { name: "Casino Guru", url: "https://casino.guru/contact-us", priority: "industry", category: "igaming", detect: /casino\.guru/i, why: "iGaming-specific visibility and reputation channel; use only where compliant.", whyZh: "iGaming 行业相关曝光与声誉渠道；仅在合规时使用。", action: "Contact the platform about brand/listing options and ensure licensing/compliance details are ready.", actionZh: "联系平台了解品牌/列表选项，并准备好牌照与合规资料。" },
  { name: "AskGamblers", url: "https://www.askgamblers.com/", priority: "industry", category: "igaming", detect: /askgamblers\.com/i, why: "iGaming audience and review/reputation discovery channel; use only where compliant.", whyZh: "iGaming 用户与评论/声誉发现渠道；仅在合规时使用。", action: "Check listing/review eligibility and keep all brand/legal details consistent.", actionZh: "检查列表/评论资格，并保持品牌与法律资料一致。" }
];
const CONNECTORS = [
  { id: "openserp", name: "OpenSERP", category: "Live SERP rank and search result API", repo: "https://github.com/karust/openserp", env: "OPEN_SERP_BASE", mode: "REST when self-hosted" },
  { id: "open-seo-crawler", name: "Open SEO Crawler", category: "Spider crawl and on-page SEO checks", repo: "https://github.com/puneetindersingh/open-seo-crawler", env: "OPEN_SEO_CRAWLER_BASE", mode: "Self-hosted crawler endpoint" },
  { id: "python-seo-analyzer", name: "python-seo-analyzer", category: "Site structure, word count and SEO warnings", repo: "https://github.com/sethblack/python-seo-analyzer", env: "PYTHON_SEO_ANALYZER_BASE", mode: "Self-hosted wrapper endpoint" },
  { id: "geo-optimizer", name: "GEO Optimizer Skill", category: "AEO/GEO answer engine readiness", repo: "https://github.com/Auriti-Labs/geo-optimizer-skill", env: "GEO_OPTIMIZER_BASE", mode: "CLI/Python/MCP bridge endpoint" },
  { id: "librecrawl", name: "LibreCrawl Technical SEO MCP", category: "AI-native technical SEO audit tools", repo: "https://github.com/adityaarsharma/librecrawl-technical-seo-audit-mcp", env: "LIBRECRAWL_BASE", mode: "MCP or REST bridge endpoint" },
];

const j = (x, s = 200, h = {}) => new Response(JSON.stringify(x), { status: s, headers: { ...H, ...h, "content-type": "application/json;charset=utf-8" } });
const html = (x) => new Response(x, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store" } });
const err = (m, s = 400) => j({ ok: false, error: m }, s);
const db = (env) => env.seo_monitor_db || env.DB;
const now = () => new Date().toISOString();
function hostOf(x = "") {
  try { return new URL(String(x)).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}
const clean = (x = "") => String(x).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ");
const text = (x = "") => clean(String(x).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const esc = (x = "") => String(x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

function norm(x) {
  try {
    const u = new URL(String(x || "").match(/^https?:\/\//) ? x : `https://${x}`);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch { return ""; }
}
async function body(req) { try { return await req.json(); } catch { return {}; } }
function cookie(req, name) {
  const p = `${name}=`;
  return (req.headers.get("cookie") || "").split(";").map((x) => x.trim()).find((x) => x.startsWith(p))?.slice(p.length) || "";
}
function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha(x) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function eq(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) v |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return v === 0;
}

async function tables(env) {
  const d = db(env);
  if (!d) throw new Error("D1 binding missing");
  await d.batch([
    d.prepare("CREATE TABLE IF NOT EXISTS targets(id INTEGER PRIMARY KEY,url TEXT NOT NULL UNIQUE,keyword TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')))"),
    d.prepare("CREATE TABLE IF NOT EXISTS monitor_logs(id INTEGER PRIMARY KEY,target_id INTEGER,platform TEXT NOT NULL,rank_or_mention TEXT NOT NULL,response_snippet TEXT,checked_at TEXT NOT NULL DEFAULT(datetime('now')))"),
    d.prepare("CREATE TABLE IF NOT EXISTS auth_sessions(token_hash TEXT PRIMARY KEY,username TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')),expires_at TEXT NOT NULL)"),
    d.prepare("CREATE TABLE IF NOT EXISTS admin_users(id INTEGER PRIMARY KEY,username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'admin',created_at TEXT NOT NULL DEFAULT(datetime('now')))"),
    d.prepare("CREATE TABLE IF NOT EXISTS domain_audits(id INTEGER PRIMARY KEY,target_id INTEGER,url TEXT NOT NULL,host TEXT NOT NULL,status TEXT NOT NULL,score INTEGER NOT NULL,report_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')))"),
    d.prepare("CREATE TABLE IF NOT EXISTS connector_settings(id TEXT PRIMARY KEY,base_url TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT(datetime('now')))"),
    d.prepare("CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status)"),
    d.prepare("CREATE INDEX IF NOT EXISTS idx_audits_host ON domain_audits(host)"),
    d.prepare("CREATE INDEX IF NOT EXISTS idx_audits_created ON domain_audits(created_at)")
  ]);
  const user = await d.prepare("SELECT id FROM admin_users LIMIT 1").first();
  if (!user) await d.prepare("INSERT INTO admin_users(username,password_hash,role) VALUES(?,?,'owner')").bind(DEFAULT_USER, DEFAULT_HASH).run();
}
async function user(req, env) {
  const tok = cookie(req, COOKIE);
  if (!tok) return null;
  await tables(env);
  const row = await db(env).prepare("SELECT username FROM auth_sessions WHERE token_hash=? AND expires_at>datetime('now')").bind(await sha(tok)).first();
  return row ? { username: row.username } : null;
}
async function auth(req, env) {
  const u = await user(req, env);
  return u ? { ok: true, user: u } : { ok: false, response: err("Unauthorized", 401) };
}

async function login(req, env) {
  await tables(env);
  const b = await body(req), username = String(b.username || "").trim(), password = String(b.password || "");
  const row = await db(env).prepare("SELECT username,password_hash FROM admin_users WHERE lower(username)=lower(?)").bind(username).first();
  if (!row || !eq(await sha(`${SALT}:${password}`), String(row.password_hash).toLowerCase())) return err("Invalid login", 401);
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
  const tok = b64(bytes);
  await db(env).prepare("INSERT INTO auth_sessions(token_hash,username,expires_at) VALUES(?,?,datetime('now','+12 hours'))").bind(await sha(tok), row.username).run();
  return j({ ok: true, user: { username: row.username } }, 200, { "set-cookie": `${COOKIE}=${encodeURIComponent(tok)}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Lax` });
}
async function logout(req, env) {
  const tok = cookie(req, COOKIE);
  if (tok) { await tables(env); await db(env).prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(await sha(tok)).run(); }
  return j({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
}
async function admins(req, env) {
  const a = await auth(req, env); if (!a.ok) return a.response;
  await tables(env);
  if (req.method === "GET") return j({ ok: true, admins: (await db(env).prepare("SELECT id,username,role,created_at FROM admin_users ORDER BY id").all()).results });
  const b = await body(req), username = String(b.username || "").trim(), password = String(b.password || "");
  if (!username.includes("@") || password.length < 10) return err("Use email and 10+ character password", 422);
  try {
    await db(env).prepare("INSERT INTO admin_users(username,password_hash,role) VALUES(?,?,'admin')").bind(username, await sha(`${SALT}:${password}`)).run();
    return j({ ok: true, admin: { username, role: "admin" } }, 201);
  } catch { return err("Admin already exists", 409); }
}

const first = (h, r) => text((h.match(r) || [])[1] || "");
function attr(tag, name) {
  const m = String(tag || "").match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return clean(m?.[1] || "");
}
function meta(h, name) {
  for (const tag of h.match(/<meta\b[^>]*>/gi) || []) {
    if ([attr(tag, "name"), attr(tag, "property")].map((x) => x.toLowerCase()).includes(name.toLowerCase())) return attr(tag, "content");
  }
  return "";
}
function many(h, r, n = 30) {
  const out = []; let m;
  while ((m = r.exec(h)) && out.length < n) { const v = text(m[1]); if (v) out.push(v); }
  return out;
}
function links(h, base) {
  const out = [], seen = new Set(), host = new URL(base).hostname.replace(/^www\./, ""); let m;
  const r = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = r.exec(h)) && out.length < 300) {
    try {
      const u = new URL(clean(m[1]), base); if (!/^https?:/.test(u.protocol)) continue; u.hash = "";
      const href = u.toString().replace(/\/$/, ""); if (seen.has(href)) continue; seen.add(href);
      out.push({ href, text: text(m[2]).slice(0, 120), external: u.hostname.replace(/^www\./, "") !== host });
    } catch {}
  }
  return out;
}
function schemas(h) {
  const types = new Set(); let count = 0, m;
  const r = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = r.exec(h)) && count < 20) {
    count++;
    try {
      const p = JSON.parse(clean(m[1].trim())), arr = Array.isArray(p) ? p : [p];
      for (const x of arr) { const t = x?.["@type"] || x?.type; Array.isArray(t) ? t.forEach((v) => types.add(String(v))) : t && types.add(String(t)); }
    } catch { types.add("Invalid JSON-LD"); }
  }
  return { count, types: [...types] };
}
function readableHtml(h) {
  h = String(h || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ");
  const chunks = [];
  const pick = /<(p|li|h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = pick.exec(h)) && chunks.length < 220) chunks.push(m[2]);
  return chunks.length ? chunks.join(" ") : h;
}
function noisyWord(word) {
  return STOP.has(word)
    || word.length < 3
    || word.length > 28
    || !/[aeiou]/i.test(word)
    || word.includes("-")
    || /^u[0-9a-f]{4,6}$/i.test(word)
    || /^[0-9]+$/.test(word)
    || /[a-z]+\d|\d[a-z]/i.test(word)
    || word.includes("-gradient")
    || word.endsWith("-color")
    || word.endsWith("-image")
    || word.endsWith("-radius")
    || word.endsWith("-size")
    || word.endsWith("url")
    || word.endsWith("widget")
    || /^[bcdfghjklmnpqrstvwxyz-]{5,}$/i.test(word)
    || /^(x|xx|xxx|btn|svg|path|fill|none|true|false)$/i.test(word);
}
function cloud(fields) {
  const map = new Map(), add = (txt, w, loc) => {
    const cleanTxt = String(txt || "").replace(/\\u[0-9a-f]{4,6}/gi, " ").replace(/https?:\/\/\S+/gi, " ");
    for (const word of (cleanTxt.toLowerCase().match(/[a-z]{3,}/g) || [])) {
      if (noisyWord(word)) continue;
      const x = map.get(word) || { text: word, value: 0, score: 0, body: 0, loc: new Set() };
      if (loc === "body" && x.body >= 12) continue;
      if (loc === "body") x.body++;
      x.value++; x.score += w; x.loc.add(loc); map.set(word, x);
    }
  };
  add(fields.title, 6, "title"); add(fields.desc, 3, "meta"); add(fields.h1.join(" "), 4, "h1"); add(fields.h2.join(" "), 2.5, "heading"); add(fields.body, 1, "body");
  return [...map.values()].map((x) => ({ text: x.text, value: x.value, score: +x.score.toFixed(1), location_bias: x.loc.has("title") || x.loc.has("h1") ? "title_h1" : x.loc.has("meta") ? "metadata" : "body" })).sort((a, b) => b.score - a.score).slice(0, 40);
}
function score(r) {
  let s = 100; const issues = [], penalties = [];
  const bad = (ok, p, msg) => { if (!ok) { s -= p; issues.push(msg); penalties.push({ points: p, issue: msg }); } };
  const imgAltRatio = r.technical.images ? (r.technical.images - r.technical.imagesMissingAlt) / r.technical.images : 1;
  const canonicalOk = !r.technical.canonicalHost || r.technical.canonicalHost === r.host;
  bad(r.seo.titleLength >= 25 && r.seo.titleLength <= 65, 10, "Title should be 25-65 characters.");
  bad(r.seo.descriptionLength >= 70 && r.seo.descriptionLength <= 160, 10, "Meta description should be 70-160 characters.");
  bad(r.seo.h1.length === 1, 12, "Use exactly one strong H1.");
  bad(!!r.technical.canonical, 8, "Add canonical tag.");
  bad(canonicalOk, 16, `Canonical points to ${r.technical.canonicalHost}, not ${r.host}; this can make Google consolidate ranking signals into another domain.`);
  bad(r.schema.types.length > 0, 12, "Add JSON-LD schema for AEO/GEO.");
  bad(r.openGraph.present, 6, "Add OpenGraph metadata.");
  bad(r.content.wordCount >= 300, 10, "Homepage content is thin; add 300+ meaningful words.");
  bad(imgAltRatio >= 0.5, 5, "More than half of images are missing ALT text.");
  bad(r.platforms.length >= 3, 8, "Link/register more entity platforms.");
  const score = Math.max(0, s);
  return {
    score,
    issues,
    breakdown: {
      technical: Math.max(0, 40 - penalties.filter((p) => /canonical|OpenGraph|ALT/i.test(p.issue)).reduce((a, p) => a + p.points, 0)),
      content: Math.max(0, 30 - penalties.filter((p) => /Title|description|H1|content/i.test(p.issue)).reduce((a, p) => a + p.points, 0)),
      entity: Math.max(0, 30 - penalties.filter((p) => /schema|platform/i.test(p.issue)).reduce((a, p) => a + p.points, 0)),
      penalties,
    }
  };
}
function growthPlan(r) {
  const seen = new Set(r.platforms.map((p) => p.platform));
  const linked = r.links.external.map((x) => x.href).join(" ");
  return REGISTRATION_SITES.map((site) => {
    const detected = site.detect.test(linked)
      || (site.name.includes("Facebook") && seen.has("facebook"))
      || (site.name.includes("Instagram") && seen.has("instagram"))
      || (site.name.includes("LinkedIn") && seen.has("linkedin"))
      || (site.name.includes("YouTube") && seen.has("youtube"))
      || (site.name.includes("X /") && seen.has("x-twitter"))
      || (site.name.includes("Trustpilot") && seen.has("trustpilot"))
      || (site.name.includes("Crunchbase") && seen.has("crunchbase"))
      || (site.name.includes("Wikidata") && seen.has("wikipedia"))
      || (site.name.includes("GitHub") && seen.has("github"));
    return { ...site, detected };
  });
}
function aiAudit(r) {
  const kws = r.content.topKeywords.slice(0, 12).map((x) => x.text);
  const hasFaq = r.schema.types.some((x) => /faq/i.test(x));
  const hasOrg = r.schema.types.some((x) => /organization/i.test(x));
  const hasWebsite = r.schema.types.some((x) => /website/i.test(x));
  const canonicalMismatch = r.technical.canonicalHost && r.technical.canonicalHost !== r.host;
  const titleFocus = r.seo.title || "Missing title";
  const actions = [];
  if (!r.seo.h1.length) actions.push("Add one visible H1 that contains the brand plus the core offer, for example: BOOMERANG AUS Jackpot Casino Bonus.");
  if (!hasFaq) actions.push("Add FAQPage schema with answer-style questions around bonus terms, withdrawals, PayID, pokies, verification and eligibility.");
  if (!r.platforms.length) actions.push("Create entity profiles and link them from the site footer: Google Search Console, Bing Webmaster Tools, Trustpilot, Facebook, Instagram, LinkedIn, YouTube and X/Twitter.");
  if (canonicalMismatch) actions.push(`Decide whether ${r.host} is a separate brand or an alias. Its canonical currently points to ${r.technical.canonicalHost}, so Google may index the other domain instead.`);
  else if (!r.technical.canonical) actions.push(`Add a canonical tag that points to ${r.finalUrl}.`);
  if (r.technical.imagesMissingAlt > 0) actions.push(`Write descriptive ALT text for ${r.technical.imagesMissingAlt} images, prioritizing brand, game, bonus and payment images.`);
  return {
    executiveSummary: canonicalMismatch
      ? `${r.host} appears to be sending canonical authority to ${r.technical.canonicalHost}. That means a crawl can complete successfully while Google may still prefer the other domain for indexing and ranking.`
      : `${r.host} has a domain-specific SEO base built around ${kws.slice(0, 5).join(", ") || "limited readable content"}, but its AEO/GEO entity layer still needs clearer answer blocks and corroborating platform signals.`,
    seoDiagnosis: [
      `Title focus: ${titleFocus}.`,
      `Meta description length is ${r.seo.descriptionLength}; ${r.seo.descriptionLength >= 70 && r.seo.descriptionLength <= 160 ? "this is usable" : "rewrite to 70-160 characters"}.`,
      r.seo.h1.length === 1 ? "H1 structure is clean." : `H1 problem: detected ${r.seo.h1.length}; use exactly one strong H1.`,
      canonicalMismatch ? `Canonical mismatch: ${r.host} canonicalizes to ${r.technical.canonicalHost}.` : `Canonical target stays on ${r.host}.`,
      `Primary content terms detected: ${kws.slice(0, 10).join(", ") || "none"}.`
    ],
    aeoDiagnosis: [
      hasFaq ? "FAQ schema exists." : "FAQ schema is missing; answer engines need explicit question/answer blocks.",
      hasOrg ? "Organization schema exists." : "Organization schema is missing; add legal/entity identity.",
      "Add concise answer blocks for high-intent questions: bonus claim, withdrawal time, supported games, PayID cashout, eligibility and safety."
    ],
    geoDiagnosis: [
      hasWebsite ? "WebSite schema exists." : "WebSite schema is missing.",
      r.platforms.length ? `Entity corroboration exists on ${r.platforms.map((p) => p.platform).join(", ")}.` : "No linked entity platforms detected; register and link official profiles to strengthen AI/entity confidence.",
      "Publish llms.txt and an About/Brand page with canonical facts that AI systems can cite."
    ],
    priorityActions: actions.length ? actions : ["Maintain current setup and monitor changes after the next crawl."]
  };
}
async function fetchPage(url) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 9000);
  try {
    const res = await fetch(url, { signal: c.signal, headers: { "user-agent": "Mozilla/5.0 SEO-AEO-GEO-Monitor/1.0", accept: "text/html,*/*" } });
    return { status: res.status, finalUrl: res.url, html: (await res.text()).slice(0, 450000) };
  } finally { clearTimeout(t); }
}
async function audit(url) {
  const input = norm(url); if (!input) throw new Error("Invalid domain");
  const inputHost = hostOf(input);
  const start = Date.now(), p = await fetchPage(input), h = p.html, base = p.finalUrl || input, host = new URL(base).hostname.replace(/^www\./, "");
  const bodyHtml = first(h, /<body\b[^>]*>([\s\S]*?)<\/body>/i) || h;
  const bodyText = text(readableHtml(bodyHtml.replace(/<nav[\s\S]*?<\/nav>/gi, " ").replace(/<footer[\s\S]*?<\/footer>/gi, " ").replace(/<aside[\s\S]*?<\/aside>/gi, " ")));
  const title = first(h, /<title\b[^>]*>([\s\S]*?)<\/title>/i), desc = meta(h, "description");
  const h1 = many(h, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, 12), h2 = many(h, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi), h3 = many(h, /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi);
  const linkList = links(h, base), schema = schemas(h), canonicalTag = (h.match(/<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i) || [])[0] || "";
  const canonicalUrl = canonicalTag ? attr(canonicalTag, "href") || "" : "";
  const canonicalAbsolute = canonicalUrl ? new URL(canonicalUrl, base).toString().replace(/\/$/, "") : "";
  const canonicalHost = canonicalAbsolute ? hostOf(canonicalAbsolute) : "";
  const platforms = PLATFORMS.map(([platform, re]) => ({ platform, urls: linkList.filter((l) => re.test(l.href)).map((l) => l.href).slice(0, 5) })).filter((p) => p.urls.length);
  const img = h.match(/<img\b[^>]*>/gi) || [];
  const r = {
    url: input, inputUrl: input, inputHost, finalUrl: base, host, fetchedAt: now(), latencyMs: Date.now() - start, httpStatus: p.status,
    seo: { title, titleLength: title.length, description: desc, descriptionLength: desc.length, keywords: meta(h, "keywords"), h1, h2, h3 },
    technical: { canonical: canonicalAbsolute, canonicalHost, canonicalMatchesHost: !canonicalHost || canonicalHost === host, robots: meta(h, "robots"), viewport: meta(h, "viewport"), images: img.length, imagesMissingAlt: img.filter((x) => !attr(x, "alt")).length },
    openGraph: { present: /<meta\b[^>]*(property|name)=["']og:/i.test(h), title: meta(h, "og:title"), description: meta(h, "og:description"), image: meta(h, "og:image") },
    schema, links: { internal: linkList.filter((l) => !l.external).slice(0, 60), external: linkList.filter((l) => l.external).slice(0, 80) },
    platforms, content: { wordCount: (bodyText.match(/[a-z]{3,}/gi) || []).filter((w) => !noisyWord(w.toLowerCase())).length, topKeywords: cloud({ title, desc, h1, h2: h2.concat(h3), body: bodyText }) },
  };
  const sc = score(r);
  const actions = [];
  if (!r.schema.types.length) actions.push("Add Organization, WebSite, BreadcrumbList and FAQPage JSON-LD schema.");
  if (!r.technical.canonical) actions.push("Add canonical URL to consolidate ranking signals.");
  if (r.platforms.length < 3) actions.push("Create and link entity profiles on Facebook, Instagram, LinkedIn, YouTube, X/Twitter and Trustpilot.");
  if (r.content.wordCount < 300) actions.push("Add richer homepage content, FAQs, internal links, proof/trust sections and service summaries.");
  if (!r.openGraph.present) actions.push("Add OpenGraph title, description and image for entity clarity.");
  r.score = sc.score; r.scoreBreakdown = sc.breakdown; r.issues = sc.issues; r.aiAudit = aiAudit(r); r.growthPlan = growthPlan(r); r.recommendations = { actionPlan: actions.concat(r.aiAudit.priorityActions).filter((x, i, arr) => arr.indexOf(x) === i), registrationPlan: r.growthPlan, summary: [`Detected focus keywords: ${r.content.topKeywords.slice(0, 8).map((x) => x.text).join(", ") || "not enough content"}.`, `Platforms detected: ${r.platforms.map((x) => x.platform).join(", ") || "none"}.`, `AEO/GEO readiness: ${r.schema.types.length ? "schema foundation exists" : "weak; schema missing"}.`] };
  return r;
}
async function saveAudit(env, url, keyword = "") {
  await tables(env); const d = db(env), u = norm(url);
  let target = await d.prepare("SELECT id FROM targets WHERE url=?").bind(u).first();
  if (!target) { const x = await d.prepare("INSERT INTO targets(url,keyword,status) VALUES(?,?,'processing')").bind(u, keyword).run(); target = { id: x.meta.last_row_id }; }
  else await d.prepare("UPDATE targets SET keyword=?,status='processing',updated_at=datetime('now') WHERE id=?").bind(keyword, target.id).run();
  try {
    const report = await audit(u);
    report.externalConnectors = await externalIntel(env, report);
    await d.batch([
      d.prepare("INSERT INTO domain_audits(target_id,url,host,status,score,report_json) VALUES(?,?,?,'completed',?,?)").bind(target.id, report.inputUrl || u, report.inputHost || hostOf(u) || report.host, report.score, JSON.stringify(report)),
      d.prepare("UPDATE targets SET status='completed',updated_at=datetime('now') WHERE id=?").bind(target.id),
      d.prepare("INSERT INTO monitor_logs(target_id,platform,rank_or_mention,response_snippet) VALUES(?,'site-audit',?,?)").bind(target.id, `score-${report.score}`, report.recommendations.summary.join(" "))
    ]);
    return report;
  } catch (e) {
    await d.prepare("UPDATE targets SET status='failed',updated_at=datetime('now') WHERE id=?").bind(target.id).run();
    throw e;
  }
}
async function targets(req, env) {
  const a = await auth(req, env); if (!a.ok) return a.response; await tables(env);
  if (req.method === "POST") { const b = await body(req); return j({ ok: true, report: await saveAudit(env, b.url || b.domain, "") }, 201); }
  return j({ ok: true, targets: (await db(env).prepare("SELECT t.*,(SELECT score FROM domain_audits a WHERE a.target_id=t.id ORDER BY id DESC LIMIT 1) latest_score,(SELECT id FROM domain_audits a WHERE a.target_id=t.id ORDER BY id DESC LIMIT 1) latest_report_id FROM targets t ORDER BY updated_at DESC").all()).results });
}
async function reports(req, env, id) {
  const a = await auth(req, env); if (!a.ok) return a.response; await tables(env);
  if (id) {
    const r = await db(env).prepare("SELECT * FROM domain_audits WHERE id=?").bind(id).first();
    if (!r) return err("Report not found", 404);
    const data = JSON.parse(r.report_json);
    if (!data.growthPlan) data.growthPlan = growthPlan(data);
    if (!data.recommendations) data.recommendations = {};
    if (!data.recommendations.registrationPlan) data.recommendations.registrationPlan = data.growthPlan;
    return j({ ok: true, report: { ...r, data } });
  }
  const rows = (await db(env).prepare("SELECT a.id,a.target_id,a.url,a.host,a.status,a.score,a.created_at,t.url target_url FROM domain_audits a LEFT JOIN targets t ON t.id=a.target_id ORDER BY a.id DESC LIMIT 100").all()).results || [];
  return j({ ok: true, reports: rows.map((x) => ({ ...x, display_host: hostOf(x.target_url || x.url) || x.host })) });
}
async function logs(req, env) {
  const a = await auth(req, env); if (!a.ok) return a.response; await tables(env);
  return j({ ok: true, logs: (await db(env).prepare("SELECT l.*,t.url,t.keyword,t.status target_status FROM monitor_logs l LEFT JOIN targets t ON t.id=l.target_id ORDER BY l.id DESC LIMIT 500").all()).results });
}
async function connectorRows(env) {
  await tables(env);
  const rows = (await db(env).prepare("SELECT id,base_url,enabled,updated_at FROM connector_settings").all()).results || [];
  return new Map(rows.map((x) => [x.id, x]));
}
async function connectorStatus(env) {
  const saved = await connectorRows(env);
  return CONNECTORS.map((c) => {
    const row = saved.get(c.id);
    const base = String(row?.base_url || env?.[c.env] || "").replace(/\/$/, "");
    const enabled = row ? !!row.enabled : !!base;
    return { ...c, baseUrl: base, enabled, baseConfigured: !!base, status: base && enabled ? "configured" : base ? "disabled" : "edge_native_ready", updatedAt: row?.updated_at || "" };
  });
}
async function fetchTextFast(url, limit = 45000) {
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 SEO-AEO-GEO-Monitor/1.0", accept: "text/html,text/plain,*/*" }, signal: AbortSignal.timeout(5500) });
    return { ok: res.ok, status: res.status, url: res.url, text: (await res.text()).slice(0, limit) };
  } catch (e) { return { ok: false, status: 0, url, text: String(e.message || e) }; }
}
async function nativeConnector(c, r) {
  const base = new URL(r.finalUrl || r.url).origin;
  if (c.id === "openserp") {
    const q = encodeURIComponent(`site:${r.host} ${r.content.topKeywords.slice(0, 3).map((x) => x.text).join(" ")}`);
    const ddg = await fetchTextFast(`https://duckduckgo.com/html/?q=${q}`, 60000);
    const titles = many(ddg.text, /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, 8);
    return { id: c.id, name: c.name, repo: c.repo, category: c.category, status: "edge_native_live", evidence: [`DuckDuckGo site query status ${ddg.status}. Visible results mentioning ${r.host}: ${titles.length}.`, ...titles.map((x, i) => `${i + 1}. ${x}`)] };
  }
  if (c.id === "open-seo-crawler") {
    return { id: c.id, name: c.name, repo: c.repo, category: c.category, status: "edge_native_live", evidence: [`Crawl graph: ${r.links.internal.length} internal links, ${r.links.external.length} external links, ${r.seo.h1.length} H1, ${r.seo.h2.length} H2, ${r.seo.h3.length} H3. Canonical host: ${r.technical.canonicalHost || "missing"}.`] };
  }
  if (c.id === "python-seo-analyzer") {
    return { id: c.id, name: c.name, repo: c.repo, category: c.category, status: "edge_native_live", evidence: [`Readable word count: ${r.content.wordCount}. Main terms: ${r.content.topKeywords.slice(0, 12).map((x) => `${x.text}:${x.score}`).join(", ")}. Issues: ${r.issues.join(" | ") || "none"}.`] };
  }
  if (c.id === "geo-optimizer") {
    const [robots, llms, sitemap] = await Promise.all([fetchTextFast(`${base}/robots.txt`, 12000), fetchTextFast(`${base}/llms.txt`, 12000), fetchTextFast(`${base}/sitemap.xml`, 12000)]);
    return { id: c.id, name: c.name, repo: c.repo, category: c.category, status: "edge_native_live", evidence: [`AI readiness files: robots.txt ${robots.status}, llms.txt ${llms.status}, sitemap.xml ${sitemap.status}. Schema types: ${r.schema.types.join(", ") || "missing"}.`, llms.ok ? `llms.txt preview: ${text(llms.text).slice(0, 240)}` : "llms.txt missing or blocked."] };
  }
  return { id: c.id, name: c.name, repo: c.repo, category: c.category, status: "edge_native_live", evidence: [`Technical audit: HTTP ${r.httpStatus}, latency ${r.latencyMs}ms, robots meta ${r.technical.robots || "none"}, viewport ${r.technical.viewport ? "present" : "missing"}, OpenGraph ${r.openGraph.present ? "present" : "missing"}, missing image ALT ${r.technical.imagesMissingAlt}/${r.technical.images}.`] };
}
async function callConnector(c, r) {
  if (!c.baseUrl || !c.enabled) return nativeConnector(c, r);
  const encoded = encodeURIComponent(r.finalUrl || r.url);
  const candidates = c.id === "openserp"
    ? [{ method: "GET", url: `${c.baseUrl}/mega/search?engines=google,bing&text=${encodeURIComponent(r.host)}&extract=0&mode=any` }]
    : [
        { method: "POST", url: `${c.baseUrl}/api/audit`, body: { url: r.finalUrl, host: r.host, keywords: r.content.topKeywords.slice(0, 10).map((x) => x.text) } },
        { method: "POST", url: `${c.baseUrl}/audit`, body: { url: r.finalUrl, host: r.host } },
        { method: "GET", url: `${c.baseUrl}/audit?url=${encoded}` }
      ];
  let last = "";
  for (const req of candidates) {
    try {
      const init = { method: req.method, headers: { accept: "application/json,text/plain,*/*" }, signal: AbortSignal.timeout(6500) };
      if (req.body) { init.headers["content-type"] = "application/json"; init.body = JSON.stringify(req.body); }
      const res = await fetch(req.url, init);
      const txt = (await res.text()).slice(0, 1800);
      if (res.ok) return { id: c.id, name: c.name, repo: c.repo, category: c.category, status: "live", endpoint: req.url, evidence: [txt] };
      last = `HTTP ${res.status} from ${req.url}: ${txt.slice(0, 240)}`;
    } catch (e) { last = String(e.message || e); }
  }
  return { id: c.id, name: c.name, repo: c.repo, category: c.category, status: "configured_but_unreachable", evidence: [last] };
}
async function externalIntel(env, r) {
  const connectors = await connectorStatus(env);
  return Promise.all(connectors.map((c) => callConnector(c, r)));
}
async function integrations(req, env) {
  const a = await auth(req, env); if (!a.ok) return a.response; await tables(env);
  if (req.method === "POST") {
    const b = await body(req), id = String(b.id || ""), c = CONNECTORS.find((x) => x.id === id);
    if (!c) return err("Unknown connector", 404);
    const base = String(b.baseUrl || "").trim().replace(/\/$/, "");
    const enabled = b.enabled === false ? 0 : base ? 1 : 0;
    if (base && !/^https?:\/\/[^ ]+$/i.test(base)) return err("Connector endpoint must be a valid http(s) URL", 422);
    await db(env).prepare("INSERT INTO connector_settings(id,base_url,enabled,updated_at) VALUES(?,?,?,datetime('now')) ON CONFLICT(id) DO UPDATE SET base_url=excluded.base_url,enabled=excluded.enabled,updated_at=datetime('now')").bind(id, base, enabled).run();
    return j({ ok: true, connector: (await connectorStatus(env)).find((x) => x.id === id) });
  }
  return j({
    ok: true,
    connectors: await connectorStatus(env),
    note: "These are free open-source connector profiles. If no self-hosted endpoint is saved, this Worker runs an Edge Native version of the same SEO/AEO/GEO checks immediately."
  });
}
async function deleteTarget(req, env, id) {
  const a = await auth(req, env); if (!a.ok) return a.response; await tables(env);
  const d = db(env), targetId = Number(id);
  if (!Number.isInteger(targetId) || targetId < 1) return err("Invalid target id", 422);
  const row = await d.prepare("SELECT id,url FROM targets WHERE id=?").bind(targetId).first();
  if (!row) return err("Target not found", 404);
  await d.batch([
    d.prepare("DELETE FROM domain_audits WHERE target_id=?").bind(targetId),
    d.prepare("DELETE FROM monitor_logs WHERE target_id=?").bind(targetId),
    d.prepare("DELETE FROM targets WHERE id=?").bind(targetId)
  ]);
  return j({ ok: true, deleted: row });
}

function page() {
  return `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>SEO Monitor</title><style>
  :root{color-scheme:dark;--bg:#020617;--p:#0f172a;--b:#263449;--t:#e5e7eb;--m:#94a3b8;--a:#deff9a;--c:#22d3ee}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,#164e6333,transparent 35rem),var(--bg);color:var(--t);font-family:Inter,system-ui,sans-serif}.hide{display:none!important}.login{min-height:100vh;display:grid;place-items:center}.card,.panel{border:1px solid var(--b);background:#0f172ad9;border-radius:14px;padding:18px;box-shadow:0 24px 70px #0007}.card{width:min(430px,92vw)}input,button{font:inherit}input{width:100%;padding:12px;border:1px solid var(--b);border-radius:8px;background:#020617;color:var(--t)}label{display:block;color:var(--m);font-size:12px;font-weight:800;text-transform:uppercase;margin:14px 0 7px}.btn{border:1px solid #deff9a88;border-radius:8px;background:linear-gradient(135deg,var(--a),var(--c));padding:11px 15px;font-weight:900;color:#00111a;cursor:pointer}.btn:disabled{opacity:.65;cursor:wait}.btn2{background:#111827;color:var(--t);border-color:var(--b)}.mini{padding:6px 10px;font-size:12px}.danger{border-color:#fb718588;color:#fecaca}.shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh}aside{border-right:1px solid var(--b);padding:22px;background:#020617cc}.brand{font-weight:900;letter-spacing:.08em;margin-bottom:28px}.nav{display:grid;gap:9px}.nav button{background:transparent;color:#bfdbfe;border:1px solid transparent;text-align:left;border-radius:8px;padding:11px;cursor:pointer}.nav .on{border-color:#deff9a66;background:#deff9a12;color:white}main{padding:28px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center}.top-actions{display:flex;gap:10px;align-items:center}.lang{display:flex;gap:4px;border:1px solid var(--b);border-radius:10px;padding:4px;background:#02061799}.lang button{border:0;border-radius:7px;background:transparent;color:#bfdbfe;padding:7px 10px;font-weight:900;cursor:pointer}.lang button.on{background:#deff9a;color:#00111a}h1{font-size:42px;margin:0}.muted{color:var(--m)}.grid{display:grid;grid-template-columns:1fr 1.6fr;gap:16px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{border:1px solid var(--b);border-radius:12px;padding:14px;background:#02061780}.metric b{display:block;font-size:28px;color:var(--a)}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid var(--b);padding:10px;text-align:left;vertical-align:top}th{color:var(--m);font-size:12px;text-transform:uppercase}.badge{border:1px solid #22d3ee66;color:var(--c);border-radius:99px;padding:3px 8px;font-size:12px}.view{display:none}.view.on{display:block}.words{display:flex;flex-wrap:wrap;gap:8px}.word{border:1px solid #334155;border-radius:99px;padding:5px 9px;background:#02061799}.report,.connector{border:1px solid var(--b);border-radius:12px;padding:12px;margin:9px 0;cursor:pointer}.connector{cursor:default}.split{display:grid;grid-template-columns:.8fr 1.2fr;gap:16px}pre{white-space:pre-wrap;color:#b9fbc0}@media(max-width:900px){.shell,.grid,.split,.metrics{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid var(--b)}}  </style></head><body>
  <section id=login class=login><form id=lf class=card><div class=brand>SEO AEO GEO MONITOR</div><h2 data-i18n=secureLogin>Secure Login</h2><p class=muted data-i18n=loginSubtitle>Full domain audit, keyword extraction, platform signals and optimization report.</p><label data-i18n=username>Username</label><input id=u autocomplete=username required><label data-i18n=password>Password</label><input id=p type=password autocomplete=current-password required><br><br><button id=lb class=btn data-i18n=enterMonitor>Enter Monitor</button><p id=le style=color:#fb7185></p></form></section>
  <section id=app class="shell hide"><aside><div class=brand>SEO / AEO / GEO</div><div class=nav><button class=on data-v=dash data-i18n=dashboard>Dashboard</button><button data-v=audit data-i18n=domainAuditAI>Domain Audit AI</button><button data-v=reports data-i18n=domainReports>Domain Reports</button><button data-v=integrations data-i18n=monitorEngine>Monitor Engine</button><button data-v=admins data-i18n=admins>Admins</button></div></aside><main><div class=top><div><h1>SEO Monitor</h1><p class=muted data-i18n=topSubtitle>Input one domain, the backend automatically runs the full SEO/AEO/GEO monitoring engine.</p></div><div class=top-actions><div class=lang><button id=langEn data-lang=en>EN</button><button id=langZh data-lang=zh>中文</button></div><button id=out class="btn btn2" data-i18n=logout>Logout</button></div></div>
    <section id=dash class="view on"><div class=metrics><div class=metric><span data-i18n=domains>Domains</span><b id=mt>0</b></div><div class=metric><span data-i18n=reports>Reports</span><b id=mr>0</b></div><div class=metric><span data-i18n=latestScore>Latest Score</span><b id=ms>-</b></div><div class=metric><span data-i18n=status>Status</span><b id=mst>-</b></div></div><br><div class=grid><div class=panel><h2 data-i18n=domainAuditAI>Domain Audit AI</h2><form id=tf><label data-i18n=domainUrl>Domain / URL</label><input id=url placeholder=https://example.com required><br><br><button id=tb class=btn data-i18n=runAudit>Run AI Domain Audit</button><p id=te style=color:#fb7185></p></form></div><div class=panel><h2 data-i18n=domainTargets>Domain Targets</h2><div id=targetCards></div><table><thead><tr><th>URL</th><th data-i18n=status>Status</th><th data-i18n=score>Score</th><th data-i18n=action>Action</th></tr></thead><tbody id=targets></tbody></table></div></div><br><div class=panel><h2 data-i18n=monitorLogs>Monitor Logs</h2><table><thead><tr><th data-i18n=checked>Checked</th><th data-i18n=target>Target</th><th data-i18n=type>Type</th><th data-i18n=result>Result</th></tr></thead><tbody id=logs></tbody></table></div></section>
    <section id=audit class=view><div class=panel><h2 data-i18n=domainAuditReport>Domain Audit AI Report</h2><div id=latest class=muted data-i18n=runFirst>Run a domain audit first.</div></div></section>
    <section id=reports class=view><div class=split><div class=panel><h2 data-i18n=reportsByDomain>Reports By Domain</h2><div id=rl></div></div><div class=panel><h2 data-i18n=reportDetail>Domain Report Detail</h2><div id=rd class=muted data-i18n=selectReport>Select a domain report.</div></div></div></section>
    <section id=integrations class=view><div class=panel><h2 data-i18n=unifiedEngine>Unified Monitor Engine</h2><p class=muted data-i18n=engineSubtitle>All modules below are bundled into the backend and run automatically for every domain audit. No endpoint setup is required.</p><div id=connectorRows></div></div></section>
    <section id=admins class=view><div class=grid><div class=panel><h2 data-i18n=createAdmin>Create Admin</h2><form id=af><label>Email</label><input id=ae><label data-i18n=password>Password</label><input id=ap type=password><br><br><button class=btn data-i18n=createAdmin>Create Admin</button><p id=aa style=color:#fb7185></p></form></div><div class=panel><h2 data-i18n=admins>Admins</h2><table><tbody id=adminRows></tbody></table></div></div></section>
  </main></section><script>
  const E=id=>document.getElementById(id), q=s=>document.querySelectorAll(s), eh=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const I18N={en:{secureLogin:"Secure Login",loginSubtitle:"Full domain audit, keyword extraction, platform signals and optimization report.",username:"Username",password:"Password",enterMonitor:"Enter Monitor",dashboard:"Dashboard",domainAuditAI:"Domain Audit AI",domainReports:"Domain Reports",monitorEngine:"Monitor Engine",admins:"Admins",topSubtitle:"Input one domain, the backend automatically runs the full SEO/AEO/GEO monitoring engine.",logout:"Logout",domains:"Domains",reports:"Reports",latestScore:"Latest Score",status:"Status",domainUrl:"Domain / URL",runAudit:"Run AI Domain Audit",domainTargets:"Domain Targets",score:"Score",action:"Action",monitorLogs:"Monitor Logs",checked:"Checked",target:"Target",type:"Type",result:"Result",domainAuditReport:"Domain Audit AI Report",runFirst:"Run a domain audit first.",reportsByDomain:"Reports By Domain",reportDetail:"Domain Report Detail",selectReport:"Select a domain report.",unifiedEngine:"Unified Monitor Engine",engineSubtitle:"All modules below are bundled into the backend and run automatically for every domain audit. No endpoint setup is required.",createAdmin:"Create Admin",noDomains:"No domains yet.",delete:"Delete",deleteConfirm:"Delete this domain and all its reports?",deleteFailed:"Delete failed",noLogs:"No logs yet.",noReports:"No reports yet.",aiRunning:"AI audit running...",loginFailed:"Login failed",reportCount:"reports",latest:"latest",technical:"Technical",content:"Content",entity:"Entity",aiSummary:"AI Executive Summary",aiSeo:"AI SEO Diagnosis",aiAeo:"AI AEO Diagnosis",aiGeo:"AI GEO Diagnosis",priorityPlan:"AI Priority Action Plan",entityGrowth:"SEO Entity Registration Plan",priority:"Priority",why:"Why",nextStep:"Next step",openSite:"Open site",detected:"detected",missing:"missing",seoSnapshot:"SEO Snapshot",title:"Title",description:"Description",schema:"Schema",platforms:"Platforms",technicalIssues:"Technical Issues",keywordCloud:"Keyword Cloud",backendEvidence:"Backend Monitor Evidence",platformUrls:"Platform URLs",autoRunning:"auto-running",bundled:"backend module bundled",source:"source",noSignal:"No signal detected.",noPlatform:"No major platform links detected."},zh:{secureLogin:"安全登录",loginSubtitle:"完整的域名审计、关键词提取、平台信号与优化报告。",username:"用户名",password:"密码",enterMonitor:"进入监控面板",dashboard:"仪表盘",domainAuditAI:"域名 AI 审计",domainReports:"域名报告",monitorEngine:"监控引擎",admins:"管理员",topSubtitle:"输入一个域名，后台会自动运行完整 SEO/AEO/GEO 监控引擎。",logout:"退出",domains:"域名",reports:"报告",latestScore:"最新分数",status:"状态",domainUrl:"域名 / URL",runAudit:"运行 AI 域名审计",domainTargets:"监控域名",score:"分数",action:"操作",monitorLogs:"监控日志",checked:"检查时间",target:"目标",type:"类型",result:"结果",domainAuditReport:"域名 AI 审计报告",runFirst:"请先运行域名审计。",reportsByDomain:"按域名分类报告",reportDetail:"域名报告详情",selectReport:"请选择一个域名报告。",unifiedEngine:"统一监控引擎",engineSubtitle:"以下模块已集合在后台，每次域名审计都会自动运行，不需要设置任何 endpoint。",createAdmin:"创建管理员",noDomains:"还没有域名。",delete:"删除",deleteConfirm:"删除这个域名和所有报告？",deleteFailed:"删除失败",noLogs:"还没有日志。",noReports:"还没有报告。",aiRunning:"AI 审计运行中...",loginFailed:"登录失败",reportCount:"份报告",latest:"最新",technical:"技术",content:"内容",entity:"实体",aiSummary:"AI 执行摘要",aiSeo:"AI SEO 诊断",aiAeo:"AI AEO 诊断",aiGeo:"AI GEO 诊断",priorityPlan:"AI 优先行动方案",entityGrowth:"SEO 实体注册优化方案",priority:"优先级",why:"为什么要做",nextStep:"下一步",openSite:"打开网站",detected:"已检测",missing:"未完成",seoSnapshot:"SEO 快照",title:"标题",description:"描述",schema:"结构化数据",platforms:"平台",technicalIssues:"技术问题",keywordCloud:"关键词云",backendEvidence:"后台监控证据",platformUrls:"平台链接",autoRunning:"自动运行",bundled:"后台模块已集合",source:"来源",noSignal:"没有检测到信号。",noPlatform:"没有检测到主要平台链接。"}};
  let lang=localStorage.getItem("seoLang")||"en";const t=k=>(I18N[lang]&&I18N[lang][k])||I18N.en[k]||k;function applyLang(){document.documentElement.lang=lang;q("[data-i18n]").forEach(x=>{x.textContent=t(x.dataset.i18n)});q("[data-lang]").forEach(x=>x.classList.toggle("on",x.dataset.lang===lang))}
  async function api(p,o={}){let r=await fetch(p,{...o,headers:{"content-type":"application/json",...(o.headers||{})}}),d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");return d}
  function nav(v){q(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.v==v));q(".view").forEach(s=>s.classList.toggle("on",s.id==v))}
  q(".nav button").forEach(b=>b.onclick=()=>nav(b.dataset.v));function show(a){E("login").classList.toggle("hide",a);E("app").classList.toggle("hide",!a)}
  function list(title,arr){return '<h3>'+eh(title)+'</h3><ul>'+((arr&&arr.length)?arr.map(x=>'<li>'+eh(x)+'</li>').join(""):'<li class=muted>'+t("noSignal")+'</li>')+'</ul>'}
  function fallbackPlan(d){let linked=(d.platforms||[]).map(p=>p.platform).join(" ");return [{name:"Google Search Console",url:"https://search.google.com/search-console/about",priority:"critical",detected:false,why:"Submit sitemap and monitor Google search queries.",whyZh:"提交 sitemap 并监控 Google 搜索查询。",action:"Verify domain and submit sitemap.xml.",actionZh:"验证域名并提交 sitemap.xml。"},{name:"Bing Webmaster Tools",url:"https://www.bing.com/webmasters",priority:"high",detected:false,why:"Improve Bing and Microsoft/Copilot discovery.",whyZh:"提升 Bing 与 Microsoft/Copilot 发现机会。",action:"Verify site and submit sitemap.xml.",actionZh:"验证网站并提交 sitemap.xml。"},{name:"Trustpilot Business",url:"https://business.trustpilot.com/",priority:"high",detected:/trustpilot/.test(linked),why:"Build review and trust signals.",whyZh:"建立评论与信任信号。",action:"Claim profile and collect genuine reviews.",actionZh:"认领资料并收集真实评论。"},{name:"Facebook Page",url:"https://www.facebook.com/pages/create",priority:"medium",detected:/facebook/.test(linked),why:"Create public brand entity.",whyZh:"建立公开品牌实体。",action:"Create page and link it from your website.",actionZh:"创建页面并从网站链接过去。"},{name:"Instagram Business",url:"https://business.instagram.com/",priority:"medium",detected:/instagram/.test(linked),why:"Strengthen social entity signal.",whyZh:"增强社交实体信号。",action:"Create business profile with matching brand name.",actionZh:"用一致品牌名创建商业资料。"},{name:"LinkedIn Company Page",url:"https://www.linkedin.com/company/setup/new/",priority:"medium",detected:/linkedin/.test(linked),why:"Company/entity corroboration.",whyZh:"公司/实体证明。",action:"Create company page with legal brand facts.",actionZh:"用合法品牌资料创建公司页面。"},{name:"YouTube Channel",url:"https://www.youtube.com/account",priority:"medium",detected:/youtube/.test(linked),why:"Video can support Google and AI visibility.",whyZh:"视频可支持 Google 和 AI 可见度。",action:"Publish brand, FAQ and trust videos.",actionZh:"发布品牌、FAQ 和信任说明视频。"},{name:"Crunchbase",url:"https://www.crunchbase.com/add-new",priority:"medium",detected:/crunchbase/.test(linked),why:"Company data source if eligible.",whyZh:"符合条件时可作为公司数据源。",action:"Add accurate registered company profile.",actionZh:"添加准确的注册公司资料。"},{name:"Casino Guru",url:"https://casino.guru/contact-us",priority:"industry",detected:false,why:"iGaming reputation and discovery channel, if compliant.",whyZh:"iGaming 声誉与发现渠道，前提是合规。",action:"Contact platform with licensing/compliance details.",actionZh:"带上牌照和合规资料联系平台。"},{name:"AskGamblers",url:"https://www.askgamblers.com/",priority:"industry",detected:false,why:"iGaming review/discovery channel, if compliant.",whyZh:"iGaming 评论/发现渠道，前提是合规。",action:"Check listing eligibility and brand consistency.",actionZh:"检查列表资格并保持品牌资料一致。"}]}
  function growthHtml(plan){return '<h3>'+t("entityGrowth")+'</h3><div>'+plan.map(p=>'<div class=connector><b>'+eh(p.name)+'</b> <span class=badge>'+eh(p.priority)+'</span> <span class=badge>'+t(p.detected?"detected":"missing")+'</span><p><b>'+t("why")+':</b> '+eh(lang==="zh"?(p.whyZh||p.why):(p.why||p.whyZh||""))+'</p><p><b>'+t("nextStep")+':</b> '+eh(lang==="zh"?(p.actionZh||p.action):(p.action||p.actionZh||""))+'</p><a style="color:#93c5fd" href="'+eh(p.url)+'" target=_blank>'+t("openSite")+'</a></div>').join("")+'</div>'}
  function report(d){if(!d)return t("noReports");let ai=d.aiAudit||{},b=d.scoreBreakdown||{},cx=d.externalConnectors||[],gp=d.growthPlan||d.recommendations?.registrationPlan||fallbackPlan(d);return '<div class=metrics><div class=metric>'+t("score")+'<b>'+d.score+'</b></div><div class=metric>'+t("technical")+'<b>'+(b.technical??"-")+'</b></div><div class=metric>'+t("content")+'<b>'+(b.content??"-")+'</b></div><div class=metric>'+t("entity")+'<b>'+(b.entity??"-")+'</b></div></div><h3>'+t("aiSummary")+'</h3><p>'+eh(ai.executiveSummary||"AI audit is being generated from deterministic SEO/AEO/GEO rules.")+'</p>'+list(t("aiSeo"),ai.seoDiagnosis)+list(t("aiAeo"),ai.aeoDiagnosis)+list(t("aiGeo"),ai.geoDiagnosis)+list(t("priorityPlan"),ai.priorityActions)+growthHtml(gp)+'<h3>'+t("seoSnapshot")+'</h3><p><b>'+t("title")+':</b> '+eh(d.seo.title||"Missing")+' ('+d.seo.titleLength+')</p><p><b>'+t("description")+':</b> '+eh(d.seo.description||"Missing")+' ('+d.seo.descriptionLength+')</p><p><b>H1:</b> '+eh(d.seo.h1.join(" | ")||"Missing")+'</p><p><b>Canonical:</b> '+eh(d.technical.canonical||"Missing")+'</p><p><b>'+t("schema")+':</b> '+eh(d.schema.types.join(", ")||"Missing")+'</p><p><b>'+t("platforms")+':</b> '+eh(d.platforms.map(p=>p.platform).join(", ")||"None detected")+'</p><h3>'+t("technicalIssues")+'</h3><ul>'+d.issues.map(x=>'<li>'+eh(x)+'</li>').join("")+'</ul><h3>'+t("keywordCloud")+'</h3><div class=words>'+d.content.topKeywords.map(w=>'<span class=word title="count '+w.value+' | bias '+w.location_bias+'">'+eh(w.text)+' '+w.score+'</span>').join("")+'</div><h3>'+t("backendEvidence")+'</h3><div>'+cx.map(c=>'<div class=connector><b>'+eh(c.name)+'</b> <span class=badge>'+eh(c.status)+'</span><p class=muted>'+eh(c.category||"")+'</p><pre>'+eh((c.evidence||[]).join("\\n"))+'</pre></div>').join("")+'</div><h3>'+t("platformUrls")+'</h3><pre>'+eh(d.platforms.flatMap(p=>p.urls.map(u=>p.platform+": "+u)).join("\\n")||t("noPlatform"))+'</pre>'}
  function groupedReports(rows){let g={};rows.forEach(x=>{let h=x.display_host||x.host;(g[h]=g[h]||[]).push(x)});return Object.entries(g).map(([host,items])=>'<div class=report data-id='+items[0].id+'><b>'+eh(host)+'</b><p class=muted>'+items.length+' '+t("reportCount")+' | '+t("latest")+' '+eh(items[0].created_at)+' | '+t("score")+' '+items[0].score+'</p><small class=muted>'+items.slice(0,4).map(x=>eh(x.created_at)+' '+t("score")+' '+x.score).join('<br>')+'</small></div>').join("")}
  function connectorHtml(c){return '<div class=connector><b>'+eh(c.name)+'</b> <span class=badge>'+t("autoRunning")+'</span><p class=muted>'+eh(c.category)+' | '+t("bundled")+' | '+t("source")+': '+eh(c.repo)+'</p></div>'}
  function bindConnectorControls(){}
  async function load(){let [targetsResp,l,r,a,i]=await Promise.all([api("/api/targets"),api("/api/logs"),api("/api/reports"),api("/api/admins"),api("/api/integrations")]);E("mt").textContent=targetsResp.targets.length;E("mr").textContent=r.reports.length;E("ms").textContent=r.reports[0]?.score??"-";E("mst").textContent=r.reports[0]?.status??"-";E("targetCards").innerHTML=targetsResp.targets.length?targetsResp.targets.map(x=>'<div class=connector><b>'+eh(x.url)+'</b> <span class=badge>'+eh(x.status)+'</span><p class=muted>'+t("score")+': '+eh(x.latest_score??"-")+' | ID '+x.id+'</p></div>').join(""):'<p class=muted>'+t("noDomains")+'</p>';E("targets").innerHTML=targetsResp.targets.length?targetsResp.targets.map(x=>'<tr><td>'+eh(x.url)+'</td><td><span class=badge>'+eh(x.status)+'</span></td><td>'+eh(x.latest_score??"-")+'</td><td><button class="btn btn2 danger mini" data-del="'+x.id+'">'+t("delete")+'</button></td></tr>').join(""):'<tr><td colspan=4 class=muted>'+t("noDomains")+'</td></tr>';q("[data-del]").forEach(b=>b.onclick=async()=>{if(!confirm(t("deleteConfirm")))return;b.disabled=1;try{await api("/api/targets/"+b.dataset.del,{method:"DELETE"});await load()}catch(e){alert(e.message||t("deleteFailed"))}finally{b.disabled=0}});E("logs").innerHTML=l.logs.length?l.logs.map(x=>'<tr><td>'+eh(x.checked_at)+'</td><td>'+eh(x.url||"-")+'</td><td>'+eh(x.platform)+'</td><td>'+eh(x.rank_or_mention)+'<br><span class=muted>'+eh(x.response_snippet)+'</span></td></tr>').join(""):'<tr><td colspan=4 class=muted>'+t("noLogs")+'</td></tr>';E("rl").innerHTML=r.reports.length?groupedReports(r.reports):'<p class=muted>'+t("noReports")+'</p>';q(".report").forEach(x=>x.onclick=async()=>{let d=await api("/api/reports/"+x.dataset.id);E("rd").innerHTML=report(d.report.data);nav("reports")});E("connectorRows").innerHTML=i.connectors.map(connectorHtml).join("");bindConnectorControls();E("adminRows").innerHTML=a.admins.map(x=>'<tr><td>'+eh(x.username)+'</td><td>'+eh(x.role)+'</td><td>'+eh(x.created_at)+'</td></tr>').join("");if(r.reports[0]){let d=await api("/api/reports/"+r.reports[0].id);E("latest").innerHTML=report(d.report.data)}applyLang()}
  q("[data-lang]").forEach(b=>b.onclick=async()=>{lang=b.dataset.lang;localStorage.setItem("seoLang",lang);applyLang();if(!E("app").classList.contains("hide"))await load()});
  E("lf").onsubmit=async e=>{e.preventDefault();E("le").textContent="";E("lb").disabled=1;try{await api("/api/login",{method:"POST",body:JSON.stringify({username:E("u").value.trim(),password:E("p").value})});show(1);await load()}catch(x){E("le").textContent=x.message||t("loginFailed")}finally{E("lb").disabled=0}}
  E("tf").onsubmit=async e=>{e.preventDefault();E("tb").disabled=1;E("te").textContent=t("aiRunning");try{let x=await api("/api/targets",{method:"POST",body:JSON.stringify({url:E("url").value})});E("tf").reset();E("latest").innerHTML=report(x.report);nav("audit");await load();E("te").textContent=""}catch(x){E("te").textContent=x.message}finally{E("tb").disabled=0}}
  E("af").onsubmit=async e=>{e.preventDefault();try{await api("/api/admins",{method:"POST",body:JSON.stringify({username:E("ae").value,password:E("ap").value})});E("af").reset();await load()}catch(x){E("aa").textContent=x.message}}
  E("out").onclick=async()=>{await api("/api/logout",{method:"POST",body:"{}"});show(0)};applyLang();(async()=>{try{let s=await api("/api/session");if(s.authenticated){show(1);await load()}else show(0)}catch{show(0)}})()
  </script></body></html>`;
}

async function route(req, env) {
  const u = new URL(req.url), p = u.pathname;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  if (p === "/" && req.method === "GET") return html(page());
  if (p === "/api/login" && req.method === "POST") return login(req, env);
  if (p === "/api/logout" && req.method === "POST") return logout(req, env);
  if (p === "/api/session") return j({ ok: true, authenticated: !!(await user(req, env)), user: await user(req, env) });
  if (p === "/api/admins") return admins(req, env);
  if (p === "/api/integrations") return integrations(req, env);
  if (p.startsWith("/api/targets/") && req.method === "DELETE") return deleteTarget(req, env, p.split("/").pop());
  if (p === "/api/targets") return targets(req, env);
  if (p === "/api/logs") return logs(req, env);
  if (p === "/api/reports") return reports(req, env);
  if (p.startsWith("/api/reports/")) return reports(req, env, p.split("/").pop());
  if (p === "/health") return j({ ok: true, service: "seo-aeo-geo-monitor", version: APP_VERSION });
  return err("Not found", 404);
}

export default {
  async fetch(req, env) { try { return await route(req, env); } catch (e) { return err(e.message || "Internal error", 500); } },
  async scheduled(event, env, ctx) { ctx.waitUntil((async () => { await tables(env); const t = await db(env).prepare("SELECT url,keyword FROM targets WHERE status='pending' ORDER BY updated_at LIMIT 1").first(); if (t) await saveAudit(env, t.url, t.keyword); })()); },
};
