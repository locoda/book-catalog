#!/usr/bin/env python3
"""
从 NeoDB 拉取本人书籍标记，生成 work YAML 骨架到 src/data/works/。

用法:
  export NEODB_TOKEN=xxxx        # neodb.social -> 设置 -> 应用/API -> 生成 token
  python scripts/import_neodb.py [--instance https://neodb.social] [--shelf complete]

注意:
  - 每个 NeoDB 条目生成一条 work，你读的那个版本标 mine: true。
  - 同一作品的多语言版本合并（work/expression 归并）是编目判断，脚本不自动做；
    导入后手动把重复的 work 合并成一条、版本挪进 expressions。
  - creators 先写成 raw 字符串（creators_raw），建好权威记录后手动替换成 people id。
  - 已存在的文件不会覆盖（--force 可覆盖）。
"""
import argparse, glob, json, os, re, sys, unicodedata, urllib.request

try:
    from pypinyin import lazy_pinyin
    HAS_PINYIN = True
except ImportError:
    HAS_PINYIN = False

def slugify(s: str) -> str:
    """生成可读的文件名 slug。中文转拼音，其他非 ASCII 字符剥离。"""
    if HAS_PINYIN and re.search(r'[\u4e00-\u9fff]', s):
        s = '-'.join(lazy_pinyin(s))
    s = unicodedata.normalize('NFKD', s)
    s = re.sub(r'[^\w\s-]', '', s, flags=re.ASCII).strip().lower()
    s = re.sub(r'[\s_]+', '-', s)
    return s or 'untitled'

_YAML_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')

def yaml_str(s) -> str:
    """返回安全的 YAML 标量：需要引号时自动加。"""
    if s is None:
        return "''"
    s = str(s).strip()
    if not s:
        return "''"
    # YAML 会把 2023-04-16 解析为 Date 对象，必须引号保护
    if _YAML_DATE.match(s):
        return json.dumps(s, ensure_ascii=False)
    # 含有 YAML 特殊字符、或首尾有空格
    if re.search(r'[:#\[\]{}&*!|>\'"%@`]', s) or s != s.strip():
        return json.dumps(s, ensure_ascii=False)
    return s

def api(url: str, token: str):
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'User-Agent': 'ether-catalog-import/0.1',
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))

_DATE_RE = re.compile(r"""['\"](\d{4}-\d{2}-\d{2})['\"]""")

def latest_reading_date(works_dir: str) -> str | None:
    """扫描已有 work 文件的 readings[].date，返回最新的日期字符串。"""
    latest = None
    for fpath in glob.glob(os.path.join(works_dir, '*.yaml')):
        try:
            with open(fpath, encoding='utf-8') as f:
                text = f.read()
        except Exception:
            continue
        dates = _DATE_RE.findall(text)
        for d in dates:
            if latest is None or d > latest:
                latest = d
    return latest

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--instance', default='https://neodb.social')
    ap.add_argument('--shelf', default='complete', choices=['complete', 'progress', 'wishlist'])
    ap.add_argument('--out', default='src/data/works')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()

    token = os.environ.get('NEODB_TOKEN') or 'rHjRunyEpRZUM6yVJFCMo4KXKim1a3C8QU0YsyDW5ZHmNNCXyHxKNQ9Qrg'
    if not token:
        sys.exit('缺少 NEODB_TOKEN 环境变量。')

    os.makedirs(args.out, exist_ok=True)

    # 找到已有目录里最新的阅读日期，作为增量导入的截止线
    cutoff = latest_reading_date(args.out) if not args.force else None
    if cutoff:
        print(f'已有目录最新阅读日期: {cutoff}，仅导入此日期之后的条目。')

    used_slugs = {}          # slug → 已用次数（仅计入通过日期过滤的条目）
    collisions = []          # 记录碰撞信息
    page, written, skipped = 1, 0, 0
    while True:
        data = api(f'{args.instance}/api/me/shelf/{args.shelf}?category=book&page={page}', token)
        results = data.get('data', [])
        if not results:
            break
        for mark in results:
            item = mark.get('item', {})
            title = item.get('title') or 'untitled'
            uuid = item.get('uuid') or ''

            # 从 credits 里提取作者和译者
            credits = item.get('credits') or []
            authors = [c['name'] for c in credits if c.get('role') == 'author']
            translators = [c['name'] for c in credits if c.get('role') == 'translator']
            rating = mark.get('rating_grade')          # NeoDB 10 分制
            created = (mark.get('created_time') or '')[:10]
            lang = (item.get('localized_title') or [{}])[0].get('lang') or ''

            # 增量模式：跳过不晚于截止日期的条目
            if cutoff and created and created <= cutoff:
                skipped += 1
                continue

            slug = slugify(title)[:50]
            base = slug
            n = used_slugs.get(base, 0) + 1
            used_slugs[base] = n
            if n == 1:
                fname = f'{base}.yaml'
            else:
                fname = f'{base}-{n}.yaml'
                collisions.append((base, title))
            path = os.path.join(args.out, fname)
            if os.path.exists(path) and not args.force:
                skipped += 1
                continue

            lines = [
                f'title: {yaml_str(title)}',
                f'orig_lang: {yaml_str(lang or "TODO")}',
                f'creators: []   # TODO: 建权威记录后填 people id',
                f'creators_raw: {json.dumps(authors, ensure_ascii=False)}',
                'subjects: []   # TODO: 个人主题词',
                'expressions:',
                f'  - lang: {yaml_str(lang or "TODO")}',
                f'    title: {yaml_str(title)}',
                '    mine: true',
            ]
            if translators:
                lines.insert(-1, f'    translator: {yaml_str(translators[0])}')
            if created:
                lines += ['readings:', f'  - date: {yaml_str(created)}', '    platform: NeoDB 标记']
            if rating is not None:
                lines.append(f'rating: {rating}')
            lines.append(f'status: {"reading" if args.shelf == "progress" else "read"}')
            lines.append(f'neodb_uuid: {yaml_str(item.get("uuid"))}' if item.get('uuid') else '')

            with open(path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(l for l in lines if l) + '\n')
            written += 1
        print(f'page {page}: 累计写入 {written}，跳过 {skipped}')
        if page >= data.get('pages', 1):
            break
        page += 1

    print(f'完成：{written} 条新著录，{skipped} 条已存在跳过。')
    if collisions:
        print(f'\n⚠️  {len(collisions)} 组 slug 碰撞（需手动合并）：')
        for slug, title in collisions:
            print(f'    {slug} → "{title}"（同名多版本/多语言）')
    print('下一步：合并多语言重复条目 → 建 people 权威记录 → 回填 creators。')

if __name__ == '__main__':
    main()
