#!/usr/bin/env node
/**
 * 编目校验（Node 版，替代 validate.py——构建环境只需 Node，Cloudflare Pages 可直接跑）。
 *
 * 运行：node scripts/validate.mjs
 * 亦由 `npm run build` 的 prebuild 自动执行。
 *
 * 规则
 * ----
 *   E1 (ERROR) orig_lang 非 zh* 开头，且无 expression.lang == orig_lang，
 *              且非「ja/ko 全汉字疑似译名」 → 缺原文版本记录，必须补。
 *   E2 (ERROR) orig_lang 非中日韩体系（非 zh/ja/ko）且 title 含中日韩文字
 *              → 原文标题实为译文，必须修正（A 类残留）。
 *   E3 (ERROR) creators 引用了不存在的 people id（悬空引用）。
 *   E4 (ERROR) callno 重复。
 *   E5 (ERROR) 主题词不在受控词表（src/data/subjects.yaml），或超过 4 个。
 *   E6 (ERROR) mine: true 的 expression.lang 不在封闭集 zh-Hans / zh-Hant / en。
 *   W1 (WARN)  orig_lang ∈ {ja,ko} 且无对应 expression，且 title 全汉字无假名/谚文
 *              → title 疑似中文译名，需人工核对真原文。不阻断构建。
 *   W2 (WARN)  orig_lang 缺失 → 建议补原文语言标记。
 *   W3 (WARN)  subjects 为空 → 规范允许（宁缺毋滥），列出以便跟踪待标引积压。
 *
 * 退出码：存在 ERROR 时返回 1（作为 prebuild 阻断构建），否则 0。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WORKS = join(ROOT, 'src', 'data', 'works');
const PEOPLE = join(ROOT, 'src', 'data', 'people');
const SUBJECTS_FILE = join(ROOT, 'src', 'data', 'subjects.yaml');

const CJK_ORIG = new Set(['ja', 'ko']);
const MINE_LANGS = new Set(['zh-Hans', 'zh-Hant', 'en']);

const hasCjk = (s) => /[㐀-䶿一-鿿豈-﫿]/.test(s ?? '');
const hasKana = (s) => /[぀-ヿ]/.test(s ?? '');
const hasHangul = (s) => /[가-힣]/.test(s ?? '');
const isCjkOrig = (ol) => ol.startsWith('zh') || CJK_ORIG.has(ol);

function yamlFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.yaml'))
    .map((e) => join(e.parentPath ?? e.path, e.name))
    .sort();
}

const errors = [];
const warns = [];

const peopleIds = new Set(yamlFiles(PEOPLE).map((p) => basename(p, '.yaml')));
const vocab = new Set(parse(readFileSync(SUBJECTS_FILE, 'utf-8')) ?? []);
const callnos = new Map();

const files = yamlFiles(WORKS);
for (const f of files) {
  let d;
  try {
    d = parse(readFileSync(f, 'utf-8'));
  } catch (e) {
    errors.push([f, `YAML 解析失败: ${e.message}`]);
    continue;
  }
  if (d === null || typeof d !== 'object' || Array.isArray(d)) continue;

  // E3 悬空 creators 引用
  for (const c of d.creators ?? []) {
    if (typeof c !== 'string' || !peopleIds.has(c)) {
      errors.push([f, `E3 creators 引用了不存在的 people id: ${JSON.stringify(c)}`]);
    }
  }

  // E4 callno 重复
  if (d.callno) {
    if (callnos.has(d.callno)) {
      errors.push([f, `E4 callno 重复: ${d.callno}（与 ${basename(callnos.get(d.callno))} 冲突）`]);
    } else {
      callnos.set(d.callno, f);
    }
  }

  // E5 主题词受控词表 + 数量上限；W3 留空跟踪
  const subjects = d.subjects ?? [];
  if (subjects.length > 4) errors.push([f, `E5 主题词超过 4 个（${subjects.length} 个）`]);
  for (const s of subjects) {
    if (!vocab.has(s)) errors.push([f, `E5 主题词「${s}」不在受控词表（src/data/subjects.yaml）`]);
  }
  if (subjects.length === 0) warns.push([f, 'W3 subjects 为空（规范允许），待标引或记词表提案']);

  // E6 mine-lang 封闭集
  for (const e of d.expressions ?? []) {
    if (e?.mine && !MINE_LANGS.has(e.lang)) {
      errors.push([f, `E6 mine: true 的 lang=${JSON.stringify(e.lang ?? null)} 不在封闭集 zh-Hans/zh-Hant/en`]);
    }
  }

  // E1 / E2 / W1 / W2 原文版本齐备性
  const ol = (d.orig_lang ?? '').trim();
  const title = d.title ?? '';
  const exprs = d.expressions ?? [];
  if (!ol) {
    warns.push([f, 'W2 orig_lang 缺失，建议补原文语言标记']);
    continue;
  }
  if (ol.startsWith('zh')) continue;
  if (exprs.some((e) => (e?.lang ?? '') === ol)) continue;
  if (CJK_ORIG.has(ol) && hasCjk(title) && !(hasKana(title) || hasHangul(title))) {
    warns.push([f, `W1 orig_lang=${ol} 但 title 全汉字无假名/谚文，疑似中文译名，需人工核对真原文`]);
  } else if (!isCjkOrig(ol) && hasCjk(title)) {
    errors.push([f, `E2 orig_lang=${ol}（非中日韩体系）但 title 含中文，原文标题实为译文，必须修正`]);
  } else {
    errors.push([f, `E1 orig_lang=${ol} 缺对应 expression（lang==${ol}），需补原文版本记录`]);
  }
}

console.log(`校验范围：${files.length} 个 work 文件`);
if (errors.length) {
  console.log(`\n❌ ERROR ${errors.length} 项（将阻断构建）：`);
  for (const [f, m] of errors) console.log(`  - ${basename(f)}: ${m}`);
}
if (warns.length) {
  console.log(`\n⚠️  WARN ${warns.length} 项（不阻断，需人工核对）：`);
  for (const [f, m] of warns) console.log(`  - ${basename(f)}: ${m}`);
}
if (!errors.length && !warns.length) console.log('\n✅ 全部通过。');
process.exit(errors.length ? 1 : 0);
