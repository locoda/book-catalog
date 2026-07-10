# 乙醚書目 · Ether Catalog

一份跨语言的个人阅读史目录。不存书，只存**关于书的结构化描述**——目录，不是馆藏。

> 线上地址：[reading.1mether.me](https://reading.1mether.me)

## 为什么做

你的阅读数据散落在各处：NeoDB 标记、微信读书笔记、豆瓣书评、Kindle 高亮。平台不会替你互通，换一个平台就意味着数据从头开始。

这个目录把阅读历史从平台手里拿回来。数据是纯文本 YAML，你自己攥着；网站是 Astro 静态生成，随便找个地方就能部署。不依赖任何第三方服务持续运行。

更具体的说，它是一个**个人编目系统**——不是把书单列出来就完了，而是对每一本书做结构化的著录：原语言题名、初版年份、权威著者记录、受控主题词。编目本身是一种理解自己读过什么的方式。

## 当前规模

496 篇 works · 13 种原语言 · 322 条权威记录 · 2019–2026

## 数据模型

采用简化版 FRBR（FRBR-lite），三层结构：

```
works/          一个作品一条——规范题名、原语言、初版年、著者引用
  ├── expressions    语言层版本（日语原版、繁中译本、英译本……）
  │     └── mine: true    标记你实际读过的版本（可以多个）
  └── readings       阅读事件（日期、平台来源）
people/         权威记录——一人一条，日/中/英/韩等形式全部归拢到同一 id
subjects        个人受控词表，每条 work 标 1–4 个；
                词表以"目录里实际用过的词"为准，首页自动汇总
```

**硬性规则**：

- works 里的 `creators` 只允许引用 people id，不允许写裸字符串。悬空引用会导致构建失败。
- schema 用 zod 做机器校验（`src/content.config.ts`），字段写错 `npm run build` 直接报。
- 著录规则见 `docs/CATALOGING.md`——这是唯一的著录依据。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # 产出 dist/
```

## 导入数据

### NeoDB

```bash
export NEODB_TOKEN=xxxx    # neodb.social → 设置 → 应用 → 生成 access token
python scripts/import_neodb.py                  # 已读
python scripts/import_neodb.py --shelf progress  # 在读
```

脚本生成的是骨架——把原始导入变成一条完整的 work 记录，你需要做：work/expression 归并、权威记录建立、主题词标引。这些判断不交给脚本，因为编目本身就是阅读行为的一部分。

### 豆瓣

豆坟导出 CSV → `import_douban.py` 解析（TODO）。

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
| `docs/CATALOGING.md` | 著录规范——题名规则、语言码、Callno 算法、主题词表、slug 命名、AI 批处理协议 |
| `docs/VERIFICATION.md` | 复核/审计流程——程序化体检脚本 + 联网核实指南 |
| `docs/TASK.md` | 编目助理操作手册——逐文件整理 NeoDB 骨架的算法 |
| `docs/QUESTIONS.md` | 编目疑点追踪——词表提案、数据异常、待馆长确认事项 |

## Roadmap

- [ ] NeoDB 全量导入 + 人工归并
- [ ] 微信读书笔记数量/时长回填
- [ ] `import_douban.py`（豆坟 CSV）
- [ ] 主题词表页（词 → 定义 → 使用统计）
- [x] 著录规范 → `docs/CATALOGING.md`
- [x] 复核/审计流程 → `docs/VERIFICATION.md`
- [ ] Phase 2: 抽成 template repo，让其他人也能搭自己的编目系统
