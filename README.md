# 乙觅书阁 · Etherary

一份跨语言的个人阅读史编目系统。不存书，只存**关于书的结构化著录**——是目录，不是馆藏。

> 线上地址：[reading.1mether.me](https://reading.1mether.me)

## 缘起

阅读数据散落在各处：NeoDB 标记、微信读书笔记、豆瓣书评、Kindle 高亮。平台之间不互通，换平台就意味着数据从头开始。

这个项目把阅读历史从平台手里拿回来。数据是纯文本 YAML，自己攥着；网站用 Astro 静态生成，随便找个地方就能部署，不依赖任何第三方服务持续运行。

它不只是把书单列出来，而是一个**个人编目系统**——对每一本书做结构化著录：原语言规范题名、初版年份、权威著者记录、受控主题词。编目本身是一种理解自己读过什么的方式。

## 当前规模

- **493** 篇 works（作品）
- **326** 条 people（权威记录）
- **21** 种原语言（ja / en / zh-Hans / zh-Hant / fr / ko / de / es / he / ru / sv / pt / it / hr / tr / hu / sq / nb / bg / da / fa）
- 初版年跨度 **1910–2026**
- 阅读记录跨度 **2018–2026**

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
subjects        受控主题词表（28 词，个人诗意视角型语域），每条 work 标 1–4 个
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
│   │   ├── works/             # 作品记录（YAML，正式目录，只收成品）
│   │   ├── works-draft/       # 导入草稿区（不受 Astro 扫描，编目完成后 promote 迁入）
│   │   ├── people/            # 权威记录（YAML）
│   │   └── subjects.yaml      # 受控主题词表（slug/name/desc，单一来源）
│   ├── pages/
│   │   ├── index.astro        # 首页（landing page + 馆藏速览）
│   │   ├── works/             # 馆藏列表 + 详情
│   │   ├── people/            # 著者索引 + 详情
│   │   └── subjects/          # 主题词索引 + 详情
│   ├── components/            # ReadingTimeline / SubjectCloud / AuthorCloud 等
│   ├── layouts/Base.astro
│   ├── lib/                   # lang.ts（语言字典）/ stats.ts（聚合）/ edition.ts / subjects.ts（词表入口）
│   └── styles/catalog.css
├── scripts/
│   ├── import_neodb.mjs       # NeoDB → work YAML 骨架（增量 checkpoint，写入草稿区）
│   ├── promote.mjs            # 草稿迁入正式目录（slug/UUID/结构校验）
│   ├── validate.mjs           # 阻断性校验（prebuild 自动执行）
│   └── audit.mjs              # 全库机器核查（advisory，npm run audit [--report]）
├── .github/workflows/         # pull-neodb.yml：定时自动导入 → 草稿区
├── docs/                      # CATALOGING（著录）/ VERIFICATION（复核）/ QUESTIONS（疑点）
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
node scripts/import_neodb.mjs        # 已读 → src/data/works-draft/（草稿区）
node scripts/promote.mjs --list      # 审阅草稿，校验通过后 --all 迁入正式目录
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

## 下一步

v1 全部完成——493 条作品导入并著录，**全库 `confirmed: true` 冻结、edition 全回填**，网站上线运行。目录进入维护态，唯一的常规工作是每周 NeoDB 增量：draft → 编目 → promote → confirm（流程见 `docs/CATALOGING.md` §9）。后续迭代方向：

**数据富化**：微信读书笔记/高亮回填、豆瓣豆坟 CSV 导入（`import_douban.mjs`，TODO）——把散落在各平台上的阅读痕迹回拢到目录里，让每条记录的厚度不只是编目元数据。

**站点打磨**：可能的检索/筛选功能、旧中文主题 URL 的重定向清理。

> Phase 2：把项目抽象成 template repo，让其他人也能搭自己的个人编目系统。这是远期目标，前提是 v1 的著录流程和工具链足够成熟，不会把自己的偏好硬编码成别人的负担。
