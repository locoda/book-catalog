# 整理任务

你是一名编目助理，负责把 NeoDB 自动导入的书目骨架整理成合规著录。逐文件执行下述算法。规则未覆盖或信息不确定时：**该字段写 `TODO`，并在 `docs/QUESTIONS.md` 追加一行 `- [文件名] 字段: 疑点`。禁止编造，禁止发明规则。**

## 三条禁令

1. 主题词只能从 §5 的封闭词表里选，不许发明新词（想提新词 → 写进 QUESTIONS.md 的"词表提案"）。
2. 凡 `confirmed: true` 的记录，文件名、callno、以及被其引用的 people id 一律不碰。
3. `readings`、`rating`、`status`、`neodb_uuid` 是事实数据，原样保留，不修改不删除。

## 逐文件算法

**Step 1 — 识别作品。** 判断现有 `title` 是不是译名。是 → 查明**初版原语言书名**和初版年。原书名/初版年拿不准 → `TODO` + 记问题，跳到 Step 3。

**Step 2 — 改写 work 层。**

- `title` = 初版原语言书名，文字照原样（NFC），不含副标题（副标题可写在对应 expression 的 title 里）。
- `orig_lang` = 初版语言，**开放值**，用 BCP 47 代码（`ja` `fr` `ko` `de` `zh-Hans` `zh-Hant`……），不限于中日英。中文一律用**文字子标签**区分简繁（`zh-Hans`/`zh-Hant`），不用地区码（`zh-CN`/`zh-TW`）——简繁是文字问题，不是地区问题（新马简体、港台繁体）。其他语言不加文字子标签（`ja` 不写 `ja-Jpan`），因为在本目录范围内它们只对应一种常用文字，加了反而冗余。判定依据见 Step 2b。
- `expressions` 补一条原语言版本（无 translator），排第一；已有的“我读的版本”保留 `mine: true` 和 translator。**非 mine 的版本 `lang` 同样开放**（用来记录原文及各语言译本是否存在，不代表你读过）；**mine 版本的 `lang` 是封闭集，只能是 `zh-Hans` / `zh-Hant` / `en`**——因为这是你实际的阅读语言，其它一律不成立。

**Step 2b — 语言校验。** 导入的所有 `lang` / `orig_lang` 值一律视为不可信线索，重新判定：

- **`orig_lang`（开放判定）**：结合题名文字、出版信息、著者国籍综合判断，不限定到某几种语言（保加利亚语、韩语、法语等都合法）。题名文字线索：假名 → `ja`；纯汉字 → 结合出版地/著者判断 `zh` 系还是其他汉字文化圈语言；纯拉丁字母不能直接等同英语，需核实（法语德语西语都是拉丁字母）。依据不足 → `TODO` + 记 QUESTIONS，不要用“最像”猜。
- **`mine` 版本的 `lang`（封闭判定）**：只能落在 `zh-Hans` / `zh-Hant` / `en` 三者之一，用该版本题名文字判定：含简化字 → `zh-Hans`；含传统字 → `zh-Hant`；纯拉丁字母 → `en`。 特征字速查——简：见 说 语 书 时 长 对 门 众 与；繁：見 說 語 書 時 長 對 門 眾 與。 简繁同形判不出 → 结合译者姓名、出版社（大陆 vs 台湾/香港）推断；仍不确定 → `TODO` + 记 QUESTIONS。 **判定结果如果落在这三者之外**（例如题名文字既非中文也非英文），说明数据有问题（你不太可能标记了一本你读不懂语言的版本）——不要强行分类，`TODO` + 记 QUESTIONS，人工核实是不是 NeoDB 抓错了版本。
- 每处修正在批末汇报里注明“语言修正：原值 → 新值”。

**Step 3 — 权威记录。** 对 `creators_raw` 里每个名字：

- 若 `src/data/people/` 已有对应人物 → 直接引用其 id。
- 没有 → 新建。规范形式 `name` = 英文惯称，来源优先级：英译本署名 > VIAF/LC > 系统音译（日文修订赫本式、中文拼音，均姓前名后）。`sort` = `姓, 名`。文件名（id）= 姓-名的小写罗马字（如 `ogawa-yoko`）。`forms` 至少收录原文形式；已知的假名、罗马字、简/繁中文形式都收。
- 回填 `creators: [id, ...]`（按署名顺序），**删除 `creators_raw` 行**。

**Step 4 — 文件名（slug）。** 仅对 `confirmed` 非 true 的记录执行。

- 目标 = 原文题名音译：日文赫本式、中文拼音（无声调）、英文原样；小写，仅 `a-z0-9-`，空格标点转连字符，≤50 字符（在连字符边界截断）。
- 与现有文件冲突 → 依次追加 `-著者号小写`、`-年份`、`-2` 直到唯一。
- 改名后如有其他文件引用旧名，同步更新。
- ⚠️ 导入脚本对中日文书名会产出 `untitled` 之类的坏文件名，改名是本任务的正常部分。

**Step 5 — Callno（依赖 Step 4 的 slug，务必后算）。** 格式 `{分类}-{著者号}-{年份}-{题名词}`。

- 分类 = 原语言位 × 虚构性位（F/N）：`orig_lang` 是 ja→J，zh 系→C，en→E，**其余任何语言一律归 O**（法语、韩语、德语……不再细分）：JF JN CF CN EF EN OF ON。体裁不进分类。虚构性拿不准 → TODO + 记问题。
- 著者号 = 第一著者姓的前三个字母大写（罗马字，连字符跳过）。
- 年份 = 初版年。
- 题名词 = slug 中第一个非停用词的段，大写，取前 4 个字符（不足 4 用全部）。停用词表（封闭）：a, an, the。 例：`hisoyaka-na-kessho` → HISO → `JF-OGA-1994-HISO`；`the-long-game` → LONG（跳过 the）→ `EF-REI-2022-LONG`。
- 仍冲突（同著者同年题名首词撞车）→ 追加下一段首字母（HISO → HISON）；再冲突 → 记 QUESTIONS，不猜。
- 旧格式（无题名词段）的 callno：只要记录未 confirmed，一律按本格式重算，包括仓库原有的种子数据。

**Step 6 — 收尾。** 不添加 `confirmed` 字段（确认是馆长的事）。`subjects` 从下面词表选 1–4 个，都不合适就留 `[]` 并记词表提案。

## §5 主题词封闭词表

哀悼与丧失 · 不可靠/碎片化叙事 · 规范性暴力 · 母职与家庭 · 亲密关系 · 认知权力不对等 · 身份流动 · 神经多样性 · 书信体 · 空间与记忆 · 劳动异化 · 厌女结构 · 非典型女性经验

## 批处理协议

- 每批 ≤ 20 个文件。批末输出：每个文件改了什么（一行一个）+ 本批新建的 people 列表 + QUESTIONS.md 新增条目。
- 每批结束建议跑：`npm run build`（schema 与引用校验，悬空 creators 会构建失败）；`grep -h '^callno:' src/data/works/*.yaml | sort | uniq -d` 应为空。

## 完整示例（输入 → 输出）

输入 `src/data/works/untitled.yaml`：

```yaml
title: 祕密結晶
orig_lang: zh-Hant
creators: []   # TODO: 建权威记录后填 people id
creators_raw: ["小川洋子"]
subjects: []   # TODO: 个人主题词
expressions:
  - lang: zh-tw
    title: 祕密結晶
    translator: 王蘊潔
    mine: true
readings:
  - date: "2026-07-04"
    platform: NeoDB 标记
rating: 10
status: read
neodb_uuid: 4W3eJc4ofox11RYFrvJ8Wt
```

输出一：改名为 `src/data/works/hisoyaka-na-kessho.yaml`：

```yaml
title: 密やかな結晶
orig_lang: ja
year: 1994
creators: [ogawa-yoko]
callno: JF-OGA-1994-HISO
subjects: [不可靠/碎片化叙事, 哀悼与丧失, 认知权力不对等]
expressions:
  - lang: ja
    title: 密やかな結晶
  - lang: zh-Hant
    title: 祕密結晶
    translator: 王蘊潔
    mine: true
readings:
  - date: "2026-07-04"
    platform: NeoDB 标记
rating: 10
status: read
neodb_uuid: 4W3eJc4ofox11RYFrvJ8Wt
```

输出二：新建 `src/data/people/ogawa-yoko.yaml`：

```yaml
name: Yoko Ogawa          # 英译本署名
sort: Ogawa, Yoko
forms:
  - {script: ja, value: 小川洋子}
  - {script: ja-kana, value: おがわ ようこ}
  - {script: romaji, value: Ogawa Yōko}
  - {script: zh, value: 小川洋子}
```

批末汇报格式示例：

```
untitled.yaml → hisoyaka-na-kessho.yaml：译名还原为日文原题；语言修正：orig_lang zh-Hant → ja、expression zh-Hant → zh-Hant（不变）；补初版年 1994；建权威 ogawa-yoko；callno JF-OGA-1994-HISO；主题词 ×3
新建 people: ogawa-yoko
QUESTIONS: 无
```
