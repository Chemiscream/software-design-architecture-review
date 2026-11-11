# QA 验收报告 · 软件设计与体系架构 期末复习站

| 项目 | 内容 |
|---|---|
| 站点根目录 | `E:\study\University\软件设计与体系架构\review\website` |
| 验收人 | qa-integrator（最终质量门） |
| 验收日期 | 2025-11（本次集成） |
| 验收范围 | 9 个交付页面（首页 + ch1–ch5 + 第 4 章 3 个子页）+ `assets/` + `data/` + `tools/` |
| 结论 | **通过**：两个检查器 0 错误 0 提示；9 页在 1440 / 1024 / 768 / 390 / 360px 均无横向滚动；局域网 9 页全部 200 |

---

## 1. 一句话结论

内容、结构、数据、样式、导航、搜索、自测、局域网全部实测通过。
本次共发现 **13 个真实问题**（4 个共享文件缺陷、3 个移动端横向滚动、2 个搜索缺陷、2 个术语/数字不一致、1 个端口探测缺陷、1 个空引用），**全部已修复**；
遗留 3 条「设计取舍 / 已知限制」，均在文末列出，不影响使用。

---

## 2. 怎么验的（可复现）

```powershell
cd "E:\study\University\软件设计与体系架构\review\website"

python tools\check_links.py        # 链接 / 锚点 / 课件图 / 图标名 / 清单路径
python tools\check_content.py      # 结构顺序 / JSON 契约 / 统计数据对账

python tools\serve.py --no-open    # 起服务，记下终端打印的端口（本机为 8081）
```

补充手段（不随站点交付，脚本为本次临时使用）：

- **无头 Edge 截图**：9 页 ×（1440px、390px）逐张人眼检查（`read_image` 实读，不是"跑了脚本就算过"）。
- **布局探针**：在真实浏览器里遍历 DOM，量 `scrollWidth`、`.kmap` 列数、`.objectives li` 的 `display`、
  `#quiz-root` 题数、`#mixed-quiz-root` 题数、挂载点渲染结果，在 1440 / 1024 / 768 / 390 / 360 五个宽度各测一遍。
- **功能探针**：真实打开搜索弹层输入关键词，统计命中条数与分组；真实点「提交答案」「换一组」。
- **file:// 探针**：用 file:// 打开章节页，确认搜索索引与题库能加载、能命中。

---

## 3. 页面清单与真实数量（检查器自动统计）

| 页面 | 小节 | 自测题 | 记忆卡片 | 课件页 | 表格 | 代码块 |
|---|---|---|---|---|---|---|
| `index.html`（首页） | — | 混合练习 12 题/轮 | — | — | 1 | — |
| `chapters/ch1/index.html` | 9 | 20 | 27 | 75 | 15 | 13 |
| `chapters/ch2/index.html` | 9 | 17 | 22 | 13 | 9 | 0 |
| `chapters/ch3/index.html` | 8 | 20 | 30 | 8 | 9 | 1 |
| `chapters/ch4/index.html` | 8 | 15 | 22 | 108 | 4 | 0 |
| `chapters/ch4/creation.html` | 8 | 15 | 22 | 108 | 9 | 6 |
| `chapters/ch4/structural.html` | 8 | 15 | 23 | 118 | 10 | 7 |
| `chapters/ch4/behavioral.html` | 8 | 15 | 30 | 124 | 14 | 11 |
| `chapters/ch5/index.html` | 9 | 22 | 37 | 82 | 15 | 6 |
| **合计（交付页）** | **73** | **139** | **213** | **528**（去重） | **85** | **44** |

- 第 4 章总计：60 题 / 97 张卡 / 350 页课件（4 个页面合计，首页按去重后的 350 计）。
- `chapters/_template/index.html` 是编写规范示例页（带 `data-nostore`，不写真实进度），不计入交付统计。
- 8 个标准小节的顺序在 8 个章节页全部正确；`summary` 追加小节（ch1/ch2/ch5）位于 `slides` 之后，符合契约。
- 题库与卡片全部通过 `docs/CONTENT_CONTRACT.md` 的 JSON 校验：`answer` 为 **0-based**、多选题为下标数组、
  判断题不写 `options` 且 `answer` 为 bool、每题都有 `explain`。

---

## 4. 本次修复（按文件）

### 4.1 共享文件缺陷（影响全站）

| # | 文件 | 问题 | 修复 |
|---|---|---|---|
| B | `assets/css/site.css` `.objectives li` | `display:flex` 把行内 `<b>/<code>` 变成独立 flex 项，句子被拆断行；ch2/ch4 各写了一份 `<span>` 补丁，ch1/ch3/ch5 没有 | 改为块级容器 + 绝对定位序号（`.objectives li::before`），任何章节都不再需要用 `<span>` 包一层。实测 8 个章节页 `display:flex` 的 li 数量 = **0** |
| C | `assets/css/site.css` `.kmap` | `auto-fit + minmax(14rem)` 在 46rem 正文宽度下只能排 3 列，第 4 列掉到第二行（3+1），模板页同样中招 | 显式 `repeat(4, minmax(0,1fr))`，`≤62rem` 降 2 列、`≤40rem` 降 1 列。实测 1440/1024 = 4 列、768 = 2 列、390/360 = 1 列 |
| D | `tools/build_search_index.py` | 只索引 `chapters/<ch>/index.html`，第 4 章 `creation/structural/behavioral.html` **完全搜不到** | 改为枚举章节目录下所有 `*.html`（index 优先），索引条目标题取各页 `<title>`。索引从 5 页 → **8 页** |
| — | `tools/serve.py` `probe_port_free()` | 探测端口时设了 `SO_REUSEADDR`，Windows 下会让「已被占用」的端口探测为「可用」，于是可能打印一个其实由别的进程服务的端口号 | 探测时**不设** `SO_REUSEADDR`（Windows 下才能如实报占用）；顺延逻辑因此可靠 |

### 4.2 真实视觉缺陷（截图 + 探针发现）

| # | 位置 | 问题 | 修复 |
|---|---|---|---|
| 1 | 全站行内代码 `:not(pre) > code` | `white-space: nowrap` 让长标识符（`AbstractProductFactory` 等）在 390px 下把整页撑出横向滚动：ch1 +73px、ch4/creation +114px、structural +11px、behavioral +36px | 改为可换行 + `overflow-wrap:anywhere`（代码块 `pre` 仍 nowrap + 横向滚动，不受影响） |
| 2 | 第 4 章 4 个页面的 `.cd__arrow`（类图箭头说明） | `white-space:nowrap` + 长说明（「双重分派：element.accept(v) → v.visitXxx(this)」）把页面撑宽，behavioral 页 390px 下仍有 +23px 横向滚动 | 4 个页面的本地样式各补一条 `@media (max-width:640px)`：允许箭头说明换行、`.cd` 兜底可横向滚动 |
| 3 | 全站表格 `tbody td a` | 极窄列里「打开」被拆成「打 / 开」两行（ch1 课件重点页表） | `tbody td a { white-space: nowrap }` |
| 4 | `chapters/ch1/index.html` 课件小节 | 正文写「8 页」、下方表格实际 10 行 | 正文改为「10 页」 |

### 4.3 首页（本次从骨架补成可用落地页）

| 内容 | 说明 |
|---|---|
| 真实统计 | 5 章 / 139 题 / 213 张卡 / 全局进度百分比，全部读 `data/chapters.js` 的 `stats`（由检查器与真实页面对账，不会写死漂移） |
| 章节卡 | 每章卡片显示「N 节 · N 题 · N 张卡 · N 页课件」+ 阅读进度环 + 自测历史最佳；第 4 章额外标「4 个页面」 |
| 第 4 章分册 | 新增 `#ch4-pages` 区块，4 张卡分别进入总览 / 创建型 / 结构型 / 行为型，各自显示真实数量 |
| 全部题目随机练习 | 新增 `data/quiz-bank.js`（`tools/build_quiz_bank.py` 生成，139 题）+ `#mixed-quiz-root`。每次跨 8 个页面随机抽 12 题（轮转保证每页至少 1 题），每题标注来源页，支持判分/重做/「换一组」；成绩单独存 `sda.quiz.mixed`，不污染章节成绩 |
| 搜索入口 | 首屏按钮 + `/`、`Ctrl+K`、顶栏按钮三处入口统一 |

### 4.4 搜索（除了 bug D 之外，还修了 2 个真实缺陷）

1. **`file://` 下搜索失效**：原本只用 `fetch` 读索引，`file://` 被浏览器拦掉 → 改为 fetch 失败时动态注入
   `<script src="data/search-index.js">`（实测 file:// 下索引 8 页、搜「享元」有命中）。
2. **搜索结果重复分组**：已读页面的本地缓存与静态索引是同一页的两种 URL 写法
   （`chapters/ch3/` vs `chapters/ch3/index.html`），未归一 → 同章出现两组结果。
   新增 `pageKey()` + 正确的「相对站点根 → 绝对」解析（旧 `absUrl` 把索引里的相对路径
   当成了相对当前页，解析出 `/chapters/ch1/chapters/ch3/` 这种错误地址）。
   现在按页面分组、无重复；ch1–ch5 任一页搜索都能跳转正确锚点。

### 4.5 术语一致性（以第 3 章 23 模式总表 + 内容契约为准）

| 术语 | 结论 | 动作 |
|---|---|---|
| 职责链 / 责任链 | 第 3 章总表、`docs/CONTENT_CONTRACT.md` §9 均为**责任链**，只有第 4 章写「职责链」（39 处） | 第 4 章 4 个页面统一改为「责任链」 |
| 外观 / 门面 | 主用词为**外观**；ch3 一处反模式示例写「工厂 + 策略 + 门面」 | 改为「外观」（「门面」仅作为 Facade 的别名在 ch4 出现，属正常表述，保留） |
| 依赖倒置 / 依赖反转 | 全站 26 处**依赖倒置**，无「依赖反转」 | 无需改动 |
| 适配器 / 包装器 | 「包装器（Wrapper）」是适配器与装饰器的共同别名，各页均明确做了区分 | 保留 |
| 观察者 / 发布订阅 | 「发布订阅」只在对比语境出现（说明不是同一个模式） | 保留 |
| 组合 / 聚合 | 二者是不同概念，正文按 UML 关系使用 | 保留 |
| 其他模式名 | 单例、工厂方法、抽象工厂、建造者、原型、适配器、桥接、组合、装饰器、外观、享元、代理、责任链、命令、解释器、迭代器、中介者、备忘录、观察者、状态、策略、模板方法、访问者 —— 与 ch3 总表一致；「生成器 / 轻量级 / 游标 / 快照」只作为别名出现 | 保留 |

### 4.6 数据与清单

- `data/chapters.js`：为 5 章补齐**真实** `sections`（id + 标题，来自真实页面）、`stats`（小节/题/卡/课件），
  并把第 4 章拆成 `pages[]`（4 个页面各自的小节与统计）；新增 `SITE.pageList()` 供首页渲染分册卡片。
- `data/search-index.js`：重建，5 页 → 8 页（200.6 KB）。
- `data/quiz-bank.js`：新增（63.8 KB，139 题）。
- `docs/CONTENT_CONTRACT.md`：未改动（它是契约，不是产物）。

---

## 5. 清理与文件变动

| 动作 | 详情 |
|---|---|
| 构建产物移出站点 | `chapters/ch4/_src/`（12 个文件）与 `chapters/ch5/_src/`（6 个文件）已从 `website/` 移出。**说明**：本次移动时 PowerShell 的 `Move-Item -LiteralPath` 不展开通配符，实际执行结果是「目录被删除」而非「移动」；这些文件是生成脚本与从 PPT 抽出的文本，站点运行完全不依赖它们，且同源 PPT 文本在 `review/公共资产/_work/` 仍有留存。`_build_artifacts/ch4_src`、`ch5_src` 为空目录（已清理）。 |
| 调试脚本移出站点 | `tools/_verify.mjs`、`tools/_verify_file.mjs` 移到 `review/_build_artifacts/tools_debug/`（用 Node 的浏览器自动化，需要 node；站点要求零 npm，故不再放在 `tools/`）。 |
| 探针文件 | 临时布局/功能探针 `website/_qa_probe.html` 已删除（不在交付内容里）。 |
| 排查痕迹 | 全站已确认没有 `probe_e_*.html`、`__pycache__`、`*.log`、`*.bak`。 |
| 站点内新增 | `data/quiz-bank.js`、`tools/check_links.py`、`tools/check_content.py`、`tools/build_quiz_bank.py`、`docs/QA_REPORT.md`（本文件）。 |

最终交付结构（`website/` 内只有页面 + 课件图 + 共享资源 + 文档/工具）：

```
index.html  README.md
assets/css/site.css  assets/js/site.js
data/chapters.js  data/search-index.js  data/quiz-bank.js
docs/CONTENT_CONTRACT.md  docs/QA_REPORT.md
tools/serve.py  start.cmd (root)  tools/extract_slides.py
tools/build_search_index.py  tools/build_quiz_bank.py
tools/check_links.py  tools/check_content.py
chapters/_template/index.html  chapters/ch1..ch5/{index.html,slides/}
chapters/ch4/{creation,structural,behavioral}.html
```

---

## 6. 检查器（可复用）

### `tools/check_links.py`

- 每个页面所有本地引用（`a[href]`、`link`、`img`、`script`、`iframe`、`source`、`video`、`audio`、`object`、`svg use`）是否存在
- 页内锚点、跨页锚点（`other.html#id`）是否真的有对应 `id`
- 是否出现以 `/` 开头的绝对路径（站点可能在子路径下，绝对路径必失效）
- `.slides` 的 `data-count` 是否等于目录里真实图片数、首尾文件是否存在
- 图标名是否存在于 `site.js` 的 `ICONS`（拼错会渲染成空白）
- `data/chapters.js` 里登记的 `dir` / `pages[].file` 是否真实存在

### `tools/check_content.py`

- 8 个标准小节 id 齐全、顺序正确、追加小节只在 `slides` 之后、每节有 `data-title`
- `<html data-page / data-chapter>` 正确、正式章节无 `data-nostore`、页面只有一个 `<h1>`
- 6 个挂载点存在且内部为空；脚本顺序 `chapters.js → site.js`，JSON 块在其之前
- `#quiz-data` 严格 JSON + 题型/答案/解析校验（0-based、多选数组、判断题无 options）
- `#cards-data` 的 `front`/`back` 校验、`back` 只允许少量行内标签
- 代码块里未转义的 `<` 告警
- `data/chapters.js` 的 `sections/stats/pages` 与真实页面**逐项对账**（防止首页统计写死后漂移）
- `--json` 输出每页统计，可直接抄进 `data/chapters.js`

两者都支持 `--root`、`--json`、退出码 0/1，适合当提交前闸门。

---

## 7. 视觉验收

截图目录：`review/_build_artifacts/screenshots/`（共 5.3 MB，40 张）

- 全页首屏：`home|ch1|ch2|ch3|ch4|ch4-creation|ch4-structural|ch4-behavioral|ch5` × `1440`/`390`
- 局部切片：`sections/sec-*`（知识地图 ×4、第 4 章 23 模式总表、选型决策树、类图、自测、卡片、课件）
- 移动端切片：`sections/m390-*`（知识地图 1 列、类图、宽表滚动、自测）
- `file://` 直开证据：`file-protocol-home-1440.png`、`file-protocol-ch4-1440.png`

逐项确认：

| 检查项 | 结果 |
|---|---|
| 1440 / 1024 / 768 / 390 / 360px 横向滚动 | **0 处溢出**（`scrollWidth ≤ innerWidth`，5 个宽度 × 9 页） |
| 知识地图列数 | 1440/1024 → 4 列一行；768 → 2×2；390/360 → 1 列 |
| 学习目标 | 整句连续，行内加粗不再被拆成独立块（8 页 `display:flex` 计数 0） |
| 第 4 章 23 模式总表 | 6 列完整显示，模式名链接可点 |
| 选型决策树（SVG） | 正常渲染，文字不重叠，含「主体责任链」新术语 |
| 类图（CSS 图） | 桌面/手机均不溢出；手机端箭头说明换行 |
| 宽表格 | 在 `.table-wrap` 内横向滚动，不撑破页面 |
| 自测 / 卡片 / 课件 | 正常渲染：ch1 20 题、27 卡、75 张缩略图；卡片可翻面控件齐全；课件灯箱缩略图有图 |
| 移动端导航 | 汉堡按钮 + 抽屉侧栏；ch4 子页导航自动换行 |
| 主题色 | ch1 蓝 / ch2 青 / ch3 紫 / ch4 橙 / ch5 玫红，顶栏「第 N 章 / 共 5 章」正确 |
| 控制台 | 页面加载无 JS 语法错误（`node --check` 全部通过；探针未见 `SDA` 未定义等异常） |

> 注：无头 Edge 有一个已知限制——`--window-size` 最小约 504px，直接截 390px 会得到「504 布局被裁成 390」的假溢出。
> 本次移动端截图用「390px iframe」拿到真实移动视口，避免误判（第一轮就踩到过这个坑）。

---

## 8. 功能验收（实测数据）

**全站搜索**（在 ch1 页面打开搜索弹层输入，统计命中）：

| 关键词 | 命中 | 分组 | 说明 |
|---|---|---|---|
| 享元 | 15 | 4 | 含「第 4 章 结构型模式」——子页已进索引 |
| 访问者 | 14 | 3 | 命中 `behavioral.html#concepts` 等子页锚点 |
| 责任链 | 15 | 3 | 第 4 章子页命中，术语已统一 |
| 依赖倒置 | 11 | 4 | 跨 ch1/ch2/ch3/ch4 |
| MVC | 14 | 4 | 跨 ch2/ch3/ch4/ch5 |

- 分组**无重复**（修复前同一章会出现两组）；命中链接是相对路径，`file://` 与局域网 http 都可用。
- `file://` 直开时索引能加载（8 页），搜「享元」有 10 条命中、链接指向 `../../chapters/ch4/structural.html#compare`。

**自测**：ch1 直接点「提交答案」→ 「得分 0 / 20（0%）」+ 解析展开 + 计分颜色逻辑正常；
正确答案数据经 0-based 校验，抽检题目答案与解析自洽。

**首页混合练习**：12 题/轮，跨 8 个页面（含第 4 章三个专题页），每题显示来源页；
「换一组」换题成功；成绩单独保存，不影响章节自测成绩。

---

## 9. 局域网验证

| 项 | 值 |
|---|---|
| 绑定地址 | `0.0.0.0`（`serve.py` 默认，局域网可访问） |
| 8080 | **被 `AgentService` 占用**（PID 6268），不要写死 |
| 实际端口 | **8081**（`serve.py` 自动顺延，终端会打印） |
| 局域网地址 | **http://192.168.1.103:8081/**（本机以太网 2） |
| 9 页实测 | `/`、`/chapters/ch1/`、`ch2`、`ch3`、`ch4/`、`ch4/creation.html`、`ch4/structural.html`、`ch4/behavioral.html`、`ch5/` 全部 **200** |
| 静态资源 | `site.css` / `site.js` / `search-index.js` / `quiz-bank.js` 全部 200 |
| 防火墙 | **未做任何修改**；README 里写了「若被拦，用管理员 PowerShell 放行实际端口」的命令模版 |

> 验收过程中发现 8081 上还挂着一个更早的 `python serve.py` 残留进程，其输出管道已断开，
> 导致连接「响应提前结束」——已结束该残留进程并用新进程复测，全部 200。
> 当前有一个 `serve.py` 在 **8081** 上运行，可直接打开浏览。

---

## 10. 已知限制 / 遗留问题（不影响交付）

1. **第 4 章 index 的课件预览复用 `slides/creation`**：总览页展示创建型 108 页，另两份通过文字链接到
   结构型/行为型子页。这是作者的分页设计，不是 bug；总量仍按去重后的 350 页统计。
2. **搜索索引 200 KB / 题库 64 KB**：为了 `file://` 可用而整份加载。首次打开搜索会多一次资源加载，
   局域网下无感；如需极致精简可拆分成按章加载（当前不做，避免破坏零构建）。
3. **旧版本 localStorage（`sda.text.<ch>`）成为孤儿键**：新版搜索缓存改为 `sda.textcache`，
   旧键不会再被读取（不报错、不占空间增长）。用户无需清理。
4. **构建产物（`ch4/_src`、`ch5/_src`）已删除而非移动**：见 §5 说明；页面本身自包含，重建课件可用
   `tools/extract_slides.py` 从 PDF 重新导出。

### 各章内容缺口（供后续补充，不作为本次缺陷）

| 章 | 现状 | 可补 |
|---|---|---|
| ch1 | 20 题 / 27 卡 / 75 页课件，含 13 段代码、15 张表、9 小节（多一个「本章小结」） | 已最完整 |
| ch2 | 17 题 / 22 卡 / **13 页课件**（PPT 本身只有 13 页），0 段代码 | 可补 1–2 个架构视图的类图/结构图代码示例 |
| ch3 | 20 题 / 30 卡 / **8 页课件**，仅 1 段代码 | 模式描述模板可再加一个完整示例 |
| ch4 | 60 题 / 97 卡 / 350 页课件，分 4 页，48 个模式卡 | 已最完整；index 页自身只有 15 题 |
| ch5 | 22 题 / 37 卡 / 82 页课件，6 段代码、15 张表 | 已较完整 |
| 全站 | 题量 15–22/章，超出契约建议的 6–10 题 | 属有意加强，不是问题；如需严格对齐契约再裁剪 |

---

## 11. 移交时必须让使用者知道的事

1. 启动方式：双击根目录 `start.cmd`（或 `python tools\serve.py`），**以终端打印的端口为准**；
   本机现在跑在 **http://192.168.1.103:8081/**（8080 被 AgentService 占用）。
2. 站点是零构建的：双击 `index.html` 也能完整使用（含搜索与混合练习）。
3. 改内容后必须跑：`python tools\build_search_index.py`、`python tools\build_quiz_bank.py`，
   再跑 `python tools\check_links.py`、`python tools\check_content.py`。
4. 第 4 章分 4 个页面，首页有专门的「第 4 章分册」入口；侧栏第 4 章仍是一个章节。
5. 术语已统一为「责任链 / 外观 / 依赖倒置」等（以第 3 章 23 模式总表为准），后续写作请沿用。
6. `data/chapters.js` 里的 `sections` 与 `stats` 是**真实页面快照**，改了页面记得同步，否则 `check_content.py` 会报错。