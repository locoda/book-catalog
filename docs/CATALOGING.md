# 著录规范 · Cataloging Rules

**版本 v0.13（版本记录见 §8）· 本文档是本目录唯一的著录依据。**

本文档的目标读者包括 AI。所有规则写成可机械执行的形式；执行者（人或 AI）在规则未覆盖的情形下**必须停下标记问题，不允许自行发明规则**。

- 处理生数据、把 NeoDB 骨架变成合规著录 → 流程见 §9。
- 著录已完成，要复核有没有语言/年份/重复之类的错误 → 流程见 `docs/VERIFICATION.md`。

---

## 0. 执行者四条禁令

1. **不发明主题词。** 只能使用 §6 词表中已有的词。认为需要新词时，写入 `docs/QUESTIONS.md` 的"词表提案"节，附理由，等人批准。
2. **`confirmed: true` 的记录，标识符冻结。** 每条记录有 `confirmed` 标志（默认 `false`）。未确认期间，slug / callno / people id 可以自由修正——但改 people id 必须同步更新所有引用它的 works，然后跑 `npm run build`（悬空引用会构建失败，这是安全网）。一旦馆长将记录置为 `confirmed: true`，其标识符永久冻结，即使按新规则算出来"应该"是别的值；此后 AI 只能修改非标识符字段。页面上未确认记录会带「草」字标记。
3. **不猜。** 任何字段拿不准（原语言判断、初版年、著者对应关系……），在该字段写 `TODO`，并在 `docs/QUESTIONS.md` 记一条：文件名 + 字段 + 疑点。宁可留空，不可编造。
4. **事实数据原样保留。** `readings`、`rating`、`status`、`neodb_uuid` 是导入留痕的事实数据，不修改不删除；需要修正时走 `docs/VERIFICATION.md` 的受控流程。

---

## 1. 记录类型与位置

| 类型 | 位置 | 一条 = |
|---|---|---|
| work | `src/data/works/{slug}.yaml` | 一个抽象作品（不是一个版本） |
| person | `src/data/people/{id}.yaml` | 一个人（所有语言的名字归拢于一条） |

机器 schema 在 `src/content.config.ts`，`npm run build` 即校验。

## 2. Work 著录

- **title（规范题名）= 初版原语言书名，文字照原样，不翻译、不音译、不简化**（`流浪の月` 不写 `流浪之月`；`女ぎらい` 不写全副标题，副标题进 expressions 的完整题名）。Unicode 一律 NFC 规范化。
- **orig_lang**：初版语言，BCP 47 代码。`ja` / `en`；**中文用文字子标签区分简繁**——`zh-Hans`（简体）/ `zh-Hant`（繁体），不用地区码（`zh-CN`/`zh-TW`），因为简繁是文字问题不是地区问题（新马简体、港台繁体）。其他语言用纯语言代码（`fr` `ko` `de`……），**不**额外加文字子标签（不写 `ja-Jpan`）——这些语言在本目录范围内只对应一种常用文字，加了是冗余，不符合 BCP47 的 Suppress-Script 惯例。
- **year**：初版年（不是你读的版本的出版年）。查不到 → `TODO`。
- **creators**：people id 数组，顺序照初版署名。**只允许引用已存在的 people 记录**；对应记录不存在 → 先建 person（§3），再回填。多人合集等无单一责任著者时可留空数组（馆长裁决 2026-07-10），此时 callno 著者号写 `UNK`。
- **expressions**：每个语言层版本一条；`mine: true` 恰好标在实际读过的版本上（读过多个版本可多个 mine）。译者写在版本上。非 mine 版本的 `lang` 开放取值（记录该译本客观存在的语言）；**`mine: true` 的 `lang` 是封闭集，只能是 `zh-Hans` / `zh-Hant` / `en`**——这是馆长实际的阅读语言，其它一律不成立，出现即视为数据错误。
- **readings**：阅读事件，`date` 用 `YYYY-MM-DD` 或 `YYYY-MM`。占位/示意数据必须在 work 上标 `placeholder: true`。`edition`（可选）记录载体形式——`ebook`/`print`/`audiobook` 三选一封闭枚举，取代了早期版本里几乎全员写"NeoDB 标记"、没有信息量的 `platform` 字段；不确定就留空，不猜，遇到再补。
- **rating**：NeoDB 十分制原值，不换算。
- **subjects**：见 §6。

> 显示层：作品详情页大标题显示「你读的版本」（`mine: true` 的题名），原语言规范题名降级为副标题（页面模板决定，与规范形式无关；改显示不需要动数据）。首页语言分面按 Callno 的四分类（中/日/英/其他）呈现，不逐语言列出。

## 3. 权威记录（person）

- **name（规范形式）= 英文惯称**，来源按优先级取第一个可得的：
  1. 英译本版权页署名（如 `Yuu Nagira` 就写 `Yuu Nagira`，名序照版权页）；
  2. VIAF / LC 权威档中的英文形式；
  3. 无英译时系统音译：日文用修订赫本式（姓 名 序），中文用汉语拼音（姓 名 序）。
- **sort**：`姓, 名` 形式的排序键（`Murata, Sayaka`）。单名或团体著者无姓名可分（Qiaomai、Uketsu、NHK「女性の貧困」取材班），`sort` 原样等于 `name` 不倒置（馆长裁决 2026-07-10）——机器核查以 `sort === name` 识别此豁免。
- **forms**：收录所有见过的形式——原文、假名、罗马字、中文译名等，`script` 标 `ja` / `ja-kana` / `romaji` / `zh` / `en`。原文形式必须收录。
- **id（=文件名）**：规范形式的 slug 化（§5 规则），`姓-名` 顺序：`murata-sayaka`。

> 显示层默认展示原文名（页面模板决定），与规范形式无关；改显示不需要动数据。

## 4. Callno

格式：`{分类}-{著者号}-{年份}-{题名词}`

- **分类**：两位封闭代码 = 原语言位 × 虚构性位。
  | | 虚构 F | 非虚构 N |
  |---|---|---|
  | 日 J | JF | JN |
  | 中 C | CF | CN |
  | 英 E | EF | EN |
  | 其他 O | OF | ON |
  体裁（romance / SF / 散文诗……）一律不进分类，进 subjects。虚构性拿不准（如自传体小说）→ 按出版方归类；再拿不准 → TODO + 记问题。
- **著者号**：第一著者 sort 键姓的前三个字母，大写（`Murata, Sayaka` → `MUR`；`El-Mohtar, Amal` → `ELM`，连字符跳过）。
- **年份**：初版年。
- **题名词**：从 slug 第一个非停用词段起，顺次连接各段字符，取前 4 个字符，大写；连接完仍不足 4 才允许短于 4。停用词表（封闭）：`a` `an` `the`。
  - 例：`hisoyaka-na-kessho` → `HISO`；`the-long-game` → `LONG`（跳过 the）；`el-tunel` → `ELTU`（el 不在停用词表，不足 4 用后续段补）；`5-de-gai-bian` → `5DEG`；`ai-lian` → `AILI`。
- **冲突处理**（同分类同著者号同年题名首词撞车）：追加 slug 下一段首字母（`HISO` → `HISON`）；再冲突 → 记 `docs/QUESTIONS.md`，不猜。
- **永不重排**：一旦分配，即使后续记录变动也不回溯调整既有 callno。`confirmed: true` 记录的 callno 永久冻结（§0.2）。
- 旧格式（无题名词段、或用小写 workmark 字母）的 callno：只要记录未 confirmed，一律按本格式重算，包括仓库原有的种子数据。

## 5. Slug（work 文件名 = URL）

1. 来源：规范题名的音译。日文 → 修订赫本式；中文 → 拼音（无声调）；英文 → 原样。
2. 归一化：小写；仅保留 `a-z0-9` 和连字符；空格与标点转连字符；连续连字符合并。
3. **长度 ≤ 50 字符**，超出时在最后一个完整连字符边界截断（不得截半个词）。
4. 冲突处理（依次尝试直到唯一）：追加 `-{著者号小写}` → 追加 `-{年份}` → 追加 `-2`。
5. 冠词不删（*the-long-game* 保留 the），规则简单优先。
6. 一经发布永不改名。

## 6. 主题词表（受控）

现行词表 v3（28 词）。每词三要素：**name**（显示名，works 的 `subjects` 字段写它）、**slug**（主题页 URL，一经发布冻结）、**desc**（一句话释义，标引时的判断依据）：

| name | slug | desc |
|---|---|---|
| 悬而未名 | `unnamed` | 拒绝归类的关系：友达以上，恋人未满，或无从命名 |
| 余烬未冷 | `embers` | 爱熄灭之后——失恋、离散、旧情残温 |
| 并肩而孤 | `alone-together` | 亲密关系内部的孤独：同床异梦，相对无言 |
| 心动症候 | `flutter` | 心动与热恋进行时：暧昧、试探、坠入 |
| 故地重游 | `old-haunts` | 记忆与空间的交织：旧地、故乡、往事的地貌 |
| 市井烟火 | `street-life` | 街头巷尾的普通人间：小店、邻里、城市烟火 |
| 与丧失同居 | `living-with-loss` | 哀悼是长期同居而非节点：丧亲之后的日常 |
| 脱稿的她们 | `off-script` | 不按社会剧本生活的女性：不婚、出走、重来 |
| 解剖父权 | `patriarchy` | 厌女、性别暴力与父权结构的批判性检视 |
| 谁在定义现实 | `who-defines-reality` | 煤气灯、话语权与认知操纵：现实由谁说了算 |
| 职场浮生 | `nine-to-five` | 劳动、职场与被工作定形的生活 |
| 血缘引力 | `kinship` | 家庭、母职、代际之间的拉扯与羁绊 |
| 成为自己 | `becoming` | 身份的流动与自我构建：性别、族裔、阶层的位移 |
| 叙事迷宫 | `narrative-maze` | 不可靠叙事、碎片结构、需要破解的文本 |
| 书页背后 | `backstage` | 关于书的书：作家、编辑、书店、阅读本身 |
| 见字如面 | `letters` | 书信体与往来通信 |
| 机关重重 | `contraption` | 谜题、诡计与精密的叙事装置 |
| 练习告别 | `rehearsing-farewell` | 终活、临终与身后事：如何练习离开 |
| 诊疗室 | `on-the-couch` | 心理咨询、精神分析与自我修复 |
| 欲望旷野 | `wilderness` | 非规范的欲望与性：越界、禁忌、身体 |
| 异频心智 | `neurodivergent` | 神经多样性：与主流不同步的心智 |
| 观看之道 | `ways-of-seeing` | 视觉、艺术与如何观看（致敬 Berger） |
| 不事生产 | `idle` | 反生产力：休息、怠工、拒绝内卷 |
| 概念急救箱 | `concept-kit` | 哲学与理论的应急工具箱 |
| 一餐一饭 | `daily-bread` | 食物、烹饪与餐桌上的生活 |
| 举重若轻 | `light-and-heavy` | 以轻盈笔触承载沉重主题 |
| 非人尺度 | `nonhuman` | 动物、植物、机器与超越人类的视角 |
| 老之将至 | `late-life` | 衰老、照护与生命末段的样子 |

- 每条 work 标 **1–4 个**词（写 name），宁缺毋滥；一个都不合适 → 留空数组 + 记词表提案。
- 词表变更只能由馆长（Linda）批准；批准后在 `src/data/subjects.yaml` 与本节同步增删，并在 §8 版本记录里记一行。name 可随批准改，slug 一经发布不改（URL 稳定性）。
- **机器可读单一来源是 `src/data/subjects.yaml`**（`{slug, name, desc}` 列表）——schema 经 `src/lib/subjects.ts` 读取，`scripts/validate.mjs` 直接读取；词表外的主题词会阻断构建。本表为人读镜像。

## 7. 机器校验清单

执行完一批著录后必须全部通过：

- [ ] `npm run build` 通过（schema 校验）
- [ ] 所有 `creators` 中的 id 在 `src/data/people/` 均存在
- [ ] callno 全库唯一（`grep -h '^callno:' src/data/works/*.yaml | sort | uniq -d` 为空）
- [ ] slug（文件名）全库唯一（文件系统天然保证）
- [ ] 不存在未记录进 QUESTIONS.md 的 `TODO`
- [ ] 本批次未改动任何 `confirmed: true` 记录的文件名 / callno / id

## 8. AI 批处理作业协议

给 AI 整理全库时，按此流程：

1. 逐文件处理 `src/data/works/`，对照 §2–§6 修正字段；`creators_raw` 存在时据其建立/关联权威记录后删除该字段。未确认记录可按规则改名/改 callno（同步更新引用）；`confirmed: true` 的记录标识符一律不碰（§0.2）。
2. 每批 ≤ 20 个文件；批末输出变更摘要（文件 × 改了什么 × 依据哪条规则）。
3. 全部疑点集中写 `docs/QUESTIONS.md`，格式：`- [文件名] 字段: 疑点一句话`。
4. 跑 §7 校验清单，贴结果。
5. 禁令（§0）全程有效。

## 9. 编目作业流程

完整流水线：**导入 → 编目（草稿区内）→ 迁入 → 校验 → 确认**。编目在草稿区就地完成，`works/` 永远只见成品；编目时查证原题/初版年留下的来源证据，直接复用为确认依据——**一次查证，两个产出**。

```
NeoDB API
  │  import_neodb.mjs
  ▼
src/data/works-draft/     ← 草稿区（不受 Astro 扫描，不影响构建）
  │  就地编目（§9.1 算法，原题/初版年必须带来源链接）
  ▼
promote.mjs                ← 校验 slug/UUID/结构后移入正式目录
  │
src/data/works/            ← 正式目录（只收成品）
  │  validate.mjs → build   ← 阻断性校验 + npm run audit
  ▼
confirmed: true            ← 馆长批准后写入，标识符永久冻结（§9.4）
```

### 9.0 导入与迁入

**导入**（`scripts/import_neodb.mjs`）：
- 从 NeoDB 拉取标记，生成 work YAML 骨架写入 `src/data/works-draft/`（默认）。
- 增量模式：读取 `scripts/.import-state.json` 记录的上次导入位置，仅拉取新增条目。
- `--force` 忽略 checkpoint 全量重拉；`--out src/data/works` 可跳过草稿直入正式目录（兼容旧流程）。
- 导入脚本不验证书目质量——`creators` 留空、`subjects` 留空、`orig_lang` 可能不准，这些是后续编目步骤的事。

**编目**（草稿区内，§9.1 算法）：
- `node scripts/promote.mjs --list` 查看待办。每批 ≤ 10 条（编目比复核重）。
- 在 `works-draft/` 内就地完成全部编目步骤后再迁入；查不到原题/初版年 → 字段写 `TODO` + 记 QUESTIONS，留在草稿区待补，**不带病迁入**。

**迁入**（`scripts/promote.mjs`）：
- `--slug <name>` 迁入单本；`--all` 迁入全部。
- 迁入前自动校验：slug 冲突、UUID 冲突、title/orig_lang 不为空或 TODO；失败拒绝迁入并列出原因。
- **UUID 冲突的正确解读**：通常说明这是已有 work 的另一语言版本或重复标记，不是新书——按 VERIFICATION.md §2 合并规则并入已有记录（版本进 expressions、readings 保留），删除草稿，批末报告注明。
- 迁入成功 = 文件从 `works-draft/` 移动到 `works/`（非复制）。迁入后跑 `npm run validate` + `npm run audit`，必须干净。

> 本节是操作流程；字段规则依据仍在 §2–§6，不在此重复。§0 四条禁令全程有效。

### 9.1 逐文件算法

**Step 1 — 识别作品。** 判断现有 `title` 是不是译名。是 → 查明初版原语言书名和初版年（§2 规则）。**原题与初版年必须带一手来源链接**（来源优先级见 VERIFICATION.md §1），这份证据在批末报告里复用为确认依据——核实 ≠ 反推，历史教训是反推的原题七成是编造的。拿不准 → `TODO` + 记 `docs/QUESTIONS.md`，跳到 Step 3。

**Step 2 — 改写 work 层。**

- `title` = 初版原语言书名，文字照原样（NFC），不含副标题（§2）。
- `orig_lang` = 初版语言，BCP 47 开放值（§2）。
- `expressions` 补一条原语言版本（无 translator）排第一；已有的"我读的版本"保留 `mine: true`。`mine` 版本 `lang` 封闭集 = `zh-Hans` / `zh-Hant` / `en`（§2）。

**Step 2b — 语言校验。** 导入的 `lang` / `orig_lang` 值一律视为不可信线索，重新判定：

- **orig_lang（开放判定）**：结合题名文字、出版信息、著者国籍综合判断，不限定到某几种语言（保加利亚语、韩语、法语等都合法）。题名文字线索：假名 → `ja`；纯汉字 → 结合出版地/著者判断 `zh` 系还是其他汉字文化圈语言；纯拉丁字母不能直接等同英语，需核实（法语德语西语都是拉丁字母）。依据不足 → `TODO` + 记 QUESTIONS，不要用"最像"猜。
- **mine 版本的 lang（封闭判定）**：只能落在 `zh-Hans` / `zh-Hant` / `en` 三者之一，用该版本题名文字判定：含简化字 → `zh-Hans`；含传统字 → `zh-Hant`；纯拉丁字母 → `en`。特征字速查——简：见 说 语 书 时 长 对 门 众 与；繁：見 說 語 書 時 長 對 門 眾 與。简繁同形判不出 → 结合译者姓名、出版社（大陆 vs 台湾/香港）推断；仍不确定 → `TODO` + 记 QUESTIONS。**判定结果如果落在这三者之外**（例如题名文字既非中文也非英文），说明数据有问题——不要强行分类，`TODO` + 记 QUESTIONS，人工核实是不是 NeoDB 抓错了版本。
- 每处修正在批末汇报里注明"语言修正：原值 → 新值"。

**Step 3 — 权威记录。** 对 `creators_raw` 里每个名字：

- 若 `src/data/people/` 已有对应人物 → 直接引用其 id。
- 没有 → 按 §3 新建。规范形式 `name` = 英文惯称，来源优先级：英译本署名 > VIAF/LC > 系统音译（日文修订赫本式、中文拼音，均姓前名后）。`sort` = `姓, 名`。文件名（id）= `姓-名` 的小写罗马字（如 `ogawa-yoko`）。`forms` 至少收录原文形式；已知的假名、罗马字、简/繁中文形式都收。
- 回填 `creators: [id, ...]`（按署名顺序），**删除 `creators_raw` 行**。

**Step 4 — 文件名（slug）。** 仅对 `confirmed` 非 true 的记录执行，规则见 §5。⚠️ 导入脚本对中日文书名会产出 `untitled` 之类的坏文件名，改名是本流程的正常部分；改名后如有其他文件引用旧名，同步更新。

**Step 5 — Callno。** 依赖 Step 4 的 slug，务必后算，规则见 §4。

**Step 6 — 收尾。** 不添加 `confirmed` 字段（确认是馆长的事）。`subjects` 从 §6 词表选 1–4 个，都不合适就留 `[]` 并记词表提案。

### 9.2 批处理协议

按 §8 执行：批末输出变更摘要（§9.3 格式）+ 新建 people 列表 + **原题/初版年证据表**（`| slug | 字段 | 记录值 | 核实结果 | 来源 | 结论 |`）+ QUESTIONS 新增条目，跑 §7 校验清单。然后等馆长批复，进入 §9.4。

### 9.3 完整示例（输入 → 输出）

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
    edition: ebook
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
subjects: [叙事的迷宫, 与丧失同居, 谁在定义现实]
expressions:
  - lang: ja
    title: 密やかな結晶
  - lang: zh-Hant
    title: 祕密結晶
    translator: 王蘊潔
    mine: true
readings:
  - date: "2026-07-04"
    edition: ebook
rating: 10
status: read
neodb_uuid: 4W3eJc4ofox11RYFrvJ8Wt
```

输出二：新建 `src/data/people/ogawa-yoko.yaml`：

```yaml
name: Yoko Ogawa
sort: Ogawa, Yoko
forms:
  - {script: ja, value: 小川洋子}
  - {script: ja-kana, value: おがわ ようこ}
  - {script: romaji, value: Ogawa Yōko}
  - {script: zh, value: 小川洋子}
```

批末汇报格式示例：

```
untitled.yaml → hisoyaka-na-kessho.yaml：译名还原为日文原题；语言修正：orig_lang zh-Hant → ja；补初版年 1994；建权威 ogawa-yoko；callno JF-OGA-1994-HISO；主题词 ×3
新建 people: ogawa-yoko
QUESTIONS: 无
```

### 9.4 确认与冻结（confirm）

编目批次经馆长批复后收尾。`confirmed: true` **只能在馆长批准后写入**（回复"批准 batch N"或指出例外）；执行者的产出是带证据的报告，不是直接确认。

- 批准的 work 加一行 `confirmed: true`（放 `status` 行附近即可）；本批新建/引用的未确认 people 一并核实提请（`name` 英文惯称是否通行、`sort` 切分、`forms` 含原文、身份唯一无重复建档），批准后同样加 `confirmed: true`。同一 person 只核一次。
- 需修正的条目：先修正（标识符联动——改 title/orig_lang/year → slug/callno 按 §4/§5 重算；改 people id → 同步所有引用），**下一批**再提请确认，不当批自证。
- 确认后即冻结（§0.2）：slug / callno / people id 永不再改，内容字段仍可经 VERIFICATION 受控流程修正。

**边界情形**：找不到可靠来源 → 不改不确认，记 QUESTIONS；来源矛盾 → 取书目级来源（NDL/Worldcat/出版社官网），报告注明；`placeholder: true` → 跳过确认；`creators` 留空与 `sort === name` 是馆长已裁决的合法形态（§2/§3），不按错误处理。

## 版本记录

- v0.13（2026-07-11）文档合并（馆长批准）：CONFIRMATION.md（原 CONFIRM-PLAYBOOK）退役——存量核实作业已完成（493/493 confirmed + edition 全回填），其增量流程并入本文档 §9（§9.0 改为"草稿区内编目→promote 成品"，Step 1 增加原题/初版年必须带来源链接的硬要求，新增 §9.4 确认与冻结），核实方法论与来源优先级并入 VERIFICATION.md §1。两条馆长裁决沉淀进规范：creators 可留空（§2）、单名/团体著者 sort === name 豁免（§3）。docs/ 回到三件套：CATALOGING / VERIFICATION / QUESTIONS。
- v0.12（2026-07-11）主题词表 v3（馆长批准）：告别"XX的XX"句式，全表 28 词换为多样句式并新增 slug + 一句话释义；`subjects.yaml` 改为 `{slug, name, desc}` 结构，新增 `src/lib/subjects.ts` 统一读取入口；主题页 URL 从中文题名改为 slug（如 `/subjects/embers/`），词表页重写为释义卡片，主题详情页显示释义。含义与 v2 一一对应，仅换名不重标：未命名的关系→悬而未名、爱的余烬→余烬未冷、并肩的孤独→并肩而孤、心动配方→心动症候、记忆的地形→故地重游、街角的人间→市井烟火、不按剧本的她们→脱稿的她们、父权的解剖→解剖父权、打卡的灵魂→职场浮生、血缘的引力→血缘引力、我是谁的练习→成为自己、叙事的迷宫→叙事迷宫、文学的后台→书页背后、精巧的圈套→机关重重、沙发上的自我→诊疗室、欲望的旷野→欲望旷野、不同频的大脑→异频心智、观看的训练→观看之道、怠工的自由→不事生产、轻盈的重量→举重若轻、老年的形状→老之将至；与丧失同居/谁在定义现实/见字如面/练习告别/概念急救箱/一餐一饭/非人尺度 7 词保留。
- v0.11（2026-07-11）在读（progress）不入目录（馆长裁决）：读完才编目。`status` 枚举去掉 `reading`（现存数据无一使用）；导入脚本仅拉 complete/wishlist，workflow 与页面在读标记同步移除。附带修复导入脚本：增量停止改为「uuid 精确 + 日期兜底」双条件（原日期兜底是死代码，checkpoint 失效会全量重拉）；`--force` 真正全量（原来会被 works/ 初始化悄悄变回增量）；checkpoint 初始化兼容平铺风格 readings 日期；骨架不再写已废除的 `platform` 字段。
- v0.10（2026-07-11）导入流水线重构：新增 `scripts/promote.mjs`（草稿迁入脚本，带 slug/UUID/结构校验），`import_neodb.mjs` 默认输出改 `src/data/works-draft/`（Astro 不扫描的草稿区），增加 UUID checkpoint 文件（`scripts/.import-state.json`）替代逐文件扫描日期。完整流程：导入→审阅→迁入→编目→复核→确认。旧流程仍可通过 `--out src/data/works` 使用。
- v0.9（2026-07-10）§4 题名词改为"不足 4 字符时用 slug 后续段补足"（馆长批准）：原规则短段直接截止（`el-tunel` → `EL`），导致大量 2 字母题名词且法语冠词书名频繁撞车；新规则 `el-tunel` → `ELTU`、`5-de-gai-bian` → `5DEG`。全库未 confirmed 记录按新规则重算。
- v0.8（2026-07-10）合并 `docs/TASK.md` 进本文档为 §9「编目作业流程」，消除两文档重复定义导致的矛盾；修正 §4 Callno 格式（原 workmark 制未反映实际数据，改为四段式 `{分类}-{著者号}-{年份}-{题名词}`，与全库 484/492 条实际 callno 一致）；§0 增第 4 条禁令（事实数据原样保留，原 TASK 三禁令之一）；删除已执行的 `docs/SUBJECTS-PROPOSAL-v2.md`（内容已落入 v0.7 记录）。docs/ 现剩 CATALOGING / VERIFICATION / QUESTIONS 三份。
- v0.7（2026-07-10）主题词表 v2 全面改版（馆长批准）：词表统一为"诗意视角型"语域，共 28 词（当日早先一轮 12 词扩充提案 v0.6 未及使用即被本版取代，记录已删）。「亲密关系」(116 本) 拆为 未命名的关系/爱的余烬/并肩的孤独/心动配方；「空间与记忆」(76 本) 拆为 记忆的地形/街角的人间；「规范性暴力」(5 本) 废除并入 父权的解剖/谁在定义现实；其余 15 词 1→1 更换措辞（哀悼与丧失→与丧失同居、非典型女性经验→不按剧本的她们、厌女结构→父权的解剖、认知权力不对等→谁在定义现实、劳动异化→打卡的灵魂、母职与家庭→血缘的引力、身份流动→我是谁的练习、不可靠/碎片化叙事→叙事的迷宫、书之书→文学的后台、书信体→见字如面、谜题装置→精巧的圈套、终活与身后事→练习告别、诊疗室叙事→沙发上的自我、非规范欲望→欲望的旷野、神经多样性→不同频的大脑）；观看的训练/怠工的自由/概念急救箱/一餐一饭/轻盈的重量/非人尺度/老年的形状 7 词保留。同批补标 23 本原空主题词记录，迁移中不确定的判断已记 QUESTIONS.md。
- v0.5（2026-07-10）`readings[].platform` 换成 `readings[].edition`（ebook/print/audiobook 封闭枚举）——原 platform 几乎全员写"NeoDB 标记"，没有信息量，实际想记录的是载体形式；历史记录暂不回填，遇到再补。
- v0.4（2026-07-10）中文语言代码改用文字子标签（`zh-CN`/`zh-TW` → `zh-Hans`/`zh-Hant`），符合 BCP47 惯例；明确 `mine` 版本 `lang` 封闭集规则写入本文档（此前仅见于 TASK.md）；显示层调整——作品详情页大标题改显示「你读的版本」题名，原语言题名降级为副标题；首页语言分面改按四分类（中/日/英/其他）呈现。
- v0.3（2026-07-10）标识符冻结改为绑定 `confirmed` 标志（整理期可自由改名）；悬空 creators 引用改为构建失败；页面增加未确认「草」标记。

- v0.2（2026-07-10）分类改为六格封闭制（原 ROM/SOC 并入 EF/JN）；锁定著者规范形式=英文惯称；新增 slug 长度与冲突规则、workmark 规则、AI 作业协议。
- v0.1（2026-07-10）初版 schema。
