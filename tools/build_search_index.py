#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/build_search_index.py —— 生成全站搜索索引 data/search-index.js
=============================================================================

为什么需要它？
    网站本身零构建、纯静态，浏览器出于安全限制无法用 file:// 或普通 fetch
    读取其它章节的 HTML。所以这里「离线」把每章正文抽成纯文本，写成一份 JS
    文件，site.js 通过 <script> 加载即可全站搜索。

用法
----
    # 在 website 目录下
    python tools/build_search_index.py

    # 指定根目录
    python tools/build_search_index.py --root .

输出
----
    data/search-index.js
        window.SDA_SEARCH_INDEX = [
          { chapter:"ch1", title:"第 1 章 面向对象设计的原理",
            url:"chapters/ch1/index.html",
            sections:[{id:"concepts", title:"核心概念", text:"……"}] }
        ]

    · 每章名下的**所有** .html 都会被索引（index.html 优先，其余按文件名排序）。
      例如第 4 章的 creation.html / structural.html / behavioral.html 三个子页
      承载了本章绝大部分内容，必须一起进索引，否则「观察者」「享元」「访问者」
      这类只在子页出现的模式名会搜不到。

注意
----
    · 不依赖任何第三方库（只用标准库 html.parser）
    · 章节内容更新后重新运行一次即可；忘记运行也不影响阅读，
      只是搜索命中可能不是最新内容
"""

import argparse
import json
import os
import re
import sys
from html.parser import HTMLParser

# Windows 控制台默认可能是 GBK，输出中文/符号会崩；统一改成 UTF-8
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

SKIP_TAGS = {"script", "style", "svg", "nav", "header", "footer", "noscript", "template"}
BLOCK_TAGS = {
    "p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6",
    "li", "td", "th", "tr", "pre", "blockquote", "dd", "dt", "figcaption",
}


class SectionParser(HTMLParser):
    """抽取 <section class="section" id="..." data-title="..."> 的纯文本。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []          # 当前打开的元素栈
        self.sections = []       # [{id,title,text}]
        self.cur = None          # 当前 section
        self.skip_depth = 0
        self.cur_title = None
        self.grab_title = 0
        self.page_title = ""
        self.in_title_tag = False
        self.buf = []

    # ------------------------------------------------------------------
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.in_title_tag = True
        if tag in SKIP_TAGS:
            self.skip_depth += 1
            return
        if tag == "section":
            sid = a.get("id") or ""
            dtitle = a.get("data-title") or ""
            cls = a.get("class") or ""
            if "section" in cls.split() or sid:
                self._flush()
                self.cur = {"id": sid, "title": dtitle, "text": ""}
                self.cur_title = dtitle
                self.buf = []
                return
        if self.cur is not None and not self.cur_title:
            if tag in ("h2", "h1"):
                self.grab_title += 1
        if tag in BLOCK_TAGS:
            self.buf.append(" ")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title_tag = False
        if tag in SKIP_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if tag in ("h1", "h2") and self.grab_title:
            self.grab_title = 0
        if tag == "section":
            self._flush()
            return
        if tag in BLOCK_TAGS:
            self.buf.append(" ")

    def handle_data(self, data):
        if self.in_title_tag:
            self.page_title += data
            return
        if self.skip_depth:
            return
        if self.cur is not None:
            t = data.strip()
            if not t:
                return
            if self.grab_title and not self.cur_title:
                self.cur_title = (self.cur_title or "") + t
            self.buf.append(t)

    # ------------------------------------------------------------------
    def _flush(self):
        if self.cur is None:
            return
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        if self.cur.get("id") or text:
            self.sections.append({
                "id": self.cur.get("id") or "",
                "title": (self.cur.get("title") or self.cur_title or "").strip(),
                "text": text[:4000],
            })
        self.cur = None
        self.cur_title = None
        self.buf = []


def parse_chapters_manifest(root):
    """从 data/chapters.js 里粗略提取 id / title / dir / no（避免依赖 JS 引擎）。"""
    path = os.path.join(root, "data", "chapters.js")
    if not os.path.isfile(path):
        return []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        src = f.read()

    out = []
    # 以 id: "chN" 为锚点，向后截取一段，抓 no/title/dir
    for m in re.finditer(r"id:\s*[\"'](ch\d+)[\"']", src):
        cid = m.group(1)
        seg = src[m.start(): m.start() + 900]
        no = re.search(r"no:\s*[\"']([^\"']*)[\"']", seg)
        title = re.search(r"title:\s*[\"']([^\"']*)[\"']", seg)
        d = re.search(r"dir:\s*[\"']([^\"']*)[\"']", seg)
        out.append({
            "id": cid,
            "no": no.group(1) if no else cid,
            "title": title.group(1) if title else cid,
            "dir": d.group(1) if d else ("chapters/" + cid),
        })
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description="生成 data/search-index.js")
    ap.add_argument("--root", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    help="站点根目录（默认本脚本上一级）")
    ap.add_argument("--max-chars", type=int, default=4000, help="每节最多保留字符数")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    root = os.path.abspath(args.root)
    manifest = parse_chapters_manifest(root)

    # 若 manifest 解析失败，退回扫描目录
    if not manifest:
        chdir = os.path.join(root, "chapters")
        if os.path.isdir(chdir):
            for name in sorted(os.listdir(chdir)):
                if re.match(r"^ch\d+$", name) and os.path.isdir(os.path.join(chdir, name)):
                    manifest.append({"id": name, "no": name, "title": name, "dir": "chapters/" + name})

    index = []
    for ch in manifest:
        ch_dir = ch.get("dir") or ("chapters/" + ch["id"])
        page_dir = os.path.join(root, ch_dir)
        if not os.path.isdir(page_dir):
            page_dir = os.path.join(root, "chapters", ch["id"])
        if not os.path.isdir(page_dir):
            if not args.quiet:
                print("  跳过（无目录）: %s/" % ch_dir)
            continue

        # 本章目录下的所有页面：index.html 优先，其余（如 ch4 三个专题子页）按文件名
        pages = [
            n for n in os.listdir(page_dir)
            if n.lower().endswith((".html", ".htm")) and os.path.isfile(os.path.join(page_dir, n))
        ]
        pages.sort(key=lambda n: (n.lower() != "index.html", n.lower()))
        if not pages:
            if not args.quiet:
                print("  跳过（无页面）: %s/" % ch_dir)
            continue

        chapter_title = (ch["no"] + " " + ch["title"]).strip()
        for page_name in pages:
            page = os.path.join(page_dir, page_name)
            try:
                with open(page, "r", encoding="utf-8", errors="replace") as f:
                    html = f.read()
                p = SectionParser()
                p.feed(html)
                p.close()
                p._flush()
            except Exception as e:  # 解析容错
                print("  [警告] 解析失败 %s/%s: %s" % (ch_dir, page_name, e), file=sys.stderr)
                continue

            secs = []
            for s in p.sections:
                if not s["text"] and not s["title"]:
                    continue
                s["text"] = s["text"][: args.max_chars]
                secs.append(s)
            if not secs:
                continue

            # 页面标题：优先用 <title>（去掉「 · 软件设计与体系架构」后缀），
            # 这样 ch4 子页在搜索结果里能显示成「第 4 章 创建型模式」。
            title = re.sub(r"\s+", " ", p.page_title or "").strip()
            title = re.sub(r"\s*[·|—]\s*软件设计与体系架构\s*$", "", title).strip()
            if not title:
                title = chapter_title if page_name.lower() == "index.html" \
                    else chapter_title + " · " + os.path.splitext(page_name)[0]

            url = ch_dir.replace(os.sep, "/").strip("/") + "/" + page_name
            index.append({
                "chapter": ch["id"],
                "page": page_name,
                "title": title,
                "url": url,
                "sections": secs,
            })
            if not args.quiet:
                chars = sum(len(s["text"]) for s in secs)
                print("  ✓ %-4s %-26s %2d 节  %6d 字  %s" % (
                    ch["id"], title[:26], len(secs), chars, page_name))

    out_dir = os.path.join(root, "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "search-index.js")
    payload = json.dumps(index, ensure_ascii=False, separators=(",", ":"))
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* 自动生成，请勿手工编辑。重新生成：python tools/build_search_index.py */\n")
        f.write("window.SDA_SEARCH_INDEX = ")
        f.write(payload)
        f.write(";\n")

    size = os.path.getsize(out_path)
    print("")
    print("已写入 %s（%d 个页面，%.1f KB）" % (out_path, len(index), size / 1024.0))
    print("章节内容更新后重新运行本脚本，全站搜索即可搜到最新内容。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
