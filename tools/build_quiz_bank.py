#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/build_quiz_bank.py —— 汇总全站题库，生成 data/quiz-bank.js
=============================================================================

为什么需要它？
    章节页的题目写在各自页面底部的 <script id="quiz-data"> 里。首页要做
    「全部题目随机练习」（跨章混排），但零构建站点在 file:// 下不能 fetch
    其它页面的 HTML。所以这里把每页的题库离线抽出来，写成一份 JS 文件，
    首页 <script src="data/quiz-bank.js"> 直接加载即可。

用法
----
    cd website
    python tools/build_quiz_bank.py
    python tools/build_quiz_bank.py --quiet

输出
----
    data/quiz-bank.js
        window.SDA_QUIZ_BANK = [
          { chapter:"ch4", file:"behavioral.html", title:"第 4 章 行为型模式",
            url:"chapters/ch4/behavioral.html", questions:[ …原样保留… ] }
        ]

注意
----
    · 只做「搬运」：题目字段（type/stem/options/answer/explain/tag）原样保留，
      不重排、不翻译；校验交给 tools/check_content.py
    · 章节内容改动后重新运行一次
"""

import argparse
import json
import os
import re
import sys

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


def read_text(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def chapters_from_manifest(root):
    """从 data/chapters.js 取 id / title / dir（够用即可，不依赖 JS 引擎）。"""
    path = os.path.join(root, "data", "chapters.js")
    if not os.path.isfile(path):
        return []
    src = read_text(path)
    out = []
    for m in re.finditer(r"\bid:\s*[\"'](ch\d+)[\"']", src):
        cid = m.group(1)
        seg = src[m.start(): m.start() + 1200]
        no = re.search(r"no:\s*[\"']([^\"']*)[\"']", seg)
        title = re.search(r"title:\s*[\"']([^\"']*)[\"']", seg)
        d = re.search(r"dir:\s*[\"']([^\"']*)[\"']", seg)
        out.append({
            "id": cid,
            "no": no.group(1) if no else cid,
            "title": title.group(1) if title else cid,
            "dir": (d.group(1) if d else ("chapters/" + cid)).strip("/"),
        })
    return out


def extract_quiz(src):
    m = re.search(
        r"<script\b(?=[^>]*\bid=[\"']quiz-data[\"'])[^>]*>([\s\S]*?)</script>", src, re.I)
    if not m:
        return None
    raw = m.group(1).strip()
    if not raw:
        return None
    data = json.loads(raw)
    if isinstance(data, dict):
        data = data.get("questions") or []
    return data if isinstance(data, list) else None


def main(argv=None):
    ap = argparse.ArgumentParser(description="生成 data/quiz-bank.js（全站题库）")
    ap.add_argument("--root", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    root = os.path.abspath(args.root)
    manifest = chapters_from_manifest(root)
    if not manifest:
        print("[错误] 读不到 data/chapters.js", file=sys.stderr)
        return 1

    bank = []
    total = 0
    for ch in manifest:
        folder = os.path.join(root, ch["dir"])
        if not os.path.isdir(folder):
            folder = os.path.join(root, "chapters", ch["id"])
        if not os.path.isdir(folder):
            continue
        pages = [n for n in os.listdir(folder)
                 if n.lower().endswith(".html") and os.path.isfile(os.path.join(folder, n))]
        pages.sort(key=lambda n: (n.lower() != "index.html", n.lower()))
        for name in pages:
            page_path = os.path.join(folder, name)
            src = read_text(page_path)
            try:
                questions = extract_quiz(src)
            except ValueError as e:
                print("  [警告] %s/%s 的 quiz-data 不是合法 JSON：%s"
                      % (ch["dir"], name, e), file=sys.stderr)
                continue
            if not questions:
                continue
            title = re.sub(r"\s+", " ", (
                re.search(r"<title>([\s\S]*?)</title>", src) or [None, ""])[1]).strip()
            title = re.sub(r"\s*[·|—]\s*软件设计与体系架构\s*$", "", title).strip()
            if not title:
                title = (ch["no"] + " " + ch["title"]).strip()
            bank.append({
                "chapter": ch["id"],
                "file": name,
                "title": title,
                "url": ch["dir"] + "/" + name,
                "questions": questions,
            })
            total += len(questions)
            if not args.quiet:
                print("  ✓ %-6s %-26s %2d 题  %s"
                      % (ch["id"], title[:26], len(questions), name))

    out_dir = os.path.join(root, "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "quiz-bank.js")
    payload = json.dumps(bank, ensure_ascii=False, separators=(",", ":"))
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* 自动生成，请勿手工编辑。重新生成：python tools/build_quiz_bank.py */\n")
        f.write("window.SDA_QUIZ_BANK = ")
        f.write(payload)
        f.write(";\n")

    size = os.path.getsize(out_path)
    print("")
    print("已写入 %s（%d 个页面 / %d 题，%.1f KB）"
          % (out_path, len(bank), total, size / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())