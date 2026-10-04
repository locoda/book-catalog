/**
 * 首页联动筛选的共享状态（客户端）。
 * 书架、语言流向、主题星图、阅读年表、书单面板都订阅同一份状态；
 * 每张图在渲染自己时忽略「自己那一维」，改为高亮，其余维度照常过滤（crossfilter 惯例）。
 */

export interface InsightBook {
  id: string;
  t: string;        // 显示题名（我读的版本）
  a: string;        // 著者
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
  until: number | null;                        // 回放：只看到这一年为止读过的书
  langs: string[] | null; langsLabel?: string; // 原语言代码集合
  subject: string | null; subjectLabel?: string;
  flow: { src: string; tgt: string; native: boolean } | null; flowLabel?: string;
}
export type Dim = 'until' | 'langs' | 'subject' | 'flow';

const EMPTY: FilterState = { until: null, langs: null, subject: null, flow: null };

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

/** 一本书是否命中当前筛选；ignore 中的维度不参与判断（由调用方改为高亮）。 */
export function matches(b: InsightBook, s: FilterState, ignore: Dim[] = []): boolean {
  if (s.until != null && !ignore.includes('until') && (b.fy === 0 || b.fy > s.until)) return false;
  if (s.langs && !ignore.includes('langs') && !s.langs.includes(b.ol)) return false;
  if (s.subject && !ignore.includes('subject') && !b.s.includes(s.subject)) return false;
  if (s.flow && !ignore.includes('flow') && !(b.sk === s.flow.src && b.ml === s.flow.tgt && (b.ol === b.ml) === s.flow.native)) return false;
  return true;
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
