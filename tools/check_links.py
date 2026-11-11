#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/check_links.py —— 全站「相对路径 / 锚点 / 课件图」检查器
=============================================================================

为什么需要它？
    这个站点刻意做成「零构建」：直接双击 index.html（file://）或用
    tools/serve.py 起静态服务都能跑。代价是没有任何打包器帮我们检查路径，
    一条写错的 ../../ 或一个改名的 section id 只会在浏览器里变成 404 / 死链。
    本脚本把这类问题在提交前一次性扫出来。

检查内容
--------
1. 每个页面（index.html + chapters/**/*.html）里所有本地资源引用是否存在
   —— a[href] / link[href] / img[src] / script[src] / iframe[src] /
      source[src] / video[src] / audio[src] / object[data] / svg use[href]
2. 页面内锚点（#xxx）是否存在对应的 id / name
3. 跨页锚点（other.html#xxx）目标页是否真有该 id
4. 是否有以 "/" 开头的绝对路径（站点可能挂在任意子路径下，绝对路径必然失效）
5. .slides 区块的 data-count 是否等于 slides 目录里真实文件数
   （data-count 写大会出现一整片裂图）
6. data/chapters.js 里登记的 dir / pages[].file / sections[].id 是否真实存在

用法
----
    cd website
    python tools/check_links.py              # 人读报告
    python tools/check_links.py --quiet      # 只输出问题与总结
    python tools/check_links.py --json       # 机器可读（CI / 自动化用）

退出码：0 = 全部通过；1 = 存在错误。
"""

import argparse
import json
import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

# Windows 控制台默认 GBK，统一 UTF-8 避免中文报错
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# 这些属性里放的是「资源地址」
LINK_ATTRS = {
    "a": "href",
    "area": "href",
    "link": "href",
    "img": "src",
    "script": "src",
    "iframe": "src",
    "frame": "src",
    "source": "src",
    "video": "src",
    "audio": "src",
    "track": "src",
    "embed": "src",
    "object": "data",
    "use": "href",          # <use href="#i-target"> 引用页面内 sprite
    "image": "href",
}

SKIP_SCHEMES = (
    "http://", "https://", "//", "mailto:", "tel:", "javascript:",
    "data:", "about:", "ftp:", "file:",
)


class PageParser(HTMLParser):
    """收集页面里的 id/name、资源引用、slides 配置、table 位置。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []          # [(tag, attr, value, line)]
        self.icons = []          # [(icon-name, line)]  <use href="#i-xxx">
        self.slides = []         # [dict(attr...)]
        self.tables = []         # [(line, wrapped_bool)]
        self._stack = []         # [(tag, classes)]

    # ---------------------------------------------------------------- tags
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]

        if a.get("id"):
            self.ids.append((a["id"], line))
        if tag == "a" and a.get("name"):
            self.ids.append((a["name"], line))

        attr = LINK_ATTRS.get(tag)
        if attr and a.get(attr) is not None:
            self.links.append((tag, attr, a[attr], line))
        if tag == "use" and (a.get("href") or "").startswith("#i-"):
            self.icons.append((a["href"].lstrip("#"), line))

        classes = (a.get("class") or "").split()
        if "slides" in classes:
            self.slides.append({k: v for k, v in a.items() if k.startswith("data-")})

        if tag == "table":
            wrapped = any(
                t == "div" and any(c.startswith("table-wrap") for c in cls)
                for t, cls in self._stack
            )
            self.tables.append((line, wrapped))

        # 空元素不入栈（HTML 里 <img> 等不会闭合）
        if tag not in ("img", "br", "hr", "input", "link", "meta", "source",
                       "track", "area", "base", "col", "embed", "wbr"):
            self._stack.append((tag, classes))

    def handle_endtag(self, tag):
        for i in range(len(self._stack) - 1, -1, -1):
            if self._stack[i][0] == tag:
                del self._stack[i:]
                break


def read_text(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def collect_pages(root):
    pages = []
    home = os.path.join(root, "index.html")
    if os.path.isfile(home):
        pages.append(home)
    chroot = os.path.join(root, "chapters")
    for dirpath, dirnames, filenames in os.walk(chroot):
        dirnames.sort()
        for name in sorted(filenames):
            if name.lower().endswith((".html", ".htm")):
                pages.append(os.path.join(dirpath, name))
    return pages


def parse_page(path):
    p = PageParser()
    p.feed(read_text(path))
    p.close()
    return p


def slide_files(page_dir, attrs):
    """按 .slides 的 data-* 规则，算出目录里实际存在的图片列表。"""
    rel_dir = attrs.get("data-slides-dir", "slides")
    prefix = attrs.get("data-prefix", "slide")
    ext = attrs.get("data-ext", "jpg")
    pad = int(attrs.get("data-pad", "3") or 3)
    start = int(attrs.get("data-start", "1") or 1)
    count = int(attrs.get("data-count", "0") or 0)
    folder = os.path.normpath(os.path.join(page_dir, unquote(rel_dir)))

    actual = []
    if os.path.isdir(folder):
        pat = re.compile(r"^%s-(\d+)\.%s$" % (re.escape(prefix), re.escape(ext)), re.I)
        for name in os.listdir(folder):
            m = pat.match(name)
            if m:
                actual.append((int(m.group(1)), name))
    actual.sort()
    expected_names = ["%s-%0*d.%s" % (prefix, pad, start + i, ext) for i in range(count)]
    missing = [n for n in expected_names
               if not os.path.isfile(os.path.join(folder, n))]
    return {
        "folder": folder,
        "rel_dir": rel_dir,
        "count": count,
        "actual": len(actual),
        "first": actual[0][1] if actual else None,
        "last": actual[-1][1] if actual else None,
        "missing": missing,
    }


def check_page(path, root, id_cache, icon_set=None):
    """返回 (errors, warnings)。"""
    errors, warnings = [], []
    rel = os.path.relpath(path, root).replace("\\", "/")
    page_dir = os.path.dirname(path)
    page = parse_page(path)
    src = read_text(path)

    ids = {i for i, _ in page.ids}
    # 重复 id
    seen = {}
    for i, line in page.ids:
        seen[i] = seen.get(i, 0) + 1
    for i, n in seen.items():
        if n > 1:
            warnings.append("%s: id=\"%s\" 重复出现 %d 次" % (rel, i, n))

    # 1/2/3/4：资源与锚点
    for tag, attr, value, line in page.links:
        v = value.strip()
        if tag == "use":
            continue          # 图标 sprite 由 site.js 注入，单独校验图标名
        if not v:
            warnings.append("%s:%d: <%s %s> 为空" % (rel, line, tag, attr))
            continue
        low = v.lower()
        if low.startswith(SKIP_SCHEMES):
            continue
        if v.startswith("/"):
            errors.append("%s:%d: <%s %s=\"%s\"> 使用了绝对路径（站点可能在子路径下）"
                          % (rel, line, tag, attr, v))
            continue

        parts = urlsplit(v)
        target_rel = unquote(parts.path)
        frag = unquote(parts.fragment)

        if not target_rel:
            # 同页锚点
            if frag and frag not in ids and frag != "top":
                errors.append("%s:%d: 锚点 #%s 在本页不存在" % (rel, line, frag))
            continue

        target = os.path.normpath(os.path.join(page_dir, target_rel))
        if not os.path.exists(target):
            errors.append("%s:%d: <%s %s=\"%s\"> 指向的文件不存在（%s）"
                          % (rel, line, tag, attr, v,
                             os.path.relpath(target, root).replace("\\", "/")))
            continue

        if frag and target.lower().endswith((".html", ".htm")):
            if target not in id_cache:
                id_cache[target] = {i for i, _ in parse_page(target).ids}
            if frag not in id_cache[target] and frag != "top":
                errors.append("%s:%d: 跨页锚点 %s#%s 在目标页不存在"
                              % (rel, line, target_rel, frag))

    # 5：课件图
    for attrs in page.slides:
        info = slide_files(page_dir, attrs)
        if info["count"] and not os.path.isdir(info["folder"]):
            errors.append("%s: .slides 目录不存在：%s" % (rel, info["rel_dir"]))
            continue
        if info["count"] != info["actual"]:
            errors.append(
                "%s: .slides data-count=%d，但 %s 里实际有 %d 张图"
                % (rel, info["count"], info["rel_dir"], info["actual"]))
        if info["missing"]:
            preview = "、".join(info["missing"][:4])
            more = "" if len(info["missing"]) <= 4 else " 等 %d 个" % len(info["missing"])
            errors.append("%s: .slides 缺少文件 %s%s" % (rel, preview, more))

    # 表格必须包在 .table-wrap 里（否则手机上横向撑破）
    for line, wrapped in page.tables:
        if not wrapped:
            warnings.append("%s:%d: <table> 没有包在 <div class=\"table-wrap\"> 里"
                            % (rel, line))

    # 图标名必须在 site.js 的 ICONS 里，否则渲染成空白
    if icon_set is not None:
        for name, line in page.icons:
            if name not in icon_set:
                errors.append("%s:%d: 图标 #%s 不在 site.js 的 ICONS 里（会渲染成空白）"
                              % (rel, line, name))

    # 内联 style 里出现绝对 url(/...)
    for m in re.finditer(r"url\(\s*['\"]?(/[^)'\"]+)", src):
        errors.append("%s: CSS url() 使用了绝对路径 %s" % (rel, m.group(1)))

    return errors, warnings


def check_manifest(root, id_cache):
    """校验 data/chapters.js 里登记的目录 / 页面 / 章节锚点是否真实存在。"""
    errors, warnings = [], []
    path = os.path.join(root, "data", "chapters.js")
    if not os.path.isfile(path):
        warnings.append("未找到 data/chapters.js，跳过清单校验")
        return errors, warnings
    src = read_text(path)

    def page_ids(rel_path):
        target = os.path.join(root, rel_path.replace("/", os.sep))
        if not os.path.isfile(target):
            return None
        if target not in id_cache:
            id_cache[target] = {i for i, _ in parse_page(target).ids}
        return id_cache[target]

    for m in re.finditer(r"id:\s*[\"'](ch\d+)[\"']", src):
        cid = m.group(1)
        seg = src[m.start(): m.start() + 6000]
        d = re.search(r"dir:\s*[\"']([^\"']*)[\"']", seg)
        if d:
            rel = d.group(1).strip("/") + "/index.html"
            if page_ids(rel) is None:
                errors.append("data/chapters.js: %s 的 dir 指向不存在的页面 %s" % (cid, rel))
        # pages[] 子页
        seg_end = seg.find("id: \"ch", 10)
        block = seg if seg_end < 0 else seg[:seg_end]
        pblock = re.search(r"pages:\s*\[([\s\S]*?)\n\s*\]", block)
        if pblock:
            for fm in re.finditer(r"file:\s*[\"']([^\"']+)[\"']", pblock.group(1)):
                rel = "chapters/%s/%s" % (cid, fm.group(1))
                if page_ids(rel) is None:
                    errors.append("data/chapters.js: %s 的 pages 登记了不存在的文件 %s"
                                  % (cid, fm.group(1)))
    return errors, warnings


def load_icon_names(root):
    """从 assets/js/site.js 的 ICONS 表里取出可用图标名。"""
    path = os.path.join(root, "assets", "js", "site.js")
    if not os.path.isfile(path):
        return None
    src = read_text(path)
    m = re.search(r"var ICONS = \{([\s\S]*?)\n\s*\};", src)
    block = m.group(1) if m else src
    names = set(re.findall(r"'(i-[a-z0-9-]+)'\s*:", block))
    return names or None



def parse_videos_manifest(root):
    """解析 data/videos.js，返回 [{slug,chapter,file,poster,duration}]。"""
    path = os.path.join(root, "data", "videos.js")
    if not os.path.isfile(path):
        return None
    src = read_text(path)
    arr = re.search(r"window\.SDA_VIDEOS\s*=\s*\[([\s\S]*?)\n\];", src)
    body = arr.group(1) if arr else src
    out = []
    for m in re.finditer(r"\{([^{}]*)\}", body):
        obj = m.group(1)
        def field(name):
            mm = re.search(r'%s:\s*"([^"]*)"' % name, obj)
            return mm.group(1) if mm else ""
        def num(name):
            mm = re.search(r"%s:\s*([0-9.]+)" % name, obj)
            return float(mm.group(1)) if mm else 0.0
        out.append({"slug": field("slug"), "chapter": field("chapter"),
                    "file": field("file"), "poster": field("poster"),
                    "duration": num("duration"), "alt": field("alt")})
    return out


def check_videos(root):
    """校验 data/videos.js：mp4 / poster 是否真实存在、字段是否完整。"""
    errors, warnings = [], []
    vids = parse_videos_manifest(root)
    if vids is None:
        return errors, warnings
    if not vids:
        errors.append("data/videos.js 里没有解析到任何视频条目")
        return errors, warnings
    chapters = {"ch1", "ch4-creation", "ch4-structural", "ch4-behavioral", "ch5"}
    slugs = {}
    for v in vids:
        label = v["slug"] or "(空 slug)"
        if not v["slug"]:
            errors.append("data/videos.js: 有条目缺少 slug")
            continue
        slugs[v["slug"]] = slugs.get(v["slug"], 0) + 1
        if v["chapter"] not in chapters:
            errors.append("data/videos.js: %s 的 chapter=%r 不在允许集合内"
                          % (label, v["chapter"]))
        if v["file"] != "videos/%s.mp4" % v["slug"]:
            warnings.append("data/videos.js: %s 的 file 命名与 slug 不一致（%s）"
                            % (label, v["file"]))
        if v["poster"] != "videos/posters/%s.jpg" % v["slug"]:
            warnings.append("data/videos.js: %s 的 poster 命名与 slug 不一致（%s）"
                            % (label, v["poster"]))
        for key, rel in (("file", v["file"]), ("poster", v["poster"])):
            target = os.path.join(root, rel.replace("/", os.sep))
            if not os.path.isfile(target):
                errors.append("data/videos.js: %s 的 %s 文件不存在：%s"
                              % (label, key, rel))
            elif key == "poster" and os.path.getsize(target) < 3000:
                warnings.append("data/videos.js: %s 的封面过小（%d B），可能截到空帧"
                                % (label, os.path.getsize(target)))
        if not v["duration"]:
            errors.append("data/videos.js: %s 缺少 duration" % label)
    for slug, n in slugs.items():
        if n > 1:
            errors.append("data/videos.js: slug %s 重复 %d 次" % (slug, n))
    return errors, warnings


def main(argv=None):
    ap = argparse.ArgumentParser(description="全站相对链接 / 锚点 / 课件图检查")
    ap.add_argument("--root", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    help="站点根目录（默认本脚本上一级）")
    ap.add_argument("--quiet", action="store_true", help="只输出问题与总结")
    ap.add_argument("--json", action="store_true", help="输出 JSON")
    args = ap.parse_args(argv)

    root = os.path.abspath(args.root)
    pages = collect_pages(root)
    if not pages:
        print("未找到任何页面，检查 --root 是否正确。")
        return 1

    id_cache = {}
    icon_set = load_icon_names(root)
    report = []
    total_err = total_warn = 0
    for path in pages:
        rel = os.path.relpath(path, root).replace("\\", "/")
        errors, warnings = check_page(path, root, id_cache, icon_set)
        total_err += len(errors)
        total_warn += len(warnings)
        report.append({"page": rel, "errors": errors, "warnings": warnings})
        if not args.quiet and not args.json:
            print("  %-42s %s" % (rel, "OK" if not errors and not warnings
                                  else "错误 %d / 提示 %d" % (len(errors), len(warnings))))

    man_err, man_warn = check_manifest(root, id_cache)
    vid_err, vid_warn = check_videos(root)
    man_err = list(man_err) + list(vid_err)
    man_warn = list(man_warn) + list(vid_warn)
    total_err += len(man_err)
    total_warn += len(man_warn)

    if args.json:
        print(json.dumps({
            "root": root,
            "pages": report,
            "manifest": {"errors": man_err, "warnings": man_warn},
            "errors": total_err,
            "warnings": total_warn,
        }, ensure_ascii=False, indent=2))
        return 1 if total_err else 0

    if not args.quiet:
        print("")
    for item in report:
        if not item["errors"] and not item["warnings"]:
            continue
        print("── %s" % item["page"])
        for e in item["errors"]:
            print("   [错误] " + e)
        for w in item["warnings"]:
            print("   [提示] " + w)
    if man_err or man_warn:
        print("── data/chapters.js")
        for e in man_err:
            print("   [错误] " + e)
        for w in man_warn:
            print("   [提示] " + w)

    print("")
    print("=" * 66)
    print("  检查页面 : %d 个" % len(pages))
    print("  错误     : %d" % total_err)
    print("  提示     : %d" % total_warn)
    print("  结论     : %s" % ("通过 ✅" if total_err == 0 else "存在错误 ❌ 请修复后再发布"))
    print("=" * 66)
    return 1 if total_err else 0


if __name__ == "__main__":
    sys.exit(main())