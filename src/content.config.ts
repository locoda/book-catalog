import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
    creators: z.array(z.string()),        // -> people collection ids
    callno: z.string().optional(),        // 个人索书号
    subjects: z.array(z.string()).default([]),   // 个人主题词表
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
