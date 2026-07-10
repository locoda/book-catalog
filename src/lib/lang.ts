/**
 * 语言标签工具。
 *
 * 全库 orig_lang / expressions[].lang 采用 BCP 47：
 * - 中文用文字子标签区分简繁：zh-Hans（简体）/ zh-Hant（繁体）——不用地区码
 *   （zh-CN/zh-TW），因为简繁是文字问题不是地区问题（新马简体、港台繁体等）。
 * - 其他语言维持纯语言子标签（ja、ko、fr、de...），不强加文字子标签：
 *   这些语言在本目录范围内只对应一种常用文字，加 -Jpan/-Kore/-Latn 纯属冗余，
 *   不符合 BCP47 的 Suppress-Script 惯例。
 *
 * LANG_LABELS 覆盖当前库中出现过的所有语言代码；新语言入库时在此补一行即可，
 * 缺失时回退显示原始代码（不会报错，但要留意——大概率是漏填字典）。
 */

export const LANG_LABELS: Record<string, string> = {
  en: '英文',
  ja: '日文',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁体中文',
  fr: '法文',
  ko: '韩文',
  de: '德文',
  it: '意大利文',
  es: '西班牙文',
  fa: '波斯文',
  sv: '瑞典文',
  tr: '土耳其文',
  pt: '葡萄牙文',
  nb: '挪威文',
  hr: '克罗地亚文',
  sq: '阿尔巴尼亚文',
  ru: '俄文',
  hu: '匈牙利文',
  he: '希伯来文',
  da: '丹麦文',
  bg: '保加利亚文',
};

export function langLabel(code: string): string {
  return LANG_LABELS[code] ?? code;
}

export type LangBucket = 'zh' | 'ja' | 'en' | 'other';

export const BUCKET_LABELS: Record<LangBucket, string> = {
  zh: '中文',
  ja: '日文',
  en: '英文',
  other: '其他',
};

/** 与 Callno 分类位（C/J/E/O）保持一致的四分类。 */
export function langBucket(code: string): LangBucket {
  if (code.startsWith('zh')) return 'zh';
  if (code === 'ja') return 'ja';
  if (code === 'en') return 'en';
  return 'other';
}
