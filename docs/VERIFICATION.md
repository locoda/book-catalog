# 核查规范 · Verification Playbook

**用途**：CATALOGING §9 覆盖的是"生数据 → 合规著录"这一轮。本文档覆盖下一轮——**著录已经做完，但怀疑有语言/年份/重复之类的错误，需要复核**。2026-07 第一次系统性复核就是照这个流程走的（结果见 `docs/QUESTIONS.md`）。

核心教训：上一轮"根据中文译名反推日文/韩文原题"的做法，事后核实发现约七成是编出来的假书名——**看起来合理不等于是真的**，反推题名/年份这类操作必须留痕（哪些是反推、依据什么），方便日后复核。

---

## 0. 先跑免费的程序化体检（不用联网）

改任何东西之前，先跑一遍——这几项几秒钟就能挖出几十条问题，且**不会有幻觉风险**，因为都是纯规则匹配：

**a. callno 全库唯一性**
```bash
grep -h '^callno:' src/data/works/*.yaml | sort | uniq -d
```

**b. callno 分类位 与 orig_lang 是否一致**（只看 `confirmed` 不为 true 的记录——已确认的记录允许历史遗留不一致，这是 §0.2 冻结规则决定的，不是 bug）
```python
import re, glob
def bucket(lang):
    if lang == 'ja': return 'J'
    if lang.startswith('zh'): return 'C'
    if lang == 'en': return 'E'
    return 'O'
for path in sorted(glob.glob('src/data/works/*.yaml')):
    text = open(path, encoding='utf-8').read()
    m_lang = re.search(r'^orig_lang:\s*(\S+)', text, re.M)
    m_callno = re.search(r'^callno:\s*(\S+)', text, re.M)
    if not m_lang or not m_callno: continue
    confirmed = bool(re.search(r'^confirmed:\s*true', text, re.M))
    if confirmed: continue  # 冻结记录跳过
    if bucket(m_lang.group(1)) != m_callno.group(1)[0]:
        print(path, m_lang.group(1), m_callno.group(1))
```

**c. year 缺失**
```bash
grep -L '^year:' src/data/works/*.yaml
```

**d. year 晚于最早阅读日期**（逻辑不可能——书还没出版就读过了；但要注意这经常是 readings 日期本身是假数据，不一定是 year 错，两种可能都要查）
```python
import re, glob
for path in sorted(glob.glob('src/data/works/*.yaml')):
    text = open(path, encoding='utf-8').read()
    m_year = re.search(r'^year:\s*(\d+)', text, re.M)
    dates = re.findall(r'date:\s*"?(\d{4})', text)
    if not m_year or not dates: continue
    year, first = int(m_year.group(1)), min(int(d) for d in dates)
    if year > first:
        print(path, year, first)
```

**e. `mine: true` 版本的 `lang` 是否在封闭集内**（`zh-Hans`/`zh-Hant`/`en`，见 CATALOGING.md §2）
```python
import re, glob
for path in sorted(glob.glob('src/data/works/*.yaml')):
    text = open(path, encoding='utf-8').read()
    m = re.search(r'^expressions:\n((?:.*\n)*?)(?=^\S|\Z)', text, re.M)
    if not m: continue
    for item in re.split(r'\n(?=\s*-\s*lang:)', m.group(1)):
        lm = re.search(r'lang:\s*(\S+)', item)
        if lm and 'mine: true' in item and lm.group(1) not in ('zh-Hans', 'zh-Hant', 'en'):
            print(path, lm.group(1))
```

**f. 简繁字符与 `lang` 标签矛盾**（比如题名含"風/書/語"等繁体特征字，却标了 zh-Hans）——目前是人工用简繁特征字表（CATALOGING §9.2b 里那张）逐条肉眼查的，还没写成脚本；量大时可以照特征字表写一遍。

**g. `people/*.yaml` 的 `name` 字段是否误写成原文/CJK**（应为英文惯称，见 CATALOGING.md §3；`name` 与"你读的是哪个语言版本"无关，是固定值，同一作者不该在不同作品页显示不同名字）
```python
import re, glob
def has_cjk(s):
    return any('一'<=c<='鿿' or '぀'<=c<='ヿ' or '가'<=c<='힣' for c in s)
for path in sorted(glob.glob('src/data/people/*.yaml')):
    text = open(path, encoding='utf-8').read()
    m = re.search(r'^name:\s*(.+)$', text, re.M)
    if m and has_cjk(m.group(1)):
        print(path, m.group(1).strip())
```

**h. `readings[].date` 里有没有大批量重复**（占位假数据的信号——同一天被 ≥3 个不相关作品共用，基本可以确定是导入时的系统占位符，不是真实标记）
```bash
grep -h 'date: "202' src/data/works/*.yaml | sort | uniq -c | sort -rn | head -10
```

**i. 重复 work 记录**（同一本书因为多次导入 / 多个语言版本分别读过，产生了两个 work 文件——通常表现为 callno 撞车，(a) 步骤就能带出来；确认是重复后应合并成一条，多个 `mine: true` 版本、多条 `readings` 都保留，不要只留一条）

---

## 1. 联网核实（针对第 0 步筛出的可疑条目 + QUESTIONS.md 里已标"推断"的条目）

- 逐条搜索一手书目页核实：出版社官网、Amazon.co.jp、教保文库/알라딘（韩）、豆瓣/誠品/博客來（中）、Gallimard 之类原版出版社官网（欧洲语言）。不要只信中文自媒体转述。
- 量大时用子代理并行跑，每批 8～10 条，要求统一汇报格式：`文件名 | 当前记录值 | 核实结果+来源链接 | 建议（保持不变 / 修正为X / 仍不确定）`。子代理只研究，不改文件——改动统一由主线程做，方便控制 confirmed 冻结规则和 callno 联动。
- 找不到确切来源 → 如实写"未找到可靠来源"，**不改**，转 `docs/QUESTIONS.md`。内容比对（"这本书讲的内容和另一本对得上"）只能作为参考线索，除非置信度足够高，且要在报告里明确标注这是推断、不是确证。

## 2. 应用修正时的规则

- `confirmed: true` 的记录：可以改 `title`/`year`/`orig_lang`/`expressions` 等**内容字段**；不能改 slug（文件名）/`callno`/people id 等**标识符**（§0.2）。哪怕改了 `orig_lang` 导致 callno 分类位理论上"应该"变了，也不动 callno——这是有意为之的不一致，冻结规则本来就是让 callno 变成历史快照。馆长本人可以口头指示覆盖冻结（比如直接说"这条 callno 该改"），AI 不能自作主张。
- 合并重复记录：保留两条各自的 `readings` 和 `mine` 版本（schema 本就支持一个 work 挂多个 `mine: true` 表达），删除多余文件；如果两条 `neodb_uuid` 不同，只能保留一个，在 QUESTIONS.md 里注明丢了哪个。
- 每处修正都写进 `docs/QUESTIONS.md`「已解决」，带来源和依据；拿不准的写清楚卡在哪一步、缺什么信息才能确认，不要不了了之。

## 3. 收尾

- 全部改完后，把第 0 步的程序化体检**重新跑一遍**，确认没有引入新问题（尤其是 callno 唯一性和 CJK-in-name 这两项，最容易被手改带歪）。
- 跑 `npm run build` 做 schema 校验——**注意**：如果本地 `node_modules` 是从别的系统同步过来的（比如 macOS 打包后同步到 Linux 沙盒），`rolldown`/`esbuild` 之类带原生二进制的依赖可能装不上，会报 `Cannot find native binding`。这种情况不要在原目录 `rm -rf node_modules` 硬修（可能因为挂载权限连删都删不掉），改成：把项目（不含 `node_modules`/`.git`/`dist`）复制到一个临时目录，在临时目录里 `npm install && npm run build`，验证完直接删掉临时目录，不影响正式目录。
