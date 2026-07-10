# 乙醚書目 · Ether Catalog

跨语言个人编目系统。不存书，只存**关于书的结构化描述**——目录，不是馆藏。

线上地址（部署后）：https://library.1mether.me

## 数据模型（FRBR-lite, schema v0.1）

- `src/data/works/*.yaml` — 一个作品一条。work 层题名以**原语言**为准；`expressions` 是语言层版本，`mine: true` 标记实际读的版本；`readings` 是阅读事件。
- `src/data/people/*.yaml` — 权威记录。一人一条，中/日/英名称形式全部归拢到同一 id；works 里的 `creators` 只允许引用这些 id，不允许写裸字符串。
- 主题词是个人受控词表，直接写在 `subjects` 里；词表本身以"目录里实际用过的词"为准（首页 facet 自动汇总）。
- schema 的机器定义在 `src/content.config.ts`（zod），字段写错构建会直接报错。

种子数据 8 条 work + 9 条 people。标了 `placeholder: true` 的条目阅读事件是示意数据，等真实导入后覆盖。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 产出 dist/
```

## 从 NeoDB 导入

```bash
export NEODB_TOKEN=xxxx   # neodb.social → 设置 → 应用 → 生成 access token
python scripts/import_neodb.py                 # 已读
python scripts/import_neodb.py --shelf progress  # 在读
```

脚本只生成骨架；work/expression 归并、权威记录建立、主题词标引是编目判断，留给人做。豆瓣路线：豆坟导出 CSV 后写 `import_douban.py` 解析（TODO）。

## 部署到 library.1mether.me（Cloudflare Pages）

1. 把本目录推到一个 GitHub 仓库（比如 `locoda/ether-catalog`）。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → 连接该仓库。
   - Framework preset: **Astro**；Build command: `npm run build`；Output: `dist`
3. 部署成功后进入该 Pages 项目 → **Custom domains** → 添加 `library.1mether.me`。
   域名本来就在 Cloudflare 托管，CNAME 会自动创建，一般一两分钟生效。

不想连 GitHub 的话，本地一条命令也行：

```bash
npm run build
npx wrangler pages deploy dist --project-name ether-catalog
```

## Roadmap

- [ ] NeoDB 全量导入 + 人工归并
- [ ] 微信读书笔记数量/时长回填
- [ ] `import_douban.py`（豆坟 CSV）
- [ ] 主题词表页（词 → 定义 → 使用统计）
- [ ] Phase 2: 抽成 template repo 开源
