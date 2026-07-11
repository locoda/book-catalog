#!/usr/bin/env node
/**
 * 全库机器核查（advisory，不阻断构建）——对照 docs/CATALOGING.md 逐条检查
 * 所有可机械执行的规则，供馆长 confirm 前参考。阻断性校验见 validate.mjs。
 *
 * 用法：
 *   node scripts/audit.mjs               # 控制台摘要
 *   node scripts/audit.mjs --report      # 另写 docs/audit-report.md（逐文件明细 + edition 回填清单）
 *
 * 检查项（编号对应 CATALOGING.md 章节）：
 *   A1  (§2)  title 未做 NFC 规范化
 *   A2  (§2)  orig_lang 代码风格：zh-CN/zh-TW（应为 zh-Hans/zh-Hant）、冗余文字子标签（ja-Jpan）、大写地区码
 *   A3  (§2)  无 mine: true 版本 / 原语言 expression 带 translator
 *   A4  (§4)  callno 四段格式不合法
 *   A5  (§4)  callno 分类位（J/C/E/O）与 orig_lang 不一致
 *   A6  (§4)  callno 著者号与第一著者 sort 键姓前三字母不一致
 *   A7  (§4)  callno 年份段与 year 不一致
 *   A8  (§4)  callno 题名词段与 slug 首个非停用词段不一致（容忍冲突加后缀）
 *   A9  (§5)  slug 字符集/长度违规
 *   A10 (§9)  creators_raw 残留（编目未完成）
 *   A11 (§0.3) 字段含 TODO
 *   P1  (§3)  people：sort 缺失或非「姓, 名」格式
 *   P2  (§3)  people：forms 为空（原文形式必须收录）
 *   P3  (§3)  people：name 含非拉丁字符（规范形式应为英文惯称）
 *
 * confirmed: true 的记录跳过标识符类检查（A4–A9）——冻结规则允许历史遗留（§0.2）。
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WORKS = join(ROOT, 'src', 'data', 'works');
const PEOPLE = join(ROOT, 'src', 'data', 'people');
const REPORT = process.argv.includes('--report');

const load = (dir) =>
  readdirSync(dir)
    .filter((n) => n.endsWith('.yaml'))
    .sort()
    .map((n) => [basename(n, '.yaml'), parse(readFileSync(join(dir, n), 'utf-8'))]);

const works = load(WORKS);
const people = new Map(load(PEOPLE));

const issues = [];   // [slug, code, message]
const flag = (slug, code, msg) => issues.push([slug, code, msg]);

/* ---------- callno 期望值算法（§4） ---------- */
const STOPWORDS = new Set(['a', 'an', 'the']);
const CLASS_RE = /^([JCEO])([FN])-([A-Z0-9]{1,3})-(\d{4})-([A-Z0-9]{1,6})$/;

const langBucket = (l) => (l === 'ja' ? 'J' : l?.startsWith('zh') ? 'C' : l === 'en' ? 'E' : 'O');

function expectedAuthorNo(work) {
  const first = work.creators?.[0];
  if (!first) return null;
  const p = people.get(first);
  if (!p?.sort) return null;
  // 先去变音符号（Márai→Marai、Müller→Muller、Yūki→Yuki），再剥非字母（连字符跳过）
  const surname = p.sort.split(',')[0]
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '');
  return surname.slice(0, 3).toUpperCase() || null;
}

function expectedTitleWord(slug) {
  // 从首个非停用词段起顺次连接，补足 4 字符（§4 v0.9）
  const segs = slug.split('-');
  const start = segs.findIndex((s) => s && !STOPWORDS.has(s));
  if (start === -1) return null;
  const joined = segs.slice(start).join('');
  return joined ? joined.slice(0, 4).toUpperCase() : null;
}

/* ---------- works ---------- */
const editionMissing = []; // [slug, title, dates[]]
let confirmedCount = 0;

for (const [slug, w] of works) {
  if (!w || typeof w !== 'object') continue;
  const frozen = w.confirmed === true;
  if (frozen) confirmedCount++;

  // A1 NFC
  if (w.title && w.title !== w.title.normalize('NFC')) flag(slug, 'A1', 'title 未 NFC 规范化');

  // A2 语言代码风格
  const ol = w.orig_lang ?? '';
  if (/^zh-(CN|TW|HK|SG)$/i.test(ol)) flag(slug, 'A2', `orig_lang=${ol} 应改用文字子标签 zh-Hans/zh-Hant`);
  else if (/-[A-Z][a-z]{3}$/.test(ol) && !/^zh-Han[st]$/.test(ol)) flag(slug, 'A2', `orig_lang=${ol} 含冗余文字子标签`);
  else if (/-[A-Z]{2}$/.test(ol)) flag(slug, 'A2', `orig_lang=${ol} 不应使用地区码`);

  // A3 mine 版本 / 原语言版本 translator
  const exprs = w.expressions ?? [];
  if (!exprs.some((e) => e?.mine)) flag(slug, 'A3', '无 mine: true 版本（实际读过的版本未标）');
  for (const e of exprs) {
    if (e?.lang === ol && e.translator && e.lang !== (exprs.find((x) => x?.mine)?.lang)) {
      flag(slug, 'A3', `原语言版本（${ol}）带 translator「${e.translator}」，原版不应有译者`);
    }
  }

  // A10 creators_raw 残留
  if ('creators_raw' in w) flag(slug, 'A10', 'creators_raw 残留，编目未完成（§9 Step 3 后应删除）');

  // A11 TODO
  for (const [k, v] of Object.entries(w)) {
    if (typeof v === 'string' && v.includes('TODO')) flag(slug, 'A11', `字段 ${k} 为 TODO`);
  }

  // edition 回填清单
  const missingDates = (w.readings ?? []).filter((r) => !r?.edition).map((r) => r?.date ?? '?');
  if (missingDates.length) {
    const mine = exprs.find((e) => e?.mine);
    editionMissing.push([slug, mine?.title ?? w.title, missingDates]);
  }

  if (frozen) continue; // 以下为标识符类检查，confirmed 记录跳过

  // A9 slug
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) flag(slug, 'A9', 'slug 含非法字符');
  if (slug.length > 50) flag(slug, 'A9', `slug 超长（${slug.length} > 50）`);

  // A4–A8 callno
  const cn = w.callno;
  if (!cn) continue;
  const m = CLASS_RE.exec(cn);
  if (!m) {
    flag(slug, 'A4', `callno「${cn}」不符合 {分类}-{著者号}-{年份}-{题名词} 格式`);
    continue;
  }
  const [, cls, , authorNo, yr, titleWord] = m;

  if (cls !== langBucket(ol)) flag(slug, 'A5', `callno 分类位 ${cls} 与 orig_lang=${ol}（应为 ${langBucket(ol)}）不一致`);

  // creators 留空是合法编目判断（多人合集等，馆长裁决 2026-07-10）——著者号无法机器核对，跳过
  const expAuthor = expectedAuthorNo(w);
  if (expAuthor && authorNo !== expAuthor) flag(slug, 'A6', `callno 著者号 ${authorNo} ≠ 期望 ${expAuthor}（第一著者 sort 姓前三字母）`);

  if (w.year && String(w.year) !== yr) flag(slug, 'A7', `callno 年份段 ${yr} ≠ year: ${w.year}`);

  const expWord = expectedTitleWord(slug);
  if (expWord && titleWord !== expWord && !titleWord.startsWith(expWord)) {
    flag(slug, 'A8', `callno 题名词段 ${titleWord} ≠ 期望 ${expWord}（slug 首非停用词段前 4 字符）`);
  }
}

/* ---------- people ---------- */
for (const [id, p] of people) {
  if (!p || typeof p !== 'object') continue;
  if (!p.sort) flag(`people/${id}`, 'P1', 'sort 缺失');
  // sort === name 视为有意不倒置（单名著者如 Qiaomai/Uketsu、团体著者如 NHK 取材班），豁免格式检查
  else if (p.sort !== p.name && !/^.+,\s.+$/.test(p.sort)) flag(`people/${id}`, 'P1', `sort「${p.sort}」非「姓, 名」格式`);
  if (!p.forms?.length) flag(`people/${id}`, 'P2', 'forms 为空，原文形式必须收录');
  if (p.name && /[^\x00-\x7F]/.test(p.name.normalize('NFD').replace(/[̀-ͯ]/g, ''))) {
    flag(`people/${id}`, 'P3', `name「${p.name}」含非拉丁字符，规范形式应为英文惯称（§3）`);
  }
}

/* ---------- 输出 ---------- */
const byCode = new Map();
for (const [slug, code, msg] of issues) {
  if (!byCode.has(code)) byCode.set(code, []);
  byCode.get(code).push([slug, msg]);
}

console.log(`核查范围：${works.length} 条 works，${people.size} 条 people；已 confirmed：${confirmedCount}`);
console.log(`发现问题：${issues.length} 项，涉及检查项 ${byCode.size} 类\n`);
for (const code of [...byCode.keys()].sort()) {
  const list = byCode.get(code);
  console.log(`【${code}】${list.length} 项`);
  for (const [slug, msg] of list.slice(0, REPORT ? 0 : 8)) console.log(`   - ${slug}: ${msg}`);
  if (!REPORT && list.length > 8) console.log(`   …… 其余 ${list.length - 8} 项见 --report`);
}
console.log(`\nedition 待回填：${editionMissing.length} 条 work 的阅读记录缺 edition`);

if (REPORT) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    `# 全库机器核查报告 · ${today}`,
    '',
    `由 \`node scripts/audit.mjs --report\` 生成。核查范围：${works.length} 条 works，${people.size} 条 people；已 confirmed：${confirmedCount}。`,
    '',
    '## 问题明细',
    '',
  ];
  if (!issues.length) lines.push('无。全部机器可查规则通过。');
  for (const code of [...byCode.keys()].sort()) {
    lines.push(`### ${code}（${byCode.get(code).length} 项）`, '');
    for (const [slug, msg] of byCode.get(code)) lines.push(`- [ ] \`${slug}\`：${msg}`);
    lines.push('');
  }
  lines.push('## edition 回填清单', '', `共 ${editionMissing.length} 条。填法：在对应 work 的 \`readings[].edition\` 写 \`ebook\` / \`print\` / \`audiobook\`；不确定留空。`, '');
  const byYear = new Map();
  for (const [slug, title, dates] of editionMissing) {
    const y = (dates[0] ?? '????').slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push([slug, title, dates]);
  }
  for (const y of [...byYear.keys()].sort()) {
    lines.push(`### ${y}（${byYear.get(y).length} 条）`, '');
    for (const [slug, title, dates] of byYear.get(y)) lines.push(`- [ ] \`${slug}\` ${title}（${dates.join('、')}）`);
    lines.push('');
  }
  const out = join(ROOT, 'docs', 'audit-report.md');
  writeFileSync(out, lines.join('\n'), 'utf-8');
  console.log(`报告已写入 docs/audit-report.md`);
}
