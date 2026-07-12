#!/usr/bin/env node
/**
 * 从 NeoDB 拉取本人书籍标记，生成 work YAML 骨架。
 * 默认写入 src/data/works-draft/（草稿区），确认后通过 promote.mjs 迁入正式目录。
 * （Node 版，替代 import_neodb.py——与 validate.mjs 统一运行时，CI 无需 Python）
 *
 * 用法:
 *   export NEODB_TOKEN=xxxx        # neodb.social -> 设置 -> 应用/API -> 生成 token
 *   node scripts/import_neodb.mjs [--instance https://neodb.social] [--shelf complete]
 *   （在读 progress 不导入——馆长裁决 2026-07-11：读完才编目）
 *
 * 增量模式（默认）：
 *   - 读取 scripts/.import-state.json 记录的上次导入位置
 *   - 只拉取新增的条目，避免重复导入
 *   - --force 忽略 checkpoint，全量重拉并重置状态
 *
 * 输出路径：
 *   - 默认 src/data/works-draft/（不在 Astro 内容集合范围内，不会影响构建）
 *   - --out src/data/works 可跳过草稿直接入正式目录（兼容旧流程）
 *
 * 注意:
 *   - 每个 NeoDB 条目生成一条 work，你读的那个版本标 mine: true。
 *   - 同一作品的多语言版本合并（work/expression 归并）是编目判断，脚本不自动做；
 *     导入后手动把重复的 work 合并成一条、版本挪进 expressions。
 *   - creators 先写成 raw 字符串（creators_raw），建好权威记录后手动替换成 people id。
 *   - 已存在的文件不会覆盖（--force 可覆盖）。
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { pinyin } from 'pinyin-pro';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, '.import-state.json');

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

/** 读取 checkpoint: { last_imported_uuid, last_imported_date, shelf } */
function readState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* 文件损坏视为无状态 */ }
  return null;
}

/** 写入 checkpoint */
function writeState(state) {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

/**
 * 从正式目录的已有工作中提取最新的 neodb_uuid 和日期，用于初始化 checkpoint。
 * 避免首次运行新脚本时把全库重复拉进 draft。
 */
function initStateFromWorks(worksDir) {
  if (!existsSync(worksDir)) return null;
  let newestUuid = null;
  let newestDate = null;
  const uuidRe = /^neodb_uuid:\s*['"]?([^\s'"]+)['"]?\s*$/m;
  const dateRe = /^\s*-\s*date:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?/m;  // 兼容平铺（顶格）与缩进两种风格

  for (const name of readdirSync(worksDir)) {
    if (!name.endsWith('.yaml')) continue;
    let text;
    try { text = readFileSync(join(worksDir, name), 'utf-8'); } catch { continue; }
    const uuid = text.match(uuidRe)?.[1];
    const date = text.match(dateRe)?.[1];
    if (uuid && date && (!newestDate || date > newestDate)) {
      newestDate = date;
      newestUuid = uuid;
    }
  }
  if (newestUuid) {
    console.log(`从已有 works/ 初始化 checkpoint: ${newestDate}（${newestUuid.slice(0, 8)}…）`);
  }
  return newestUuid ? { last_imported_uuid: newestUuid, last_imported_date: newestDate } : null;
}

async function api(url, token) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'ether-catalog-import/0.3',
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`NeoDB API ${r.status}: ${url}`);
  return r.json();
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      instance: { type: 'string', default: 'https://neodb.social' },
      shelf: { type: 'string', default: 'complete' },
      out: { type: 'string', default: 'src/data/works-draft' },
      force: { type: 'boolean', default: false },
    },
  });
  // 在读（progress）不入目录（馆长裁决 2026-07-11）：读完才编目
  if (!['complete', 'wishlist'].includes(args.shelf)) {
    process.exit(console.error('--shelf 只能是 complete / wishlist（在读不入目录）') ?? 2);
  }

  const token = process.env.NEODB_TOKEN;
  if (!token) {
    console.error('缺少 NEODB_TOKEN 环境变量。');
    process.exit(2);
  }

  mkdirSync(args.out, { recursive: true });

  // 增量模式：读取 checkpoint；无 checkpoint 时尝试从正式目录初始化
  // --force 跳过全部初始化，真正全量拉取
  let state = args.force ? null : readState();
  if (!state && !args.force) {
    const init = initStateFromWorks('src/data/works');
    if (init) {
      state = init;
      writeState({ ...init, shelf: args.shelf, updated_at: new Date().toISOString() });
    }
  }
  const checkpointUuid = state?.last_imported_uuid ?? null;
  const checkpointDate = state?.last_imported_date ?? null;

  if (checkpointUuid) {
    console.log(`增量模式：上次导入到 ${checkpointDate}（uuid: ${checkpointUuid.slice(0, 8)}…），仅拉取此后的条目。`);
  } else if (args.force) {
    console.log('--force 模式：忽略 checkpoint，全量拉取。');
  } else {
    console.log('无 checkpoint 且 works/ 无可用数据，全量拉取（首次导入）。');
  }
  if (args.out !== 'src/data/works-draft') {
    console.log(`⚠️  输出目标: ${args.out}（非默认草稿目录）`);
  }

  const usedSlugs = new Map(); // slug → 已用次数
  const collisions = [];
  let page = 1, written = 0, skipped = 0;
  let reachedCheckpoint = false;
  let newestWritten = null; // { uuid, date } —— 本轮写入的最新条目

  while (true) {
    const data = await api(`${args.instance}/api/me/shelf/${args.shelf}?category=book&page=${page}`, token);
    const results = data.data ?? [];
    if (!results.length) break;

    for (const mark of results) {
      const item = mark.item ?? {};
      const title = item.title || 'untitled';
      const itemUuid = item.uuid ?? '';

      // 增量停止条件（shelf 按 created_time 降序）：
      // 1) 精确：遇到 checkpoint uuid 就停；
      // 2) 兜底：checkpoint uuid 不在本架（被取消标记/换架等）时，靠日期截止，避免全量重拉。
      const created = (mark.created_time ?? '').slice(0, 10);
      if (checkpointUuid && itemUuid === checkpointUuid) {
        reachedCheckpoint = true;
        break;
      }
      if (checkpointDate && created && created < checkpointDate) {
        reachedCheckpoint = true;
        break;
      }

      // 检查 draft 目录是否已有此文件（按 neodb_uuid 判断）
      // 一个简单检查：遍历已有 draft 文件名查找 uuid
      // 此处用文件名存在性检查作为快速路径
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

      // 从 credits 里提取作者和译者
      const credits = item.credits ?? [];
      const authors = credits.filter((c) => c.role === 'author').map((c) => c.name);
      const translators = credits.filter((c) => c.role === 'translator').map((c) => c.name);
      const rating = mark.rating_grade;
      const lang = (item.localized_title ?? [{}])[0]?.lang ?? '';

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
      if (created) lines.push('readings:', `  - date: ${yamlStr(created)}`);  // edition（载体）由馆长回填，platform 字段已废除（CATALOGING v0.5）
      if (rating !== null && rating !== undefined) lines.push(`rating: ${rating}`);
      lines.push('status: read');
      if (itemUuid) lines.push(`neodb_uuid: ${yamlStr(itemUuid)}`);

      writeFileSync(path, lines.join('\n') + '\n', 'utf-8');
      written++;

      // 记录本轮最新写入的条目（第一页第一条就是最新的）
      if (!newestWritten) {
        newestWritten = { uuid: itemUuid, date: created };
      }
    }

    if (reachedCheckpoint) {
      console.log(`page ${page}: 命中 checkpoint，停止拉取。`);
      break;
    }
    console.log(`page ${page}: 累计写入 ${written}，跳过 ${skipped}`);
    if (page >= (data.pages ?? 1)) break;
    page++;
  }

  // 更新 checkpoint（除非拉取结果为空）
  if (newestWritten) {
    writeState({
      last_imported_uuid: newestWritten.uuid,
      last_imported_date: newestWritten.date,
      shelf: args.shelf,
      updated_at: new Date().toISOString(),
    });
    console.log(`checkpoint 已更新: ${newestWritten.date}（${newestWritten.uuid.slice(0, 8)}…）`);
  }

  console.log(`\n完成：${written} 条新著录 → ${args.out}，${skipped} 条跳过。`);
  if (collisions.length) {
    console.log(`\n⚠️  ${collisions.length} 组 slug 碰撞（需手动合并）：`);
    for (const [slug, title] of collisions) console.log(`    ${slug} → "${title}"（同名多版本/多语言）`);
  }
  if (args.out === 'src/data/works-draft') {
    console.log('\n下一步：审阅草稿 → node scripts/promote.mjs --list → --all 迁入正式目录');
  } else {
    console.log('下一步：合并多语言重复条目 → 建 people 权威记录 → 回填 creators。');
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
