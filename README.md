# 乙觅书阁 · Etherary

一份跨语言的个人阅读史编目系统。不存书，只存**关于书的结构化著录**——是目录，不是馆藏。

> 线上地址：[reading.1mether.me](https://reading.1mether.me)

## 缘起

阅读数据散落在各处：NeoDB 标记、微信读书笔记、豆瓣书评、Kindle 高亮。平台之间不互通，换平台就意味着数据从头开始。

这个项目把阅读历史从平台手里拿回来。数据是纯文本 YAML，自己攥着；网站用 Astro 静态生成，随便找个地方就能部署，不依赖任何第三方服务持续运行。

它不只是把书单列出来，而是一个**个人编目系统**——对每一本书做结构化著录：原语言规范题名、初版年份、权威著者记录、受控主题词。编目本身是一种理解自己读过什么的方式。

## 当前规模

- **492** 篇 works（作品）
- **322** 条 people（权威记录）
- **21** 种原语言（ja / en / zh-Hans / zh-Hant / fr / ko / de / es / sv / he / ru / ……）
- 初版年跨度 **1910–2026**
- 阅读记录跨度 **2019–2026**

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | [Astro](https://astro.build) 7（静态生成） |
| 数据 | YAML 文件 + Astro Content Collections（`glob` loader） |
| 校验 | Zod schema（`src/content.config.ts`），`npm run build` 即校验 |
| 部署 | Cloudflare Pages，域名 `reading.1mether.me` |
| 依赖 | 运行时仅 `astro`；开发依赖 `yaml`（校验/导入脚本）、`pinyin-pro`（slug 拼音）。无运行时第三方服务 |

## 数据模型

采用简化版 FRBR（FRBR-lite），三层结构：

```
works/          一个作品一条——规范题名、原语言、初版年、著者引用
  ├── expressions    语言层版本（日语原版、繁中译本、英译本……）
  │     └── mine: true    标记实际读过的版本（可多个）
  └── readings       阅读事件（日期、载体形式）
people/         权威记录——一人一条，日/中/英/韩等形式全部归拢到同一 id
subjects        个人受控词表，每条 work 标 1–4 个
```

**硬性规则**：

- works 里的 `creators` 只允许引用 people id，不允许写裸字符串。schema 用 `reference('people')`，悬空引用会导致构建失败（安全网）。
- `mine: true` 版本的 `lang` 是封闭集，只能是 `zh-Hans` / `zh-Hant` / `en`——馆长实际的阅读语言。schema 强制。
- 主题词只能从受控词表中选用，不发明新词。机器可读单一来源是 `src/data/subjects.yaml`（schema 与 `validate.mjs` 共同读取），词条定义见 `docs/CATALOGING.md` §6；每条 work ≤4 个，允许留空。
- `confirmed: true` 的记录标识符（slug / callno / people id）永久冻结。
- schema 用 Zod 做机器校验；`npm run build` 会先自动跑 `scripts/validate.mjs`（prebuild：悬空引用、callno 唯一性、词表、mine-lang、原文版本齐备），再做 Zod 结构校验，任一 ERROR 即失败。纯 Node 实现，Cloudflare Pages / CI 无需 Python。
- 著录规则见 `docs/CATALOGING.md`——这是唯一的著录依据。

## 项目结构

```
.
├── src/
│   ├── content.config.ts      # Zod schema（works + people 集合定义）
│   ├── data/
│   │   ├── works/             # 作品记录（YAML）
│   │   └── people/            # 权威记录（YAML）
│   ├── pages/
│   │   ├── index.astro        # 首页（时间线 + 语言流向 + 词云）
│   │   ├── works/             # 馆藏列表 + 详情
│   │   ├── people/            # 著者索引 + 详情
│   │   └── subjects/          # 主题词索引 + 详情
│   ├── components/            # ReadingTimeline / LangFlow / SubjectCloud / AuthorCloud
│   ├── layouts/Base.astro
│   ├── lib/                   # lang.ts（语言字典）/ stats.ts（聚合）/ edition.ts
│   └── styles/catalog.css
├── scripts/
│   ├── import_neodb.mjs       # NeoDB → work YAML 骨架
│   └── validate.mjs           # 编目校验（prebuild 自动执行）
├── docs/                      # 著录规范、复核流程、任务手册、疑点追踪
├── astro.config.mjs
└── package.json
```

## 快速开始

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # 产出 dist/
npm run preview    # 预览构建产物
```

## 导入数据

### NeoDB

```bash
export NEODB_TOKEN=xxxx    # neodb.social → 设置 → 应用 → 生成 access token
node scripts/import_neodb.mjs                   # 已读
node scripts/import_neodb.mjs --shelf progress  # 在读
```

脚本生成的是骨架——把原始导入变成一条 work 记录，之后需要人工完成：work/expression 归并、权威记录建立、主题词标引。这些判断不交给脚本，因为编目本身就是阅读行为的一部分。

### 豆瓣

豆坟导出 CSV → `import_douban.mjs` 解析（TODO）。

## 部署

目标平台 Cloudflare Pages，域名 `reading.1mether.me`。

**走 GitHub：**

1. 把仓库推到 GitHub。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → 连接该仓库。
   - Framework preset: **Astro**；Build: `npm run build`；Output: `dist`
3. Custom domains → 添加 `reading.1mether.me`。域名已在 Cloudflare 托管，CNAME 自动创建。

**不走 GitHub：**

```bash
npm run build
npx wrangler pages deploy dist --project-name ether-catalog
```

## 相关文档

| 文档 | 用途 |
|---|---|
| `docs/CATALOGING.md` | 著录规范（唯一依据）——题名规则、语言码、Callno 算法、主题词表、slug 命名、AI 批处理协议、§9 编目作业流程 |
| `docs/VERIFICATION.md` | 复核/审计流程——程序化体检脚本 + 联网核实指南 |
| `docs/QUESTIONS.md` | 编目疑点追踪——词表提案、数据异常、待馆长确认事项 |

> `docs/` 另有 `audit-missing-original-version.md`，是原文版本缺失的一次性审计快照，非规范文档。

## Roadmap

- [ ] NeoDB 全量导入 + 人工归并
- [ ] 微信读书笔记数量/时长回填
- [ ] `import_douban.mjs`（豆坟 CSV）
- [ ] 主题词表页（词 → 定义 → 使用统计）
- [x] 著录规范 → `docs/CATALOGING.md`
- [x] 复核/审计流程 → `docs/VERIFICATION.md`
- [x] 主题词表 v2 改版（28 词，诗意视角型语域）
- [ ] Phase 2: 抽成 template repo，让其他人也能搭自己的编目系统
