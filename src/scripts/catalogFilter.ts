/**
 * 首页联动筛选的共享状态（客户端）。
 * 书架、语言流向、主题星图、阅读年表、书单面板都订阅同一份状态；
 * 每张图在渲染自己时忽略「自己那一维」，改为高亮，其余维度照常过滤（crossfilter 惯例）。
 */

export interface InsightBook {
  id: string;
  t: string;        // 显示题名（我读的版本）
  a: string;        // 著者（显示名）
  c: string[];      // 著者 people id
  ol: string;       // 原语言代码
  sk: string;       // 流向图左列节点 key（小语种并为 other）
  ml: string;       // 我读的语言
  s: string[];      // 主题 slug
  ym: string[];     // 全部阅读年月 YYYY-MM
  fy: number;       // 首次阅读年
  d: string;        // 最近读毕日期
  r: number | null; // 评分
}

export interface FilterState {
  years: { from: number; to: number } | null;  // 年份区间：在这几年里读过的书（null = 全部）
  langs: string[] | null; langsLabel?: string; // 原语言代码集合
  subject: string | null; subjectLabel?: string;
  flow: { src: string; tgt: string; native: boolean } | null; flowLabel?: string;
}
export type Dim = 'years' | 'langs' | 'subject' | 'flow';

const EMPTY: FilterState = { years: null, langs: null, subject: null, flow: null };

// 挂在 window 上，保证各组件脚本即使被分别打包也共用同一份状态
export interface InsightData { books: InsightBook[]; subjects: Record<string, { name: string; desc: string }> }
const g = window as unknown as { __catalogFilter?: FilterState; __insights?: InsightData };
g.__catalogFilter ??= { ...EMPTY };

export const getState = (): FilterState => g.__catalogFilter!;

export function setFilter(patch: Partial<FilterState>) {
  g.__catalogFilter = { ...getState(), ...patch };
  window.dispatchEvent(new CustomEvent('catalog:filter', { detail: g.__catalogFilter }));
}

export function clearFilter(dim?: Dim) {
  if (!dim) return setFilter({ ...EMPTY });
  const patch: Partial<FilterState> = { [dim]: null };
  setFilter(patch);
}

export function onFilter(fn: (s: FilterState) => void) {
  window.addEventListener('catalog:filter', (e) => fn((e as CustomEvent<FilterState>).detail));
}

export function getData(): InsightData {
  if (!g.__insights) {
    const el = document.getElementById('insights-data');
    g.__insights = el ? JSON.parse(el.textContent || '{}') : { books: [], subjects: {} };
  }
  return g.__insights!;
}
export const getBooks = () => getData().books;

/** 这本书是否有阅读记录落在 [from, to] 年内 */
export const readIn = (b: InsightBook, from: number, to: number) =>
  b.ym.some((ym) => { const y = +ym.slice(0, 4); return y >= from && y <= to; });

/** 年份区间的读法：全部 / 2020 / 到 2022 / 2021 起 / 2019–2021 */
export function yearsLabel(years: FilterState['years'], y0: number, y1: number): string {
  if (!years) return '全部';
  const { from, to } = years;
  if (from === to) return String(from);
  if (from <= y0) return `到 ${to}`;
  if (to >= y1) return `${from} 起`;
  return `${from}–${to}`;
}

/** 一本书是否命中当前筛选；ignore 中的维度不参与判断（由调用方改为高亮）。 */
export function matches(b: InsightBook, s: FilterState, ignore: Dim[] = []): boolean {
  if (s.years && !ignore.includes('years') && !readIn(b, s.years.from, s.years.to)) return false;
  if (s.langs && !ignore.includes('langs') && !s.langs.includes(b.ol)) return false;
  if (s.subject && !ignore.includes('subject') && !b.s.includes(s.subject)) return false;
  if (s.flow && !ignore.includes('flow') && !(b.sk === s.flow.src && b.ml === s.flow.tgt && (b.ol === b.ml) === s.flow.native)) return false;
  return true;
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
