/**
 * 语言流向（桑基）布局。纯函数：构建时出静态 SVG，客户端筛选/回放时用同一份代码重排。
 * 桌面版左右两列（原语言 → 我读的），手机版上下两行（原语言按 Callno 四分类聚合）。
 */
import type { FlowData } from './stats';
import { langBucket } from './lang';

type Link = FlowData['links'][number];

/* ---------- 桌面：左右桑基 ---------- */
export const DESK = {
  U: 0.72,          // px / 种
  GAP: 10,          // 节点间距
  NW: 10,           // 节点宽
  X0: 120, X1: 570, // 左右节点 x
  W: 680, PAD: 40,  // 画布窄 → 渲染大
  MIN: 8,           // 节点最小占位（px），保证小节点的标签不互相压住
};

export interface DeskNode { key: string; total: number; y0: number; h: number }
export interface DeskRibbon extends Link { d: string }
export interface DeskLayout { H: number; src: DeskNode[]; tgt: DeskNode[]; ribbons: DeskRibbon[] }

const slot = (total: number, U: number) => Math.max(total * U, DESK.MIN);
const colH = (col: { total: number }[], U = DESK.U) =>
  col.reduce((a, n) => a + slot(n.total, U), 0) + Math.max(0, col.length - 1) * DESK.GAP;

/** 全量数据所需画布高度；筛选时沿用它，图在固定画布里垂直居中、随数据伸缩。 */
export const deskHeight = (f: FlowData) => Math.max(colH(f.sources), colH(f.targets)) + 2 * DESK.PAD;

/**
 * U 可覆盖：筛选后书少时客户端放大单位高度（仍小于全量图），既看得清也看得出增长。
 */
export function deskLayout(f: FlowData, H = deskHeight(f), U = DESK.U): DeskLayout {
  const { GAP, NW, X0, X1 } = DESK;
  const place = (col: { key: string; total: number }[]) => {
    let y = (H - colH(col, U)) / 2;
    return col.map((n) => {
      const h = n.total * U;
      // 节点在占位里垂直居中
      const node = { key: n.key, total: n.total, y0: y + (slot(n.total, U) - h) / 2, h, used: 0 };
      y += slot(n.total, U) + GAP;
      return node;
    });
  };
  const src = place(f.sources), tgt = place(f.targets);
  const sIdx = new Map(src.map((n) => [n.key, n]));
  const tIdx = new Map(tgt.map((n) => [n.key, n]));
  const sOrder = new Map(src.map((n, i) => [n.key, i]));
  const tOrder = new Map(tgt.map((n, i) => [n.key, i]));

  // 流排序：先按 source 列序，再按 target 列序，保证 ribbon 不交叉过甚
  const ordered = [...f.links].sort((a, b) =>
    (sOrder.get(a.source)! - sOrder.get(b.source)!) || (tOrder.get(a.target)! - tOrder.get(b.target)!));
  // 目标侧偏移需按 target 分组、按 source 列序填充
  const byTarget = [...f.links].sort((a, b) =>
    (tOrder.get(a.target)! - tOrder.get(b.target)!) || (sOrder.get(a.source)! - sOrder.get(b.source)!));
  const tOffset = new Map<Link, number>();
  for (const l of byTarget) {
    const t = tIdx.get(l.target)!;
    tOffset.set(l, t.y0 + t.used);
    t.used += l.value * U;
  }

  const XM = (X0 + NW + X1) / 2;
  const ribbons = ordered.map((l) => {
    const s = sIdx.get(l.source)!;
    const sy = s.y0 + s.used;
    s.used += l.value * U;
    const ty = tOffset.get(l)!;
    const h = l.value * U;
    return {
      ...l,
      d: `M${X0 + NW},${sy.toFixed(1)} C${XM},${sy.toFixed(1)} ${XM},${ty.toFixed(1)} ${X1},${ty.toFixed(1)} ` +
         `L${X1},${(ty + h).toFixed(1)} C${XM},${(ty + h).toFixed(1)} ${XM},${(sy + h).toFixed(1)} ${X0 + NW},${(sy + h).toFixed(1)} Z`,
    };
  });
  const strip = ({ used, ...n }: DeskNode & { used: number }) => n;
  return { H, src: src.map(strip), tgt: tgt.map(strip), ribbons };
}

/* ---------- 手机：上下桑基 ---------- */
export const MOB = { W: 360, P: 14, NH: 22, G: 4, RH: 200, TOP: 72 };
export const MOB_BOT = MOB.TOP + MOB.NH + MOB.RH;
export const MOB_H = MOB_BOT + MOB.NH + 40;
const MOB_MID = (MOB.TOP + MOB.NH + MOB_BOT) / 2;

export interface MobNode { key: string; total: number; x0: number; w: number }
export interface MobRibbon extends Link { d: string }
export interface MobLayout { src: MobNode[]; tgt: MobNode[]; ribbons: MobRibbon[] }

/** 原语言按 bucket 聚合：中 / 日 / 英 / 其他（节点少不叠） */
const mobSourceKey = (k: string) => (k === 'other' ? 'other' : langBucket(k));

/** 手机版节点最小宽度（px）：小节点也要放得下标签 */
const MOB_MIN_W = 40;

export function mobLayout(f: FlowData): MobLayout {
  const { W, P, G } = MOB;
  const totals = new Map<string, number>();
  for (const s of f.sources) totals.set(mobSourceKey(s.key), (totals.get(mobSourceKey(s.key)) ?? 0) + s.total);
  const sources = ['zh', 'ja', 'en', 'other']
    .filter((b) => totals.has(b))
    .map((b) => ({ key: b, total: totals.get(b)! }))
    .sort((a, b) => b.total - a.total)
    .sort((a, b) => (a.key === 'other' ? 1 : 0) - (b.key === 'other' ? 1 : 0));

  const linkMap = new Map<string, Link>();
  for (const l of f.links) {
    const src = mobSourceKey(l.source);
    const k = `${src}→${l.target}`;
    const ex = linkMap.get(k);
    if (ex) { ex.value += l.value; ex.native = ex.native && l.native; }
    else linkMap.set(k, { source: src, target: l.target, value: l.value, native: l.native });
  }
  const links = [...linkMap.values()];

  // 每个节点先保底 MOB_MIN_W，剩余带宽按册数比例分配
  const row = (col: { key: string; total: number }[]) => {
    const band = W - 2 * P - (col.length - 1) * G;
    const all = col.reduce((a, n) => a + n.total, 0) || 1;
    const floor = Math.min(MOB_MIN_W, band / Math.max(1, col.length));
    const rest = band - floor * col.length;
    let x = P;
    return col.map((n) => {
      const w = floor + (n.total / all) * rest;
      const node = { key: n.key, total: n.total, x0: x, w, used: 0 };
      x += w + G;
      return node;
    });
  };
  const src = row(sources), tgt = row(f.targets);
  const sOrder = new Map(src.map((n, i) => [n.key, i]));
  const tOrder = new Map(tgt.map((n, i) => [n.key, i]));
  const sMap = new Map(src.map((n) => [n.key, n]));
  const tMap = new Map(tgt.map((n) => [n.key, n]));

  // 目标侧偏移
  const byTgt = [...links].sort((a, b) =>
    (tOrder.get(a.target)! - tOrder.get(b.target)!) || (sOrder.get(a.source)! - sOrder.get(b.source)!));
  const tOffset = new Map<Link, number>();
  for (const l of byTgt) {
    const t = tMap.get(l.target)!;
    tOffset.set(l, t.x0 + t.used);
    t.used += (l.value / t.total) * t.w;
  }

  const ordered = [...links].sort((a, b) =>
    (sOrder.get(a.source)! - sOrder.get(b.source)!) || (tOrder.get(a.target)! - tOrder.get(b.target)!));
  const topY = MOB.TOP + MOB.NH, botY = MOB_BOT;
  const ribbons = ordered.map((l) => {
    const s = sMap.get(l.source)!;
    const sx = s.x0 + s.used;
    const sw = (l.value / s.total) * s.w;
    s.used += sw;
    const tx = tOffset.get(l)!;
    const t = tMap.get(l.target)!;
    const tw = (l.value / t.total) * t.w;
    return {
      ...l,
      d: `M${sx.toFixed(1)},${topY} C${sx.toFixed(1)},${MOB_MID} ${tx.toFixed(1)},${MOB_MID} ${tx.toFixed(1)},${botY} ` +
         `L${(tx + tw).toFixed(1)},${botY} C${(tx + tw).toFixed(1)},${MOB_MID} ${(sx + sw).toFixed(1)},${MOB_MID} ${(sx + sw).toFixed(1)},${topY} Z`,
    };
  });
  const strip = ({ used, ...n }: MobNode & { used: number }) => n;
  return { src: src.map(strip), tgt: tgt.map(strip), ribbons };
}
