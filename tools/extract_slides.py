#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/extract_slides.py —— 把课件 PDF 逐页渲染成章节页可用的图片
=============================================================================

依赖 PyMuPDF（位于 E:\\study\\University\\软件设计与体系架构\\review\\pylibs）。
本脚本会自动把该目录加入 sys.path，因此通常无需手动设置 PYTHONPATH。

基本用法
--------
    # 1) 导出某一章的全部页（最常用）
    python tools/extract_slides.py ^
        --pdf "E:\\study\\University\\软件设计与体系架构\\课件\\ch1.面向对象设计的原理.pdf" ^
        --out chapters/ch1/slides

    # 2) 只导出第 1-20 页，并给文件名加前缀
    python tools/extract_slides.py --pdf xxx.pdf --out chapters/ch1/slides --start 1 --end 20 --prefix slide

    # 3) 第 4 章有三份 PDF，按顺序合并编号导出到同一个目录
    python tools/extract_slides.py --pdf 创建型.pdf --out chapters/ch4/slides --start 1 --pad 3
    python tools/extract_slides.py --pdf 结构型.pdf --out chapters/ch4/slides --start 109 --pad 3

    # 4) 先看看 PDF 有多少页、尺寸多大，不生成图片
    python tools/extract_slides.py --pdf xxx.pdf --out chapters/ch1/slides --dry-run

输出约定（章节页 data-* 属性必须与此一致）
-------------------------------------------
    chapters/chN/slides/slide-001.jpg, slide-002.jpg, ...
    · 文件名 = {prefix}-{零填充序号}.{ext}
    · 序号默认从 1 开始，宽度 3 位（001…999），可用 --start / --pad 调整
    · 默认 JPEG 质量 80、宽度 1100px（等比缩放）
    · 章节页里写：
        <div class="slides" data-slides-dir="slides" data-count="75"
             data-prefix="slide" data-ext="jpg" data-pad="3" data-start="1"></div>

导出后请核对：slides 目录里的文件数 == 章节页 data-count 的值。
"""

import argparse
import os
import sys
import time

# --------------------------------------------------------------------------
# 依赖路径：优先用仓库内自带的 pylibs，其次退回系统环境
# --------------------------------------------------------------------------
_THIS = os.path.dirname(os.path.abspath(__file__))
_SITE = os.path.dirname(_THIS)
_PYLIBS = os.path.normpath(os.path.join(_SITE, "..", "pylibs"))
if os.path.isdir(_PYLIBS) and _PYLIBS not in sys.path:
    sys.path.insert(0, _PYLIBS)


def die(msg, code=2):
    print("[错误] " + msg, file=sys.stderr)
    sys.exit(code)


def load_pymupdf():
    try:
        import pymupdf  # PyMuPDF >= 1.24 的新名字
    except ImportError:
        try:
            import fitz as pymupdf  # 老版本 / 兼容名
        except ImportError:
            die(
                "无法导入 PyMuPDF。请确认已安装：\n"
                "    pip install pymupdf\n"
                "或确认 pylibs 目录存在：\n    " + _PYLIBS
            )
    return pymupdf


def human_size(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return "%.1f %s" % (n, unit) if unit != "B" else "%d %s" % (n, unit)
        n /= 1024.0
    return "%.1f GB" % n


def main(argv=None):
    p = argparse.ArgumentParser(
        description="把课件 PDF 渲染成章节页用的幻灯片图片（PyMuPDF）。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="示例：\n"
        "  python tools/extract_slides.py --pdf \"课件/ch1.面向对象设计的原理.pdf\" --out chapters/ch1/slides\n"
        "  python tools/extract_slides.py --pdf a.pdf --out chapters/ch1/slides --dry-run\n",
    )
    p.add_argument("--pdf", required=True, help="源 PDF 路径（可含中文，建议用引号包住）")
    p.add_argument("--out", required=True, help="输出目录，例如 chapters/ch1/slides")
    p.add_argument("--start", type=int, default=1, help="起始页号（1 起，默认 1）")
    p.add_argument("--end", type=int, default=0, help="结束页号（含，默认到最后一页）")
    p.add_argument("--width", type=int, default=1100, help="输出图片宽度 px（默认 1100）")
    p.add_argument("--quality", type=int, default=80, help="JPEG 质量 1-100（默认 80）")
    p.add_argument("--prefix", default="slide", help="文件名前缀（默认 slide）")
    p.add_argument("--pad", type=int, default=3, help="序号零填充位数（默认 3）")
    p.add_argument("--ext", default="jpg", choices=["jpg", "jpeg", "png", "webp"], help="图片格式（默认 jpg）")
    p.add_argument("--dpi", type=int, default=0, help="直接指定 DPI（会覆盖 --width）")
    p.add_argument("--dry-run", action="store_true", help="只打印信息，不写文件")
    p.add_argument("--force", action="store_true", help="覆盖已存在的同名图片")
    p.add_argument("--quiet", action="store_true", help="减少输出")
    args = p.parse_args(argv)

    pymupdf = load_pymupdf()

    pdf_path = os.path.abspath(args.pdf)
    if not os.path.isfile(pdf_path):
        die("找不到 PDF：\n    " + pdf_path)

    out_dir = os.path.abspath(args.out)
    if not os.path.isdir(out_dir):
        if args.dry_run:
            print("[dry-run] 将创建目录：" + out_dir)
        else:
            os.makedirs(out_dir, exist_ok=True)

    try:
        doc = pymupdf.open(pdf_path)
    except Exception as e:
        die("打开 PDF 失败：%s\n    %s" % (e, pdf_path))

    total = doc.page_count
    start = max(1, args.start)
    end = args.end if args.end and args.end > 0 else total
    end = min(end, total)
    if start > end:
        die("页码范围无效：start=%d > end=%d（该 PDF 共 %d 页）" % (start, end, total))

    # 以首页尺寸推算缩放比
    first = doc.load_page(start - 1)
    base_w = first.rect.width or 960.0
    if args.dpi > 0:
        zoom = args.dpi / 72.0
    else:
        zoom = float(args.width) / base_w
    zoom = max(0.2, min(zoom, 8.0))

    ext = "jpg" if args.ext == "jpeg" else args.ext

    if not args.quiet:
        print("=" * 66)
        print("PDF      : " + pdf_path)
        print("总页数   : %d" % total)
        print("导出范围 : 第 %d - %d 页（共 %d 页）" % (start, end, end - start + 1))
        print("输出目录 : " + out_dir)
        print("缩放     : %.3fx  (原始 %.0f x %.0f pt → 约 %d px 宽)"
              % (zoom, base_w, first.rect.height, int(base_w * zoom)))
        print("格式     : %s  质量 %d  文件名 %s-%0*d.%s"
              % (args.ext.upper(), args.quality, args.prefix, args.pad, start, ext))
        print("=" * 66)

    if args.dry_run:
        print("[dry-run] 未写入任何文件。")
        doc.close()
        return 0

    matrix = pymupdf.Matrix(zoom, zoom)
    written = 0
    skipped = 0
    total_bytes = 0
    t0 = time.time()

    for page_no in range(start, end + 1):
        idx = page_no - 1
        name = "%s-%0*d.%s" % (args.prefix, args.pad, page_no, ext)
        dst = os.path.join(out_dir, name)
        if os.path.exists(dst) and not args.force:
            skipped += 1
            if not args.quiet:
                print("  跳过（已存在）：" + name)
            continue
        page = doc.load_page(idx)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        try:
            if ext == "png":
                pix.save(dst)
            else:
                pix.save(dst, jpg_quality=args.quality)
        except Exception as e:
            print("[警告] 第 %d 页保存失败：%s" % (page_no, e), file=sys.stderr)
            continue
        written += 1
        try:
            total_bytes += os.path.getsize(dst)
        except OSError:
            pass
        if not args.quiet:
            sys.stdout.write("\r  已导出 %d/%d 页 …" % (written, end - start + 1))
            sys.stdout.flush()

    doc.close()
    dt = time.time() - t0
    if not args.quiet:
        print("\r" + " " * 40 + "\r", end="")
    print("完成：新导出 %d 张，跳过 %d 张，合计 %s，用时 %.1fs"
          % (written, skipped, human_size(total_bytes), dt))
    print("目录：" + out_dir)
    print("")
    print("下一步：在章节页里写")
    print('  <div class="slides" data-slides-dir="slides" data-count="%d"' % (end - start + 1))
    print('       data-prefix="%s" data-ext="%s" data-pad="%d" data-start="%d"'
          % (args.prefix, ext, args.pad, start))
    print('       data-title="本章课件原图"></div>')
    print("其中 data-count = %d（本次导出的页数）。" % (end - start + 1))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n已中断。", file=sys.stderr)
        sys.exit(130)
