/* ==========================================================================
   data/chapters.js —— 全站章节清单（单一事实来源 / single source of truth）
   --------------------------------------------------------------------------
   · 由 index.html 与每个章节页共同加载（章节页相对路径：../../data/chapters.js）
   · 章节页通过 <html data-chapter="ch1"> 与这里的 id 对应
   · accent 会被 site.js 写入 CSS 变量 --accent / --accent-strong / --accent-soft
   · 新增章节 = 在这里加一条 + 建 chapters/chN/index.html，无需改任何 JS

   【sections / stats / pages 是「真实页面」的快照】
   它们不是手填的装饰数据：
     · sections —— 该页面 <section class="section" id data-title> 的真实顺序与标题
     · stats    —— 真实题量 / 卡片数 / 课件页数 / 小节数
   首页的统计、章节卡与「全部题目随机练习」都读取这里。
   内容改动后先跑 python tools/check_content.py，它会报告不一致的数字。
   ========================================================================== */

window.SITE = {
  course: "软件设计与体系架构",
  courseEn: "Software Design & Architecture",
  tagline: "从面向对象设计原理，到设计模式与架构风格 —— 一份可自测的期末复习笔记",
  examNote: "期末复习 · 闭卷笔试 + 设计题",
  updated: "2025-11",

  /* 全站统一的 8 个标准小节（章节页必须按此顺序出现，可在此之外追加小节） */
  standardSections: [
    "overview",
    "concepts",
    "detail",
    "compare",
    "pitfalls",
    "quiz",
    "cards",
    "slides"
  ],

  chapters: [
    {
      id: "ch1",
      no: "第 1 章",
      title: "面向对象设计的原理",
      short: "面向对象原理",
      subtitle:
        "从抽象、封装、继承、多态到 SOLID 原则与设计模式的关系，建立后续所有章节的术语底座。",
      dir: "chapters/ch1",
      accent: "#2b4a6f",
      icon: "i-layers",
      minutes: 45,
      topics: ["抽象与封装", "继承与多态", "SOLID", "UML 关系", "高内聚低耦合"],
      sections: [
        { id: "overview", title: "本章导览" },
        { id: "concepts", title: "核心概念" },
        { id: "detail", title: "原则逐条拆解" },
        { id: "compare", title: "横向对比" },
        { id: "pitfalls", title: "易错点" },
        { id: "quiz", title: "本章自测" },
        { id: "cards", title: "记忆卡片" },
        { id: "slides", title: "课件原图" },
        { id: "videos", title: "视频讲解" },
        { id: "summary", title: "本章小结" }
      ],
      stats: { sections: 10, quiz: 20, cards: 27, slides: 75, videos: 5 },
      slides: { source: "ch1.面向对象设计的原理.pdf", pages: 75 }
    },
    {
      id: "ch2",
      no: "第 2 章",
      title: "软件架构",
      short: "软件架构",
      subtitle:
        "架构的定义与作用、架构视图、质量属性、架构与需求的绑定关系，以及架构师关注的核心问题。",
      dir: "chapters/ch2",
      accent: "#3f5f4a",
      icon: "i-grid",
      minutes: 30,
      topics: ["架构定义", "4+1 视图", "质量属性", "架构决策", "架构描述"],
      sections: [
        { id: "overview", title: "本章导览" },
        { id: "concepts", title: "核心概念" },
        { id: "detail", title: "架构详解" },
        { id: "compare", title: "横向对比" },
        { id: "pitfalls", title: "易错点" },
        { id: "quiz", title: "本章自测" },
        { id: "cards", title: "记忆卡片" },
        { id: "slides", title: "课件原图" },
        { id: "summary", title: "本章小结" }
      ],
      stats: { sections: 9, quiz: 17, cards: 22, slides: 13, videos: 0 },
      slides: { source: "ch2.软件架构.pdf", pages: 13 }
    },
    {
      id: "ch3",
      no: "第 3 章",
      title: "软件设计的模式",
      short: "设计模式导论",
      subtitle:
        "模式是什么、为什么用模式、模式的描述要素与分类，以及「模式 ≠ 框架 ≠ 架构」的辨析。",
      dir: "chapters/ch3",
      accent: "#5b4a72",
      icon: "i-compass",
      minutes: 25,
      topics: ["模式定义", "GoF 分类", "模式要素", "模式与框架", "反模式"],
      sections: [
        { id: "overview", title: "本章导览" },
        { id: "concepts", title: "核心概念" },
        { id: "detail", title: "模式的定义与描述" },
        { id: "compare", title: "横向对比" },
        { id: "pitfalls", title: "易错点" },
        { id: "quiz", title: "本章自测" },
        { id: "cards", title: "记忆卡片" },
        { id: "slides", title: "课件原图" }
      ],
      stats: { sections: 8, quiz: 20, cards: 30, slides: 8, videos: 0 },
      slides: { source: "ch3.软件设计的模式.pdf", pages: 8 }
    },
    {
      id: "ch4",
      no: "第 4 章",
      title: "面向对象设计模式",
      short: "GoF 23 种模式",
      subtitle:
        "创建型 5 种、结构型 7 种、行为型 11 种：意图、结构、适用场景、协作过程与典型误用。整章分为 4 个页面。",
      dir: "chapters/ch4",
      accent: "#8a5a2b",
      icon: "i-puzzle",
      minutes: 120,
      topics: ["创建型 ×5", "结构型 ×7", "行为型 ×11", "模式对比", "适用场景"],
      /* 本章 4 个页面各自独立成篇：index 是总纲，另外三页是 23 种模式的详解 */
      pages: [
        {
          file: "index.html",
          label: "总览",
          title: "23 种模式速查 · 选型决策",
          sections: [
            { id: "overview", title: "本章导览" },
            { id: "concepts", title: "模式分类与 23 种速查表" },
            { id: "detail", title: "如何选择模式" },
            { id: "compare", title: "跨模式横向对比" },
            { id: "pitfalls", title: "易错点" },
            { id: "quiz", title: "本章自测" },
            { id: "cards", title: "记忆卡片" },
            { id: "slides", title: "课件原图" }
          ],
          stats: { sections: 8, quiz: 15, cards: 22, slides: 108 }
        },
        {
          file: "creation.html",
          label: "创建型 ×5",
          title: "创建型模式（含简单工厂）",
          sections: [
            { id: "overview", title: "本章导览" },
            { id: "concepts", title: "核心概念与模式卡" },
            { id: "detail", title: "结构与实现（六个模式详解）" },
            { id: "compare", title: "横向对比" },
            { id: "pitfalls", title: "易错点" },
            { id: "quiz", title: "本节自测" },
            { id: "cards", title: "记忆卡片" },
            { id: "slides", title: "课件原图" },
            { id: "videos", title: "视频讲解" }
          ],
          stats: { sections: 9, quiz: 15, cards: 22, slides: 108 }
        },
        {
          file: "structural.html",
          label: "结构型 ×7",
          title: "结构型模式",
          sections: [
            { id: "overview", title: "本章导览" },
            { id: "concepts", title: "核心概念与模式卡" },
            { id: "detail", title: "结构与实现（七个模式详解）" },
            { id: "compare", title: "横向对比" },
            { id: "pitfalls", title: "易错点" },
            { id: "quiz", title: "本节自测" },
            { id: "cards", title: "记忆卡片" },
            { id: "slides", title: "课件原图" },
            { id: "videos", title: "视频讲解" }
          ],
          stats: { sections: 9, quiz: 15, cards: 23, slides: 118 }
        },
        {
          file: "behavioral.html",
          label: "行为型 ×11",
          title: "行为型模式",
          sections: [
            { id: "overview", title: "本章导览" },
            { id: "concepts", title: "核心概念与模式卡" },
            { id: "detail", title: "结构与实现（十一个模式详解）" },
            { id: "compare", title: "横向对比" },
            { id: "pitfalls", title: "易错点" },
            { id: "quiz", title: "本节自测" },
            { id: "cards", title: "记忆卡片" },
            { id: "slides", title: "课件原图" },
            { id: "videos", title: "视频讲解" }
          ],
          stats: { sections: 9, quiz: 15, cards: 30, slides: 124 }
        }
      ],
      /* 本章总览页（index.html）的小节 */
      sections: [
        { id: "overview", title: "本章导览" },
        { id: "concepts", title: "模式分类与 23 种速查表" },
        { id: "detail", title: "如何选择模式" },
        { id: "compare", title: "跨模式横向对比" },
        { id: "pitfalls", title: "易错点" },
        { id: "quiz", title: "本章自测" },
        { id: "cards", title: "记忆卡片" },
        { id: "slides", title: "课件原图" }
      ],
      /* 章级合计：4 个页面去重后共 60 题 / 97 张卡 / 350 页课件 */
      stats: { sections: 8, quiz: 60, cards: 97, slides: 350, videos: 21 },
      slides: {
        source: [
          "ch4.面向对象设计模式-创建型模式.pdf",
          "ch4.面向对象设计模式-结构型.pdf",
          "ch4.面向对象设计模式-行为型new.pdf"
        ],
        pages: 350
      }
    },
    {
      id: "ch5",
      no: "第 5 章",
      title: "架构模式",
      short: "架构模式",
      subtitle:
        "分层、MVC、管道过滤器、事件驱动、微服务等经典架构风格的原理、优缺点与选型依据。",
      dir: "chapters/ch5",
      accent: "#7a4040",
      icon: "i-network",
      minutes: 60,
      topics: ["分层架构", "MVC", "管道-过滤器", "事件驱动", "微服务"],
      sections: [
        { id: "overview", title: "本章导览" },
        { id: "concepts", title: "核心概念" },
        { id: "detail", title: "结构与实现" },
        { id: "compare", title: "横向对比" },
        { id: "pitfalls", title: "易错点" },
        { id: "quiz", title: "本章自测" },
        { id: "cards", title: "记忆卡片" },
        { id: "slides", title: "课件原图" },
        { id: "videos", title: "视频讲解" },
        { id: "summary", title: "本章小结" }
      ],
      stats: { sections: 10, quiz: 22, cards: 37, slides: 82, videos: 6 },
      slides: { source: "ch5.架构模式.pdf", pages: 82 }
    }
  ]
};

/* 便捷查询：window.SITE.chapter('ch1') */
window.SITE.chapter = function (id) {
  return (window.SITE.chapters || []).filter(function (c) {
    return c.id === id;
  })[0] || null;
};

/* 便捷查询：某个章节下的全部页面（单页章节返回 [index.html]） */
window.SITE.pageList = function (id) {
  var ch = window.SITE.chapter(id);
  if (!ch) return [];
  if (ch.pages && ch.pages.length) {
    return ch.pages.map(function (p) {
      return {
        chapter: ch.id,
        file: p.file,
        label: p.label,
        title: p.title,
        stats: p.stats || null,
        url: ch.dir + "/" + p.file
      };
    });
  }
  return [{
    chapter: ch.id,
    file: "index.html",
    label: ch.short || ch.title,
    title: ch.title,
    stats: ch.stats || null,
    url: ch.dir + "/index.html"
  }];
};