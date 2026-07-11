# 确认作业手册 · Confirm Playbook

**给 AI 执行者的自成一体操作手册。** 目标：把全库未 `confirmed` 的 work 记录逐批联网核实，产出证据链，经馆长（Linda）批准后写入 `confirmed: true`，使其标识符永久冻结（CATALOGING §0.2）。

配套文档：字段规则见 `docs/CATALOGING.md`（唯一著录依据）；核查方法论与教训见 `docs/VERIFICATION.md`；进度记录在 `docs/confirm-progress.md`。

---

## 0. 执行者须知（先读，全程有效）

1. **CATALOGING §0 四条禁令全程有效**：不发明主题词；confirmed 记录标识符冻结；不猜（拿不准写 QUESTIONS）；事实数据（readings/rating/status/neodb_uuid）原样保留。
2. **`confirmed: true` 只能在馆长批准某一批之后写入。** 执行者的产出是"核实报告"，不是直接确认。馆长回复"批准 batch N"（或指出哪几条除外）后，才把该批通过的记录加上 `confirmed: true`。
3. **核实 ≠ 反推。** 历史教训（VERIFICATION.md 开头）：从中文译名反推原文书名，七成是编造的。每个结论必须有一手来源链接；找不到来源就如实说"未找到"，不许用"看起来合理"的值。
4. 机器可查的格式规则（callno 算法、语言代码、slug、词表）已由 `npm run audit` 保证，**不在本手册核实范围内**——你要核的是机器查不了的事实。

## 1. 每条记录核实四件事

| # | 核什么 | 常见错误形态 |
|---|---|---|
| V1 | `title` 是否真是**初版原语言书名**（文字照原样，NFC，不含副标题） | 记录里存的是中文译名/英译名；假名书名被写成汉字形态；副标题混入 |
| V2 | `year` 是否真是**初版年**（不是所读版本出版年、不是文库本年） | 记录的是译本年或再版年（此前 A7 修正的 20 条即此类残留） |
| V3 | `creators` 指向的 people 记录是否对（真是这本书的著者；people 的 `name` 英文惯称、`sort`、`forms` 原文形式拼写无误） | 同名异人；罗马字拼法错；英文惯称用了非通行形式 |
| V4 | callno 分类位的 **F/N（虚构性）**归类是否合理（按出版方归类；自传体小说等拿不准 → 记 QUESTIONS，不改） | 散文/随笔被标 F；自传体小说争议 |

`orig_lang`、expressions 结构、主题词**不需要**逐条重核（audit 已查格式；主题词是馆长的编目判断）。核 V1 时如果顺带发现 orig_lang 错了，按 §4 修正流程处理。

### 1b. people 权威记录同步确认

people 记录也走"核实 → 馆长批准 → `confirmed: true`"（id 即文件名，冻结依据同 §0.2）。**不单开清单**：确认某条 work 时，把其 `creators` 引用的、尚未 confirmed 的 people 一并核实，报告里单列一节。每条 person 核四件事：

| # | 核什么 | 常见错误形态 |
|---|---|---|
| P-V1 | `name` 英文惯称是否通行（来源优先级：英译本版权页署名 > VIAF/LC > 系统音译，见 CATALOGING §3） | 用了非通行罗马字方案；姓名序错 |
| P-V2 | `sort` 的「姓, 名」切分是否正确 | 复姓/双名切错；单名/团体著者误加逗号（sort === name 为合法豁免形态） |
| P-V3 | `forms` 至少含原文形式且拼写无误 | 原文名漏收；假名/汉字写错 |
| P-V4 | 身份唯一：没有同一人两条 id，也没有同名异人共用一条 | 译名不同导致重复建档；同名作家混淆 |

同一 person 只核一次，confirmed 后后续批次直接跳过。全部 works 做完后，扫一遍未被任何 work 引用且未 confirmed 的 people（孤儿记录），逐条核实或提请馆长删除。

## 2. 来源优先级

按语言选一手书目来源，**不要只信中文自媒体/豆瓣条目转述**：

- 日语：出版社官网（新潮社、講談社、文藝春秋……）、Amazon.co.jp、国立国会图书馆 NDL Search
- 中文：出版社官网、豆瓣（仅作线索）、博客來/誠品（繁体）、国家图书馆
- 英语：出版社官网、Worldcat、LC Catalog
- 韩语：알라딘 (aladin.co.kr)、교보문고
- 欧洲语言：原版出版社官网（Gallimard、Suhrkamp、Einaudi……）、Worldcat
- 著者权威：VIAF、LC Name Authority、Wikipedia 各语言版（互证）

初版年判定要点：出版社页/书目页标注的是**该版本**年份，需区分「初版 première édition / 単行本初版 / first edition」与文库本、新装版、译本。Wikipedia 作品条目通常直接给初版年，可用但需与书目来源互证。

## 3. 批处理协议

1. **批大小 ≤ 15 条。** 从 `docs/confirm-progress.md` 顶部第一个未勾选的记录开始，按清单顺序取。
2. 每条产出一行核实结论，格式固定：

   ```
   | slug | 字段 | 记录值 | 核实结果 | 来源 | 结论 |
   ```

   `结论` 三选一：`一致` / `建议修正为 X` / `不确定（已记 QUESTIONS）`。四件事（V1–V4）没问题可合并为一行写「V1–V4 一致」。
3. 批末输出：**核实报告**（上表）+ 修正清单（如有）+ QUESTIONS 新增条目。等馆长批复。
4. 馆长批复后：
   - 「批准」的记录 → 文件加一行 `confirmed: true`（放在 `status` 行附近即可，位置不影响 schema）。
   - 需修正的 → 先按 §4 修正，修正后的记录**下一批**再提请确认（改过的东西要再看一眼，不当批自证）。
5. 在 `docs/confirm-progress.md` 勾掉已确认条目，并在文件顶部「批次日志」加一行：日期、batch 编号、范围、确认数、修正数。

## 4. 修正流程（核实发现错误时）

1. 该记录未 confirmed，标识符可改，但有联动义务：
   - 改 `title`/`orig_lang` → slug 可能要按 CATALOGING §5 重算（改文件名）；callno 分类位/题名词随之重算（§4）。
   - 改 `year` → callno 年份段重算。
   - 改 people id → 同步更新所有引用该 id 的 works。
2. 改完跑：`npm run validate`（必须 0 ERROR）+ `npm run audit`（不得引入新问题）。
3. 每处修正记入 `docs/QUESTIONS.md`「已解决」节：文件名、改了什么、依据来源链接。
4. 大规模改动后跑 `npm run build` 全量验证（本地 node_modules 跨系统问题见 VERIFICATION.md §3 的临时目录办法）。

## 5. 边界情形

- **找不到任何可靠来源**：结论写「不确定」，QUESTIONS 记一条，**不改不确认**，继续下一条。
- **来源互相矛盾**（如 Wikipedia 与出版社页年份不一）：取书目级来源（NDL/Worldcat/出版社），报告里注明矛盾。
- **团体/单名著者**（sort === name，如 NHK 取材班、Qiaomai、Uketsu）：属馆长已裁决的合法形态，V3 只核对应关系，不动格式。
- **creators 为空**（多人合集等）：馆长已裁决可留空，V3 跳过，其余照核。
- **发现重复 work**：按 VERIFICATION.md §2 合并规则处理，合并结果下一批提请确认。
- **placeholder: true 的记录**：跳过不确认，等真实数据。

## 6. 完成标准

`docs/confirm-progress.md` 全部勾完；`npm run audit` 0 问题；`npm run validate` 0 ERROR；QUESTIONS.md 里没有悬而未决的本作业条目。
