const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const COOKIE = "seo_monitor_session";
const SALT = "seo-monitor-admin-v1";
const DEFAULT_USER = "admin@seomonitor.app";
const DEFAULT_HASH = "b0e7d521a39a77a1cbcd37fefd979919bb33f38dbe948edfb6be2d7cb76cdf02";
const STOP = new Set("about above after again all also and are because been before being below both but can click contact copyright could details does down each from have having here home into just learn login menu more only other our page please privacy read search site than that the their them then there these they this those through under using view was were what when where which while with your null true false undefined function const return async await class window document script style html body data image icon content width height href https http src var let json".split(" "));
const PLATFORMS = [
  ["facebook", /facebook\.com/i], ["instagram", /instagram\.com/i], ["x-twitter", /(twitter\.com|x\.com)/i],
  ["linkedin", /linkedin\.com/i], ["youtube", /youtube\.com/i], ["tiktok", /tiktok\.com/i],
  ["telegram", /t\.me|telegram\.me/i], ["reddit", /reddit\.com/i], ["trustpilot", /trustpilot\.com/i],
  ["crunchbase", /crunchbase\.com/i], ["wikipedia", /wikipedia\.org/i], ["github", /github\.com/i],
];

const j = (x, s = 200, h = {}) => new Response(JSON.stringify(x), { status: s, headers: { ...H, ...h, "content-type": "application/json;charset=utf-8" } });
const html = (x) => new Response(x, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store" } });
const err = (m, s = 400) => j({ ok: false, error: m }, s);
const db = (env) => env.seo_monitor_db || env.DB;
const now = () => new Date().toISOString();
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
function cloud(fields) {
  const map = new Map(), add = (txt, w, loc) => {
    for (const word of (String(txt || "").toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [])) {
      if (STOP.has(word) || word.length > 28 || /^u[0-9a-f]{4}$/i.test(word) || /^[0-9]+$/.test(word)) continue;
      const x = map.get(word) || { text: word, value: 0, score: 0, loc: new Set() };
      x.value++; x.score += w; x.loc.add(loc); map.set(word, x);
    }
  };
  add(fields.title, 6, "title"); add(fields.desc, 3, "meta"); add(fields.h1.join(" "), 4, "h1"); add(fields.h2.join(" "), 2.5, "heading"); add(fields.body, 1, "body");
  return [...map.values()].map((x) => ({ text: x.text, value: x.value, score: +x.score.toFixed(1), location_bias: x.loc.has("title") || x.loc.has("h1") ? "title_h1" : x.loc.has("meta") ? "metadata" : "body" })).sort((a, b) => b.score - a.score).slice(0, 40);
}
function score(r) {
  let s = 100; const issues = [], bad = (ok, p, msg) => { if (!ok) { s -= p; issues.push(msg); } };
  bad(r.seo.titleLength >= 25 && r.seo.titleLength <= 65, 10, "Title should be 25-65 characters.");
  bad(r.seo.descriptionLength >= 70 && r.seo.descriptionLength <= 160, 10, "Meta description should be 70-160 characters.");
  bad(r.seo.h1.length === 1, 10, "Use exactly one strong H1.");
  bad(!!r.technical.canonical, 8, "Add canonical tag.");
  bad(r.schema.types.length > 0, 12, "Add JSON-LD schema for AEO/GEO.");
  bad(r.openGraph.present, 8, "Add OpenGraph metadata.");
  bad(r.content.wordCount >= 300, 10, "Homepage content is thin; add 300+ meaningful words.");
  bad(r.platforms.length >= 3, 6, "Link/register more entity platforms.");
  return { score: Math.max(0, s), issues };
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
  const start = Date.now(), p = await fetchPage(input), h = p.html, base = p.finalUrl || input, host = new URL(base).hostname.replace(/^www\./, "");
  const bodyHtml = first(h, /<body\b[^>]*>([\s\S]*?)<\/body>/i) || h;
  const bodyText = text(bodyHtml.replace(/<nav[\s\S]*?<\/nav>/gi, " ").replace(/<footer[\s\S]*?<\/footer>/gi, " "));
  const title = first(h, /<title\b[^>]*>([\s\S]*?)<\/title>/i), desc = meta(h, "description");
  const h1 = many(h, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, 12), h2 = many(h, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi), h3 = many(h, /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi);
  const linkList = links(h, base), schema = schemas(h), canonicalTag = (h.match(/<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i) || [])[0] || "";
  const platforms = PLATFORMS.map(([platform, re]) => ({ platform, urls: linkList.filter((l) => re.test(l.href)).map((l) => l.href).slice(0, 5) })).filter((p) => p.urls.length);
  const img = h.match(/<img\b[^>]*>/gi) || [];
  const r = {
    url: input, finalUrl: base, host, fetchedAt: now(), latencyMs: Date.now() - start, httpStatus: p.status,
    seo: { title, titleLength: title.length, description: desc, descriptionLength: desc.length, keywords: meta(h, "keywords"), h1, h2, h3 },
    technical: { canonical: canonicalTag ? attr(canonicalTag, "href") || true : "", robots: meta(h, "robots"), viewport: meta(h, "viewport"), images: img.length, imagesMissingAlt: img.filter((x) => !attr(x, "alt")).length },
    openGraph: { present: /<meta\b[^>]*(property|name)=["']og:/i.test(h), title: meta(h, "og:title"), description: meta(h, "og:description"), image: meta(h, "og:image") },
    schema, links: { internal: linkList.filter((l) => !l.external).slice(0, 60), external: linkList.filter((l) => l.external).slice(0, 80) },
    platforms, content: { wordCount: (bodyText.match(/[a-z0-9][a-z0-9-]{2,}/gi) || []).length, topKeywords: cloud({ title, desc, h1, h2: h2.concat(h3), body: bodyText }) },
  };
  const sc = score(r);
  const actions = [];
  if (!r.schema.types.length) actions.push("Add Organization, WebSite, BreadcrumbList and FAQPage JSON-LD schema.");
  if (!r.technical.canonical) actions.push("Add canonical URL to consolidate ranking signals.");
  if (r.platforms.length < 3) actions.push("Create and link entity profiles on Facebook, Instagram, LinkedIn, YouTube, X/Twitter and Trustpilot.");
  if (r.content.wordCount < 300) actions.push("Add richer homepage content, FAQs, internal links, proof/trust sections and service summaries.");
  if (!r.openGraph.present) actions.push("Add OpenGraph title, description and image for entity clarity.");
  r.score = sc.score; r.issues = sc.issues; r.recommendations = { actionPlan: actions, summary: [`Detected focus keywords: ${r.content.topKeywords.slice(0, 8).map((x) => x.text).join(", ") || "not enough content"}.`, `Platforms detected: ${r.platforms.map((x) => x.platform).join(", ") || "none"}.`, `AEO/GEO readiness: ${r.schema.types.length ? "schema foundation exists" : "weak; schema missing"}.`] };
  return r;
}
async function saveAudit(env, url, keyword = "") {
  await tables(env); const d = db(env), u = norm(url);
  let target = await d.prepare("SELECT id FROM targets WHERE url=?").bind(u).first();
  if (!target) { const x = await d.prepare("INSERT INTO targets(url,keyword,status) VALUES(?,?,'processing')").bind(u, keyword).run(); target = { id: x.meta.last_row_id }; }
  else await d.prepare("UPDATE targets SET keyword=?,status='processing',updated_at=datetime('now') WHERE id=?").bind(keyword, target.id).run();
  try {
    const report = await audit(u);
    await d.batch([
      d.prepare("INSERT INTO domain_audits(target_id,url,host,status,score,report_json) VALUES(?,?,?,'completed',?,?)").bind(target.id, report.finalUrl, report.host, report.score, JSON.stringify(report)),
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
  if (req.method === "POST") { const b = await body(req); return j({ ok: true, report: await saveAudit(env, b.url || b.domain, String(b.keyword || "")) }, 201); }
  return j({ ok: true, targets: (await db(env).prepare("SELECT t.*,(SELECT score FROM domain_audits a WHERE a.target_id=t.id ORDER BY id DESC LIMIT 1) latest_score,(SELECT id FROM domain_audits a WHERE a.target_id=t.id ORDER BY id DESC LIMIT 1) latest_report_id FROM targets t ORDER BY updated_at DESC").all()).results });
}
async function reports(req, env, id) {
  const a = await auth(req, env); if (!a.ok) return a.response; await tables(env);
  if (id) { const r = await db(env).prepare("SELECT * FROM domain_audits WHERE id=?").bind(id).first(); return r ? j({ ok: true, report: { ...r, data: JSON.parse(r.report_json) } }) : err("Report not found", 404); }
  return j({ ok: true, reports: (await db(env).prepare("SELECT id,target_id,url,host,status,score,created_at FROM domain_audits ORDER BY id DESC LIMIT 100").all()).results });
}
async function logs(req, env) {
  const a = await auth(req, env); if (!a.ok) return a.response; await tables(env);
  return j({ ok: true, logs: (await db(env).prepare("SELECT l.*,t.url,t.keyword,t.status target_status FROM monitor_logs l LEFT JOIN targets t ON t.id=l.target_id ORDER BY l.id DESC LIMIT 500").all()).results });
}

function page() {
  return `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>SEO Monitor</title><style>
  :root{color-scheme:dark;--bg:#020617;--p:#0f172a;--b:#263449;--t:#e5e7eb;--m:#94a3b8;--a:#deff9a;--c:#22d3ee}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,#164e6333,transparent 35rem),var(--bg);color:var(--t);font-family:Inter,system-ui,sans-serif}.hide{display:none}.login{min-height:100vh;display:grid;place-items:center}.card,.panel{border:1px solid var(--b);background:#0f172ad9;border-radius:14px;padding:18px;box-shadow:0 24px 70px #0007}.card{width:min(430px,92vw)}input,button{font:inherit}input{width:100%;padding:12px;border:1px solid var(--b);border-radius:8px;background:#020617;color:var(--t)}label{display:block;color:var(--m);font-size:12px;font-weight:800;text-transform:uppercase;margin:14px 0 7px}.btn{border:1px solid #deff9a88;border-radius:8px;background:linear-gradient(135deg,var(--a),var(--c));padding:11px 15px;font-weight:900;color:#00111a;cursor:pointer}.btn2{background:#111827;color:var(--t);border-color:var(--b)}.shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh}aside{border-right:1px solid var(--b);padding:22px;background:#020617cc}.brand{font-weight:900;letter-spacing:.08em;margin-bottom:28px}.nav{display:grid;gap:9px}.nav button{background:transparent;color:#bfdbfe;border:1px solid transparent;text-align:left;border-radius:8px;padding:11px;cursor:pointer}.nav .on{border-color:#deff9a66;background:#deff9a12;color:white}main{padding:28px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center}h1{font-size:42px;margin:0}.muted{color:var(--m)}.grid{display:grid;grid-template-columns:1fr 1.6fr;gap:16px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{border:1px solid var(--b);border-radius:12px;padding:14px;background:#02061780}.metric b{display:block;font-size:28px;color:var(--a)}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid var(--b);padding:10px;text-align:left;vertical-align:top}th{color:var(--m);font-size:12px;text-transform:uppercase}.badge{border:1px solid #22d3ee66;color:var(--c);border-radius:99px;padding:3px 8px;font-size:12px}.view{display:none}.view.on{display:block}.words{display:flex;flex-wrap:wrap;gap:8px}.word{border:1px solid #334155;border-radius:99px;padding:5px 9px;background:#02061799}.report{border:1px solid var(--b);border-radius:12px;padding:12px;margin:9px 0;cursor:pointer}.split{display:grid;grid-template-columns:.8fr 1.2fr;gap:16px}pre{white-space:pre-wrap;color:#b9fbc0}@media(max-width:900px){.shell,.grid,.split,.metrics{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid var(--b)}}  </style></head><body>
  <section id=login class=login><form id=lf class=card><div class=brand>SEO AEO GEO MONITOR</div><h2>Secure Login</h2><p class=muted>Full domain audit, keyword extraction, platform signals and optimization report.</p><label>Username</label><input id=u required><label>Password</label><input id=p type=password required><br><br><button class=btn>Enter Monitor</button><p id=le style=color:#fb7185></p></form></section>
  <section id=app class="shell hide"><aside><div class=brand>SEO / AEO / GEO</div><div class=nav><button class=on data-v=dash>Dashboard</button><button data-v=audit>Domain Audit</button><button data-v=reports>Reports</button><button data-v=admins>Admins</button></div></aside><main><div class=top><div><h1>SEO Monitor</h1><p class=muted>Input domain, get crawl data, keyword cloud, platform signals and action report.</p></div><button id=out class="btn btn2">Logout</button></div>
    <section id=dash class="view on"><div class=metrics><div class=metric>Targets<b id=mt>0</b></div><div class=metric>Reports<b id=mr>0</b></div><div class=metric>Latest Score<b id=ms>-</b></div><div class=metric>Status<b id=mst>-</b></div></div><br><div class=grid><div class=panel><h2>Analyze Domain</h2><form id=tf><label>Domain / URL</label><input id=url placeholder=https://example.com required><label>Optional keyword</label><input id=kw placeholder="brand or money keyword"><br><br><button id=tb class=btn>Analyze SEO</button><p id=te style=color:#fb7185></p></form></div><div class=panel><h2>Targets</h2><table><thead><tr><th>URL</th><th>Keyword</th><th>Status</th><th>Score</th></tr></thead><tbody id=targets></tbody></table></div></div><br><div class=panel><h2>Monitor Logs</h2><table><thead><tr><th>Checked</th><th>Target</th><th>Type</th><th>Result</th></tr></thead><tbody id=logs></tbody></table></div></section>
    <section id=audit class=view><div class=panel><h2>Latest Domain Report</h2><div id=latest class=muted>Run an audit first.</div></div></section>
    <section id=reports class=view><div class=split><div class=panel><h2>Saved Reports</h2><div id=rl></div></div><div class=panel><h2>Report Detail</h2><div id=rd class=muted>Select a report.</div></div></div></section>
    <section id=admins class=view><div class=grid><div class=panel><h2>Create Admin</h2><form id=af><label>Email</label><input id=ae><label>Password</label><input id=ap type=password><br><br><button class=btn>Create Admin</button><p id=aa style=color:#fb7185></p></form></div><div class=panel><h2>Admins</h2><table><tbody id=adminRows></tbody></table></div></div></section>
  </main></section><script>
  const E=id=>document.getElementById(id), q=s=>document.querySelectorAll(s), eh=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  async function api(p,o={}){let r=await fetch(p,{...o,headers:{"content-type":"application/json",...(o.headers||{})}}),d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");return d}
  function nav(v){q(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.v==v));q(".view").forEach(s=>s.classList.toggle("on",s.id==v))}
  q(".nav button").forEach(b=>b.onclick=()=>nav(b.dataset.v));function show(a){E("login").classList.toggle("hide",a);E("app").classList.toggle("hide",!a)}
  function report(d){if(!d)return"No report yet";return '<div class=metrics><div class=metric>Score<b>'+d.score+'</b></div><div class=metric>Words<b>'+d.content.wordCount+'</b></div><div class=metric>Schemas<b>'+d.schema.types.length+'</b></div><div class=metric>Platforms<b>'+d.platforms.length+'</b></div></div><h3>SEO Snapshot</h3><p><b>Title:</b> '+eh(d.seo.title||"Missing")+' ('+d.seo.titleLength+')</p><p><b>Description:</b> '+eh(d.seo.description||"Missing")+' ('+d.seo.descriptionLength+')</p><p><b>H1:</b> '+eh(d.seo.h1.join(" | ")||"Missing")+'</p><p><b>Schema:</b> '+eh(d.schema.types.join(", ")||"Missing")+'</p><p><b>Platforms:</b> '+eh(d.platforms.map(p=>p.platform).join(", ")||"None detected")+'</p><h3>Optimization Action Plan</h3><ul>'+d.recommendations.actionPlan.map(x=>'<li>'+eh(x)+'</li>').join("")+'</ul><h3>Issues</h3><ul>'+d.issues.map(x=>'<li>'+eh(x)+'</li>').join("")+'</ul><h3>Keyword Cloud</h3><div class=words>'+d.content.topKeywords.map(w=>'<span class=word title="count '+w.value+'">'+eh(w.text)+' '+w.score+'</span>').join("")+'</div><h3>Platform URLs</h3><pre>'+eh(d.platforms.flatMap(p=>p.urls.map(u=>p.platform+": "+u)).join("\\n")||"No major platform links detected.")+'</pre>'}
  async function load(){let [t,l,r,a]=await Promise.all([api("/api/targets"),api("/api/logs"),api("/api/reports"),api("/api/admins")]);E("mt").textContent=t.targets.length;E("mr").textContent=r.reports.length;E("ms").textContent=r.reports[0]?.score??"-";E("mst").textContent=r.reports[0]?.status??"-";E("targets").innerHTML=t.targets.length?t.targets.map(x=>'<tr><td>'+eh(x.url)+'</td><td>'+eh(x.keyword||"-")+'</td><td><span class=badge>'+eh(x.status)+'</span></td><td>'+eh(x.latest_score??"-")+'</td></tr>').join(""):'<tr><td colspan=4 class=muted>No targets yet.</td></tr>';E("logs").innerHTML=l.logs.length?l.logs.map(x=>'<tr><td>'+eh(x.checked_at)+'</td><td>'+eh(x.url||"-")+'</td><td>'+eh(x.platform)+'</td><td>'+eh(x.rank_or_mention)+'<br><span class=muted>'+eh(x.response_snippet)+'</span></td></tr>').join(""):'<tr><td colspan=4 class=muted>No logs yet.</td></tr>';E("rl").innerHTML=r.reports.length?r.reports.map(x=>'<div class=report data-id='+x.id+'><b>'+eh(x.host)+'</b><p class=muted>'+eh(x.created_at)+' | score '+x.score+'</p></div>').join(""):'<p class=muted>No reports yet.</p>';q(".report").forEach(x=>x.onclick=async()=>{let d=await api("/api/reports/"+x.dataset.id);E("rd").innerHTML=report(d.report.data);nav("reports")});E("adminRows").innerHTML=a.admins.map(x=>'<tr><td>'+eh(x.username)+'</td><td>'+eh(x.role)+'</td><td>'+eh(x.created_at)+'</td></tr>').join("");if(r.reports[0]){let d=await api("/api/reports/"+r.reports[0].id);E("latest").innerHTML=report(d.report.data)}}
  E("lf").onsubmit=async e=>{e.preventDefault();try{await api("/api/login",{method:"POST",body:JSON.stringify({username:E("u").value,password:E("p").value})});show(1);await load()}catch(x){E("le").textContent=x.message}}
  E("tf").onsubmit=async e=>{e.preventDefault();E("tb").disabled=1;E("te").textContent="Analyzing...";try{let x=await api("/api/targets",{method:"POST",body:JSON.stringify({url:E("url").value,keyword:E("kw").value})});E("tf").reset();E("latest").innerHTML=report(x.report);nav("audit");await load();E("te").textContent=""}catch(x){E("te").textContent=x.message}finally{E("tb").disabled=0}}
  E("af").onsubmit=async e=>{e.preventDefault();try{await api("/api/admins",{method:"POST",body:JSON.stringify({username:E("ae").value,password:E("ap").value})});E("af").reset();await load()}catch(x){E("aa").textContent=x.message}}
  E("out").onclick=async()=>{await api("/api/logout",{method:"POST",body:"{}"});show(0)};(async()=>{try{let s=await api("/api/session");if(s.authenticated){show(1);await load()}else show(0)}catch{show(0)}})()
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
  if (p === "/api/targets") return targets(req, env);
  if (p === "/api/logs") return logs(req, env);
  if (p === "/api/reports") return reports(req, env);
  if (p.startsWith("/api/reports/")) return reports(req, env, p.split("/").pop());
  if (p === "/health") return j({ ok: true, service: "seo-aeo-geo-monitor" });
  return err("Not found", 404);
}

export default {
  async fetch(req, env) { try { return await route(req, env); } catch (e) { return err(e.message || "Internal error", 500); } },
  async scheduled(event, env, ctx) { ctx.waitUntil((async () => { await tables(env); const t = await db(env).prepare("SELECT url,keyword FROM targets WHERE status='pending' ORDER BY updated_at LIMIT 1").first(); if (t) await saveAudit(env, t.url, t.keyword); })()); },
};
