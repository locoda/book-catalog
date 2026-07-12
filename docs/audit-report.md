# 全库机器核查报告 · 2026-07-12

由 `node scripts/audit.mjs --report` 生成。核查范围：493 条 works，326 条 people；已 confirmed：493。

## 问题明细

### P1（1 项）

- [ ] `people/hobo-nikkan-itoi-shinbun`：sort「HOBO日刊ITOI新聞」非「姓, 名」格式

## edition 回填清单

共 0 条。填法：在对应 work 的 `readings[].edition` 写 `ebook` / `print` / `audiobook`；不确定留空。
