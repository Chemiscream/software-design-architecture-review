#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/check_content.py —— 全站「结构 + 数据 + 清单一致性」检查器
=============================================================================

对应 docs/CONTENT_CONTRACT.md 第 3 / 5 / 6 / 8 节。检查项：

结构
    · <html data-page> / <html data-chapter> 正确；正式章节没有 data-nostore
    · 8 个标准 section 的 id 齐全且顺序为
          overview → concepts → detail → compare → pitfalls → quiz → cards → slides
     追加小节只能出现在 slides 之后，且都带 class="section" 与 data-title
    · 每页只有一个 <h1>
    · 六个挂载点存在且内部为空
    · 脚本顺序：chapters.js → site.js，JSON 数据块在两者之前
    · 没有任何以 "/" 开头的绝对路径
    · .section-head__num 编号连续（02、03……）

数据
    · #quiz-data 能被 JSON.parse 解析（严格 JSON）
    · 题型只有 single / multiple / boolean
    · answer 是 0-based：单选为整数下标；多选为下标数组；判断为 true/false
    · 单选/多选有 options 且下标在范围内；判断题不得写 options
    · 每题必须有非空 explain（解析）
    · #cards-data 每张卡都有 front / back；back 只允许少量行内 HTML

清单
    · data/chapters.js 里每章登记的 sections / pages / stats 与真实页面一致
      （这是防止「首页统计写死、内容改了没同步」的自动闸门）

用法
----
    cd website
    python tools/check_content.py                 # 人读报告
    python tools/check_content.py --json          # 机器可读（含每页统计）
    python tools/check_content.py --no-manifest   # 跳过 data/chapters.js 比对

退出码：0 = 全部通过；1 = 存在错误。
"""

import argparse
import json
import os
import re
import sys
from html.parser import HTMLParser

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

STANDARD_SECTIONS = ["overview", "concepts", "detail", "compare",
                     "pitfalls", "quiz", "cards", "slides"]
QUIZ_TYPES = ("single", "multiple", "boolean")
ALLOWED_CARD_TAGS = {"b", "strong", "code", "br", "i", "em", "span", "small", "mark"}
MOUNTS = ["topbar-root", "sidebar-root", "footer-root", "pager-root",
          "quiz-root", "cards-root"]


class ContentParser(HTMLParser):
    """收集 section 序列、挂载点、id、h1、slides 配置。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections = []        # [{"id","title","classes","line"}]
        self.ids = set()
        self.mounts = {}          # id -> {"tag","inner":[str],"line"}
        self.h1 = []              # lines
        self.slide_blocks = []    # [dict(data-*)]
        self._open_mount = None   # (id, tag, depth)
        self._depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        self._depth += 1
        eid = a.get("id")
        if eid:
            self.ids.add(eid)
        if tag == "h1":
            self.h1.append(line)

        if tag == "section":
            self.sections.append({
                "id": eid or "",
                "title": a.get("data-title") or "",
                "classes": (a.get("class") or "").split(),
                "line": line,
            })

        classes = (a.get("class") or "").split()
        if "slides" in classes:
            self.slide_blocks.append({k: v for k, v in a.items() if k.startswith("data-")})

        if eid in MOUNTS and eid not in self.mounts:
            self.mounts[eid] = {"tag": tag, "line": line, "inner": [], "depth": self._depth}

    def handle_endtag(self, tag):
        self._depth -= 1

    def handle_data(self, data):
        # 记录所有挂载点内部的文字：挂载点必须为空
        for info in self.mounts.values():
            if "closed" not in info and self._depth > info["depth"]:
                info["inner"].append(data)


def read_text(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def collect_pages(root):
    pages = []
    home = os.path.join(root, "index.html")
    if os.path.isfile(home):
        pages.append(home)
    for dirpath, dirnames, filenames in os.walk(os.path.join(root, "chapters")):
        dirnames.sort()
        for name in sorted(filenames):
            if name.lower().endswith((".html", ".htm")):
                pages.append(os.path.join(dirpath, name))
    return pages


def extract_json_block(src, block_id):
    """从源码里取 <script ... id="block-id">JSON</script> 的原始内容。"""
    m = re.search(
        r"<script\b(?=[^>]*\bid=[\"']%s[\"'])[^>]*>([\s\S]*?)</script>" % re.escape(block_id),
        src, re.I)
    if not m:
        return None
    return m.group(1)


def count_slide_files(folder, prefix="slide", ext="jpg"):
    if not os.path.isdir(folder):
        return 0
    pat = re.compile(r"^%s-\d+\.%s$" % (re.escape(prefix), re.escape(ext)), re.I)
    return sum(1 for n in os.listdir(folder) if pat.match(n))


def validate_quiz(data, rel, lenient=False):
    errors, warnings = [], []
    if data is None:
        return errors, warnings, 0
    questions = data if isinstance(data, list) else (data.get("questions") or [])
    if not isinstance(questions, list) or not questions:
        errors.append("%s: quiz-data 不是非空数组" % rel)
        return errors, warnings, 0

    stems = {}
    for i, q in enumerate(questions, 1):
        where = "%s: 第 %d 题" % (rel, i)
        if not isinstance(q, dict):
            errors.append(where + " 不是对象")
            continue
        qtype = str(q.get("type", "")).strip().lower()
        if qtype not in QUIZ_TYPES:
            errors.append(where + "：type 必须是 single/multiple/boolean，当前为 %r"
                          % q.get("type"))
            continue
        stem = q.get("stem")
        if not isinstance(stem, str) or not stem.strip():
            errors.append(where + "：缺少 stem（题干）")
        else:
            stems[stem.strip()] = stems.get(stem.strip(), 0) + 1
            if "<script" in stem.lower():
                errors.append(where + "：题干里出现了 <script")

        explain = q.get("explain")
        if not isinstance(explain, str) or not explain.strip():
            errors.append(where + "：缺少 explain（解析）—— 题意要求每题都写为什么")

        options = q.get("options")
        answer = q.get("answer")
        if qtype == "boolean":
            if options is not None:
                errors.append(where + "：判断题不应写 options（选项自动为 正确/错误）")
            if not isinstance(answer, bool):
                errors.append(where + "：判断题 answer 必须是 true/false，当前为 %r" % (answer,))
        else:
            if not isinstance(options, list) or len(options) < 2:
                errors.append(where + "：%s 题必须提供至少 2 个 options" % qtype)
                continue
            for oi, opt in enumerate(options):
                if not isinstance(opt, str) or not opt.strip():
                    errors.append(where + "：options[%d] 为空" % oi)
            n = len(options)
            if qtype == "single":
                if isinstance(answer, bool) or not isinstance(answer, int):
                    errors.append(where + "：单选 answer 必须是整数下标（0-based），当前 %r"
                                  % (answer,))
                elif not (0 <= answer < n):
                    errors.append(where + "：单选 answer=%d 越界（0–%d）" % (answer, n - 1))
            else:  # multiple
                if not isinstance(answer, list) or not answer:
                    errors.append(where + "：多选 answer 必须是非空下标数组，当前 %r"
                                  % (answer,))
                else:
                    bad = [a for a in answer
                           if isinstance(a, bool) or not isinstance(a, int) or not (0 <= a < n)]
                    if bad:
                        errors.append(where + "：多选 answer 有越界/非法下标 %r（合法 0–%d）"
                                      % (bad, n - 1))
                    if len(set(answer)) != len(answer):
                        warnings.append(where + "：多选 answer 有重复下标")

    for stem, n in stems.items():
        if n > 1:
            warnings.append("%s: 题干重复 %d 次：%s" % (rel, n, stem[:24]))
    if len(questions) < 6 and not lenient:
        warnings.append("%s: 只有 %d 题（契约建议 6–10 题）" % (rel, len(questions)))
    return errors, warnings, len(questions)


def validate_cards(data, rel, lenient=False):
    errors, warnings = [], []
    if data is None:
        return errors, warnings, 0
    cards = data if isinstance(data, list) else (data.get("cards") or [])
    if not isinstance(cards, list) or not cards:
        errors.append("%s: cards-data 不是非空数组" % rel)
        return errors, warnings, 0

    for i, c in enumerate(cards, 1):
        where = "%s: 第 %d 张卡" % (rel, i)
        if not isinstance(c, dict):
            errors.append(where + " 不是对象")
            continue
        for key in ("front", "back"):
            v = c.get(key)
            if not isinstance(v, str) or not v.strip():
                errors.append("%s：缺少 %s" % (where, key))
        back = c.get("back") or ""
        if isinstance(back, str):
            for m in re.finditer(r"<\s*/?\s*([a-zA-Z][a-zA-Z0-9]*)", back):
                tag = m.group(1).lower()
                if tag not in ALLOWED_CARD_TAGS:
                    warnings.append("%s：back 里用了契约未列出的标签 <%s>" % (where, tag))
            if "<script" in back.lower():
                errors.append(where + "：back 里出现了 <script")
    if len(cards) < 8 and not lenient:
        warnings.append("%s: 只有 %d 张卡（契约建议 8–15 张）" % (rel, len(cards)))
    return errors, warnings, len(cards)


def parse_int_attr(attrs, key, default):
    v = attrs.get(key)
    try:
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def check_page(path, root):
    errors, warnings = [], []
    rel = os.path.relpath(path, root).replace("\\", "/")
    src = read_text(path)
    p = ContentParser()
    p.feed(src)
    p.close()

    is_home = rel == "index.html"
    is_template = "_template" in rel
    # 首页是落地页，模板页只是示例：两者不套用「章节页」的强制结构
    strict_chapter = not is_home and not is_template

    # ---------- html 元素 ----------
    m = re.search(r"<html\b([^>]*)>", src, re.I)
    html_attrs = dict(re.findall(r"([a-zA-Z-]+)=\"([^\"]*)\"", m.group(1))) if m else {}
    data_page = html_attrs.get("data-page", "")
    data_chapter = html_attrs.get("data-chapter", "")

    if is_home:
        if data_page != "home":
            errors.append('%s: <html data-page> 应为 "home"，当前 %r' % (rel, data_page))
    elif not is_template:
        if data_page != "chapter":
            errors.append('%s: <html data-page> 应为 "chapter"，当前 %r' % (rel, data_page))
        if not re.match(r"^ch\d+$", data_chapter or ""):
            errors.append('%s: <html data-chapter> 缺失或格式不对（当前 %r）'
                          % (rel, data_chapter))
        else:
            expected = re.match(r"chapters/(ch\d+)/", rel.replace("\\", "/"))
            if expected and expected.group(1) != data_chapter and not is_template:
                errors.append("%s: data-chapter=%s 与所在目录 %s 不一致"
                              % (rel, data_chapter, expected.group(1)))
        if "data-nostore" in src:
            errors.append("%s: 正式章节不能带 data-nostore（进度与成绩不会保存）" % rel)

    if not is_home and "· 软件设计与体系架构" not in src.split("</title>")[0]:
        warnings.append("%s: <title> 建议写成「第 N 章 …· 软件设计与体系架构」" % rel)

    # ---------- 绝对路径 ----------
    for m in re.finditer(r"(?:href|src)\s*=\s*[\"'](/[^\"']*)[\"']", src, re.I):
        errors.append("%s: 绝对路径 %s（必须用相对路径）" % (rel, m.group(1)))

    # ---------- section 顺序（仅正式章节页） ----------
    secs = [s for s in p.sections if "section" in s["classes"] or s["id"]] if strict_chapter else []
    ids = [s["id"] for s in secs]
    for sid in STANDARD_SECTIONS:
        if strict_chapter and sid not in ids:
            errors.append("%s: 缺少 section id=%s" % (rel, sid))
    if strict_chapter and all(s in ids for s in STANDARD_SECTIONS):
        positions = [ids.index(s) for s in STANDARD_SECTIONS]
        if positions != sorted(positions):
            errors.append("%s: 8 个标准 section 顺序错误，当前顺序 %s"
                          % (rel, " → ".join(ids)))
        last = ids.index("slides")
        for sid in ids[last + 1:]:
            if sid not in STANDARD_SECTIONS:
                pass  # 追加小节合法
        for i, sid in enumerate(ids):
            if sid in STANDARD_SECTIONS:
                continue
            if i < last:
                errors.append("%s: 追加小节 #%s 出现在 slides 之前（必须在 slides 之后）"
                              % (rel, sid))
    for s in secs:
        if not s["title"]:
            errors.append("%s:%d: section#%s 缺少 data-title（侧栏要用）"
                          % (rel, s["line"], s["id"] or "?"))
    if not strict_chapter and not is_home:
        if "data-nostore" not in src:
            warnings.append("%s: 模板页应保留 data-nostore（避免写入真实进度）" % rel)

    # section-head 编号连续
    nums = re.findall(r'<span class="section-head__num">\s*([^<]*?)\s*</span>', src)
    expect = ["%02d" % (i + 2) for i in range(len(nums))]
    if nums and nums != expect and strict_chapter:
        warnings.append("%s: section-head__num 编号不连续：%s（应为 %s）"
                        % (rel, "、".join(nums), "、".join(expect)))

    # ---------- h1 ----------
    if len(p.h1) != 1:
        errors.append("%s: 有 %d 个 <h1>（全页应只有 1 个，放在 hero 里）"
                      % (rel, len(p.h1)))

    # ---------- 挂载点 ----------
    if strict_chapter:
        for mid in MOUNTS:
            if mid not in p.ids:
                errors.append("%s: 缺少挂载点 #%s" % (rel, mid))
        for mid in MOUNTS:
            mopen = re.search(r"<([a-zA-Z0-9]+)([^>]*\bid=[\"']%s[\"'][^>]*)>([\s\S]*?)</\1>"
                              % re.escape(mid), src, re.I)
            if mopen:
                inner = re.sub(r"<!--[\s\S]*?-->", "", mopen.group(3)).strip()
                if inner:
                    errors.append("%s: 挂载点 #%s 内部必须为空，当前有内容" % (rel, mid))

    # ---------- 脚本顺序 ----------
    has_chapters = re.search(r"<script[^>]+src=[\"'][^\"']*data/chapters\.js[\"']", src, re.I)
    has_site = re.search(r"<script[^>]+src=[\"'][^\"']*assets/js/site\.js[\"']", src, re.I)
    if strict_chapter:
        if not has_chapters:
            errors.append("%s: 缺少 ../../data/chapters.js 引用" % rel)
        if not has_site:
            errors.append("%s: 缺少 ../../assets/js/site.js 引用" % rel)
        if has_chapters and has_site and has_chapters.start() > has_site.start():
            errors.append("%s: 脚本顺序错，chapters.js 必须在 site.js 之前" % rel)
        quiz_pos = src.find('id="quiz-data"')
        if quiz_pos < 0:
            quiz_pos = src.find("id='quiz-data'")
        if has_chapters and quiz_pos > has_chapters.start():
            errors.append("%s: #quiz-data 应放在两个 <script src> 之前" % rel)
        css = re.search(r"<link[^>]+href=[\"']([^\"']*site\.css)[\"']", src, re.I)
        if not css:
            errors.append("%s: 缺少 site.css 引用" % rel)
        elif css.group(1) != "../../assets/css/site.css":
            warnings.append("%s: site.css 路径建议为 ../../assets/css/site.css，当前 %s"
                            % (rel, css.group(1)))

    # ---------- quiz / cards ----------
    quiz_raw = extract_json_block(src, "quiz-data")
    quiz_count = 0
    if strict_chapter:
        if quiz_raw is None:
            errors.append("%s: 缺少 <script id=\"quiz-data\">" % rel)
        else:
            try:
                quiz_data = json.loads(quiz_raw.strip() or "null")
            except ValueError as e:
                errors.append("%s: quiz-data 不是合法 JSON —— %s" % (rel, e))
                quiz_data = None
            if quiz_data is not None:
                errs, warns, quiz_count = validate_quiz(quiz_data, rel, lenient=is_template)
                errors += errs
                warnings += warns

    cards_raw = extract_json_block(src, "cards-data")
    cards_count = 0
    if strict_chapter:
        if cards_raw is None:
            errors.append("%s: 缺少 <script id=\"cards-data\">" % rel)
        else:
            try:
                cards_data = json.loads(cards_raw.strip() or "null")
            except ValueError as e:
                errors.append("%s: cards-data 不是合法 JSON —— %s" % (rel, e))
                cards_data = None
            if cards_data is not None:
                errs, warns, cards_count = validate_cards(cards_data, rel, lenient=is_template)
                errors += errs
                warnings += warns

    # ---------- 代码块转义 ----------
    for m in re.finditer(r"<pre>\s*<code>([\s\S]*?)</code>\s*</pre>", src):
        body = m.group(1)
        if re.search(r"<[a-zA-Z/]", body):
            line = src[: m.start()].count("\n") + 1
            errors.append("%s:%d: 代码块里有未转义的 '<'（应写成 &lt;）" % (rel, line))

    # ---------- 课件 ----------
    slides_total = 0
    for attrs in p.slide_blocks:
        rel_dir = attrs.get("data-slides-dir", "slides")
        folder = os.path.normpath(os.path.join(os.path.dirname(path), rel_dir))
        count = parse_int_attr(attrs, "data-count", 0)
        actual = count_slide_files(folder,
                                   attrs.get("data-prefix", "slide"),
                                   attrs.get("data-ext", "jpg"))
        slides_total += count
        if count != actual:
            errors.append("%s: data-count=%d，但 %s 实际有 %d 张图"
                          % (rel, count, rel_dir, actual))
        if not attrs.get("data-title"):
            warnings.append("%s: .slides 缺少 data-title" % rel)

    stats = {
        "page": rel,
        "sections": [{"id": s["id"], "title": s["title"]} for s in secs],
        "sectionCount": len(secs),
        "quiz": quiz_count,
        "cards": cards_count,
        "slides": slides_total,
    }
    return errors, warnings, stats


# ---------------------------------------------------------------- 清单比对
def _balanced(text, start):
    """从 text[start]（必须是 [ 或 {）开始，返回配平的整段（含首尾括号）。"""
    pairs = {"[": "]", "{": "}"}
    open_ch = text[start]
    close_ch = pairs[open_ch]
    depth = 0
    i = start
    in_str = None
    while i < len(text):
        ch = text[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == in_str:
                in_str = None
        else:
            if ch in "\"'":
                in_str = ch
            elif ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
        i += 1
    return text[start:]


def _objects(arr_text):
    """把 "[ {..} {..} ]" 里的顶层对象拆出来。"""
    out = []
    i = 0
    while i < len(arr_text):
        j = arr_text.find("{", i)
        if j < 0:
            break
        obj = _balanced(arr_text, j)
        if not obj:
            break
        out.append(obj)
        i = j + len(obj)
    return out


def _section_list(obj_text):
    """取对象里第一个 sections: [...] 的 {id, title} 列表。"""
    m = re.search(r"\bsections:\s*\[", obj_text)
    if not m:
        return []
    arr = _balanced(obj_text, m.end() - 1)
    return [{"id": sid, "title": st}
            for sid, st in re.findall(
                r"\{\s*id:\s*[\"']([^\"']+)[\"']\s*,\s*title:\s*[\"']([^\"']*)[\"']\s*\}", arr)]


def _stats(obj_text):
    """取对象里第一个 stats: {...} 的数字字段。"""
    m = re.search(r"\bstats:\s*\{([^}]*)\}", obj_text)
    if not m:
        return {}
    return {k: int(v) for k, v in re.findall(r"(\w+)\s*:\s*(\d+)", m.group(1))}


def parse_manifest(src):
    """解析 data/chapters.js 的 chapters 数组（只取检查所需字段）。"""
    chapters = []
    m = re.search(r"chapters:\s*\[", src)
    if not m:
        return chapters
    arr = _balanced(src, m.end() - 1)
    for ch_text in _objects(arr):
        cid_m = re.search(r"\bid:\s*[\"'](ch\d+)[\"']", ch_text)
        if not cid_m:
            continue
        cid = cid_m.group(1)
        ch = {"id": cid, "sections": [], "pages": [], "stats": {}}
        pages_m = re.search(r"\bpages:\s*\[", ch_text)
        chapter_only = ch_text
        if pages_m:
            pages_arr = _balanced(ch_text, pages_m.end() - 1)
            chapter_only = ch_text.replace(pages_arr, "")
            for ptxt in _objects(pages_arr):
                fm = re.search(r"file:\s*[\"']([^\"']+)[\"']", ptxt)
                if not fm:
                    continue
                ch["pages"].append({
                    "file": fm.group(1),
                    "sections": _section_list(ptxt),
                    "stats": _stats(ptxt),
                })
        ch["sections"] = _section_list(chapter_only)
        ch["stats"] = _stats(chapter_only)
        chapters.append(ch)
    return chapters


def check_manifest(root, stats_by_page):
    errors, warnings = [], []
    path = os.path.join(root, "data", "chapters.js")
    if not os.path.isfile(path):
        return errors, [("未找到 data/chapters.js，跳过清单比对", "")]
    src = read_text(path)
    chapters = parse_manifest(src)

    def cmp_sections(where, expected, actual, rel_page):
        if not expected:
            warning = "%s 尚未登记 sections（首页/侧栏无法显示真实小节）" % where
            return None, warning
        e = [(s["id"], s["title"]) for s in expected]
        a = [(s["id"], s["title"]) for s in actual]
        if e != a:
            return ("%s 的 sections 与 %s 不一致\n        登记: %s\n        实际: %s"
                    % (where, rel_page, e, a)), None
        return None, None

    for ch in chapters:
        cid = ch["id"]
        chapter_pages = [p for p in stats_by_page if p.startswith("chapters/%s/" % cid)]
        index_page = "chapters/%s/index.html" % cid
        if index_page not in stats_by_page:
            errors.append("data/chapters.js: %s 找不到 %s" % (cid, index_page))
            continue
        if ch["sections"]:
            e, w = cmp_sections("data/chapters.js %s" % cid, ch["sections"],
                                stats_by_page[index_page]["sections"], index_page)
            if e:
                errors.append(e)
            if w:
                warnings.append(w)
        else:
            warnings.append("data/chapters.js %s: 尚未登记 sections" % cid)

        # 章级统计
        tot_quiz = sum(stats_by_page[r]["quiz"] for r in chapter_pages)
        tot_cards = sum(stats_by_page[r]["cards"] for r in chapter_pages)
        # 课件页数：按不重复目录统计（ch4 首页复用了 creation 目录）
        dirs = set()
        for rel_page in chapter_pages:
            rel_dir = os.path.dirname(os.path.join(root, rel_page))
            src_page = read_text(os.path.join(root, rel_page))
            for sl in re.finditer(r'<div[^>]*class="slides"[^>]*>', src_page):
                tag = sl.group(0)
                d = re.search(r'data-slides-dir="([^"]*)"', tag)
                pfx = re.search(r'data-prefix="([^"]*)"', tag)
                ext = re.search(r'data-ext="([^"]*)"', tag)
                if d:
                    folder = os.path.normpath(os.path.join(rel_dir, d.group(1)))
                    dirs.add((folder, pfx.group(1) if pfx else "slide",
                              ext.group(1) if ext else "jpg"))
        tot_slides = sum(count_slide_files(f, pf, ex) for f, pf, ex in dirs)
        expect = {"quiz": tot_quiz, "cards": tot_cards,
                  "slides": tot_slides, "sections": stats_by_page[index_page]["sectionCount"]}
        if not ch["stats"]:
            warnings.append("data/chapters.js %s: 尚未登记 stats（首页统计会缺失）" % cid)
        else:
            for key, val in expect.items():
                if key in ch["stats"] and ch["stats"][key] != val:
                    errors.append("data/chapters.js %s.stats.%s=%d，实际为 %d"
                                  % (cid, key, ch["stats"][key], val))

        # 子页
        if ch["pages"]:
            for page in ch["pages"]:
                rel_page = "chapters/%s/%s" % (cid, page["file"])
                if rel_page not in stats_by_page:
                    errors.append("data/chapters.js %s.pages 登记了不存在的页面 %s"
                                  % (cid, page["file"]))
                    continue
                if page["sections"]:
                    e, _ = cmp_sections("data/chapters.js %s/%s" % (cid, page["file"]),
                                        page["sections"],
                                        stats_by_page[rel_page]["sections"], rel_page)
                    if e:
                        errors.append(e)
                if page["stats"]:
                    real = stats_by_page[rel_page]
                    for key in ("quiz", "cards", "slides", "sections"):
                        if key in page["stats"]:
                            actual = real["sectionCount"] if key == "sections" else real[key]
                            if page["stats"][key] != actual:
                                errors.append(
                                    "data/chapters.js %s/%s.stats.%s=%d，实际为 %d"
                                    % (cid, page["file"], key, page["stats"][key], actual))
    return errors, warnings



def check_videos(root, chapters):
    """校验 data/videos.js 与 data/chapters.js（stats.videos）以及各页 #videos 小节。"""
    errors, warnings = [], []
    path = os.path.join(root, "data", "videos.js")
    if not os.path.isfile(path):
        warnings.append("未找到 data/videos.js（视频功能相当于关闭）")
        return errors, warnings
    src = read_text(path)
    lens = re.findall(r"chapter:\s*\"([^\"]+)\"", src)
    counts = {}
    for k in lens:
        counts[k] = counts.get(k, 0) + 1
    per_chapter = {"ch1": counts.get("ch1", 0), "ch2": 0, "ch3": 0,
                   "ch4": sum(v for k, v in counts.items() if k.startswith("ch4")),
                   "ch5": counts.get("ch5", 0)}
    for ch in chapters:
        cid = ch["id"]
        expect = per_chapter.get(cid, 0)
        have = ch["stats"].get("videos")
        if have is None:
            errors.append("data/chapters.js %s 缺少 stats.videos（应有 %d）" % (cid, expect))
        elif have != expect:
            errors.append("data/chapters.js %s.stats.videos=%d，data/videos.js 实际 %d"
                          % (cid, have, expect))
    # 页面 ↔ 视频清单：有视频的页面必须有 #videos 小节，没视频的不该有
    pages = {
        "ch1": "chapters/ch1/index.html",
        "ch4-creation": "chapters/ch4/creation.html",
        "ch4-structural": "chapters/ch4/structural.html",
        "ch4-behavioral": "chapters/ch4/behavioral.html",
        "ch5": "chapters/ch5/index.html",
    }
    for key, rel in pages.items():
        p = os.path.join(root, rel.replace("/", os.sep))
        html = read_text(p) if os.path.isfile(p) else ""
        has_sec = 'id="videos"' in html
        has_root = 'id="videos-root"' in html
        has_manifest = "data/videos.js" in html
        if counts.get(key, 0) > 0:
            if not has_sec:
                errors.append("%s: data/videos.js 有 %d 条视频，但页面缺少 #videos 小节"
                              % (rel, counts[key]))
            elif not has_root:
                errors.append("%s: #videos 小节缺少 #videos-root 挂载点" % rel)
            if not has_manifest:
                errors.append("%s: 没有引用 data/videos.js（视频清单加载不到）" % rel)
        elif has_sec:
            warnings.append("%s: 有 #videos 小节，但清单里本页没有视频" % rel)
    for rel in ("chapters/ch2/index.html", "chapters/ch3/index.html",
                "chapters/ch4/index.html"):
        p = os.path.join(root, rel.replace("/", os.sep))
        if os.path.isfile(p) and 'id="videos"' in read_text(p):
            errors.append("%s: 该页没有视频，不应出现 #videos 小节" % rel)
    return errors, warnings


def main(argv=None):
    ap = argparse.ArgumentParser(description="全站内容/结构/清单一致性检查")
    ap.add_argument("--root", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ap.add_argument("--json", action="store_true", help="输出 JSON（含每页统计）")
    ap.add_argument("--no-manifest", action="store_true", help="跳过 data/chapters.js 比对")
    args = ap.parse_args(argv)

    root = os.path.abspath(args.root)
    pages = collect_pages(root)
    report = []
    stats_by_page = {}
    total_err = total_warn = 0

    for path in pages:
        rel = os.path.relpath(path, root).replace("\\", "/")
        errors, warnings, stats = check_page(path, root)
        stats_by_page[rel] = stats
        total_err += len(errors)
        total_warn += len(warnings)
        report.append({"page": rel, "errors": errors, "warnings": warnings, "stats": stats})
        if not args.json:
            print("  %-42s %-6s 节 %-4d 题 %-4d 卡 %-4d 课件 %-4d  %s"
                  % (rel, "", stats["sectionCount"], stats["quiz"], stats["cards"],
                     stats["slides"],
                     "OK" if not errors else "错误 %d" % len(errors)))

    man_err, man_warn = ([], [])
    if not args.no_manifest:
        man_err, man_warn = check_manifest(root, stats_by_page)
        chapters = parse_manifest(read_text(os.path.join(root, "data", "chapters.js")))
        v_err, v_warn = check_videos(root, chapters)
        man_err = list(man_err) + v_err
        man_warn = list(man_warn) + [(w, "") for w in v_warn]
        total_err += len(man_err)
        total_warn += len(man_warn)

    if args.json:
        print(json.dumps({
            "root": root,
            "pages": report,
            "manifest": {"errors": man_err,
                         "warnings": [w[0] if isinstance(w, tuple) else w for w in man_warn]},
            "errors": total_err,
            "warnings": total_warn,
        }, ensure_ascii=False, indent=2))
        return 1 if total_err else 0

    shown = False
    for item in report:
        if not item["errors"] and not item["warnings"]:
            continue
        shown = True
        print("── %s" % item["page"])
        for e in item["errors"]:
            print("   [错误] " + e)
        for w in item["warnings"]:
            print("   [提示] " + w)
    if man_err or man_warn:
        shown = True
        print("── data/chapters.js")
        for e in man_err:
            print("   [错误] " + e)
        for w in man_warn:
            if isinstance(w, tuple):
                print("   [提示] " + w[0])
            else:
                print("   [提示] " + w)
    if not shown:
        print("")
        print("  未发现结构或数据问题。")

    # 汇总各章题量/卡片量，便于更新首页统计
    print("")
    print("── 各章实际数量（用于 data/chapters.js 的 stats）")
    groups = {}
    slide_dirs = {}
    for rel, st in stats_by_page.items():
        m = re.match(r"chapters/(ch\d+)/", rel)
        if not m:
            continue
        g = groups.setdefault(m.group(1), {"quiz": 0, "cards": 0, "slides": 0, "pages": []})
        g["quiz"] += st["quiz"]
        g["cards"] += st["cards"]
        slide_dirs.setdefault(m.group(1), set())
        src_page = read_text(os.path.join(root, rel))
        for sl in re.finditer(r'<div[^>]*class="slides"[^>]*>', src_page):
            tag = sl.group(0)
            d = re.search(r'data-slides-dir="([^"]*)"', tag)
            if not d:
                continue
            pfx = re.search(r'data-prefix="([^"]*)"', tag)
            ext = re.search(r'data-ext="([^"]*)"', tag)
            slide_dirs[m.group(1)].add((
                os.path.normpath(os.path.join(os.path.dirname(os.path.join(root, rel)), d.group(1))),
                pfx.group(1) if pfx else "slide",
                ext.group(1) if ext else "jpg"))
        g["pages"].append((rel, st["sectionCount"], st["quiz"], st["cards"], st["slides"]))
    for cid, ds in slide_dirs.items():
        if cid in groups:
            groups[cid]["slides"] = sum(count_slide_files(f, p, e) for f, p, e in ds)
    for cid in sorted(groups):
        g = groups[cid]
        print("  %s  合计 quiz=%d cards=%d slides=%d"
              % (cid, g["quiz"], g["cards"], g["slides"]))
        for rel, nsec, nq, nc, ns in g["pages"]:
            print("       %-34s 节=%d quiz=%d cards=%d slides=%d" % (rel, nsec, nq, nc, ns))

    print("")
    print("=" * 66)
    print("  检查页面 : %d 个" % len(pages))
    print("  错误     : %d" % total_err)
    print("  提示     : %d" % total_warn)
    print("  结论     : %s" % ("通过 ✅" if total_err == 0 else "存在错误 ❌"))
    print("=" * 66)
    return 1 if total_err else 0


if __name__ == "__main__":
    sys.exit(main())