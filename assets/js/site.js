/* ==========================================================================
   assets/js/site.js —— 全站唯一脚本（无依赖 / 无 CDN / 可离线 / 支持 file://）
   --------------------------------------------------------------------------
   它负责渲染「共享外壳」并驱动所有交互组件：
     顶栏 / 侧栏目录 / 页脚 / 上下章导航 / 阅读进度 / 目录高亮
     全站搜索 / 自测 Quiz / 记忆卡片 / 课件原图查看器 / 代码块复制
     主题切换 / 键盘快捷键 / 回到顶部

   章节页只需要：写好正文 HTML + 两个 JSON 数据块，其余交给本文件。
   详细契约见 docs/CONTENT_CONTRACT.md。
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 0. 基础工具
   * ------------------------------------------------------------------ */
  var SITE = window.SITE || { chapters: [], course: '软件设计与体系架构', standardSections: [] };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clamp(n, a, b) { return n < a ? a : n > b ? b : n; }
  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  }
  function throttleRaf(fn) {
    var lock = false;
    return function () {
      if (lock) return;
      lock = true;
      requestAnimationFrame(function () { lock = false; fn(); });
    };
  }

  /* 安全的 localStorage（file:// / 隐私模式下可能抛错，绝不让整站挂掉） */
  var LS = {
    get: function (k, dflt) {
      try {
        var v = localStorage.getItem(k);
        return v == null ? dflt : JSON.parse(v);
      } catch (e) { return dflt; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
    raw: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  };

  var NS = 'sda.'; // 本地存储命名空间

  /* ------------------------------------------------------------------ *
   * 1. 图标（内联 SVG sprite，无 emoji 图标）
   * ------------------------------------------------------------------ */
  var ICONS = {
    'i-layers': '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
    'i-grid': '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    'i-compass': '<circle cx="12" cy="12" r="9"/><path d="m15.4 8.6-2 4.8-4.8 2 2-4.8 4.8-2Z"/>',
    'i-blocks': '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M17 13v8M13 17h8"/>',
    'i-puzzle': '<path d="M10 3h4v2.2a2 2 0 1 0 2.8 2.8H19v4h-2.2a2 2 0 1 0-2.8 2.8V19h-4v-2.2a2 2 0 1 0-2.8-2.8H5v-4h2.2A2 2 0 1 0 10 5.2V3Z"/>',
    'i-network': '<circle cx="12" cy="4.5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 6.7v4.8M12 11.5 6.4 17M12 11.5l5.6 5.5"/>',
    'i-moon': '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    'i-sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    'i-search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    'i-menu': '<path d="M3 6h18M3 12h18M3 18h18"/>',
    'i-x': '<path d="M18 6 6 18M6 6l12 12"/>',
    'i-arrow-left': '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    'i-arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'i-arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
    'i-check': '<path d="m20 6-11 11-5-5"/>',
    'i-book': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    'i-play': '<path d="M7 4.5 20 12 7 19.5v-15Z"/>',
    'i-shuffle': '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    'i-refresh': '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>',
    'i-copy': '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    'i-bulb': '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/>',
    'i-alert': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    'i-stop': '<path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9L7.9 2Z"/><path d="M12 8v5M12 16h.01"/>',
    'i-info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    'i-target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    'i-clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    'i-cards': '<rect x="3" y="6" width="12" height="15" rx="2"/><path d="M7 3h11a2 2 0 0 1 2 2v13"/>',
    'i-list': '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    'i-printer': '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    'i-home': '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    'i-chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'i-star': '<path d="m12 3 2.9 5.9 6.1.9-4.5 4.3 1.1 6.1-5.6-3-5.6 3 1.1-6.1L3 9.8l6.1-.9L12 3Z"/>',
    'i-eye': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    'i-link': '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
    'i-keyboard': '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>',
    'i-flag': '<path d="M4 21V4h9l-1 3h8l-2 5 2 5h-8l1 4"/>',
    'i-zoom': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M11 8v6M8 11h6"/>',
    'i-trophy': '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
    'i-graduation': '<path d="M22 9 12 4 2 9l10 5 10-5Z"/><path d="M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
    'i-terminal': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    'i-print-doc': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'
  };

  function icon(name, cls) {
    var key = name && ICONS[name] ? name : (name && ICONS['i-' + name] ? 'i-' + name : null);
    if (!key) return '';
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + key + '"></use></svg>';
  }

  function injectSprite() {
    if ($('#sda-sprite')) return;
    var parts = [];
    for (var k in ICONS) {
      if (!Object.prototype.hasOwnProperty.call(ICONS, k)) continue;
      parts.push('<symbol id="' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>');
    }
    var holder = el('div');
    holder.id = 'sda-sprite';
    holder.setAttribute('aria-hidden', 'true');
    holder.innerHTML = '<svg class="icon-sprite" focusable="false">' + parts.join('') + '</svg>';
    document.body.insertBefore(holder, document.body.firstChild);
  }

  /* ------------------------------------------------------------------ *
   * 2. 颜色工具（把 manifest 里的 accent 变成一组 CSS 变量）
   * ------------------------------------------------------------------ */
  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function shade(rgb, amount) {
    // amount<0 变暗，>0 变亮
    return rgb.map(function (c) {
      return clamp(Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount), 0, 255);
    });
  }
  function rgbCss(rgb, alpha) {
    return alpha == null
      ? 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'
      : 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
  }
  function applyAccent(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return;
    var root = document.documentElement.style;
    root.setProperty('--accent', rgbCss(rgb));
    root.setProperty('--accent-strong', rgbCss(shade(rgb, -0.32)));
    root.setProperty('--accent-soft', rgbCss(rgb, 0.13));
    root.setProperty('--accent-softer', rgbCss(rgb, 0.06));
    document.documentElement.setAttribute('data-accent', 'custom');
  }

  /* ------------------------------------------------------------------ *
   * 3. 当前页面上下文
   * ------------------------------------------------------------------ */

  /* 站点根路径前缀。
     从「本脚本自身的 src」反推，而不是假设页面在第几层：
         /assets/js/site.js       → ''        （首页）
         ../../assets/js/site.js  → '../../'  （chapters/chN/ 与 chapters/_template/）
     这样即使章节页放在任何深度，site.js 生成的链接都正确。 */
  var ROOT = (function () {
    var s = document.querySelector('script[src*="assets/js/site.js"]');
    if (s) {
      var href = s.getAttribute('src') || '';
      var cut = href.indexOf('assets/js/site.js');
      if (cut >= 0) return href.slice(0, cut);
    }
    return '';
  })();
  function siteUrl(rel) { return ROOT + String(rel).replace(/^\.?\//, ''); }

  var ctx = {
    page: document.documentElement.getAttribute('data-page') || 'chapter',
    chapterId: document.documentElement.getAttribute('data-chapter') || null,
    chapter: null,
    index: -1,
    /* 模板 / 预览页不写入真实章节的本地进度 */
    noStore: document.documentElement.hasAttribute('data-nostore'),
    storeKey: function (suffix) {
      var id = this.noStore ? 'preview' : (this.chapterId || 'x');
      return NS + suffix + '.' + id;
    }
  };
  function resolveContext() {
    if (!ctx.chapterId) return;
    var list = SITE.chapters || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === ctx.chapterId) { ctx.chapter = list[i]; ctx.index = i; break; }
    }
    if (ctx.chapter) {
      applyAccent(ctx.chapter.accent);
      document.title = document.title || ctx.chapter.title;
    }
  }

  /* ------------------------------------------------------------------ *
   * 4. 主题
   * ------------------------------------------------------------------ */
  var THEME_KEY = NS + 'theme';
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function setTheme(t, announce) {
    document.documentElement.setAttribute('data-theme', t);
    LS.set(THEME_KEY, t);
    syncThemeButton();
    if (announce) toast(t === 'dark' ? '已切换到深色模式' : '已切换到浅色模式');
  }
  function toggleTheme() { setTheme(currentTheme() === 'dark' ? 'light' : 'dark', true); }
  function syncThemeButton() {
    var b = $('#theme-toggle');
    if (!b) return;
    var dark = currentTheme() === 'dark';
    b.innerHTML = icon(dark ? 'i-sun' : 'i-moon');
    b.setAttribute('aria-label', dark ? '切换到浅色模式（快捷键 D）' : '切换到深色模式（快捷键 D）');
    b.setAttribute('title', dark ? '浅色模式 (D)' : '深色模式 (D)');
  }

  /* ------------------------------------------------------------------ *
   * 5. Toast
   * ------------------------------------------------------------------ */
  var toastTimer;
  function toast(msg, ms) {
    var t = $('#sda-toast');
    if (!t) {
      t = el('div', 'toast');
      t.id = 'sda-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-shown'); }, ms || 2200);
  }

  /* ------------------------------------------------------------------ *
   * 6. 顶栏
   * ------------------------------------------------------------------ */
  function chapterHref(ch) { return ch && ch.dir ? ch.dir + '/index.html' : '#'; }

  function renderTopbar() {
    var root = $('#topbar-root');
    if (!root) return;
    var homeHref = siteUrl('index.html');
    var sub = '';
    if (ctx.chapter) {
      sub = '<span class="topbar__sub">' + esc(ctx.chapter.no) + ' / 共 ' + (SITE.chapters || []).length + ' 章</span>';
    } else if (ctx.page === 'home') {
      sub = '<span class="topbar__sub">期末复习</span>';
    }

    root.innerHTML =
      '<button class="icon-btn nav-toggle" id="nav-toggle" type="button" aria-label="打开目录" aria-expanded="false" aria-controls="sidebar-root">' +
        icon('i-menu') + '</button>' +
      '<a class="topbar__brand" href="' + homeHref + '" title="返回课程首页">' +
        '<span class="topbar__mark">' + icon('i-graduation') + '</span>' +
        '<span class="topbar__title">' + esc(SITE.course || '课程复习') + '</span>' +
        sub +
      '</a>' +
      '<span class="topbar__spacer"></span>' +
      '<div class="topbar__actions">' +
        '<button class="icon-btn icon-btn--labeled" id="search-open" type="button" aria-label="搜索全站内容">' +
          icon('i-search') + '<span>搜索</span><kbd>/</kbd></button>' +
        '<button class="icon-btn" id="theme-toggle" type="button"></button>' +
        '<button class="icon-btn" id="print-btn" type="button" aria-label="打印 / 导出 PDF" title="打印 / 导出 PDF">' +
          icon('i-printer') + '</button>' +
      '</div>';

    syncThemeButton();
    var tgl = $('#nav-toggle');
    if (tgl) tgl.addEventListener('click', function () { toggleSidebar(); });
    var th = $('#theme-toggle');
    if (th) th.addEventListener('click', toggleTheme);
    var pb = $('#print-btn');
    if (pb) pb.addEventListener('click', function () { window.print(); });
  }

  /* ------------------------------------------------------------------ *
   * 7. 侧栏目录
   * ------------------------------------------------------------------ */
  function sectionNodes() {
    return $$('.main .section, .main section[id]').filter(function (s) {
      return s.getAttribute('data-nav') !== 'off';
    });
  }
  function sectionTitle(s, i) {
    var t = s.getAttribute('data-title');
    if (t) return t;
    var h = $('.section-title', s) || $('h2', s) || $('h1', s);
    return h ? h.textContent.trim() : '第 ' + (i + 1) + ' 节';
  }

  function renderSidebar() {
    var root = $('#sidebar-root');
    if (!root) return;
    if (ctx.page === 'home' || !ctx.chapter) {
      root.innerHTML = '';
      root.style.display = 'none';
      return;
    }
    root.style.display = '';

    var secs = sectionNodes();
    var items = secs.map(function (s, i) {
      var id = s.id || 'section-' + (i + 1);
      if (!s.id) s.id = id;
      return '<li><a class="sidebar__link" href="#' + esc(id) + '" data-target="' + esc(id) + '">' +
        '<span class="sidebar__num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span>' + esc(sectionTitle(s, i)) + '</span></a></li>';
    }).join('');

    var chapters = (SITE.chapters || []).map(function (c) {
      var active = c.id === ctx.chapterId;
      return '<li><a class="sidebar__link' + (active ? ' is-active' : '') + '" href="' +
        (active ? '#' : siteUrl(c.dir + '/index.html')) + '">' +
        '<span class="sidebar__num">' + esc(String(c.no).replace(/[^0-9]/g, '')) + '</span>' +
        '<span>' + esc(c.short || c.title) + '</span></a></li>';
    }).join('');

    root.innerHTML =
      '<div class="sidebar__group">' +
        '<p class="sidebar__label">本章目录</p>' +
        '<ul class="sidebar__list" id="toc-list">' + items + '</ul>' +
      '</div>' +
      '<div class="sidebar__group">' +
        '<p class="sidebar__label">全部章节</p>' +
        '<ul class="sidebar__list">' + chapters + '</ul>' +
      '</div>' +
      '<div class="sidebar__foot">' +
        '<div class="sidebar__progress">' +
          '<span id="side-progress-label">阅读 0%</span>' +
          '<span class="sidebar__progress-bar"><i id="side-progress-fill"></i></span>' +
        '</div>' +
        '<div>快捷键：<kbd>/</kbd> 搜索 · <kbd>D</kbd> 深色 · <kbd>[</kbd><kbd>]</kbd> 上下章</div>' +
      '</div>';

    $$('#toc-list .sidebar__link', root).forEach(function (a) {
      a.addEventListener('click', function () { closeSidebar(); });
    });
  }

  function toggleSidebar(force) {
    var sb = $('#sidebar-root');
    if (!sb) return;
    var open = typeof force === 'boolean' ? force : !sb.classList.contains('is-open');
    sb.classList.toggle('is-open', open);
    var scrim = $('#sidebar-scrim');
    if (scrim) scrim.classList.toggle('is-shown', open);
    var tgl = $('#nav-toggle');
    if (tgl) tgl.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open && window.innerWidth <= 992 ? 'hidden' : '';
  }
  function closeSidebar() { toggleSidebar(false); }

  function ensureScrim() {
    if ($('#sidebar-scrim')) return;
    var s = el('div', 'sidebar-scrim');
    s.id = 'sidebar-scrim';
    document.body.appendChild(s);
    s.addEventListener('click', closeSidebar);
  }

  /* ------------------------------------------------------------------ *
   * 8. 阅读进度 + 目录高亮
   * ------------------------------------------------------------------ */
  function saveProgress(pct) {
    if (!ctx.chapterId || ctx.noStore) return;
    var all = LS.get(NS + 'progress', {}) || {};
    var rec = all[ctx.chapterId] || { max: 0, at: 0 };
    rec.max = Math.max(rec.max || 0, Math.round(pct));
    rec.at = Date.now();
    all[ctx.chapterId] = rec;
    LS.set(NS + 'progress', all);
    LS.set(NS + 'last', { id: ctx.chapterId, at: rec.at });
  }

  function initProgress() {
    var bar = $('#progress-fill');
    var sideFill = $('#side-progress-fill');
    var sideLabel = $('#side-progress-label');
    var toTop = $('#to-top');
    var last = -1;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? clamp((window.scrollY / max) * 100, 0, 100) : 100;
      if (bar) bar.style.width = pct.toFixed(2) + '%';
      if (sideFill) sideFill.style.width = pct.toFixed(0) + '%';
      if (sideLabel) sideLabel.textContent = '阅读 ' + pct.toFixed(0) + '%';
      if (toTop) toTop.classList.toggle('is-shown', window.scrollY > 700);
      var r = Math.round(pct);
      if (r !== last) { last = r; saveProgress(pct); }
      spy();
    }
    var onScroll = throttleRaf(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', debounce(update, 150));
    window.addEventListener('pagehide', function () { saveProgress(last); });
    update();
  }

  function spy() {
    var links = $$('#toc-list .sidebar__link');
    if (!links.length) return;
    var offset = (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 56) + 90;
    var current = null;
    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute('data-target');
      var target = id && document.getElementById(id);
      if (!target) continue;
      if (target.getBoundingClientRect().top - offset <= 0) current = links[i];
      else break;
    }
    if (!current) current = links[0];
    if (current.classList.contains('is-active')) return;
    links.forEach(function (l) { l.classList.remove('is-active'); });
    current.classList.add('is-active');
  }

  function initToTop() {
    var b = el('button', 'to-top');
    b.id = 'to-top';
    b.type = 'button';
    b.setAttribute('aria-label', '回到顶部');
    b.innerHTML = icon('i-arrow-up');
    document.body.appendChild(b);
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ------------------------------------------------------------------ *
   * 9. 页脚
   * ------------------------------------------------------------------ */
  function renderFooter() {
    var root = $('#footer-root');
    if (!root) return;
    root.innerHTML =
      '<div class="wrap footer__inner">' +
        '<div>' +
          '<strong>' + esc(SITE.course || '') + '</strong>' +
          (SITE.courseEn ? ' · ' + esc(SITE.courseEn) : '') +
          ' · 期末复习站' +
          '<br><span class="tiny">内容整理自课堂课件，仅供复习参考 · 更新于 ' + esc(SITE.updated || '') + '</span>' +
        '</div>' +
        '<div class="footer__links">' +
          '<a href="' + siteUrl('index.html') + '">课程首页</a>' +
          '<a href="' + siteUrl('chapters/_template/index.html') + '">页面模板</a>' +
          '<a href="' + siteUrl('docs/CONTENT_CONTRACT.md') + '">内容规范</a>' +
          '<a href="#" id="footer-top">回到顶部</a>' +
        '</div>' +
      '</div>';
    var ft = $('#footer-top');
    if (ft) ft.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------------ *
   * 10. 上一章 / 下一章
   * ------------------------------------------------------------------ */
  function renderPager() {
    var root = $('#pager-root');
    if (!root) return;
    var list = SITE.chapters || [];
    var prev = ctx.index > 0 ? list[ctx.index - 1] : null;
    var next = ctx.index >= 0 && ctx.index < list.length - 1 ? list[ctx.index + 1] : null;
    if (!prev && !next) { root.remove(); return; }

    function link(ch, dir) {
      if (!ch) return '<span class="pager__link pager__link--empty" aria-hidden="true"></span>';
      var isNext = dir === 'next';
      return '<a class="pager__link' + (isNext ? ' pager__link--next' : '') + '" href="' + siteUrl(ch.dir + '/index.html') + '">' +
        '<span class="pager__dir">' + (isNext ? '下一章 ' + icon('i-arrow-right') : icon('i-arrow-left') + ' 上一章') + '</span>' +
        '<span class="pager__name">' + esc(ch.title) + ' <span>' + esc(ch.no) + '</span></span>' +
        '</a>';
    }
    root.innerHTML = link(prev, 'prev') + link(next, 'next');
  }

  /* ------------------------------------------------------------------ *
   * 11. 代码块增强（语言标签 + 复制按钮）
   * ------------------------------------------------------------------ */
  function initCodeBlocks() {
    $$('figure.code').forEach(function (fig) {
      if ($('.code__bar', fig)) return;
      var lang = fig.getAttribute('data-lang') || '';
      var file = fig.getAttribute('data-file') || '';
      var bar = el('div', 'code__bar');
      bar.innerHTML =
        (lang ? '<span class="code__lang">' + esc(lang) + '</span>' : '') +
        (file ? '<span class="code__file">' + esc(file) + '</span>' : '') +
        '<button class="code__copy" type="button">' + icon('i-copy') + '<span>复制</span></button>';
      fig.insertBefore(bar, fig.firstChild);

      var btn = $('.code__copy', bar);
      btn.addEventListener('click', function () {
        var codeEl = $('pre code', fig) || $('pre', fig);
        var text = codeEl ? codeEl.innerText.replace(/\n$/, '') : '';
        copyText(text).then(function (ok) {
          btn.classList.toggle('is-done', ok);
          btn.innerHTML = ok ? icon('i-check') + '<span>已复制</span>' : icon('i-copy') + '<span>复制失败</span>';
          setTimeout(function () {
            btn.classList.remove('is-done');
            btn.innerHTML = icon('i-copy') + '<span>复制</span>';
          }, 1800);
        });
      });
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(fallback);
    }
    return Promise.resolve(fallback());
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
  }

  /* ------------------------------------------------------------------ *
   * 12. 自测 Quiz
   *    数据来源：<script type="application/json" id="quiz-data">
   * ------------------------------------------------------------------ */
  function readJSON(id) {
    var node = document.getElementById(id);
    if (!node) return null;
    try {
      var raw = node.textContent.trim();
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[site.js] JSON 解析失败：#' + id, e);
      return { __error: e.message };
    }
  }

  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  function quizPlaceholder(root, msg, title) {
    root.innerHTML =
      '<div class="quiz__head"><h3 class="quiz__title">' + esc(title || '本章自测') + '</h3>' +
      '<span class="chip chip--warn">' + icon('i-alert') + '待补充</span></div>' +
      '<div class="quiz__body"><p class="muted" style="margin:0">' + esc(msg) + '</p></div>';
  }

  /* 页面自测：数据来自本页 <script id="quiz-data"> */
  function initQuiz() {
    var root = $('#quiz-root');
    if (!root) return;
    renderQuiz(root, readJSON('quiz-data'), {});
  }

  /* 通用自测渲染器
     root   —— 渲染目标（#quiz-root / #mixed-quiz-root）
     data   —— 数组，或 {title, questions:[...]}
     opts   —— storeKey: 成绩存储键；showSource: 每题显示来源页；
               reshuffle: 提供则显示「换一组」按钮（首页随机练习用） */
  function renderQuiz(root, data, opts) {
    opts = opts || {};
    if (!data) { quizPlaceholder(root, '尚未提供 quiz-data。请按 CONTENT_CONTRACT.md 在页面底部加入 JSON 数据块。'); return; }
    if (data.__error) { quizPlaceholder(root, 'quiz-data JSON 解析失败：' + data.__error); return; }

    var questions = Array.isArray(data) ? data : (data.questions || []);
    if (!questions.length) { quizPlaceholder(root, 'quiz-data 中没有题目。'); return; }

    // 归一化
    questions = questions.map(function (q, i) {
      var type = (q.type || 'single').toLowerCase();
      if (type === 'true-false' || type === 'truefalse' || type === 'tf' || type === 'judge') type = 'boolean';
      if (type === 'multi' || type === 'multi-select') type = 'multiple';
      var optsList = Array.isArray(q.options) ? q.options.slice() : null;
      if (type === 'boolean') optsList = ['正确', '错误'];
      var answer = q.answer;
      var ansSet;
      if (type === 'multiple') ansSet = (Array.isArray(answer) ? answer : [answer]).map(Number);
      else if (type === 'boolean') ansSet = [answer === true || answer === 'true' || answer === 0 ? 0 : 1];
      else ansSet = [Number(answer)];
      return {
        n: i + 1,
        type: type,
        stem: q.stem || q.question || '（题干缺失）',
        options: optsList || ['选项 A', '选项 B'],
        answers: ansSet,
        explain: q.explain || q.explanation || '',
        tag: q.tag || '',
        src: q.src || '',
        multi: type === 'multiple'
      };
    });

    var total = questions.length;
    var QUIZ_KEY = opts.storeKey || ctx.storeKey('quiz');
    var saved = LS.get(QUIZ_KEY, null);
    var graded = false;

    var typeLabel = { single: '单选', multiple: '多选', boolean: '判断' };

    var headHTML =
      '<div class="quiz__head">' +
        '<h3 class="quiz__title">' + icon('i-target') + ' ' +
          esc(data.title || opts.title || '本章自测') + '</h3>' +
        '<span class="quiz__meta">共 ' + total + ' 题' +
          (saved && saved.best != null ? ' · 历史最佳 ' + saved.best + '%' : '') +
          (opts.note ? ' · ' + esc(opts.note) : '') + '</span>' +
        '<span class="quiz__score" id="quiz-score"><span id="quiz-score-num">—</span><small id="quiz-score-den">/ ' + total + '</small></span>' +
      '</div>';

    var bodyHTML = questions.map(function (q) {
      var markCls = q.multi ? ' opt__mark opt__mark--square' : 'opt__mark';
      var list = q.options.map(function (o, oi) {
        return '<label class="opt" data-oi="' + oi + '">' +
          '<input type="' + (q.multi ? 'checkbox' : 'radio') + '" name="q' + q.n + '" value="' + oi + '">' +
          '<span class="' + markCls + '">' + icon('i-check') + '</span>' +
          '<span class="opt__text"><span class="opt__key">' + (LETTERS[oi] || oi + 1) + '.</span>' + o + '</span>' +
        '</label>';
      }).join('');
      var srcChip = (opts.showSource && q.src)
        ? '<span class="q__type" title="题目来源">' + esc(q.src) + '</span>' : '';
      return '<div class="q" data-q="' + q.n + '">' +
        '<div class="q__head">' +
          '<span class="q__index">' + String(q.n).padStart(2, '0') + '</span>' +
          '<p class="q__stem">' + q.stem + '</p>' +
          srcChip +
          '<span class="q__type">' + (typeLabel[q.type] || '单选') + '</span>' +
        '</div>' +
        '<div class="q__options">' + list + '</div>' +
        '<div class="q__explain"><div class="q__verdict" data-verdict></div><div data-explain>' +
          (q.explain || '（暂无解析）') + '</div></div>' +
      '</div>';
    }).join('');

    var footHTML =
      '<div class="quiz__foot">' +
        '<button class="btn btn--primary" id="quiz-submit" type="button">' + icon('i-check') + '提交答案</button>' +
        '<button class="btn" id="quiz-retry" type="button">' + icon('i-refresh') + '全部重做</button>' +
        '<button class="btn" id="quiz-redo-wrong" type="button" style="display:none">' + icon('i-flag') + '只重做错题</button>' +
        (opts.reshuffle
          ? '<button class="btn" id="quiz-reshuffle" type="button">' + icon('i-shuffle') + '换一组</button>'
          : '') +
        '<span class="quiz__hint">多选需全部选对才计分 · 结果自动保存在本机</span>' +
      '</div>' +
      '<div class="quiz__result" id="quiz-result" role="status" aria-live="polite"></div>';

    root.innerHTML = headHTML + '<div class="quiz__body" id="quiz-body">' + bodyHTML + '</div>' + footHTML;

    var bodyEl = $('#quiz-body');
    var scoreNum = $('#quiz-score-num');
    var resultEl = $('#quiz-result');
    /* 当前参与判分的题号（「只重做错题」时只含错题） */
    var activeSet = questions.map(function (q) { return q.n; });

    function selected(q) {
      var qEl = $('.q[data-q="' + q.n + '"]', bodyEl);
      return $$('input:checked', qEl).map(function (i) { return Number(i.value); });
    }

    function gradeOne(q) {
      var qEl = $('.q[data-q="' + q.n + '"]', bodyEl);
      var sel = selected(q).sort(function (a, b) { return a - b; });
      var ans = q.answers.slice().sort(function (a, b) { return a - b; });
      var ok = sel.length === ans.length && sel.every(function (v, i) { return v === ans[i]; });
      var unanswered = sel.length === 0;

      qEl.classList.add('is-graded');
      $$('.opt', qEl).forEach(function (opt) {
        var oi = Number(opt.getAttribute('data-oi'));
        opt.classList.remove('is-correct', 'is-wrong', 'is-missed');
        var isAns = ans.indexOf(oi) >= 0;
        var isSel = sel.indexOf(oi) >= 0;
        if (isAns && isSel) opt.classList.add('is-correct');
        else if (!isAns && isSel) opt.classList.add('is-wrong');
        else if (isAns && !isSel) opt.classList.add('is-missed');
      });

      var verdict = $('[data-verdict]', qEl);
      verdict.className = 'q__verdict ' + (ok ? 'q__verdict--ok' : 'q__verdict--no');
      verdict.innerHTML = ok
        ? icon('i-check') + '回答正确'
        : icon('i-x') + (unanswered ? '未作答' : '回答错误') + ' · 正确答案：' +
          ans.map(function (a) { return LETTERS[a]; }).join('、');
      return ok;
    }

    function submit() {
      if (graded) return;
      var pool = questions.filter(function (q) { return activeSet.indexOf(q.n) >= 0; });
      if (!pool.length) return;
      graded = true;

      var right = 0;
      var wrongNums = [];
      pool.forEach(function (q) {
        var ok = gradeOne(q);
        if (ok) right++; else wrongNums.push(q.n);
      });
      var n = pool.length;
      var pct = Math.round((right / n) * 100);
      scoreNum.textContent = right;
      $('#quiz-score-den').textContent = '/ ' + n;
      scoreNum.style.color = pct >= 80 ? 'var(--ok)' : pct >= 60 ? 'var(--warn)' : 'var(--danger)';

      var msg = pct === 100 ? '满分！本章掌握得很稳，可以进入下一章了。'
        : pct >= 80 ? '不错！把错题的解析再看一遍就基本没问题了。'
        : pct >= 60 ? '及格线附近，建议重点复习「易错点」与「对比表」。'
        : '基础还不牢，建议回到「核心概念」重新过一遍再来自测。';
      resultEl.className = 'quiz__result is-shown';
      resultEl.innerHTML = '<strong>得分 ' + right + ' / ' + n + '（' + pct + '%）</strong> —— ' + esc(msg) +
        (wrongNums.length && wrongNums.length < n
          ? ' <span class="muted tiny">错题：第 ' + wrongNums.join('、') + ' 题</span>'
          : '');

      // 持久化（预览/模板页不写真实进度）
      if (!ctx.noStore) {
        var rec = LS.get(QUIZ_KEY, {}) || {};
        rec.last = pct;
        rec.lastRight = right;
        rec.total = n;
        rec.at = Date.now();
        rec.best = Math.max(rec.best == null ? 0 : rec.best, pct);
        LS.set(QUIZ_KEY, rec);
        var meta = $('.quiz__meta', root);
        if (meta) meta.innerHTML = '共 ' + total + ' 题 · 历史最佳 ' + rec.best + '%';
      }

      var sb = $('#quiz-submit');
      sb.disabled = true;
      sb.innerHTML = icon('i-check') + '已提交';
      var redo = $('#quiz-redo-wrong');
      redo.style.display = wrongNums.length ? '' : 'none';
      redo.setAttribute('data-wrong', wrongNums.join(','));
      resultEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function reset(onlyWrong) {
      graded = false;
      var wrong = onlyWrong
        ? String($('#quiz-redo-wrong').getAttribute('data-wrong') || '')
            .split(',').filter(Boolean).map(Number)
        : null;

      activeSet = onlyWrong
        ? questions.map(function (q) { return q.n; }).filter(function (n2) { return wrong.indexOf(n2) >= 0; })
        : questions.map(function (q) { return q.n; });

      questions.forEach(function (q) {
        var qEl = $('.q[data-q="' + q.n + '"]', bodyEl);
        var inPlay = activeSet.indexOf(q.n) >= 0;
        qEl.style.display = inPlay ? '' : 'none';
        qEl.classList.remove('is-graded');
        $$('input', qEl).forEach(function (inp) { inp.checked = false; });
        $$('.opt', qEl).forEach(function (o) { o.classList.remove('is-correct', 'is-wrong', 'is-missed'); });
      });

      scoreNum.textContent = '—';
      scoreNum.style.color = '';
      $('#quiz-score-den').textContent = '/ ' + activeSet.length;
      resultEl.className = 'quiz__result';
      resultEl.innerHTML = '';
      var sb = $('#quiz-submit');
      sb.disabled = false;
      sb.innerHTML = icon('i-check') + '提交答案';
      $('#quiz-redo-wrong').style.display = 'none';
      if (onlyWrong) toast('已隐藏答对的题，开始重做 ' + activeSet.length + ' 道错题');
    }

    $('#quiz-submit').addEventListener('click', submit);
    $('#quiz-retry').addEventListener('click', function () { reset(false); });
    $('#quiz-redo-wrong').addEventListener('click', function () { reset(true); });
    if (opts.reshuffle) {
      var rs = $('#quiz-reshuffle');
      if (rs) rs.addEventListener('click', function () { opts.reshuffle(); });
    }

    // 键盘：1-9 选择第 n 个选项（作用于当前可见且未判分的题）
    bodyEl.addEventListener('keydown', function (e) {
      if (graded) return;
      var n = parseInt(e.key, 10);
      if (!n || n > 9) return;
      var qEl = e.target.closest && e.target.closest('.q');
      if (!qEl) return;
      var inp = $$('input', qEl)[n - 1];
      if (inp) { inp.checked = true; inp.focus(); }
    });
  }

  /* ------------------------------------------------------------------ *
   * 12.5 首页：全部题目随机练习（跨章混排，含 ch4 三个专题页）
   *      数据来源：data/quiz-bank.js（tools/build_quiz_bank.py 生成）
   * ------------------------------------------------------------------ */
  var MIXED_SIZE = 12;

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* 每个页面先各抽一题保证跨章覆盖，再轮转补齐；最后整体打乱 */
  function buildMixedQuestions(bank, size) {
    var pages = bank.map(function (page) {
      return shuffleInPlace((page.questions || []).map(function (q) {
        return {
          type: q.type,
          stem: q.stem,
          options: q.options ? q.options.slice() : q.options,
          answer: q.answer,
          explain: q.explain,
          tag: q.tag,
          src: page.title || page.chapter
        };
      }));
    });
    var out = [];
    var maxRounds = 0;
    pages.forEach(function (p) { maxRounds = Math.max(maxRounds, p.length); });
    for (var round = 0; round < maxRounds && out.length < size; round++) {
      for (var i = 0; i < pages.length && out.length < size; i++) {
        if (pages[i][round]) out.push(pages[i][round]);
      }
    }
    return shuffleInPlace(out);
  }

  function initMixedQuiz() {
    var root = $('#mixed-quiz-root');
    if (!root) return;
    var bank = window.SDA_QUIZ_BANK;
    if (!bank || !bank.length) {
      quizPlaceholder(root,
        '题库还没生成：在站点根目录运行 python tools/build_quiz_bank.py 即可。',
        '全部题目随机练习');
      return;
    }
    var totalQ = bank.reduce(function (s, p) { return s + (p.questions || []).length; }, 0);
    function draw() {
      renderQuiz(root, {
        title: '全部题目随机练习',
        questions: buildMixedQuestions(bank, MIXED_SIZE)
      }, {
        storeKey: NS + 'quiz.mixed',
        showSource: true,
        note: '跨 ' + bank.length + ' 个页面 · 题库共 ' + totalQ + ' 题',
        reshuffle: draw
      });
    }
    draw();
  }

  /* ------------------------------------------------------------------ *
   * 13. 记忆卡片
   *    数据来源：<script type="application/json" id="cards-data">
   * ------------------------------------------------------------------ */
  function initFlashcards() {
    var root = $('#cards-root');
    if (!root) return;
    var data = readJSON('cards-data');
    if (!data || data.__error || !Array.isArray(data) || !data.length) {
      root.innerHTML =
        '<div class="flash__head"><h3 class="quiz__title">' + icon('i-cards') + ' 记忆卡片</h3></div>' +
        '<div class="flash__empty">尚未提供 cards-data（应为 [{front, back, tag}] 数组）。</div>';
      return;
    }

    var cards = data.map(function (c) {
      return {
        front: c.front || '',
        back: c.back || '',
        tag: c.tag || ''
      };
    });

    var state = LS.get(ctx.storeKey('cards'), {}) || {};
    var known = Array.isArray(state.known) ? state.known : [];
    var idx = clamp(state.idx || 0, 0, cards.length - 1);
    var flipped = false;
    var order = cards.map(function (_, i) { return i; });

    root.innerHTML =
      '<div class="flash__head">' +
        '<h3 class="quiz__title">' + icon('i-cards') + ' 记忆卡片</h3>' +
        '<span class="chip" id="flash-known">已掌握 0 / ' + cards.length + '</span>' +
        '<span class="flash__counter" id="flash-counter">1 / ' + cards.length + '</span>' +
      '</div>' +
      '<div class="flash__stage">' +
        '<button class="flash__card" id="flash-card" type="button" aria-label="点击翻面">' +
          '<div class="flash__face flash__face--front">' +
            '<span class="flash__tag" id="flash-tag"></span>' +
            '<span class="flash__label">正面 · 点击翻面</span>' +
            '<p class="flash__text" id="flash-front"></p>' +
          '</div>' +
          '<div class="flash__face flash__face--back">' +
            '<span class="flash__tag" id="flash-tag-back"></span>' +
            '<span class="flash__label">背面 · 答案</span>' +
            '<p class="flash__text" id="flash-back"></p>' +
          '</div>' +
        '</button>' +
      '</div>' +
      '<div class="flash__controls">' +
        '<button class="btn btn--sm" id="flash-prev" type="button" aria-label="上一张">' + icon('i-arrow-left') + '上一张</button>' +
        '<button class="btn btn--sm" id="flash-flip" type="button">' + icon('i-refresh') + '翻面</button>' +
        '<button class="btn btn--sm" id="flash-next" type="button" aria-label="下一张">下一张' + icon('i-arrow-right') + '</button>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn--sm" id="flash-known-btn" type="button">' + icon('i-check') + '标记已掌握</button>' +
        '<button class="btn btn--sm btn--ghost" id="flash-shuffle" type="button">' + icon('i-shuffle') + '打乱</button>' +
      '</div>' +
      '<div class="flash__dots" id="flash-dots"></div>';

    var cardEl = $('#flash-card');
    var dotsEl = $('#flash-dots');

    function render() {
      var real = order[idx];
      var c = cards[real];
      $('#flash-front').innerHTML = c.front;
      $('#flash-back').innerHTML = c.back;
      $('#flash-tag').textContent = c.tag;
      $('#flash-tag-back').textContent = c.tag;
      $('#flash-counter').textContent = (idx + 1) + ' / ' + cards.length;
      var kn = known.filter(function (v) { return v != null; });
      $('#flash-known').textContent = '已掌握 ' + kn.length + ' / ' + cards.length;
      $('#flash-known-btn').innerHTML = known.indexOf(real) >= 0
        ? icon('i-check') + '已掌握' : icon('i-check') + '标记已掌握';
      $('#flash-known-btn').classList.toggle('btn--primary', known.indexOf(real) >= 0);
      cardEl.classList.toggle('is-flipped', flipped);
      cardEl.setAttribute('aria-pressed', flipped ? 'true' : 'false');
      // 圆点
      dotsEl.innerHTML = order.map(function (ri, i) {
        var cls = 'flash__dot';
        if (known.indexOf(ri) >= 0) cls += ' is-known';
        else if (i < idx) cls += ' is-seen';
        if (i === idx) cls += ' is-active';
        return '<button class="' + cls + '" type="button" data-i="' + i + '" aria-label="第 ' + (i + 1) + ' 张"></button>';
      }).join('');
      state.idx = idx;
      state.known = known;
      LS.set(ctx.storeKey('cards'), state);
    }

    function go(delta) {
      idx = (idx + delta + cards.length) % cards.length;
      flipped = false;
      render();
    }
    function flip() { flipped = !flipped; render(); }

    cardEl.addEventListener('click', flip);
    $('#flash-flip').addEventListener('click', flip);
    $('#flash-prev').addEventListener('click', function () { go(-1); });
    $('#flash-next').addEventListener('click', function () { go(1); });
    $('#flash-known-btn').addEventListener('click', function () {
      var real = order[idx];
      var p = known.indexOf(real);
      if (p >= 0) { known.splice(p, 1); toast('已取消「掌握」标记'); }
      else { known.push(real); toast('已标记为掌握'); }
      render();
      if (p < 0 && idx < cards.length - 1) setTimeout(function () { go(1); }, 260);
    });
    $('#flash-shuffle').addEventListener('click', function () {
      for (var i = order.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = order[i]; order[i] = order[j]; order[j] = t;
      }
      idx = 0; flipped = false; render(); toast('卡片顺序已打乱');
    });
    dotsEl.addEventListener('click', function (e) {
      var d = e.target.closest('.flash__dot');
      if (!d) return;
      idx = Number(d.getAttribute('data-i'));
      flipped = false;
      render();
    });
    // 键盘（卡片区域内）
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') {
        if (e.target === cardEl) { flip(); e.preventDefault(); }
      }
    });

    render();
  }

  /* ------------------------------------------------------------------ *
   * 14. 课件原图 + 灯箱
   * ------------------------------------------------------------------ */
  var LIGHTBOX = { list: [], i: 0 };

  function initSlides() {
    var blocks = $$('.slides[data-slides-dir]');
    if (!blocks.length) return;

    blocks.forEach(function (block) {
      var dir = block.getAttribute('data-slides-dir') || 'slides';
      var count = parseInt(block.getAttribute('data-count') || '0', 10);
      var prefix = block.getAttribute('data-prefix') || 'slide';
      var ext = block.getAttribute('data-ext') || 'jpg';
      var pad = parseInt(block.getAttribute('data-pad') || '3', 10);
      var start = parseInt(block.getAttribute('data-start') || '1', 10);
      var title = block.getAttribute('data-title') || '课件原图';

      if (!count) {
        block.innerHTML = '<div class="slides__head"><strong>' + esc(title) + '</strong>' +
          '<span class="chip chip--warn">' + icon('i-alert') + '尚未导出图片</span></div>' +
          '<div class="slides__grid"><p class="muted tiny" style="padding:.5rem">' +
          '请运行 tools/extract_slides.py 导出图片后，把本容器的 data-count 改为实际页数。</p></div>';
        return;
      }

      function srcOf(n) {
        var num = String(n).padStart(pad, '0');
        return dir.replace(/\/$/, '') + '/' + prefix + '-' + num + '.' + ext;
      }

      var head = el('div', 'slides__head');
      head.innerHTML =
        '<strong>' + icon('i-print-doc') + ' ' + esc(title) + '</strong>' +
        '<span class="chip">共 ' + count + ' 页</span>' +
        '<span class="muted tiny">点击任意缩略图放大查看，支持 ← → 翻页</span>';

      var grid = el('div', 'slides__grid');
      var shown = 0;
      var STEP = 48;

      var moreBtn = el('button', 'btn btn--sm');
      moreBtn.type = 'button';
      moreBtn.style.margin = '0 var(--sp-4) var(--sp-4)';

      function appendBatch() {
        var frag = document.createDocumentFragment();
        var end = Math.min(shown + STEP, count);
        for (var k = shown; k < end; k++) {
          var n = start + k;
          var b = el('button', 'slide-thumb');
          b.type = 'button';
          b.setAttribute('data-n', String(n));
          b.setAttribute('aria-label', '第 ' + n + ' 页');
          var img = el('img');
          img.loading = 'lazy';
          img.decoding = 'async';
          img.alt = title + ' 第 ' + n + ' 页';
          img.src = srcOf(n);
          b.appendChild(img);
          var lab = el('span', 'slide-thumb__n');
          lab.textContent = n;
          b.appendChild(lab);
          frag.appendChild(b);
        }
        grid.appendChild(frag);
        shown = end;
        if (shown >= count) moreBtn.remove();
        else moreBtn.innerHTML = '继续加载（' + shown + ' / ' + count + '）';
      }

      moreBtn.addEventListener('click', appendBatch);
      block.innerHTML = '';
      block.appendChild(head);
      block.appendChild(grid);
      block.appendChild(moreBtn);
      appendBatch();

      grid.addEventListener('click', function (e) {
        var b = e.target.closest('.slide-thumb');
        if (!b) return;
        var list = $$('.slide-thumb', grid).map(function (t) { return Number(t.getAttribute('data-n')); });
        var n = Number(b.getAttribute('data-n'));
        openLightbox(list, list.indexOf(n), { dir: dir, prefix: prefix, ext: ext, pad: pad, title: title });
      });
    });
  }

  function lbSrc(n) {
    var L = LIGHTBOX.meta || {};
    return (L.dir || 'slides').replace(/\/$/, '') + '/' + (L.prefix || 'slide') + '-' +
      String(n).padStart(L.pad || 3, '0') + '.' + (L.ext || 'jpg');
  }

  function ensureLightbox() {
    var lb = $('#lightbox');
    if (lb) return lb;
    lb = el('div', 'lightbox');
    lb.id = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '课件原图查看');
    lb.innerHTML =
      '<div class="lightbox__bar">' +
        '<strong id="lb-title"></strong>' +
        '<span class="lightbox__count" id="lb-count"></span>' +
        '<button class="icon-btn" id="lb-close" type="button" aria-label="关闭">' + icon('i-x') + '</button>' +
      '</div>' +
      '<button class="lightbox__nav lightbox__nav--prev" id="lb-prev" type="button" aria-label="上一页">' + icon('i-arrow-left') + '</button>' +
      '<img class="lightbox__img" id="lb-img" alt="">' +
      '<button class="lightbox__nav lightbox__nav--next" id="lb-next" type="button" aria-label="下一页">' + icon('i-arrow-right') + '</button>';
    document.body.appendChild(lb);

    $('#lb-close').addEventListener('click', closeLightbox);
    $('#lb-prev').addEventListener('click', function () { lbGo(-1); });
    $('#lb-next').addEventListener('click', function () { lbGo(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
    return lb;
  }

  function openLightbox(list, i, meta) {
    var lb = ensureLightbox();
    LIGHTBOX.list = list;
    LIGHTBOX.i = clamp(i, 0, list.length - 1);
    LIGHTBOX.meta = meta;
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lbShow();
  }
  function lbShow() {
    var n = LIGHTBOX.list[LIGHTBOX.i];
    var img = $('#lb-img');
    img.src = lbSrc(n);
    img.alt = (LIGHTBOX.meta.title || '课件') + ' 第 ' + n + ' 页';
    $('#lb-count').textContent = (LIGHTBOX.i + 1) + ' / ' + LIGHTBOX.list.length + ' · 第 ' + n + ' 页';
    $('#lb-title').textContent = LIGHTBOX.meta.title || '';
  }
  function lbGo(d) {
    if (!LIGHTBOX.list.length) return;
    LIGHTBOX.i = (LIGHTBOX.i + d + LIGHTBOX.list.length) % LIGHTBOX.list.length;
    lbShow();
  }
  function closeLightbox() {
    var lb = $('#lightbox');
    if (!lb) return;
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ------------------------------------------------------------------ *
   * 14.5 视频讲解：封面卡片 + 播放弹层
   *      清单来源：data/videos.js → window.SDA_VIDEOS
   *      原则：卡片只加载 poster（loading="lazy"），点开时才给 <video> 设 src，
   *            关闭时 pause() 并清空 src，避免几十个视频同时预载。
   *      页面上下文：data-chapter（ch1/ch5），或 ch4 的 data-chapter + data-subpage。
   * ------------------------------------------------------------------ */
  var VIDEO = { list: [], i: 0, opener: null };

  function videoContextKey() {
    var ch = ctx.chapterId || '';
    var sub = (document.documentElement.getAttribute('data-subpage') || '').toLowerCase();
    if (ch === 'ch4' && sub && sub !== 'index') return 'ch4-' + sub;
    return ch;
  }

  function fmtDuration(sec) {
    var s = Math.max(0, Math.round(Number(sec) || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function renderVideoSection() {
    var root = $('#videos-root');
    if (!root) return;
    var all = window.SDA_VIDEOS || [];
    if (!all.length) {
      root.innerHTML = '<p class="muted">视频清单（data/videos.js）缺失，无法渲染本页视频。</p>';
      return;
    }
    var list = all.filter(function (v) { return v.chapter === videoContextKey(); });
    VIDEO.list = list;
    if (!list.length) {
      root.innerHTML = '<p class="muted">本页暂无讲解视频。</p>';
      return;
    }
    root.innerHTML = list.map(function (v, i) {
      var sub = v.alt ? v.alt + ' · ' : '';
      return '<button class="video-card" type="button" data-vi="' + i + '"' +
          ' aria-label="播放视频：' + esc(v.title) + '">' +
        '<span class="video-card__thumb">' +
          '<img loading="lazy" src="' + siteUrl(v.poster) + '"' +
            ' alt="' + esc(v.title) + ' 封面" width="640" height="360">' +
          '<span class="video-card__play">' + icon('i-play') + '播放</span>' +
          '<span class="video-card__dur">' + fmtDuration(v.duration) + '</span>' +
        '</span>' +
        '<span class="video-card__body">' +
          '<span class="video-card__title">' + esc(v.title) + '</span>' +
          '<span class="video-card__meta">' + esc(sub + '讲解视频') + '</span>' +
        '</span>' +
      '</button>';
    }).join('');
    $$('.video-card', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        openVideo(Number(btn.getAttribute('data-vi')), btn);
      });
    });
  }

  function ensureVideoModal() {
    var m = $('#video-modal');
    if (m) return m;
    m = el('div', 'vmodal');
    m.id = 'video-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-label', '视频播放');
    m.innerHTML =
      '<div class="vmodal__inner">' +
        '<div class="vmodal__bar">' +
          '<span class="vmodal__title" id="vmodal-title"></span>' +
          '<span class="vmodal__count" id="vmodal-count"></span>' +
          '<button class="icon-btn" id="vmodal-close" type="button" aria-label="关闭视频">' +
            icon('i-x') + '</button>' +
        '</div>' +
        '<video id="vmodal-video" controls autoplay playsinline preload="metadata"></video>' +
      '</div>';
    document.body.appendChild(m);
    $('#vmodal-close').addEventListener('click', closeVideo);
    m.addEventListener('click', function (e) { if (e.target === m) closeVideo(); });
    return m;
  }

  function openVideo(i, opener) {
    var v = VIDEO.list[i];
    if (!v) return;
    var m = ensureVideoModal();
    var video = $('#vmodal-video');
    VIDEO.i = i;
    VIDEO.opener = opener || null;
    $('#vmodal-title').textContent = v.title;
    $('#vmodal-count').textContent = fmtDuration(v.duration) +
      (VIDEO.list.length > 1 ? ' · ' + (i + 1) + ' / ' + VIDEO.list.length : '');
    video.poster = siteUrl(v.poster);
    video.src = siteUrl(v.file);
    m.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    try { video.load(); } catch (e) {}
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    setTimeout(function () {
      var btn = $('#vmodal-close');
      if (btn) btn.focus();
    }, 20);
  }

  function closeVideo() {
    var m = $('#video-modal');
    if (!m) return;
    var video = $('#vmodal-video');
    if (video) {
      try { video.pause(); } catch (e) {}
      video.removeAttribute('src');
      video.poster = '';
      try { video.load(); } catch (e) {}
    }
    m.classList.remove('is-open');
    document.body.style.overflow = '';
    if (VIDEO.opener && typeof VIDEO.opener.focus === 'function') VIDEO.opener.focus();
    VIDEO.opener = null;
  }

  /* ------------------------------------------------------------------ *
   * 15. 全站搜索
   *    索引来源（按优先级合并）：
   *      a) window.SDA_SEARCH_INDEX  ← data/search-index.js（tools/build_search_index.py 生成）
   *      b) localStorage 中访问过的章节正文缓存（无需构建工具也能搜到已读章节）
   * ------------------------------------------------------------------ */
  var SEARCH = { index: null, active: 0, hits: [] };

  function loadSearchIndex(cb) {
    if (window.SDA_SEARCH_INDEX) { SEARCH.index = window.SDA_SEARCH_INDEX; cb(); return; }
    var url = siteUrl('data/search-index.js');

    /* file:// 下 fetch 会被浏览器拦掉，此时退回「动态 <script>」：
       <script> 不受同源限制，两种协议都能加载同一份索引。 */
    function viaScript() {
      var s = document.createElement('script');
      s.src = url;
      s.onload = function () {
        SEARCH.index = window.SDA_SEARCH_INDEX || [];
        cb();
      };
      s.onerror = function () { SEARCH.index = []; cb(); };
      document.head.appendChild(s);
    }

    /* 用 fetch 先探一下（http 下可避免索引缺失时的 404 噪音） */
    fetch(url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('missing');
        return r.text();
      })
      .then(function (txt) {
        try {
          // 直接求值，避免再插入一个 <script>
          var fn = new Function(txt + '\n;return window.SDA_SEARCH_INDEX || [];');
          SEARCH.index = fn() || [];
        } catch (e) {
          SEARCH.index = [];
        }
        cb();
      })
      .catch(function () {
        if (/^file:/i.test(location.protocol)) viaScript();
        else { SEARCH.index = []; cb(); }
      });
  }

  function cacheOwnText() {
    var main = $('.main');
    if (!main) return;
    var text = main.innerText || '';
    if (text.length < 200) return;
    var secs = sectionNodes().map(function (s, i) {
      return {
        id: s.id,
        title: sectionTitle(s, i),
        text: (s.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 4000)
      };
    });
    var url = location.href.split('#')[0];
    var title = (document.title || '').replace(/\s*[·|—]\s*软件设计与体系架构\s*$/, '').trim();
    if (!title) {
      title = ctx.chapter ? (ctx.chapter.no + ' ' + ctx.chapter.title) : '预览页';
    }
    /* 以「页面地址」为键缓存：ch4 的 index / creation / structural / behavioral
       是四个独立页面，不能互相覆盖（它们共用 data-chapter="ch4"）。 */
    var cache = LS.get(NS + 'textcache', {}) || {};
    cache[url] = {
      chapter: ctx.chapterId || 'preview',
      title: title,
      url: url,
      sections: secs,
      at: Date.now()
    };
    var keys = Object.keys(cache).sort(function (a, b) {
      return (cache[b].at || 0) - (cache[a].at || 0);
    });
    for (var i = 12; i < keys.length; i++) delete cache[keys[i]];
    LS.set(NS + 'textcache', cache);
  }

  /* 把任意写法（相对站点根 / 相对当前页 / 绝对）统一成绝对地址。
   必须用 URL 解析：'chapters/ch3/index.html' 这类「相对站点根」的写法，
   若只做字符串拼接会变成 '../../chapters/...'，无法和浏览器直接访问
   目录地址（…/chapters/ch3/）时写入的缓存键比较。 */
  function absUrl(u) {
    var s = String(u || '');
    /* 已是绝对地址（http:, https:, file: …）—— 来自「本机读过」的缓存 */
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
    /* 索引里的相对地址是「相对站点根」的，不是相对当前页；必须补 ROOT 再解析 */
    try {
      return new URL(ROOT + s.replace(/^\.?\//, ''), location.href).href;
    } catch (e) {
      return s;
    }
  }

  /* 页面唯一键：同一页面可能以三种写法出现——
       chapters/ch3/index.html  ·  .../chapters/ch3/  ·  .../chapters/ch3
     三种必须归一到同一个键上，否则搜索结果里会出现重复的章节分组。 */
  function pageKey(u) {
    var s = absUrl(u).split('#')[0].split('?')[0];
    s = s.replace(/index\.html$/i, '');
    if (s.charAt(s.length - 1) !== '/') s += '/';
    return s;
  }

  function buildCorpus() {
    var corpus = [];
    (SEARCH.index || []).forEach(function (c) {
      if (!c || !c.sections) return;
      corpus.push({
        chapter: c.chapter,
        title: c.title || c.chapter,
        url: c.url || ('chapters/' + c.chapter + '/index.html'),
        sections: c.sections
      });
    });
    /* 合并「本机读过的」页面正文：按页面键覆盖同一条目，保证搜到的是最新内容 */
    var cache = LS.get(NS + 'textcache', {}) || {};
    Object.keys(cache).forEach(function (k) {
      var rec = cache[k];
      if (!rec || !rec.sections || !rec.url) return;
      var entry = {
        chapter: rec.chapter || 'preview',
        title: rec.title || rec.url,
        url: rec.url,
        sections: rec.sections
      };
      for (var i = 0; i < corpus.length; i++) {
        if (pageKey(corpus[i].url) === pageKey(entry.url)) {
          /* 保留静态索引里的相对 url，只替换正文（相对 url 在 file:// 下更稳） */
          corpus[i] = {
            chapter: entry.chapter,
            title: entry.title,
            url: corpus[i].url,
            sections: entry.sections
          };
          return;
        }
      }
      corpus.push(entry);
    });
    /* 当前页若是模板/预览页，也让它可被搜到（仅本机会话内） */
    var prev = LS.get(NS + 'text.preview', null);
    if (prev && prev.sections && prev.url) {
      corpus.push({
        chapter: 'preview',
        title: prev.title || '页面模板',
        url: prev.url,
        sections: prev.sections
      });
    }
    return corpus;
  }

  function basePath() { return ROOT; }

  function doSearch(q) {
    var corpus = SEARCH.corpus || [];
    var query = q.trim();
    SEARCH.hits = [];
    SEARCH.active = 0;
    if (!query) return [];
    var terms = query.split(/\s+/).filter(Boolean).map(function (t) { return t.toLowerCase(); });

    corpus.forEach(function (c) {
      (c.sections || []).forEach(function (s) {
        var hay = ((s.title || '') + ' ' + (s.text || '')).toLowerCase();
        var score = 0;
        var allHit = true;
        terms.forEach(function (t) {
          var n = 0, p = 0;
          while ((p = hay.indexOf(t, p)) !== -1) { n++; p += t.length; if (n > 30) break; }
          if (!n) allHit = false;
          score += n;
        });
        if (!allHit || !score) return;
        if ((s.title || '').toLowerCase().indexOf(terms[0]) >= 0) score += 12;
        SEARCH.hits.push({
          chapter: c.chapter,
          chapterTitle: c.title,
          url: c.url,
          secId: s.id,
          secTitle: s.title || '正文',
          text: s.text || '',
          score: score
        });
      });
    });
    SEARCH.hits.sort(function (a, b) { return b.score - a.score; });
    return SEARCH.hits.slice(0, 40);
  }

  function snippet(text, terms) {
    var t = text || '';
    var lower = t.toLowerCase();
    var pos = -1;
    for (var i = 0; i < terms.length; i++) {
      var p = lower.indexOf(terms[i]);
      if (p >= 0 && (pos < 0 || p < pos)) pos = p;
    }
    if (pos < 0) pos = 0;
    var from = Math.max(0, pos - 34);
    var to = Math.min(t.length, pos + 110);
    var s = (from > 0 ? '…' : '') + t.slice(from, to) + (to < t.length ? '…' : '');
    return esc(s).replace(new RegExp('(' + terms.map(function (x) {
      return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|') + ')', 'gi'), '<mark>$1</mark>');
  }

  function ensureSearchDialog() {
    var d = $('#search-dialog');
    if (d) return d;
    d = el('div', 'search-dialog');
    d.id = 'search-dialog';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-label', '搜索全站内容');
    d.innerHTML =
      '<div class="search-panel">' +
        '<div class="search-panel__input">' + icon('i-search') +
          '<input id="search-input" type="search" placeholder="搜索全站知识点、模式名、术语…" ' +
            'autocomplete="off" spellcheck="false" aria-label="搜索关键词">' +
          '<button class="icon-btn" id="search-close" type="button" aria-label="关闭搜索">' + icon('i-x') + '</button>' +
        '</div>' +
        '<div class="search-panel__body" id="search-results"></div>' +
        '<div class="search-panel__foot">' +
          '<span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>' +
          '<span><kbd>Enter</kbd> 打开</span>' +
          '<span><kbd>Esc</kbd> 关闭</span>' +
          '<span class="muted" id="search-count"></span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) closeSearch(); });
    $('#search-close').addEventListener('click', closeSearch);

    var input = $('#search-input');
    input.addEventListener('input', debounce(function () { runSearch(input.value); }, 90));
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var hit = SEARCH.hits[SEARCH.active];
        if (hit) openHit(hit);
      } else if (e.key === 'Escape') { closeSearch(); }
    });
    return d;
  }

  function runSearch(q) {
    var box = $('#search-results');
    var terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!q.trim()) {
      box.innerHTML = '<div class="search-empty">输入关键词开始搜索，例如「依赖倒置」「观察者」「分层架构」。</div>';
      $('#search-count').textContent = '';
      SEARCH.hits = [];
      return;
    }
    var hits = doSearch(q);
    SEARCH.terms = terms;
    if (!hits.length) {
      box.innerHTML = '<div class="search-empty">没有找到「' + esc(q) + '」相关的内容。<br>' +
        '<span class="tiny">如果本章刚刚补充内容，可运行 tools/build_search_index.py 重建索引。</span></div>';
      $('#search-count').textContent = '0 条结果';
      return;
    }
    var groups = {};
    /* 按「页面」分组：ch4 的 index / 创建型 / 结构型 / 行为型 各自成组，
       组标题用索引里的页面标题（第 4 章 创建型模式 等）。 */
    hits.forEach(function (h) {
      var key = pageKey(h.url);
      (groups[key] = groups[key] || []).push(h);
    });
    var html = '';
    Object.keys(groups).forEach(function (key) {
      html += '<div class="search-group__label">' + esc(groups[key][0].chapterTitle) + '</div>';
      groups[key].forEach(function (h) {
        var gi = SEARCH.hits.indexOf(h);
        html += '<a class="search-hit" data-gi="' + gi + '" href="' + hitHref(h) + '">' +
          '<span class="search-hit__title"><span class="search-hit__where">' + esc(h.secTitle) + '</span></span>' +
          '<span class="search-hit__snippet">' + snippet(h.text, terms) + '</span></a>';
      });
    });
    box.innerHTML = html;
    $('#search-count').textContent = hits.length + ' 条结果';
    box.querySelectorAll('.search-hit').forEach(function (a) {
      a.addEventListener('mouseenter', function () { setActive(Number(a.getAttribute('data-gi'))); });
    });
  }

  function setActive(i) {
    SEARCH.active = clamp(i, 0, Math.max(0, SEARCH.hits.length - 1));
    $$('#search-results .search-hit').forEach(function (a) {
      var on = Number(a.getAttribute('data-gi')) === SEARCH.active;
      a.classList.toggle('is-active', on);
      if (on) a.scrollIntoView({ block: 'nearest' });
    });
  }
  function moveActive(d) {
    if (!SEARCH.hits.length) return;
    setActive((SEARCH.active + d + SEARCH.hits.length) % SEARCH.hits.length);
  }
  /* 命中项的链接：索引里的 url 可能是相对站点根的路径，也可能是绝对地址 */
  function hitHref(h) {
    var u = String(h.url || '');
    var abs = /^(?:[a-z]+:)?\/\//i.test(u) || u.charAt(0) === '/';
    return (abs ? u : siteUrl(u)) + (h.secId ? '#' + h.secId : '');
  }

  function openHit(h) {
    window.location.href = hitHref(h);
  }

  function openSearch() {
    var d = ensureSearchDialog();
    d.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var input = $('#search-input');
    if (!SEARCH.corpus) {
      SEARCH.corpus = buildCorpus();
      runSearch('');
    }
    setTimeout(function () { input.focus(); input.select(); }, 30);
  }
  function closeSearch() {
    var d = $('#search-dialog');
    if (!d) return;
    d.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function initSearch() {
    loadSearchIndex(function () {
      SEARCH.corpus = buildCorpus();
    });
    var open = $('#search-open');
    if (open) open.addEventListener('click', openSearch);
  }

  /* ------------------------------------------------------------------ *
   * 16. 首页
   * ------------------------------------------------------------------ */
  function pctOf(id) {
    var all = LS.get(NS + 'progress', {}) || {};
    return clamp((all[id] && all[id].max) || 0, 0, 100);
  }
  function quizBest(id) {
    var r = LS.get(NS + 'quiz.' + id, null);
    return r && r.best != null ? r.best : null;
  }

  function ringSVG(pct, accent) {
    var r = 12.5, c = 2 * Math.PI * r, off = c * (1 - clamp(pct, 0, 100) / 100);
    return '<svg class="ring" viewBox="0 0 30 30" aria-hidden="true">' +
      '<circle class="ring__bg" cx="15" cy="15" r="' + r + '" fill="none" stroke-width="3"/>' +
      '<circle class="ring__fg" cx="15" cy="15" r="' + r + '" fill="none" stroke-width="3" ' +
      'stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" ' +
      'transform="rotate(-90 15 15)"' + (accent ? ' style="stroke:' + accent + '"' : '') + '/>' +
      '</svg>';
  }

  function renderHome() {
    if (ctx.page !== 'home') return;
    var list = SITE.chapters || [];

    function sumStat(key) {
      return list.reduce(function (s, c) {
        return s + ((c.stats && c.stats[key]) || 0);
      }, 0);
    }
    function statText(st) {
      if (!st) return '';
      var bits = [];
      if (st.sections) bits.push(st.sections + ' 节');
      if (st.quiz) bits.push(st.quiz + ' 题');
      if (st.cards) bits.push(st.cards + ' 张卡');
      if (st.slides) bits.push(st.slides + ' 页课件');
      if (st.videos) bits.push(st.videos + ' 个视频');
      return bits.join(' · ');
    }

    // 统计（数字来自 data/chapters.js 的 stats，由 tools/check_content.py 对账）
    var statsEl = $('#home-stats');
    if (statsEl) {
      var totalMin = list.reduce(function (s, c) { return s + (c.minutes || 0); }, 0);
      var totalQuiz = sumStat('quiz');
      var totalCards = sumStat('cards');
      var totalVideos = sumStat('videos');
      var overall = list.length
        ? Math.round(list.reduce(function (s, c) { return s + pctOf(c.id); }, 0) / list.length) : 0;
      var doneCount = list.filter(function (c) { return pctOf(c.id) >= 95; }).length;
      statsEl.innerHTML = [
        { n: list.length, u: '章', l: '课程章节 · 约 ' + (totalMin ? Math.round(totalMin / 60 * 10) / 10 : '—') + ' 小时' },
        { n: totalQuiz || '—', u: totalQuiz ? '题' : '', l: '自测题（含解析）' },
        { n: totalCards || '—', u: totalCards ? '张' : '', l: '记忆卡片' },
        { n: totalVideos || '—', u: totalVideos ? '条' : '', l: '讲解视频' },
        { n: overall, u: '%', l: '整体进度 · 已完成 ' + doneCount + '/' + list.length + ' 章' }
      ].map(function (s) {
        return '<div class="stat"><span class="stat__num">' + esc(s.n) +
          (s.u ? '<small>' + esc(s.u) + '</small>' : '') + '</span>' +
          '<span class="stat__label">' + esc(s.l) + '</span></div>';
      }).join('');
    }

    // 继续上次
    var cont = $('#home-continue');
    if (cont) {
      var last = LS.get(NS + 'last', null);
      var ch = last && SITE.chapter ? SITE.chapter(last.id) : null;
      if (ch) {
        cont.style.display = '';
        cont.innerHTML = icon('i-play') + '继续上次：' + esc(ch.short || ch.title);
        cont.href = ch.dir + '/index.html';
      } else {
        cont.style.display = 'none';
      }
    }

    // 章节卡：真实小节数 / 题量 / 卡片 / 课件页数
    var grid = $('#chapter-grid');
    if (grid) {
      grid.innerHTML = list.map(function (c) {
        var pct = pctOf(c.id);
        var best = quizBest(c.id);
        var topics = (c.topics || []).slice(0, 5).map(function (t) {
          return '<span class="chip">' + esc(t) + '</span>';
        }).join('');
        var st = c.stats || {};
        var metaBits = statText(st);
        var multi = (c.pages && c.pages.length > 1)
          ? '<span class="chip chip--accent tiny">' + c.pages.length + ' 个页面</span>' : '';
        var videoChip = st.videos
          ? '<span class="chip chip--accent tiny">' + icon('i-play') + st.videos + ' 个视频</span>' : '';
        return '<a class="chapter-card" href="' + c.dir + '/index.html" style="--card-accent:' + esc(c.accent) + '">' +
          '<div class="chapter-card__top">' +
            '<span class="chapter-card__icon">' + icon(c.icon || 'i-book') + '</span>' +
            '<div><span class="chapter-card__no">' + esc(c.no) + '</span>' +
            '<h3 class="chapter-card__title">' + esc(c.title) + '</h3></div>' +
          '</div>' +
          '<p class="chapter-card__desc">' + esc(c.subtitle || '') + '</p>' +
          (metaBits ? '<p class="chapter-card__stats tiny muted">' + esc(metaBits) + multi + '</p>' : '') +
          '<div class="chapter-card__topics">' + topics + videoChip + '</div>' +
          '<div class="chapter-card__foot">' +
            '<span>' + icon('i-clock') + ' ' + (c.minutes || '—') + ' 分钟</span>' +
            (best != null ? '<span class="chip chip--ok tiny">自测 ' + best + '%</span>' : '') +
            '<span class="chapter-card__progress">' + ringSVG(pct, c.accent) +
              '<span class="tiny">' + (pct >= 95 ? '已读完' : pct > 0 ? pct + '%' : '未开始') + '</span></span>' +
          '</div>' +
        '</a>';
      }).join('');
    }
  }

  /* ------------------------------------------------------------------ *
   * 17. 键盘快捷键
   * ------------------------------------------------------------------ */
  function initShortcuts() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

      // Esc 关闭浮层
      if (e.key === 'Escape') {
        if ($('#video-modal') && $('#video-modal').classList.contains('is-open')) { closeVideo(); return; }
        if ($('#lightbox') && $('#lightbox').classList.contains('is-open')) { closeLightbox(); return; }
        if ($('#search-dialog') && $('#search-dialog').classList.contains('is-open')) { closeSearch(); return; }
        closeSidebar();
        return;
      }
      if (typing) return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k' || e.key === 'K') { e.preventDefault(); openSearch(); }
        return;
      }
      if (e.key === '/') { e.preventDefault(); openSearch(); return; }
      if (e.key === 'd' || e.key === 'D') { toggleTheme(); return; }
      if (e.key === '?') { toast('快捷键：/ 搜索 · D 深色 · [ ] 上下章 · Esc 关闭', 3600); return; }
      if (e.key === '[' || e.key === ']') {
        var list = SITE.chapters || [];
        if (ctx.index < 0) return;
        var t = e.key === '[' ? ctx.index - 1 : ctx.index + 1;
        if (list[t]) window.location.href = siteUrl(list[t].dir + '/index.html');
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && $('#lightbox') && $('#lightbox').classList.contains('is-open')) {
        lbGo(e.key === 'ArrowRight' ? 1 : -1);
        e.preventDefault();
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 18. 启动
   * ------------------------------------------------------------------ */
  function boot() {
    injectSprite();
    resolveContext();
    ensureScrim();
    renderTopbar();
    renderSidebar();
    renderFooter();
    renderPager();
    initToTop();

    if (ctx.page === 'home') {
      renderHome();
      initMixedQuiz();
    } else {
      initProgress();
      initQuiz();
      initFlashcards();
      initSlides();
      renderVideoSection();
      cacheOwnText();
    }    initCodeBlocks();
    initSearch();
    initShortcuts();

    // 首屏后重建索引（正文已渲染）
    if (ctx.chapterId) LS.set(NS + 'last', { id: ctx.chapterId, at: Date.now() });

    document.documentElement.classList.add('is-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* 暴露少量工具给章节作者（可选使用，非必需） */
  window.SDA = {
    toast: toast,
    icon: icon,
    theme: { get: currentTheme, set: setTheme, toggle: toggleTheme },
    search: openSearch,
    version: '1.0.0'
  };
})();
