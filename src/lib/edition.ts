/** 阅读事件的载体形式：电子书 / 纸质书 / 有声书。 */
export const EDITION_LABELS = {
  ebook: '电子书',
  print: '纸质书',
  audiobook: '有声书',
} as const;

export function editionLabel(edition: keyof typeof EDITION_LABELS): string {
  return EDITION_LABELS[edition] ?? edition;
}
