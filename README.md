# 软件设计与体系架构 · 期末复习站

纯静态的课程复习网站：**零构建、零依赖、无 CDN、可离线**。
双击 `index.html` 就能看，也可以用内置服务器在局域网共享给手机 / 平板。

---

## 快速开始

### 方式一：直接打开（最快）

双击 `index.html` 即可。功能完整（含全站搜索）——搜索索引与题库都通过 `<script>` 加载，
`file://` 下同样可用，只是「本机读过的页面」缓存帮不上忙（浏览器限制读取历史页面）。

### 方式二：本地服务器（推荐）

**最简单：双击根目录的 `start.cmd`**（全英文、纯 ASCII，任何编码的 Windows 都不会出错）。

或命令行：

```powershell
cd "E:\study\University\软件设计与体系架构\review\website"
python tools\serve.py
```

指定端口：双击后在命令行用 `start.cmd 9000`，或 `python tools\serve.py --port 9000`。

> `start.cmd` 与 `serve.py` 的输出都是英文，避免中文 Windows 控制台（GBK）
> 把批处理里的 UTF-8 中文拆坏、或输出乱码。站点内容仍然是中文。

启动后终端会打印**实际端口**，形如：

```
  Software Design & Architecture - Exam Review
  ----------------------------------------------------
  Site root  : …\review\website

  Local      : http://127.0.0.1:8081/
  Network (phone / other computers on the same Wi-Fi):
             : http://192.168.1.103:8081/
  Template   : http://127.0.0.1:8081/chapters/_template/
  Stop       : Ctrl+C
```

指定端口：

```powershell
python tools\serve.py --port 9000
```

> **端口被占用会自动顺延。** 本机 `8080` 常被其它后台服务占用（`AgentService`），
> 此时 `serve.py` 会提示并自动改用 `8081`（依次尝试到 `+20`），
> **请以终端实际打印的端口为准，不要写死 8080**。
> 想强制指定端口用 `--port`；端口占用即退出用 `--strict-port`。

---

## 局域网访问（手机 / 平板 / 其它电脑）

1. 确认设备与电脑在**同一个 WiFi / 局域网**；
2. 启动服务器后，在手机浏览器打开终端打印的 `http://192.168.x.x:实际端口/`；
   本机实测地址：`http://192.168.1.103:8081/`（以终端输出为准）；
3. 打不开时按顺序排查：
   - **Windows 防火墙**：首次运行会弹窗，必须勾选「专用网络」并允许。若已误点「取消」，
     用管理员 PowerShell 放行（**端口换成终端实际打印的那个**，下面是 8081 的例子）：
     ```powershell
     New-NetFirewallRule -DisplayName "SDA Review Site 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
     ```
   - **IP 选错**：电脑可能有多个网卡（VMware、ZeroTier 等），终端会把它们都列出来，
     选与手机同网段的那个（家里通常是 `192.168.1.x`）；
   - **端口被占用**：`serve.py` 会自动顺延，看终端打印的实际地址即可。

> 本机 `8080` 端口实测被其它后台服务（`AgentService`）独占，因此 `serve.py` 默认会落到 `8081`。
> 这是正常现象，不是故障。本次交付前已用 `http://192.168.1.103:8081/` 逐页验证 9 个页面均返回 200。

---

## 目录结构

```
website/
├── index.html                 课程首页（真实统计、章节卡片、第 4 章分册、混合练习、全局进度）
├── README.md                  本文件
├── assets/
│   ├── css/site.css           全站样式（设计变量、组件、暗色、打印、移动端）
│   └── js/site.js             全站脚本（导航、目录、搜索、自测、混合练习、卡片、灯箱）
├── videos/                    ★ 32 段讲解视频（1080p h264，共约 370 MB）+ posters/ 封面
├── data/
│   ├── chapters.js            章节清单（id/标题/主色/图标/真实小节/统计/第4章分页）
│   ├── videos.js              视频清单（32 条，章节/标题/时长/封面，site.js 渲染卡片）
│   ├── search-index.js        搜索索引（自动生成：8 个页面）
│   └── quiz-bank.js           全站题库（自动生成：139 题，供首页混合练习）
├── docs/
│   ├── CONTENT_CONTRACT.md    ★ 章节编写规范（给内容作者看）
│   └── QA_REPORT.md           ★ 本次集成验收报告（检查项、修复项、遗留项）
├── start.cmd                   ★ Windows 双击启动（纯 ASCII，不会乱码）
├── tools/
│   ├── serve.py               静态服务器（UTF-8、禁缓存、局域网、Range、端口自动顺延）
│   ├── extract_slides.py      PDF → 课件图片
│   ├── build_search_index.py  重建全站搜索索引（含第 4 章三个子页）
│   ├── build_quiz_bank.py     重建首页「全部题目随机练习」题库
│   ├── check_links.py         ★ 全站链接 / 锚点 / 课件图检查器
│   └── check_content.py       ★ 全站结构 / JSON / 清单一致性检查器
└── chapters/
    ├── _template/index.html   ★ 章节页黄金模板（所有组件的正确写法）
    ├── ch1/ … ch5/            各章页面 + slides/ 图片
    └── ch4/                   第 4 章分 4 页：index / creation / structural / behavioral
```

> 站点内容只有 HTML + 课件图片。构建期的生成脚本、抽出的 PPT 文本等源码产物
> 已移出 `website/`，放在同级目录 `review/_build_artifacts/`。

---

## 新增 / 修改一章内容

**内容作者请看 [`docs/CONTENT_CONTRACT.md`](docs/CONTENT_CONTRACT.md)**，那里有可直接复制的完整骨架。要点：

1. 复制 `chapters/_template/index.html` → `chapters/chN/index.html`；
2. 改 `<html data-chapter="chN">`、`<title>`、正文；
3. 改页面底部的 `#quiz-data` 与 `#cards-data` 两段 JSON；
4. 导出课件图片：
   ```powershell
   python tools\extract_slides.py --pdf "…\课件\ch1.面向对象设计的原理.pdf" --out chapters\ch1\slides
   ```
   把输出提示的页数填进 `data-count`；
5. 更新 `data/chapters.js` 里该章的 `sections` 与 `stats`（小节标题、题量、卡片数、课件页数）；
6. 重建派生数据并自检：
   ```powershell
   python tools\build_search_index.py
   python tools\build_quiz_bank.py
   python tools\check_links.py
   python tools\check_content.py
   ```

### 新增第 6 章

只需两步：

1. 在 `data/chapters.js` 的 `chapters` 数组里追加一条（照抄现有条目，改 `id` / `no` / `title` / `dir` / `accent` / `icon`，补上 `sections` / `stats`）；
2. 建 `chapters/ch6/index.html`。

首页卡片、侧栏、上下章导航、进度统计会自动出现，**不需要改任何 JS 或 CSS**。

---

## 站点功能

| 功能 | 说明 |
|---|---|
| 章节导航 | 顶栏 + 侧栏目录，滚动自动高亮当前小节 |
| 阅读进度 | 按滚动位置记录，存在 localStorage；首页显示环形进度与全局百分比 |
| 自测 Quiz | 单选 / 多选 / 判断，即时判分、显示解析、记录历史最佳、可只重做错题 |
| 全部题目随机练习 | 首页从全站 139 题（含第 4 章三个专题页）跨章随机抽 12 题，可「换一组」 |
| 记忆卡片 | 3D 翻面、标记已掌握、打乱顺序、进度持久化 |
| 课件原图 | 缩略图懒加载、点击灯箱放大、← → 翻页 |
| 视频讲解 | 每章 5–9 段 1080p 讲解视频（共 32 段），封面卡片懒加载，点开弹层播放；支持拖动进度条与全屏 |
| 全站搜索 | `data/search-index.js` 静态索引（8 个页面）+ 已读页面本地缓存；`/` 或 `Ctrl+K` 打开 |
| 深色模式 | 跟随系统偏好，可手动切换，选择被记住 |
| 打印 / PDF | 隐藏交互元素、展开解析、优化分页 |
| 快捷键 | `/` 搜索、`D` 深色、`[` `]` 上下章、`1`–`9` 选答案、`Esc` 关闭 |

所有进度与成绩**只保存在本机浏览器**，不上传任何服务器。

### 视频讲解（370 MB）

- 32 段视频已**复制进站点**（`videos/*.mp4`，1080p h264 + aac，合计约 370 MB），
  不依赖任何外部目录或网络；封面在 `videos/posters/`（640px JPG）。
- 页面默认只加载封面（`loading="lazy"`），点开卡片才向服务器取视频；关闭弹层会
  `pause()` 并清空 `src`，不会常驻内存。
- **拖动进度条依赖 HTTP Range**：`tools/serve.py` 已实现
  `Accept-Ranges: bytes` / `206 Partial Content` / `416`，局域网播放可以随意 seek。
- 直接双击 `index.html`（`file://`）也能播放，浏览器会自己处理本地文件的 seek。
- 视频是静态大文件，局域网首次打开某一段时会缓冲几秒；这是带宽问题，不是故障。

---

## 质量检查（改完必跑）

两个零依赖的 Python 检查器，全部通过才算可以交付：

```powershell
cd "E:\study\University\软件设计与体系架构\review\website"

# 1) 链接 / 锚点 / 课件图数量 / 图标名 / 清单里的路径
python tools\check_links.py

# 2) 8 小节顺序、挂载点、JSON 校验（答案是否 0-based）、
#    cards 结构、代码块转义、data/chapters.js 与真实页面是否一致
python tools\check_content.py
```

- 退出码 `0` = 通过；`1` = 有错误。
- `--json` 输出机器可读结果（含每页统计，可直接用来更新 `data/chapters.js` 的 `stats`）。
- `check_content.py` 会打印「各章实际数量」汇总，方便对照清单。

---

## 常见问题

**Q：为什么不能用 npm / 构建工具？**
A：要求零构建、可离线、可在无网络的局域网使用。所有 CSS / JS / 图标都是手写或内联 SVG，没有任何外部请求。

**Q：中文显示成方块？**
A：字体栈优先使用系统字体（PingFang SC / 微软雅黑 / 思源黑体）。如果系统缺少中文字体，请安装任一中文字体。

**Q：搜索搜不到新写的内容？**
A：运行 `python tools\build_search_index.py` 重建索引。已在本机读过的页面会自动进缓存，无需重建。

**Q：首页「全部题目随机练习」没有题目？**
A：题库文件没生成。运行 `python tools\build_quiz_bank.py`。

**Q：导出课件图片很慢？**
A：用 `--width 900 --quality 72` 降低分辨率，或 `--start` / `--end` 只导出部分页。

**Q：端口 8080 起不来？**
A：多半被占用。`serve.py` 会自动顺延，或以终端打印的端口为准；也可 `python tools\serve.py --port 8081`。

---

## 回归测试（给维护者）

修改 `site.js` / `site.css` / 内容后，按下面顺序跑一遍：

```powershell
# 1) 静态检查（不需要服务器）
python tools\check_links.py
python tools\check_content.py

# 2) 启动服务器，人工/截图验收
python tools\serve.py

# 3) 重建派生数据（若改了正文或题目）
python tools\build_search_index.py
python tools\build_quiz_bank.py
```

浏览器验收要点：9 个页面在 1440px 与 390px 下均无横向滚动、知识地图为 4 列（手机上 1 列）、
学习目标整句不断行、自测能判分、卡片能翻面、课件缩略图能加载、搜索能搜到第 4 章子页里的模式名。

---

## 技术说明

- 纯 HTML + CSS + 原生 JS（ES5 语法，兼容老浏览器），无框架、无 polyfill。
- 图标全部为内联 SVG `<symbol>` sprite，由 `site.js` 注入，无图标字体、无 emoji。
- 主题通过 `data-theme` 属性 + CSS 变量切换；主题初始化脚本内联在 `<head>` 中以避免闪烁。
- 样式使用 `color-mix()` 与 `:has()` 等现代 CSS；在较旧的浏览器上会优雅降级（配色略简，功能不受影响）。
- 数据块使用 `<script type="application/json">`，避免 XSS 与转义地狱。
- 设计模式中文名以第 3 章 23 模式总表为准（如「责任链」而非「职责链」「外观」而非「门面」）。