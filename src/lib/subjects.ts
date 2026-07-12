/**
 * 受控主题词表的唯一读取入口。
 * 单一来源：src/data/subjects.yaml（{slug, name, desc}[]，馆长批准后方可变更）。
 * schema 校验（content.config.ts）与页面（subjects/*、SubjectCloud）都从这里取。
 */
import { parse } from 'yaml';
// ?raw：构建期由 Vite 内联文件内容，避免运行目录差异（fs 路径在 prerender 打包后会失效）
// @ts-ignore -- Vite raw import
import raw from '../data/subjects.yaml?raw';

export interface Subject {
  slug: string;
  name: string;
  desc: string;
}

export const SUBJECTS: Subject[] = parse(raw);

export const SUBJECT_NAMES = new Set(SUBJECTS.map((s) => s.name));
export const bySlug = new Map(SUBJECTS.map((s) => [s.slug, s]));
export const byName = new Map(SUBJECTS.map((s) => [s.name, s]));

/** name → 主题页 URL */
export const subjectUrl = (name: string) =>
  `/subjects/${byName.get(name)?.slug ?? encodeURIComponent(name)}/`;
