import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { readFileSync } from 'node:fs';

/** 受控主题词表：单一来源 src/data/subjects.yaml（validate.py 读同一文件） */
const SUBJECTS = new Set(
  readFileSync(new URL('./data/subjects.yaml', import.meta.url), 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim()),
);

/** mine: true 版本的语言封闭集——馆长实际的阅读语言 */
const MINE_LANGS = new Set(['zh-Hans', 'zh-Hant', 'en']);

/**
 * FRBR-lite schema, v0.1
 * work  = 抽象作品（题名以原语言为准）
 * expressions = 语言层版本；mine 标记你读的版本
 * readings = 阅读事件（时间、平台、语言）
 */
const works = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/data/works' }),
  schema: z.object({
    title: z.string(),                    // authority title（原语言）
    orig_lang: z.string(),                // BCP 47：ja / en / zh-Hans / zh-Hant / ...（中文用文字子标签区分简繁）
    year: z.number().optional(),          // 初版年
    creators: z.array(reference('people')),      // -> people collection ids（悬空引用阻断构建）
    callno: z.string().optional(),        // 个人索书号
    subjects: z.array(z.string()).max(4).default([]),   // 受控词表，≤4；允许留空（待标引/无合适词）
    expressions: z.array(z.object({
      lang: z.string(),
      title: z.string(),
      translator: z.string().optional(),
      mine: z.boolean().default(false),   // 我读的版本
    })).default([]),
    readings: z.array(z.object({
      date: z.string(),                   // "2021-03" / "2026-06-24"
      edition: z.enum(['ebook', 'print', 'audiobook']).optional(),  // 电子书/纸质书/有声书；历史记录多数缺失，遇到再补，不猜
      lang: z.string().optional(),
      note: z.string().optional(),
    })).default([]),
    rating: z.number().min(0).max(10).optional(),
    rating_source: z.string().default('NeoDB'),
    status: z.enum(['read', 'reading', 'shelved']).default('read'),
    placeholder: z.boolean().default(false),  // 示意数据，待真实导入覆盖
    confirmed: z.boolean().default(false),    // 馆长确认：true 后 slug/callno/people id 永久冻结（CATALOGING §0.2）
  }).superRefine((w, ctx) => {
    // 硬性规则 1：主题词只能出自受控词表（src/data/subjects.yaml）
    for (const s of w.subjects) {
      if (!SUBJECTS.has(s)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subjects'],
          message: `主题词「${s}」不在受控词表（src/data/subjects.yaml）`,
        });
      }
    }
    // 硬性规则 2：mine: true 的 lang 是封闭集 zh-Hans / zh-Hant / en
    w.expressions.forEach((e, i) => {
      if (e.mine && !MINE_LANGS.has(e.lang)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expressions', i, 'lang'],
          message: `mine: true 的 lang 只能是 zh-Hans / zh-Hant / en，收到「${e.lang}」`,
        });
      }
    });
  }),
});

/**
 * 权威记录：一人一条，多语言名称形式全部归拢到同一 id
 */
const people = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/data/people' }),
  schema: z.object({
    name: z.string(),                     // 权威形式（原语言）
    sort: z.string().optional(),          // 排序键
    forms: z.array(z.object({
      script: z.string(),                 // ja-kana / romaji / zh / en ...
      value: z.string(),
    })).default([]),
  }),
});

export const collections = { works, people };
