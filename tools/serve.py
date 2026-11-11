#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/serve.py -- zero-dependency static server (Python standard library only)
=============================================================================

Serves the review site on the local network so phones / tablets / other
computers on the same Wi-Fi can open it.

    python tools/serve.py                # 0.0.0.0:8080
    python tools/serve.py --port 9000
    python tools/serve.py --no-open      # do not auto-open a browser

Features:
  * Forces UTF-8 charset (Chinese never turns into mojibake)
  * Cache disabled for development (edit HTML, refresh, see it)
  * Auto-appends the slash: /chapters/ch1 -> /chapters/ch1/
  * Prints every usable LAN address
  * HTTP Range support so video seeking works
"""

import argparse
import http.server
import os
import re
import socket
import socketserver
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 确保中文输出与行缓冲：重定向到文件/管道时也能立刻看到地址
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
    sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
except (AttributeError, ValueError):
    pass

MIME = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".xml": "application/xml; charset=utf-8",
    ".map": "application/json; charset=utf-8",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    """带 UTF-8 / 禁缓存 / 目录补斜杠的静态文件处理器。"""

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    # ---- MIME ----------------------------------------------------------
    def guess_type(self, path):
        ext = os.path.splitext(str(path))[1].lower()
        return MIME.get(ext, super().guess_type(path))

    # ---- 响应头 --------------------------------------------------------
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    # ---- Range 支持（视频拖动进度条必需）-------------------------------
    @staticmethod
    def parse_range(header, size):
        """解析 Range 头。

        返回 (start, end)：可满足的区间；
        返回 None：忽略这个 Range，按整文件返回 200；
        返回 False：区间不可满足，应答 416。
        只支持单区间（multi-range 直接忽略，浏览器播放器不需要）。
        """
        m = re.match(r"^\s*bytes\s*=\s*(.+)$", header or "")
        if not m:
            return None
        spec = m.group(1).split(",")[0].strip()
        mm = re.match(r"^(\d*)\s*-\s*(\d*)$", spec)
        if not mm:
            return None
        a, b = mm.group(1), mm.group(2)
        if a == "" and b == "":
            return None
        if a == "":
            n = int(b)                       # 后缀区间：bytes=-1024
            if n <= 0:
                return False
            start = max(0, size - n)
            end = size - 1
        elif b == "":
            start = int(a)                   # 开区间：bytes=1024-
            end = size - 1
        else:
            start = int(a)                   # 闭区间：bytes=0-1023
            end = min(int(b), size - 1)
        if start > end or start >= size:
            return False
        return (start, end)

    def send_head(self):
        self._range = None
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            if not self.path.split("?")[0].endswith("/"):
                parts = self.path.split("?")
                newpath = parts[0] + "/" + ("?" + parts[1] if len(parts) > 1 else "")
                self.send_response(301)
                self.send_header("Location", newpath)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None
            for index in ("index.html", "index.htm"):
                candidate = os.path.join(path, index)
                if os.path.isfile(candidate):
                    path = candidate
                    break
            else:
                return super().send_head()

        if not os.path.isfile(path):
            self.send_error(404, "File not found")
            return None

        ctype = self.guess_type(path)
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        fs = os.fstat(f.fileno())
        size = fs.st_size

        parsed = self.parse_range(self.headers.get("Range"), size)
        if parsed is False:
            f.close()
            self.send_response(416)
            self.send_header("Content-Range", "bytes */%d" % size)
            self.send_header("Content-Length", "0")
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            return None

        if parsed is None:
            start, end = 0, size - 1
            self._range = None
        else:
            start, end = parsed
            self._range = (start, end)
            f.seek(start)

        self.send_response(206 if self._range else 200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
        if self._range:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        """配合 Range：只写请求的那一段，而不是整文件。"""
        rng = getattr(self, "_range", None)
        if not rng:
            return super().copyfile(source, outputfile)
        start, end = rng
        remaining = end - start + 1
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)

    # ---- 日志：只显示有用信息 -------------------------------------------
    def log_message(self, fmt, *args):
        code = args[1] if len(args) > 1 else ""
        path = args[0] if args else ""
        mark = ""
        try:
            c = int(str(code))
            if c >= 500:
                mark = "  <-- ERROR"
            elif c == 404:
                mark = "  <-- NOT FOUND"
        except (ValueError, TypeError):
            pass
        sys.stdout.write("  %s  %s%s\n" % (code, path, mark))
        sys.stdout.flush()


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def lan_ips():
    ips = []
    # 主路由地址（连外网的那块网卡）
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            ips.append(s.getsockname()[0])
        finally:
            s.close()
    except OSError:
        pass
    # 其它网卡（虚拟机 / ZeroTier 等也列出来，方便判断该用哪个）
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except OSError:
        pass
    return [ip for ip in ips if not ip.startswith("169.254.")]


def probe_port_free(host, port):
    """检查 host:port 能否真的绑定（不能则说明被占用或无权限）。

    注意：这里**故意不设** SO_REUSEADDR。
    Windows 下 SO_REUSEADDR 允许「抢占式」绑定已被占用的端口，探测会误报可用，
    结果就是打印出一个其实由别的进程在服务的地址（本机 8080 常被 AgentService
    占用，一旦误判，用户看到的端口号就是错的）。不设该选项时 bind 会如实地
    抛 OSError，自动顺延逻辑才可靠。
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind((host, port))
        return True
    except OSError:
        return False
    finally:
        s.close()


def main(argv=None):
    ap = argparse.ArgumentParser(description="Start the review-site static server (zero deps)")
    ap.add_argument("--port", type=int, default=8080, help="port, default 8080")
    ap.add_argument("--host", default="0.0.0.0", help="bind address, default 0.0.0.0 (LAN reachable)")
    ap.add_argument("--no-open", action="store_true", help="do not auto-open a browser")
    ap.add_argument("--strict-port", action="store_true",
                    help="exit if the port is taken instead of falling back")
    ap.add_argument("--tries", type=int, default=20, help="max fallback ports to try")
    args = ap.parse_args(argv)

    port = args.port
    host = args.host

    # 端口被占用时（常见：8080 被其它后台服务占用）自动顺延，避免一上来就失败
    if not probe_port_free(host, port):
        if args.strict_port:
            print("[ERROR] Port %d is already in use or cannot be bound." % port)
            print("        Try another: python tools/serve.py --port %d" % (port + 1))
            return 1
        found = None
        for p in range(port + 1, port + 1 + args.tries):
            if probe_port_free(host, p):
                found = p
                break
        if found is None:
            print("[ERROR] Ports %d-%d are all unavailable." % (port, port + args.tries))
            print("        Specify another port: python tools/serve.py --port 9000")
            return 1
        print("")
        print("  [NOTE] Port %d is taken by another program, using %d instead." % (port, found))
        print("         To pin a port, free %d or pass --port." % port)
        port = found

    try:
        httpd = ThreadingServer((host, port), Handler)
    except OSError as e:
        print("[ERROR] Failed to start on port %d: %s" % (port, e))
        print("        Try another port: python tools/serve.py --port %d" % (port + 1))
        return 1

    print("")
    print("  Software Design & Architecture - Exam Review")
    print("  " + "-" * 52)
    print("  Site root  : " + ROOT)
    print("")
    print("  Local      : http://127.0.0.1:%d/" % port)
    print("             : http://localhost:%d/" % port)
    ips = lan_ips()
    if ips:
        print("")
        print("  Network (phone / other computers on the same Wi-Fi):")
        for ip in ips:
            print("             : http://%s:%d/" % (ip, port))
    print("")
    print("  Template   : http://127.0.0.1:%d/chapters/_template/" % port)
    print("  Stop       : Ctrl+C")
    print("  " + "-" * 52)
    if not ips:
        print("  [NOTE] No LAN IP detected, check your network connection.")
    print("")

    if not args.no_open:
        threading.Timer(0.6, lambda: webbrowser.open("http://127.0.0.1:%d/" % port)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
