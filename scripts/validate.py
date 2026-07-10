#!/usr/bin/env python3
"""
编目校验：确保每个原文书目都有对应的原文版本记录。

运行方式（任选其一）：
  python3 scripts/validate.py            # 自动回退到 managed venv（若系统无 pyyaml）
  npm run validate                       # 同上的封装

规则
----
  E1 (ERROR) orig_lang 非 zh* 开头，且无 expression.lang == orig_lang，
             且非「ja/ko 全汉字疑似译名」  → 缺原文版本记录，必须补。
  E2 (ERROR) orig_lang 非中日韩体系（非 zh/ja/ko）且 title 含中日韩文字
             → 原文标题实为译文，必须修正（A 类残留）。
  W1 (WARN)  orig_lang ∈ {ja,ko} 且无对应 expression，且 title 全汉字无假名/谚文
             → title 疑似中文译名，需人工核对真原文。不阻断构建。
  W2 (WARN)  orig_lang 缺失  → 建议补原文语言标记。

退出码：存在 ERROR 时返回 1（可阻断 prebuild），否则 0。
"""
import glob
import os
import re
import sys

WORKS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data", "works")

CJK_ORIG = ("ja", "ko")


def has_cjk(s):
    return bool(re.search(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]", s or ""))


def has_kana(s):
    return bool(re.search(r"[\u3040-\u30ff]", s or ""))


def has_hangul(s):
    return bool(re.search(r"[\uac00-\ud7a3]", s or ""))


def is_cjk_orig(ol):
    return ol.startswith("zh") or ol in CJK_ORIG


try:
    import yaml
except ImportError:
    venv = "/Users/1mether/.workbuddy/binaries/python/envs/default/bin/python"
    if os.path.exists(venv) and sys.executable != venv:
        os.execv(venv, [venv, os.path.abspath(__file__)] + sys.argv[1:])
    print("ERROR: 需要 pyyaml。请运行: pip install pyyaml", file=sys.stderr)
    sys.exit(2)


def main():
    errors = []
    warns = []
    files = sorted(glob.glob(os.path.join(WORKS, "**", "*.yaml"), recursive=True))
    for f in files:
        try:
            d = yaml.safe_load(open(f, encoding="utf-8"))
        except Exception as e:
            errors.append((f, "YAML 解析失败: %s" % e))
            continue
        if not isinstance(d, dict):
            continue
        ol = (d.get("orig_lang") or "").strip()
        title = d.get("title") or ""
        exprs = d.get("expressions") or []
        if not ol:
            warns.append((f, "W2 orig_lang 缺失，建议补原文语言标记"))
            continue
        if ol.startswith("zh"):
            continue
        has_orig = any((e.get("lang") or "") == ol for e in exprs)
        if has_orig:
            continue
        # 缺原文 expression 条目
        if ol in CJK_ORIG and has_cjk(title) and not (has_kana(title) or has_hangul(title)):
            warns.append((f, "W1 orig_lang=%s 但 title 全汉字无假名/谚文，疑似中文译名，需人工核对真原文" % ol))
        elif not is_cjk_orig(ol) and has_cjk(title):
            errors.append((f, "E2 orig_lang=%s（非中日韩体系）但 title 含中文，原文标题实为译文，必须修正" % ol))
        else:
            errors.append((f, "E1 orig_lang=%s 缺对应 expression（lang==%s），需补原文版本记录" % (ol, ol)))

    print("校验范围：%d 个 work 文件" % len(files))
    if errors:
        print("\n❌ ERROR %d 项（将阻断构建）：" % len(errors))
        for f, m in errors:
            print("  - %s: %s" % (os.path.basename(f), m))
    if warns:
        print("\n⚠️  WARN %d 项（不阻断，需人工核对）：" % len(warns))
        for f, m in warns:
            print("  - %s: %s" % (os.path.basename(f), m))
    if not errors and not warns:
        print("\n✅ 全部通过：每个原文书目都有对应原文版本记录。")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
