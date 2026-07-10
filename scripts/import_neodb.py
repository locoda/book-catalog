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
import argparse, json, os, re, sys, unicodedata, urllib.request

def slugify(s: str) -> str:
    s = unicodedata.normalize('NFKD', s)
    s = re.sub(r'[^\w\s-]', '', s, flags=re.ASCII).strip().lower()
    s = re.sub(r'[\s_]+', '-', s)
    return s or 'untitled'

def yaml_str(s) -> str:
    if s is None:
        return "''"
    s = str(s)
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

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--instance', default='https://neodb.social')
    ap.add_argument('--shelf', default='complete', choices=['complete', 'progress', 'wishlist'])
    ap.add_argument('--out', default='src/data/works')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()

    token = os.environ.get('NEODB_TOKEN')
    if not token:
        sys.exit('缺少 NEODB_TOKEN 环境变量。')

    os.makedirs(args.out, exist_ok=True)
    page, written, skipped = 1, 0, 0
    while True:
        data = api(f'{args.instance}/api/me/shelf/{args.shelf}?category=book&page={page}', token)
        results = data.get('data', [])
        if not results:
            break
        for mark in results:
            item = mark.get('item', {})
            title = item.get('title') or 'untitled'
            slug = slugify(title)[:60]
            path = os.path.join(args.out, f'{slug}.yaml')
            if os.path.exists(path) and not args.force:
                skipped += 1
                continue

            authors = item.get('author') or []
            rating = mark.get('rating_grade')          # NeoDB 10 分制
            created = (mark.get('created_time') or '')[:10]
            lang = (item.get('localized_title') or [{}])[0].get('lang') or ''

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
    print('下一步：合并多语言重复条目 → 建 people 权威记录 → 回填 creators。')

if __name__ == '__main__':
    main()
