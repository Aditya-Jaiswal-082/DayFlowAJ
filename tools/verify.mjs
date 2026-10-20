/**
 * Repo self-check — `npm run verify`.
 *
 * Catches the class of mistakes a test suite can't: a JSX tag that never closes,
 * an import that points at a moved file, a named import that isn't exported, a
 * circular dependency, an unused import left behind by a refactor, an export
 * nothing calls any more, a hook behind an `if`, and a broken link in the docs.
 *
 * No dependencies — it walks the source itself, converts JSX to plain JS and
 * hands that to `node --check`.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, "/");
const problems = [];
const note = (m) => problems.push(m);

/* ── walk ──────────────────────────────────────────────────────────────── */

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.jsx?$/.test(p)) files.push(p);
  }
})(SRC);

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Read and strip once — the checks below cross-reference every file against
    every other one, so re-reading from disk each time is O(n²) on I/O. */
const raw = new Map(files.map((f) => [f, fs.readFileSync(f, "utf8")]));
const bare = new Map(files.map((f) => [f, stripComments(raw.get(f))]));

/* ── JSX → JS, so node can parse it ────────────────────────────────────── */

function matchBrace(s, i) {
  let depth = 0;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (c === "/" && s[k + 1] === "/") { while (k < s.length && s[k] !== "\n") k++; continue; }
    if (c === "/" && s[k + 1] === "*") { k += 2; while (k < s.length && !(s[k] === "*" && s[k + 1] === "/")) k++; k++; continue; }
    if (c === '"' || c === "'" || c === "`") {
      const q = c; k++;
      while (k < s.length) { if (s[k] === "\\") k++; else if (s[k] === q) break; k++; }
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return k; }
  }
  return -1;
}

const wrap = (expr) => {
  const t = stripComments(expr).trim();
  if (!t) return "0";
  return t.startsWith("...") ? t : `(${t})`;
};

function parseElement(s, i, file) {
  let j = i + 1;
  let name = "";
  while (/[A-Za-z0-9._]/.test(s[j] || "")) { name += s[j]; j++; }   // "" => fragment

  const parts = [];
  let selfClosing = false;
  let last = "";

  while (j < s.length) {
    const c = s[j];
    if (c === '"' || c === "'") {
      const q = c; j++;
      while (j < s.length) { if (s[j] === "\\") j++; else if (s[j] === q) break; j++; }
      j++; last = '"'; continue;
    }
    if (c === "{") {
      const end = matchBrace(s, j);
      if (end < 0) throw new Error(`${file}: unmatched attribute brace near line ${s.slice(0, j).split("\n").length}`);
      parts.push(convert(s.slice(j + 1, end), file));
      j = end + 1; last = "}"; continue;
    }
    if (c === ">") { selfClosing = last === "/"; j++; break; }
    if (!/\s/.test(c)) last = c;
    j++;
  }

  if (!selfClosing) {
    let closed = false;
    while (j < s.length) {
      if (s[j] === "<" && s[j + 1] === "/") {
        let k = j + 2;
        let closing = "";
        while (/[A-Za-z0-9._]/.test(s[k] || "")) { closing += s[k]; k++; }
        while (k < s.length && s[k] !== ">") k++;
        if (closing !== name) {
          throw new Error(`${file}: </${closing}> closes <${name || "fragment"}> (line ${s.slice(0, j).split("\n").length})`);
        }
        j = k + 1; closed = true; break;
      }
      if (s[j] === "<" && (/[A-Za-z]/.test(s[j + 1] || "") || s[j + 1] === ">")) {
        const child = parseElement(s, j, file);
        parts.push(child.js);
        j = child.end;
        continue;
      }
      if (s[j] === "{") {
        const end = matchBrace(s, j);
        if (end < 0) throw new Error(`${file}: unmatched child brace`);
        parts.push(convert(s.slice(j + 1, end), file));
        j = end + 1;
        continue;
      }
      j++;
    }
    if (!closed) throw new Error(`${file}: <${name || "fragment"}> is never closed (line ${s.slice(0, i).split("\n").length})`);
  }

  return { end: j, js: `[${parts.map(wrap).join(",")}]` };
}

function convert(s, file) {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const n = s[i + 1];
    if (c === "/" && n === "/") { const k = s.indexOf("\n", i); const e = k < 0 ? s.length : k; out += s.slice(i, e); i = e; continue; }
    if (c === "/" && n === "*") { const k = s.indexOf("*/", i + 2); out += s.slice(i, k + 2); i = k + 2; continue; }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      let k = i + 1;
      while (k < s.length) { if (s[k] === "\\") { k += 2; continue; } if (s[k] === q) { k++; break; } k++; }
      out += s.slice(i, k); i = k; continue;
    }
    if (c === "<" && (/[A-Za-z]/.test(n || "") || n === ">")) {
      const el = parseElement(s, i, file);
      out += el.js; i = el.end; continue;
    }
    out += c; i++;
  }
  return out;
}

/* ── 1. syntax ─────────────────────────────────────────────────────────── */

const tmp = path.join(ROOT, "node_modules", ".verify-tmp");
fs.mkdirSync(tmp, { recursive: true });
let clean = 0;

for (const f of files) {
  let js;
  try {
    js = convert(raw.get(f), rel(f));
  } catch (e) {
    note(`JSX  ${e.message}`);
    continue;
  }
  const out = path.join(tmp, rel(f).replace(/[/\\.]/g, "_") + ".mjs");
  fs.writeFileSync(out, js);
  try {
    execFileSync(process.execPath, ["--check", out], { stdio: "pipe" });
    clean++;
  } catch (e) {
    const first = String(e.stderr).split("\n").find((l) => /Error/.test(l)) || "parse error";
    note(`SYNTAX  ${rel(f)}: ${first.trim()}`);
  }
}

/* ── 2. exports map ────────────────────────────────────────────────────── */

const exportsOf = new Map();
for (const f of files) {
  const src = bare.get(f);
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    m[1].split(",").forEach((piece) => {
      const t = piece.trim().split(/\s+as\s+/).pop().trim();
      if (t) names.add(t);
    });
  }
  if (/export\s+default/.test(src)) names.add("default");
  exportsOf.set(path.resolve(f), names);
}

/* ── 3. imports resolve, and export what's asked for ───────────────────── */

const graph = new Map();
const externals = new Set();

for (const f of files) {
  const src = bare.get(f);
  const deps = [];
  const re = /import\s+([\s\S]*?)\s+from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;

  for (const m of src.matchAll(re)) {
    const clause = m[1] || "";
    const spec = m[2] || m[3];
    if (!spec.startsWith(".")) { externals.add(spec); continue; }

    let abs = path.resolve(path.dirname(f), spec);
    if (!fs.existsSync(abs)) {
      const hit = [abs + ".js", abs + ".jsx", path.join(abs, "index.js"), path.join(abs, "index.jsx")]
        .find((c) => fs.existsSync(c));
      if (!hit) { note(`MISSING FILE  "${spec}" imported by ${rel(f)}`); continue; }
      abs = hit;
    }
    if (/\.css$/.test(abs)) continue;

    deps.push(abs);
    const available = exportsOf.get(abs) || new Set();
    const trimmed = clause.trim();
    const named = clause.match(/\{([^}]*)\}/);

    if (trimmed && !trimmed.startsWith("{") && !trimmed.startsWith("*") && !available.has("default")) {
      note(`NO DEFAULT EXPORT  "${spec}" (imported by ${rel(f)})`);
    }
    if (named) {
      named[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean).forEach((n) => {
        if (!available.has(n)) note(`NOT EXPORTED  "${n}" from "${spec}" (imported by ${rel(f)})`);
      });
    }
  }
  graph.set(path.resolve(f), deps);
}

/* ── 4. circular imports ───────────────────────────────────────────────── */

const state = new Map();
const cycles = [];
const dfs = (n, stack) => {
  if (state.get(n) === 1) { cycles.push([...stack.slice(stack.indexOf(n)), n].map(rel).join(" → ")); return; }
  if (state.get(n) === 2) return;
  state.set(n, 1); stack.push(n);
  for (const d of graph.get(n) || []) dfs(d, stack);
  stack.pop(); state.set(n, 2);
};
for (const n of graph.keys()) dfs(n, []);
cycles.forEach((c) => note(`CIRCULAR  ${c}`));

/* ── 5. components used in JSX are in scope ────────────────────────────── */

for (const f of files) {
  const src = bare.get(f);
  const defined = new Set(["React"]);
  for (const m of src.matchAll(/function\s+([A-Z][\w$]*)/g)) defined.add(m[1]);
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Z][\w$]*)/g)) defined.add(m[1]);
  for (const m of src.matchAll(/(?:const|let|var)\s*[{[]([^}\]]*)[}\]]\s*=/g)) {
    m[1].split(",").forEach((piece) => {
      const t = piece.trim().split(":").pop().trim();
      if (/^[A-Z]/.test(t)) defined.add(t);
    });
  }
  for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from/g)) {
    const clause = m[1];
    const named = clause.match(/\{([^}]*)\}/);
    if (named) named[1].split(",").forEach((p) => { const t = p.trim().split(/\s+as\s+/).pop().trim(); if (t) defined.add(t); });
    const def = clause.trim().match(/^([A-Za-z_$][\w$]*)/);
    if (def && !clause.trim().startsWith("{")) defined.add(def[1]);
  }
  for (const used of new Set([...src.matchAll(/<([A-Z][\w$.]*)/g)].map((m) => m[1].split(".")[0]))) {
    if (!defined.has(used)) note(`UNDEFINED COMPONENT  <${used}> in ${rel(f)}`);
  }
}

/* ── 6. hooks behind a condition ───────────────────────────────────────── */

for (const f of files) {
  raw.get(f).split("\n").forEach((line, i) => {
    const bare = line.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
    if (/^\s*(if|for|while)\s*\([^)]*\)\s*\{?\s*(const|let)?\s*.*\buse[A-Z]\w*\(/.test(bare)) {
      note(`CONDITIONAL HOOK  ${rel(f)}:${i + 1}`);
    }
  });
}

/* ── 7. unused imports and locals ──────────────────────────────────────── */

const countWord = (hay, name) => {
  let n = 0;
  let i = 0;
  const word = /[A-Za-z0-9_$]/;
  while ((i = hay.indexOf(name, i)) !== -1) {
    const before = hay[i - 1];
    const after = hay[i + name.length];
    if (!(before && word.test(before)) && !(after && word.test(after))) n++;
    i += name.length;
  }
  return n;
};

for (const f of files) {
  const src = bare.get(f);
  const body = src
    .replace(/^import[\s\S]*?from\s*["'][^"']+["'];?$/gm, "")
    .replace(/^import\s*["'][^"']+["'];?$/gm, "");

  for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from\s*["'][^"']+["']/g)) {
    const clause = m[1];
    const names = [];
    const named = clause.match(/\{([^}]*)\}/);
    if (named) named[1].split(",").forEach((p) => { const t = p.trim().split(/\s+as\s+/).pop().trim(); if (t) names.push(t); });
    const def = clause.trim().match(/^([A-Za-z_$][\w$]*)/);
    if (def && !clause.trim().startsWith("{")) names.push(def[1]);
    names.forEach((n) => { if (countWord(body, n) === 0) note(`UNUSED IMPORT  ${rel(f)}: ${n}`); });
  }

  for (const m of body.matchAll(/^(?!export)(?:const|function)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (countWord(body, m[1]) < 2) note(`UNUSED LOCAL  ${rel(f)}: ${m[1]}`);
  }
}

/* ── 8. exports nothing uses ───────────────────────────────────────────── */

const testSrc = fs.existsSync(path.join(ROOT, "tests"))
  ? fs.readdirSync(path.join(ROOT, "tests")).map((f) => fs.readFileSync(path.join(ROOT, "tests", f), "utf8")).join("\n")
  : "";

for (const f of files) {
  const own = bare.get(f);
  for (const name of exportsOf.get(path.resolve(f))) {
    if (name === "default") continue;
    const usedElsewhere = files.some((g) => g !== f && countWord(bare.get(g), name) > 0);
    const usedInOwnFile = countWord(own, name) > 1;
    const usedInTests = countWord(testSrc, name) > 0;
    if (!usedElsewhere && !usedInOwnFile && !usedInTests) {
      note(`DEAD EXPORT  ${rel(f)}: ${name}`);
    }
  }
}

/* ── 9. dependencies declared ──────────────────────────────────────────── */

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const declared = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
for (const spec of externals) {
  const base = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
  if (base.startsWith("node:")) continue;
  if (!declared.has(base)) note(`UNDECLARED DEPENDENCY  "${base}" is imported but not in package.json`);
}

/* ── 10. tabs registered, docs link somewhere real ─────────────────────── */

const registry = fs.readFileSync(path.join(SRC, "tabs/index.js"), "utf8");
for (const tabFile of fs.readdirSync(path.join(SRC, "tabs")).filter((f) => /Tab\.jsx$/.test(f))) {
  if (!registry.includes(tabFile.replace(".jsx", ""))) note(`TAB NOT REGISTERED  ${tabFile}`);
}

for (const doc of ["README.md", "docs/ARCHITECTURE.md"]) {
  const p = path.join(ROOT, doc);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, "utf8");
  const dir = path.dirname(p);
  for (const m of src.matchAll(/\]\((?!https?:|#)([^)]+)\)/g)) {
    const target = m[1].split("#")[0];
    if (!target || /docs\/screenshots\/.+\.png$/.test(target)) continue;
    if (!fs.existsSync(path.resolve(dir, target))) note(`BROKEN DOC LINK  ${doc} → ${target}`);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public/manifest.webmanifest"), "utf8"));
manifest.icons.forEach((icon) => {
  if (!fs.existsSync(path.join(ROOT, "public", icon.src))) note(`MISSING ICON  ${icon.src}`);
});

/* ── report ────────────────────────────────────────────────────────────── */

fs.rmSync(tmp, { recursive: true, force: true });

console.log(`files: ${files.length}   syntax clean: ${clean}   external deps: ${[...externals].join(", ")}`);
if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  problems.forEach((p) => console.error(` - ${p}`));
  process.exit(1);
}
console.log("no problems found");
