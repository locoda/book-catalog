#!/usr/bin/env node
/**
 * 将草稿目录（src/data/works-draft/）中的书目骨架迁入正式目录（src/data/works/）。
 *
 * 用法:
 *   node scripts/promote.mjs --list           列出所有草稿
 *   node scripts/promote.mjs --slug xxx        迁入指定草稿（按文件名，不含 .yaml）
 *   node scripts/promote.mjs --all             迁入全部草稿（逐文件校验后移动）
 *
 * 迁入前自动校验:
 *   - slug 冲突：works/ 中已有同名文件
 *   - UUID 冲突：works/ 中已有同一 NeoDB 条目
 *   - 结构检查：title / orig_lang 不为空或 TODO
 *   - 校验失败则拒绝迁入，列出具体原因
 */
import { readFileSync, readdirSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parseArgs } from 'node:util';

const DRAFT_DIR = 'src/data/works-draft';
const WORKS_DIR = 'src/data/works';

/** 从 YAML 文本中提取 neodb_uuid */
function extractUuid(text) {
  const m = text.match(/^neodb_uuid:\s*(.+)$/m);
  if (!m) return null;
  // 去掉可能的引号
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

/** 扫描 works/ 目录，建立 { neodb_uuid → 文件名 } 映射 */
function buildWorksIndex() {
  const index = new Map();
  if (!existsSync(WORKS_DIR)) return index;
  for (const name of readdirSync(WORKS_DIR)) {
    if (!name.endsWith('.yaml')) continue;
    try {
      const text = readFileSync(join(WORKS_DIR, name), 'utf-8');
      const uuid = extractUuid(text);
      if (uuid) index.set(uuid, name);
    } catch { /* skip unreadable */ }
  }
  return index;
}

/** 列出所有草稿文件 */
function listDrafts() {
  if (!existsSync(DRAFT_DIR)) {
    console.log('草稿目录不存在，无需迁入。');
    return [];
  }
  return readdirSync(DRAFT_DIR).filter((f) => f.endsWith('.yaml')).sort();
}

/** 校验单个草稿，返回 { ok, errors[] } */
function validateDraft(filename, worksIndex) {
  const errors = [];
  const path = join(DRAFT_DIR, filename);
  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch {
    return { ok: false, errors: ['无法读取文件'] };
  }

  // 1. slug 冲突
  if (existsSync(join(WORKS_DIR, filename))) {
    errors.push(`slug 冲突：works/ 中已存在 ${filename}`);
  }

  // 2. UUID 冲突
  const uuid = extractUuid(text);
  if (uuid && worksIndex.has(uuid)) {
    const existing = worksIndex.get(uuid);
    errors.push(`UUID 冲突：${uuid} 已存在于 ${existing}`);
  }

  // 3. 结构检查
  const title = text.match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  const origLang = text.match(/^orig_lang:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';

  if (!title || title === 'untitled') {
    errors.push('title 缺失或为 "untitled"');
  }
  if (!origLang || origLang === 'TODO') {
    errors.push('orig_lang 缺失或为 "TODO"');
  }

  // 4. 警告（不阻止迁入，但提醒）
  const warnings = [];
  if (text.includes('TODO')) {
    warnings.push('文件中含 TODO（需后续编目处理）');
  }

  return { ok: errors.length === 0, errors, warnings, title, origLang, uuid };
}

function promoteFile(filename) {
  const src = join(DRAFT_DIR, filename);
  const dst = join(WORKS_DIR, filename);
  mkdirSync(WORKS_DIR, { recursive: true });
  renameSync(src, dst);
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      list: { type: 'boolean', default: false },
      slug: { type: 'string' },
      all: { type: 'boolean', default: false },
    },
  });

  const drafts = listDrafts();
  if (drafts.length === 0) {
    console.log('📭 没有待迁入的草稿。');
    process.exit(0);
  }

  // --list：列出草稿
  if (args.list) {
    console.log(`📋 草稿目录（${drafts.length} 条）：\n`);
    const worksIndex = buildWorksIndex();
    for (const f of drafts) {
      const { errors, warnings, title, uuid } = validateDraft(f, worksIndex);
      const status = errors.length ? '❌' : '✅';
      console.log(`  ${status} ${f}`);
      console.log(`      题名: ${title}`);
      if (uuid) console.log(`      UUID: ${uuid}`);
      for (const e of errors) console.log(`      ⛔ ${e}`);
      for (const w of warnings) console.log(`      ⚠️  ${w}`);
    }
    console.log(`\n迁入命令: node scripts/promote.mjs --all`);
    process.exit(0);
  }

  // --slug：迁入指定草稿
  if (args.slug) {
    const filename = args.slug.endsWith('.yaml') ? args.slug : `${args.slug}.yaml`;
    if (!drafts.includes(filename)) {
      console.error(`❌ 草稿 "${filename}" 不存在。`);
      process.exit(1);
    }
    const worksIndex = buildWorksIndex();
    const { ok, errors, warnings } = validateDraft(filename, worksIndex);
    for (const e of errors) console.log(`⛔ ${e}`);
    for (const w of warnings) console.log(`⚠️  ${w}`);
    if (!ok) {
      console.error(`\n❌ 校验未通过，拒绝迁入。修复后重试。`);
      process.exit(1);
    }
    promoteFile(filename);
    console.log(`✅ ${filename} → works/`);
    process.exit(0);
  }

  // --all：全部迁入
  if (args.all) {
    const worksIndex = buildWorksIndex();
    let promoted = 0;
    let failed = 0;

    for (const filename of drafts) {
      const { ok, errors, warnings } = validateDraft(filename, worksIndex);
      if (!ok) {
        console.log(`❌ ${filename}:`);
        for (const e of errors) console.log(`     ${e}`);
        failed++;
        continue;
      }
      promoteFile(filename);
      promoted++;
      console.log(`✅ ${filename}`);
      for (const w of warnings) console.log(`   ⚠️  ${w}`);
    }

    console.log(`\n迁入完成: ${promoted} 条成功，${failed} 条失败（留在草稿目录）。`);
    if (failed > 0) {
      console.log('请修复以上问题后重试: node scripts/promote.mjs --all');
    }
    process.exit(failed > 0 ? 1 : 0);
  }

  // 无参数：显示帮助
  console.log(`用法:
  node scripts/promote.mjs --list            列出所有草稿及校验结果
  node scripts/promote.mjs --slug <name>      迁入指定草稿（不含 .yaml）
  node scripts/promote.mjs --all              迁入全部草稿

草稿目录: ${DRAFT_DIR}
正式目录: ${WORKS_DIR}
`);
  console.log(`当前草稿数: ${drafts.length}`);
  if (drafts.length > 0) {
    console.log(`先用 --list 查看详情。`);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
