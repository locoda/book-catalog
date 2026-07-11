#!/usr/bin/env node
/**
 * 从 NeoDB 拉取本人书籍标记，生成 work YAML 骨架到 src/data/works/。
 * （Node 版，替代 import_neodb.py——与 validate.mjs 统一运行时，CI 无需 Python）
 *
 * 用法:
 *   export NEODB_TOKEN=xxxx        # neodb.social -> 设置 -> 应用/API -> 生成 token
 *   node scripts/import_neodb.mjs [--instance https://neodb.social] [--shelf complete]
 *
 * 注意:
 *   - 每个 NeoDB 条目生成一条 work，你读的那个版本标 mine: true。
 *   - 同一作品的多语言版本合并（work/expression 归并）是编目判断，脚本不自动做；
 *     导入后手动把重复的 work 合并成一条、版本挪进 expressions。
 *   - creators 先写成 raw 字符串（creators_raw），建好权威记录后手动替换成 people id。
 *   - 已存在的文件不会覆盖（--force 可覆盖）。
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pinyin } from 'pinyin-pro';

function slugify(s) {
  // 中文转拼音，其他非 ASCII 字符剥离
  if (/[一-鿿]/.test(s)) {
    s = pinyin(s, { toneType: 'none', type: 'array', nonZh: 'consecutive' }).join('-');
  }
  s = s.normalize('NFKD');
  s = s.replace(/[^\x00-\x7F]/g, '');
  s = s.replace(/[^\w\s-]/g, '').trim().toLowerCase();
  s = s.replace(/[\s_]+/g, '-');
  return s || 'untitled';
}

const YAML_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 返回安全的 YAML 标量：需要引号时自动加。 */
function yamlStr(s) {
  if (s === null || s === undefined) return "''";
  s = String(s).trim();
  if (!s) return "''";
  // YAML 会把 2023-04-16 解析为 Date 对象，必须引号保护
  if (YAML_DATE.test(s)) return JSON.stringify(s);
  // 含有 YAML 特殊字符
  if (/[:#[\]{}&*!|>'"%@`]/.test(s)) return JSON.stringify(s);
  return s;
}

async function api(url, token) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'ether-catalog-import/0.2',
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`NeoDB API ${r.status}: ${url}`);
  return r.json();
}

const DATE_RE = /['"](\d{4}-\d{2}-\d{2})['"]/g;

/** 扫描已有 work 文件的 readings[].date，返回最新的日期字符串。 */
function latestReadingDate(worksDir) {
  let latest = null;
  for (const name of readdirSync(worksDir)) {
    if (!name.endsWith('.yaml')) continue;
    let text;
    try {
      text = readFileSync(join(worksDir, name), 'utf-8');
    } catch {
      continue;
    }
    for (const m of text.matchAll(DATE_RE)) {
      if (latest === null || m[1] > latest) latest = m[1];
    }
  }
  return latest;
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      instance: { type: 'string', default: 'https://neodb.social' },
      shelf: { type: 'string', default: 'complete' },
      out: { type: 'string', default: 'src/data/works' },
      force: { type: 'boolean', default: false },
    },
  });
  if (!['complete', 'progress', 'wishlist'].includes(args.shelf)) {
    process.exit(console.error('--shelf 只能是 complete / progress / wishlist') ?? 2);
  }

  const token = process.env.NEODB_TOKEN;
  if (!token) {
    console.error('缺少 NEODB_TOKEN 环境变量。');
    process.exit(2);
  }

  mkdirSync(args.out, { recursive: true });

  // 找到已有目录里最新的阅读日期，作为增量导入的截止线
  const cutoff = args.force ? null : latestReadingDate(args.out);
  if (cutoff) console.log(`已有目录最新阅读日期: ${cutoff}，仅导入此日期之后的条目。`);

  const usedSlugs = new Map(); // slug → 已用次数（仅计入通过日期过滤的条目）
  const collisions = [];
  let page = 1, written = 0, skipped = 0;

  while (true) {
    const data = await api(`${args.instance}/api/me/shelf/${args.shelf}?category=book&page=${page}`, token);
    const results = data.data ?? [];
    if (!results.length) break;

    for (const mark of results) {
      const item = mark.item ?? {};
      const title = item.title || 'untitled';

      // 从 credits 里提取作者和译者
      const credits = item.credits ?? [];
      const authors = credits.filter((c) => c.role === 'author').map((c) => c.name);
      const translators = credits.filter((c) => c.role === 'translator').map((c) => c.name);
      const rating = mark.rating_grade; // NeoDB 10 分制
      const created = (mark.created_time ?? '').slice(0, 10);
      const lang = (item.localized_title ?? [{}])[0]?.lang ?? '';

      // 增量模式：跳过不晚于截止日期的条目
      if (cutoff && created && created <= cutoff) {
        skipped++;
        continue;
      }

      const base = slugify(title).slice(0, 50);
      const n = (usedSlugs.get(base) ?? 0) + 1;
      usedSlugs.set(base, n);
      let fname;
      if (n === 1) {
        fname = `${base}.yaml`;
      } else {
        fname = `${base}-${n}.yaml`;
        collisions.push([base, title]);
      }
      const path = join(args.out, fname);
      if (existsSync(path) && !args.force) {
        skipped++;
        continue;
      }

      const lines = [
        `title: ${yamlStr(title)}`,
        `orig_lang: ${yamlStr(lang || 'TODO')}`,
        'creators: []   # TODO: 建权威记录后填 people id',
        `creators_raw: ${JSON.stringify(authors)}`,
        'subjects: []   # TODO: 个人主题词',
        'expressions:',
        `  - lang: ${yamlStr(lang || 'TODO')}`,
        `    title: ${yamlStr(title)}`,
        '    mine: true',
      ];
      if (translators.length) lines.splice(lines.length - 1, 0, `    translator: ${yamlStr(translators[0])}`);
      if (created) lines.push('readings:', `  - date: ${yamlStr(created)}`, '    platform: NeoDB 标记');
      if (rating !== null && rating !== undefined) lines.push(`rating: ${rating}`);
      lines.push(`status: ${args.shelf === 'progress' ? 'reading' : 'read'}`);
      if (item.uuid) lines.push(`neodb_uuid: ${yamlStr(item.uuid)}`);

      writeFileSync(path, lines.join('\n') + '\n', 'utf-8');
      written++;
    }
    console.log(`page ${page}: 累计写入 ${written}，跳过 ${skipped}`);
    if (page >= (data.pages ?? 1)) break;
    page++;
  }

  console.log(`完成：${written} 条新著录，${skipped} 条已存在跳过。`);
  if (collisions.length) {
    console.log(`\n⚠️  ${collisions.length} 组 slug 碰撞（需手动合并）：`);
    for (const [slug, title] of collisions) console.log(`    ${slug} → "${title}"（同名多版本/多语言）`);
  }
  console.log('下一步：合并多语言重复条目 → 建 people 权威记录 → 回填 creators。');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
