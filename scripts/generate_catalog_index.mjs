#!/usr/bin/env node
/**
 * 全量书单单文件索引生成器。
 *
 * 运行：node scripts/generate_catalog_index.mjs（亦由 `npm run build:index` / `npm run build` 触发）
 *
 * 把散落在 src/data/works/*.yaml 的编目记录汇总成一个 public/catalog.json，
 * 让 AI 与外部工具一次读取即可拿到全量书单，不必逐个文件抓取。
 * public/ 由 Astro 原样拷进 dist/，站点上即 /catalog.json（只读 API）。
 *
 * 排序：按最后一次阅读时间倒序，最近读的在最前。
 *
 * 字段取自 FRBR-lite schema（src/content.config.ts）：
 *   title           我读的版本题名（expressions[].mine），无则回退原题
 *   original_title  原语言权威题名（work.title），与 title 相同时留空
 *   authors         creators（people id）解析后的权威名
 *   language        orig_lang（原语言）；read_lang 为我读的版本语言
 *   subjects        受控词表 slug；subject_names 为对应中文显示名
 */
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WORKS_DIR = join(ROOT, 'src', 'data', 'works');
const PEOPLE_DIR = join(ROOT, 'src', 'data', 'people');
const SUBJECTS_FILE = join(ROOT, 'src', 'data', 'subjects.yaml');
const PUBLIC_JSON = join(ROOT, 'public', 'catalog.json');

/** 与 validate.mjs 一致：递归收集 .yaml，路径排序，保证输出稳定 */
function yamlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.yaml'))
    .map((e) => join(e.parentPath ?? e.path, e.name))
    .sort();
}

function loadYaml(file) {
  try {
    return parse(readFileSync(file, 'utf-8'));
  } catch (e) {
    console.error(`× ${basename(file)} YAML 解析失败：${e.message}`);
    return null;
  }
}

// 1. people id → 权威名（与站内页面一致，取 name；缺失则回退 id，不静默丢作者）
const peopleMap = new Map();
for (const file of yamlFiles(PEOPLE_DIR)) {
  const id = basename(file, '.yaml');
  peopleMap.set(id, loadYaml(file)?.name ?? id);
}

// 2. subject slug → 中文显示名（受控词表，src/data/subjects.yaml）
const subjectNames = new Map();
if (existsSync(SUBJECTS_FILE)) {
  for (const s of loadYaml(SUBJECTS_FILE) ?? []) {
    if (s?.slug) subjectNames.set(s.slug, s.name ?? s.slug);
  }
}

// 3. 汇总 works
const works = [];
for (const file of yamlFiles(WORKS_DIR)) {
  const id = basename(file, '.yaml');
  const d = loadYaml(file);
  if (!d || typeof d !== 'object' || Array.isArray(d)) continue;

  const expressions = Array.isArray(d.expressions) ? d.expressions : [];
  const mine = expressions.find((e) => e?.mine);
  const origTitle = d.title ?? id;
  // 书单面向中文读者，题名以「我读的版本」为准，原题另立一字段
  const title = mine?.title ?? origTitle;
  const subjects = Array.isArray(d.subjects) ? d.subjects : [];
  const readings = Array.isArray(d.readings) ? d.readings : [];

  works.push({
    id,
    title,
    original_title: title === origTitle ? '' : origTitle,
    authors: (Array.isArray(d.creators) ? d.creators : [])
      .filter((c) => typeof c === 'string')
      .map((c) => peopleMap.get(c) ?? c),
    year: d.year ?? '',
    language: d.orig_lang ?? '',
    read_lang: mine?.lang ?? d.orig_lang ?? '',
    subjects,
    subject_names: subjects.map((s) => subjectNames.get(s) ?? s),
    callno: d.callno ?? '',
    rating: d.rating ?? null,
    read_dates: readings.map((r) => r?.date).filter(Boolean),
    status: d.status ?? 'read',
  });
}

// 4. 按阅读时间倒序（最近读的在最前）。
//    取最后一次阅读为排序键（重读的书跟着最新一次走）；readings 缺失的排末尾。
//    日期形如 "2021-03" / "2026-06-24"，ISO 前缀直接字典序即可比较。
const lastRead = (w) => (w.read_dates.length ? w.read_dates.reduce((x, y) => (x > y ? x : y)) : '');
works.sort((a, b) => {
  const [x, y] = [lastRead(a), lastRead(b)];
  if (x !== y) return x && y ? y.localeCompare(x) : x ? -1 : 1;
  return a.title.localeCompare(b.title, 'zh-Hans-CN') || a.id.localeCompare(b.id);
});

// 5. 写出 public/catalog.json
mkdirSync(dirname(PUBLIC_JSON), { recursive: true });
writeFileSync(PUBLIC_JSON, `${JSON.stringify(works, null, 2)}\n`, 'utf-8');
console.log(`✅ public/catalog.json：${works.length} 条`);
