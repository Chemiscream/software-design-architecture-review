# 内容规范 · CONTENT_CONTRACT

> 面向 **章节内容编写者**（ch1–ch5 各一人）。本文件是硬性契约，不是建议。
> 只要严格照抄骨架、类名与数据格式，五个人并行写出来的页面就会完全一致。
>
> 唯一权威示例：`chapters/_template/index.html`（下称「模板页」）。
> 有疑问时，**以模板页为准**，本文件负责解释「为什么」与「哪些不能改」。

---

## 0. 三分钟速览

| 你要做的事 | 具体动作 |
|---|---|
| 建页面 | 复制 `chapters/_template/index.html` → `chapters/chN/index.html` |
| 声明身份 | `<html data-chapter="chN">`（**必须改**，否则主题色/上下章/进度全错） |
| 去模板痕迹 | 删掉 `<html>` 上的 `data-nostore`；删掉正文顶部那个黄色「这是页面模板」提示框 |
| 写正文 | 只在 `<section class="section" id="...">` 内部写内容 |
| 加题目 | 改页面底部 `<script id="quiz-data">` 里的 JSON |
| 加卡片 | 改页面底部 `<script id="cards-data">` 里的 JSON |
| 加课件图 | 跑 `tools/extract_slides.py`，再把 `data-count` 改成实际页数 |
| 自检 | 跑第 8 节的检查清单 |

**复制后必须改的 4 处**（漏一处就会出问题）：

1. `<html>` 的 `data-chapter="ch4"` → `data-chapter="chN"`
2. `<html>` 上的 `data-nostore` → **删掉**（否则进度与成绩不保存）
3. `<title>` 与 `<meta name="description">` → 改成自己的章节
4. 正文顶部 `<!-- ↓↓↓ 仅模板 ↓↓↓ -->` 与 `<!-- ↑↑↑ 仅模板 ↑↑↑ -->` 之间的整个黄色提示框 → **删掉**

**绝对不能改**：`<head>` 里的主题脚本、`#topbar-root` / `#sidebar-root` / `#footer-root` / `#pager-root` / `#quiz-root` / `#cards-root` 这几个挂载点、CSS/JS 的引用路径与顺序、`site.css` / `site.js` / `data/chapters.js` 这三个共享文件。

---

## 1. 目录与文件布局

```
website/
├── index.html                      ← 课程首页（共享，勿动）
├── assets/
│   ├── css/site.css                ← 全站样式（共享，勿动）
│   └── js/site.js                  ← 全站脚本（共享，勿动）
├── data/
│   ├── chapters.js                 ← 章节清单（共享，勿动）
│   └── search-index.js             ← 搜索索引（自动生成，勿动）
├── docs/CONTENT_CONTRACT.md        ← 本文件
├── tools/
│   ├── serve.py                    ← 本地/局域网服务器
│   ├── extract_slides.py           ← PDF → 图片
│   └── build_search_index.py       ← 重建搜索索引├── chapters/
│   ├── _template/index.html        ← 模板页（勿改，除非你是框架维护者）
│   ├── ch1/index.html              ← 你写的
│   │   └── slides/slide-001.jpg …  ← 你导出的
│   ├── ch2/index.html
│   ├── ch3/index.html
│   ├── ch4/index.html
│   └── ch5/index.html
└── README.md
```

**你只写** `chapters/chN/index.html` 与 `chapters/chN/slides/*`。
不要新建 CSS 文件，不要新建 JS 文件，不要改共享文件。

---

## 2. 相对路径规则（最容易出错的地方）

章节页在 **第 3 层目录**（`chapters/chN/`），所以：

| 要引用的东西 | 从 `chapters/chN/index.html` 出发写 |
|---|---|
| 样式表 | `../../assets/css/site.css` |
| 脚本（章节清单） | `../../data/chapters.js` |
| 脚本（站点引擎） | `../../assets/js/site.js` |
| 课程首页 | `../../index.html` |
| 别的章节 | `../ch3/index.html` |
| 本章课件图 | `slides/slide-001.jpg`（**相对本文件**） |
| 内容规范 | `../../docs/CONTENT_CONTRACT.md` |

规则：**永远用相对路径，永远不要用 `/` 开头**。站点可能被挂在任意子路径下（`http://host:8080/`、`file:///E:/.../website/`），绝对路径会全部失效。

`site.js` 生成的导航链接（顶栏、侧栏、上下章）由脚本根据自身 `src` 自动推算站点根，你不需要管。

---

## 3. 必须照抄的 HTML 骨架

下面是**完整可复制**的骨架。`...` 处才是你写内容的地方。

```html
<!DOCTYPE html>
<html lang="zh-CN" data-page="chapter" data-chapter="chN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="第 N 章 …… 复习要点。">
<meta name="color-scheme" content="light dark">
<title>第 N 章 章节标题 · 软件设计与体系架构</title>
<link rel="stylesheet" href="../../assets/css/site.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%232f6bff'/%3E%3Cpath d='M6 8h12M6 12h12M6 16h7' stroke='%23fff' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E">
<script>
  /* 主题初始化：必须内联在 <head> 中，且必须一字不改地保留 */
  (function () {
    try {
      var t = JSON.parse(localStorage.getItem('sda.theme'));
      if (t !== 'dark' && t !== 'light') {
        t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
</head>
<body>
<a class="skip-link" href="#main">跳到正文</a>

<div class="progress-bar" aria-hidden="true"><div class="progress-bar__fill" id="progress-fill"></div></div>

<header class="topbar" id="topbar-root"></header>

<div class="wrap">
  <div class="layout">
    <aside class="sidebar" id="sidebar-root" aria-label="章节目录"></aside>

    <main class="main" id="main">
      <div class="main__inner">

        <!-- ↓↓↓ 你的内容从这里开始 ↓↓↓ -->

        <section class="section" id="overview" data-title="本章导览">
          <!-- hero + 学习目标 + 知识地图 -->
        </section>

        <section class="section" id="concepts" data-title="核心概念">
          <!-- 概念卡 + 模式卡 -->
        </section>

        <section class="section" id="detail" data-title="结构与实现">
          <!-- 正文 + 代码块 + 提示框 -->
        </section>

        <section class="section" id="compare" data-title="横向对比">
          <!-- 对比表 -->
        </section>

        <section class="section" id="pitfalls" data-title="易错点">
          <!-- 易错点列表 -->
        </section>

        <section class="section" id="quiz" data-title="本章自测">
          <div class="quiz" id="quiz-root"></div>
        </section>

        <section class="section" id="cards" data-title="记忆卡片">
          <div class="flash" id="cards-root"></div>
        </section>

        <section class="section" id="slides" data-title="课件原图">
          <div class="slides" data-slides-dir="slides" data-count="0"
               data-prefix="slide" data-ext="jpg" data-pad="3" data-start="1"
               data-title="本章课件原图"></div>
        </section>

        <!-- ↑↑↑ 你的内容到这里结束 ↑↑↑ -->

        <nav class="pager" id="pager-root" aria-label="章节导航"></nav>
      </div>
    </main>
  </div>
</div>

<footer class="footer" id="footer-root"></footer>

<script type="application/json" id="quiz-data">[]</script>
<script type="application/json" id="cards-data">[]</script>

<script src="../../data/chapters.js"></script>
<script src="../../assets/js/site.js"></script>
</body>
</html>
```

### 骨架的硬性约束

1. `<html>` 上必须有 `data-page="chapter"` 与 `data-chapter="chN"`（`chN` 换成 `ch1`…`ch5`）。
   - ⚠️ **不要**加 `data-nostore`。该属性只用于模板页 / 预览页，作用是「不把阅读进度和自测成绩写入真实章节」。正式章节加了它，首页的进度环和「历史最佳」就永远不会更新。
2. `<head>` 里的内联主题脚本**必须保留**，位置必须在 `<link rel="stylesheet">` 之后、`</head>` 之前。删了会闪白屏。
3. 五个挂载点必须存在且 **id 精确**：`topbar-root`、`sidebar-root`、`footer-root`、`pager-root`、`quiz-root`、`cards-root`。它们**内部必须为空**，内容由 `site.js` 渲染。
4. 三个 `<script>` 顺序不可变：`chapters.js` → `site.js` → 结束。JSON 数据块放在它们**之前**。
5. `<section>` 的 8 个 `id` 固定为：`overview`、`concepts`、`detail`、`compare`、`pitfalls`、`quiz`、`cards`、`slides`。
   - 顺序不能变（侧栏目录按 DOM 顺序生成）。
   - 可以**追加**额外小节（如 `id="extra"`），但必须放在 `slides` 之后、`pager-root` 之前，且必须带 `class="section"` 和 `data-title`。
   - 如果某节确实没有内容，**保留 section 与标题**，写一句「本章不涉及」——不要删，否则侧栏编号会错位。

---

## 4. 组件清单与正确写法

所有组件都是**纯 HTML + class**，不需要写任何 JS。下面每段都可以直接复制。

### 4.1 章首 Hero

```html
<div class="hero">
  <span class="hero__eyebrow">第 1 章 · 面向对象设计的原理</span>
  <h1>抽象、封装与 SOLID 五原则</h1>
  <p class="hero__lead">一到两句话说清本章解决什么问题、读完能得到什么。</p>
  <div class="hero__meta">
    <span class="chip chip--accent"><svg class="icon" aria-hidden="true"><use href="#i-target"></use></svg>考试重点</span>
    <span class="chip"><svg class="icon" aria-hidden="true"><use href="#i-clock"></use></svg>约 45 分钟</span>
    <span class="chip"><svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg>高频简答题</span>
  </div>
  <div class="hero__actions">
    <a class="btn btn--primary" href="#concepts">
      <svg class="icon" aria-hidden="true"><use href="#i-play"></use></svg>开始阅读
    </a>
    <a class="btn" href="#quiz">
      <svg class="icon" aria-hidden="true"><use href="#i-target"></use></svg>直接自测
    </a>
  </div>
</div>
```

- 每章**只能有一个 `<h1>`**，就在 hero 里。
- 其余小节标题一律用 `<h2 class="section-title">`，小节内的分层用 `<h3>` / `<h4>`。

### 4.2 小节标题（除 overview 外每节都用）

```html
<div class="section-head">
  <span class="section-head__num">02</span>
  <h2 class="section-title">核心概念</h2>
  <a class="section-anchor" href="#concepts" aria-label="本节链接">#</a>
</div>
<p class="section-lead">一句话导读（可选）。</p>
```

`section-head__num` 用两位数字，与侧栏编号一致。`overview` 节不需要这个（它用 hero）。

### 4.3 学习目标

```html
<ol class="objectives">
  <li>能说明……</li>
  <li>能画出……</li>
  <li>能区分……</li>
</ol>
```

3–5 条，动词开头，可检验。**不要**写成知识点罗列。

### 4.4 知识地图

```html
<div class="kmap">
  <div class="kmap__col">
    <p class="kmap__title">问题</p>
    <ul class="kmap__list"><li>要点一</li><li>要点二</li></ul>
  </div>
  <!-- 再放 2–3 个 kmap__col -->
</div>
```

固定 **4 列**（问题 / 角色 / 协作 / 代价 或类似框架），每列 3–5 条短句。

### 4.5 概念卡

```html
<div class="grid">
  <div class="concept">
    <p class="concept__term">术语中文 <span class="concept__en">English</span></p>
    <p class="concept__body">解释，<b>关键词加粗</b>。行内代码用 <code>code</code>。</p>
    <div class="concept__tags">
      <span class="chip chip--accent">分类</span>
      <span class="chip">标签</span>
    </div>
  </div>
  <!-- 更多概念卡 -->
</div>
```

外层 `.grid` 会自动响应式排版（2–3 列）。**不要**手写列数或 `style="width:..."`。

### 4.6 模式卡（设计模式专用）

```html
<div class="pattern">
  <div class="pattern__head">
    <h4 class="pattern__name">单例模式</h4>
    <span class="pattern__en">Singleton Pattern</span>
    <span class="pattern__type">创建型</span>
  </div>
  <div class="pattern__body">
    <dl class="pattern__rows">
      <div class="pattern__row"><dt>意图</dt><dd>……</dd></div>
      <div class="pattern__row"><dt>适用场景</dt><dd>……</dd></div>
      <div class="pattern__row"><dt>参与角色</dt><dd>……</dd></div>
      <div class="pattern__row"><dt>主要代价</dt><dd>……</dd></div>
      <div class="pattern__row"><dt>相关模式</dt><dd>……</dd></div>
    </dl>
  </div>
</div>
```

`pattern__type` 只能是 `创建型` / `结构型` / `行为型` / `架构型` 之一。
`dt` 建议固定这 5 项，顺序一致，便于横向比较。

### 4.7 代码块

```html
<figure class="code" data-lang="java" data-file="Singleton.java">
<pre><code>public class Singleton {
    private static final Singleton INSTANCE = new Singleton();
    private Singleton() {}
    public static Singleton getInstance() { return INSTANCE; }
}</code></pre>
</figure>
```

**极其重要**：`<pre><code>` 内必须做 HTML 转义，否则代码会被浏览器吃掉：

| 代码里的字符 | 必须写成 |
|---|---|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;`（可选，仅在属性中必须） |

`data-lang` 会显示在代码块左上角，`data-file` 显示文件名（都可省略）。
`<pre><code>` 的**第一个字符要紧贴 `<code>`**，不要换行，否则首行会多一个空行。

### 4.8 提示框（四种）

```html
<div class="callout callout--tip">
  <span class="callout__icon"><svg class="icon" aria-hidden="true"><use href="#i-bulb"></use></svg></span>
  <div class="callout__body">
    <p><span class="callout__title">答题技巧</span>正文……</p>
  </div>
</div>
```

`callout--tip`（绿，技巧）/ `callout--warn`（黄，注意）/ `callout--danger`（红，错误）/ `callout--info`（蓝，补充）。
图标对应：`#i-bulb` / `#i-alert` / `#i-stop` / `#i-info`。

### 4.9 对比表

```html
<div class="table-wrap">
  <table>
    <thead>
      <tr><th>对比维度</th><th>方案 A</th><th>方案 B</th></tr>
    </thead>
    <tbody>
      <tr><td>耦合度</td><td>高</td><td>低</td></tr>
      <tr><td>扩展性</td><td>差</td><td>好</td></tr>
    </tbody>
  </table>
</div>
```

**必须**包在 `.table-wrap` 里（否则手机上表格会撑破布局）。
第一列是「对比维度」，用短语，不要写整句。

### 4.10 易错点

```html
<ul class="pitfalls">
  <li><strong>错误认识。</strong>正确解释……</li>
  <li><strong>另一个坑。</strong>正确解释……</li>
</ul>
```

3–5 条。每条以 `<strong>` 概括错误点开头，后面紧跟纠正。**不要**用 `-` 或 emoji 当项目符号（CSS 已处理）。

### 4.11 自测与记忆卡片（挂载点，内部留空）

```html
<section class="section" id="quiz" data-title="本章自测">
  <div class="section-head">
    <span class="section-head__num">06</span>
    <h2 class="section-title">本章自测</h2>
    <a class="section-anchor" href="#quiz" aria-label="本节链接">#</a>
  </div>
  <p class="section-lead">题目数据来自本页底部 <code>&lt;script id="quiz-data"&gt;</code>，由 site.js 渲染判分。</p>
  <div class="quiz" id="quiz-root"></div>
</section>

<section class="section" id="cards" data-title="记忆卡片">
  <div class="section-head">
    <span class="section-head__num">07</span>
    <h2 class="section-title">记忆卡片</h2>
    <a class="section-anchor" href="#cards" aria-label="本节链接">#</a>
  </div>
  <div class="flash" id="cards-root"></div>
</section>
```

`#quiz-root` 与 `#cards-root` **内部必须是空的**。不要自己写题目 HTML。

### 4.12 课件原图

```html
<section class="section" id="slides" data-title="课件原图">
  <div class="section-head">
    <span class="section-head__num">08</span>
    <h2 class="section-title">课件原图</h2>
    <a class="section-anchor" href="#slides" aria-label="本节链接">#</a>
  </div>
  <div class="slides"
       data-slides-dir="slides"
       data-count="75"
       data-prefix="slide"
       data-ext="jpg"
       data-pad="3"
       data-start="1"
       data-title="第 1 章 · 课件原图"></div>
</section>
```

| 属性 | 含义 | 默认 |
|---|---|---|
| `data-slides-dir` | 图片目录，**相对本 HTML 文件** | `slides` |
| `data-count` | 图片**总数**，必须与实际文件数一致 | `0`（显示「尚未导出」提示） |
| `data-prefix` | 文件名前缀 | `slide` |
| `data-ext` | 扩展名 `jpg`/`png`/`webp` | `jpg` |
| `data-pad` | 序号零填充位数 | `3` |
| `data-start` | 起始序号 | `1` |
| `data-title` | 显示标题 | `课件原图` |

`data-count` 写错会导致 404 裂图。导出后务必核对文件数。

### 4.13 可用图标

`<svg class="icon" aria-hidden="true"><use href="#图标名"></use></svg>`

可用名：`i-layers` `i-grid` `i-compass` `i-blocks` `i-puzzle` `i-network` `i-book` `i-target` `i-clock` `i-star` `i-eye` `i-bulb` `i-alert` `i-stop` `i-info` `i-list` `i-check` `i-x` `i-arrow-left` `i-arrow-right` `i-arrow-up` `i-play` `i-refresh` `i-shuffle` `i-copy` `i-cards` `i-trophy` `i-graduation` `i-terminal` `i-print-doc` `i-keyboard` `i-flag` `i-link` `i-zoom` `i-home` `i-printer` `i-search` `i-moon` `i-sun` `i-menu` `i-chevron-down`

**不要用 emoji 当图标**（不统一、跨平台渲染不一致）。

---

## 5. 数据块 1：自测题 `#quiz-data`

位置：`</div>`（`.wrap`）之后、两个 `<script src>` 之前。
格式：JSON **数组**（也接受 `{"title":"...","questions":[...]}`）。

### Schema

```
QuizItem {
  type:    "single" | "multiple" | "boolean"   // 必填
  stem:    string                              // 必填，题干
  options: string[]                            // single/multiple 必填；boolean 可省略
  answer:  number | number[] | boolean         // 必填，见下
  explain: string                              // 强烈建议，解析
  tag:     string                              // 可选
}
```

`answer` 规则：

| type | answer 写法 | 说明 |
|---|---|---|
| `single` | `1` | 正确选项的**下标**（从 0 开始！） |
| `multiple` | `[0, 2]` | 所有正确选项下标；**全部选对才计分** |
| `boolean` | `true` / `false` | 选项自动为「正确 / 错误」 |

⚠️ **最常见的错误：把 `answer` 写成选项字母（"B"）或 1-based 序号。必须是 0-based 下标。**

### 示例

```json
[
  {
    "type": "single",
    "stem": "开闭原则的核心含义是？",
    "options": [
      "每个类只做一件事",
      "对扩展开放，对修改关闭",
      "高层模块不依赖低层模块",
      "子类可以替换父类"
    ],
    "answer": 1,
    "explain": "开闭原则要求软件实体应对扩展开放、对修改关闭；A 是单一职责，C 是依赖倒置，D 是里氏替换。"
  },
  {
    "type": "multiple",
    "stem": "下列属于 SOLID 原则的有（多选）：",
    "options": ["单一职责", "开闭原则", "里氏替换", "迪米特法则"],
    "answer": [0, 1, 2],
    "explain": "迪米特法则（最少知识原则）不属于 SOLID 五原则，它是独立的设计原则。"
  },
  {
    "type": "boolean",
    "stem": "依赖倒置原则要求高层模块依赖抽象，而不是依赖具体实现。",
    "answer": true,
    "explain": "这正是依赖倒置原则的定义：抽象不应依赖细节，细节应依赖抽象。"
  }
]
```

### 题量与配比（统一要求）

- **6–10 题**，建议 8 题。
- 配比：单选 4–5、多选 2、判断 2。
- 每题 `explain` 必写，且要解释**为什么错**，不只是重复正确答案。
- 干扰项要「像真的」，不要写明显荒谬的选项。

### JSON 写法禁忌

- 不要写注释（JSON 不支持）。
- 不要用中文引号 `“”`，只能用 `"`。
- 最后一个元素后不要留逗号。
- `<` `>` `&` 在 JSON 里**不需要**转义（因为不是 HTML 解析上下文），但写 `</script>` 会提前结束标签——若必须出现，写成 `<\/script>`。

---

## 6. 数据块 2：记忆卡片 `#cards-data`

位置与 `#quiz-data` 相邻。格式：JSON 数组。

### Schema

```
Card {
  front: string   // 必填，正面（问题/术语）
  back:  string   // 必填，背面（答案），允许少量 HTML：<b> <code> <br>
  tag:   string   // 可选，分类标签
}
```

### 示例

```json
[
  {
    "front": "单一职责原则（SRP）的定义？",
    "back": "一个类应该<b>只有一个引起它变化的原因</b>，即只承担一个职责。",
    "tag": "SOLID"
  },
  {
    "front": "里氏替换原则（LSP）的核心要求？",
    "back": "子类型必须能够替换掉它们的基类型，且<b>不改变程序的正确性</b>。",
    "tag": "SOLID"
  },
  {
    "front": "依赖倒置原则的两条要点？",
    "back": "① 高层模块不应依赖低层模块，二者都应依赖<b>抽象</b>；<br>② 抽象不应依赖细节，细节应依赖抽象。",
    "tag": "SOLID"
  }
]
```

### 要求

- **8–15 张**，建议 10 张。
- `front` 是一句话能问清的问题，**不要**写「请简述……（20 分）」这种。
- `back` 控制在 2–3 行内，突出关键词（用 `<b>`）。
- `tag` 建议按主题分（如 `SOLID`、`结构`、`易错`、`辨析`），便于复习时定位。

---

## 7. 课件图片导出

```powershell
# 1. 进入站点目录
cd "E:\study\University\软件设计与体系架构\review\website"

# 2. 先确认页数与尺寸（不生成文件）
python tools/extract_slides.py --pdf "E:\study\University\软件设计与体系架构\课件\ch1.面向对象设计的原理.pdf" --out chapters/ch1/slides --dry-run

# 3. 正式导出
python tools/extract_slides.py --pdf "E:\study\University\软件设计与体系架构\课件\ch1.面向对象设计的原理.pdf" --out chapters/ch1/slides

# 4. 把输出的 data-count 数字填进章节页的 data-count
```

输出：`chapters/chN/slides/slide-001.jpg` … `slide-075.jpg`（宽 1100px，JPEG 质量 80）。

**第 4 章有三份 PDF**，按顺序合并编号到同一目录：

```powershell
$cw = "E:\study\University\软件设计与体系架构\课件"
python tools/extract_slides.py --pdf "$cw\ch4.面向对象设计模式-创建型模式.pdf" --out chapters/ch4/slides --start 1
python tools/extract_slides.py --pdf "$cw\ch4.面向对象设计模式-结构型.pdf"       --out chapters/ch4/slides --start 109
python tools/extract_slides.py --pdf "$cw\ch4.面向对象设计模式-行为型new.pdf"    --out chapters/ch4/slides --start 227
```

然后 `data-count` = 三份页数之和（约 350，以实际文件数为准）。

> 若图片太大导致页面卡顿，可加 `--width 900 --quality 72` 重新导出。

---

## 8. 自检清单（提交前逐条打勾）

### 结构

- [ ] 文件在 `chapters/chN/index.html`，图片在 `chapters/chN/slides/`
- [ ] `<html data-chapter="chN">` 已改成本章 id
- [ ] `<html>` 上**没有** `data-nostore`
- [ ] 已删除正文顶部的「这是页面模板」黄色提示框
- [ ] `<title>` 是「第 N 章 标题 · 软件设计与体系架构」
- [ ] 8 个 `<section>` 的 id 齐全且顺序为 overview → concepts → detail → compare → pitfalls → quiz → cards → slides
- [ ] 每个 section 都有 `data-title`（侧栏用它显示）
- [ ] `#quiz-root`、`#cards-root` 内部为空
- [ ] `#topbar-root`、`#sidebar-root`、`#footer-root`、`#pager-root` 内部为空

### 路径

- [ ] 所有资源用相对路径，**没有任何以 `/` 开头的路径**
- [ ] CSS 是 `../../assets/css/site.css`
- [ ] 脚本顺序：`../../data/chapters.js` 然后 `../../assets/js/site.js`
- [ ] `data-slides-dir` 是 `slides`（相对本文件）

### 数据

- [ ] `#quiz-data` 能被 `JSON.parse` 解析（无注释、无中文引号、无尾逗号）
- [ ] `answer` 是 **0-based 下标**（单选 `1` 表示第二个选项）
- [ ] 多选题 `answer` 是数组
- [ ] 判断题 `answer` 是 `true`/`false`，且没写 `options`
- [ ] 题量 6–10，卡片 8–15
- [ ] `#cards-data` 每个对象都有 `front` 与 `back`

### 课件

- [ ] `data-count` == `slides/` 目录里实际文件数
- [ ] 图片文件名是 `slide-001.jpg` 格式（三位零填充）

### 显示

- [ ] 页面上**只有一个 `<h1>`**（在 hero 里）
- [ ] 代码块里的 `<` `>` `&` 已转义成 `&lt;` `&gt;` `&amp;`
- [ ] 表格都包在 `.table-wrap` 里
- [ ] 没有用 emoji 当图标
- [ ] 没有内联 `style` 写颜色（用 `.chip--accent` 等类）

### 验收（必须实际打开看）

```powershell
cd "E:\study\University\软件设计与体系架构\review\website"
python tools/serve.py
```

> 终端会打印实际端口。本机 `8080` 常被占用，脚本会自动顺延到 `8081`，**以打印的地址为准**。

然后逐项确认：

- [ ] 顶栏显示正确章节名与「第 N 章 / 共 5 章」
- [ ] 侧栏目录列出 8 项，滚动时高亮跟随
- [ ] 主题色是本章的强调色（ch1 蓝 / ch2 青 / ch3 紫 / ch4 橙 / ch5 玫红）
- [ ] 点「提交答案」能判分、显示解析、刷新后「历史最佳」还在
- [ ] 记忆卡片能翻面、能标记已掌握、能打乱
- [ ] 课件缩略图能加载，点击能放大，← → 能翻页
- [ ] 底部「上一章 / 下一章」链接正确
- [ ] 手机宽度（<640px）下不横向滚动
- [ ] 浏览器控制台**没有红色报错**

最后重建一次搜索索引：

```powershell
python tools/build_search_index.py
```

---

## 9. 内容质量要求（不只是格式）

五个人写的东西要像一个团队写的，除格式外还需遵守：

1. **术语一致**。全站统一用这些译名，不要自创：
   - 设计模式名：单例、工厂方法、抽象工厂、建造者、原型 / 适配器、桥接、组合、装饰器、外观、享元、代理 / 责任链、命令、解释器、迭代器、中介者、备忘录、观察者、状态、策略、模板方法、访问者
   - 原则：单一职责、开闭、里氏替换、接口隔离、依赖倒置
   - 架构：分层、MVC、管道-过滤器、事件驱动、微服务、仓库、黑板
2. **每节开头一句 `section-lead`**，说明这节要解决什么，不要直接甩列表。
3. **每个知识点都回答「为什么」**，而不只是「是什么」。考试简答题按「定义 + 作用 + 代价」三段写。
4. **对比表必须有**。凡是容易混淆的两个概念，都用表格列出至少 3 个维度。
5. **易错点来自真实错误**，写「学生常把 X 当成 Y」，而不是重复正文。
6. **不要复制 PPT 原文长句**。PPT 是提纲，你要写成能读的句子。
7. **不要写「本章介绍了……」这种元叙述**。直接讲内容。
8. **代码示例要能跑**（Java 优先，与课程一致），省略号用 `// ...` 注释表示。

---

## 10. 常见失败模式

| 症状 | 原因 | 修复 |
|---|---|---|
| 页面全白 | `<head>` 内联主题脚本被删 / `site.js` 路径错 | 照抄骨架的 `<head>` |
| 首页进度永远 0%、自测不记分 | `<html>` 上留了 `data-nostore` | 删掉该属性 |
| 页面顶部一直显示「这是页面模板」 | 没删模板提示框 | 删掉 `<!-- ↓↓↓ 仅模板 ↓↓↓ -->` 到 `<!-- ↑↑↑ 仅模板 ↑↑↑ -->` 之间内容 |
| 顶栏、侧栏不显示 | 挂载点 id 写错或被填了内容 | id 必须是 `topbar-root` 等，内部留空 |
| 主题色是默认蓝 | `data-chapter` 没改 | 改成 `ch1`…`ch5` |
| 自测不渲染 | `#quiz-data` JSON 语法错 | 控制台会打印解析错误，按提示修 |
| 答案全判错 | `answer` 用了 1-based 或字母 | 改成 0-based 下标 |
| 课件全是裂图 | `data-count` 大于实际文件数 | 改成实际文件数 |
| 代码块显示错乱 | `<` `>` 未转义 | 用 `&lt;` `&gt;` `&amp;` |
| 手机横向滚动 | 表格没包 `.table-wrap` | 包上 |
| 侧栏编号错位 | 删了某个 section | 8 个 section 都要保留 |
| 上下章链接失效 | `data/chapters.js` 里没有该章条目 | 框架已预填 5 章，勿删 |

---

## 11. 需要帮助时

- 完整示例：`chapters/_template/index.html`（**先看这个**）
- 站点首页：`index.html`
- 启动服务：`python tools/serve.py`
- 重建搜索：`python tools/build_search_index.py`
- 本文件：`docs/CONTENT_CONTRACT.md`

**不要修改**：`assets/`、`data/chapters.js`、`index.html`、`docs/`、`tools/`、`chapters/_template/`。
发现框架有 bug 时，报告给框架负责人，不要自行改共享文件——那会同时影响另外四个人的页面。

---

## 12. 追加小节：#videos（视频讲解）

8 个标准小节之后可以再追加小节，目前已启用的追加小节有两个：

| 小节 | 允许出现的页面 | 说明 |
|---|---|---|
| `#summary` 本章小结 | 任意章节页 | 放在 `#slides` 之后 |
| `#videos` 视频讲解 | 有讲解视频的页面（第 1/4/5 章） | **必须放在 `#slides` 之后**；第 4 章放在三个专题页（creation / structural / behavioral），总览页不放 |

`#videos` 的写法是固定的，作者只需要写小节壳，卡片由 `site.js` 从 `data/videos.js` 渲染：

```html
<section class="section" id="videos" data-title="视频讲解">
  <div class="section-head">
    <span class="section-head__num">09</span>
    <h2 class="section-title">视频讲解</h2>
    <a class="section-anchor" href="#videos" aria-label="本节链接">#</a>
  </div>
  <p class="section-lead">一句话说明本节收录了哪些视频。</p>
  <div class="videos" id="videos-root"></div>
</section>
```

同时要在页面底部、`data/chapters.js` 之前加一行：

```html
<script src="../../data/videos.js"></script>
```

- 视频清单是 `data/videos.js`（32 条，`window.SDA_VIDEOS`），由发布者维护，**不要手写卡片**；
- 页面上下文由 `<html data-chapter>` 决定；第 4 章三个专题页用 `data-subpage`
  区分（`creation` / `structural` / `behavioral`），卡片只显示本册的视频；
- 视频文件在 `videos/`，封面在 `videos/posters/`，路径都相对站点根，由 `siteUrl()` 解析；
- 不要给卡片加 `<video>` 预载：`site.js` 只在点开时才设置 `src`。
