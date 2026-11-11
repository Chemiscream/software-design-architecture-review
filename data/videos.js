/* ==========================================================================
   data/videos.js —— 视频讲解清单（片源在 videos/，封面在 videos/posters/）
   --------------------------------------------------------------------------
   · 32 条讲解视频，按章节/分册分组：ch1 5、ch4 创建型 5、结构型 7、行为型 9、ch5 6
   · file / poster 都是「相对站点根」的路径，渲染时由 site.js 的 siteUrl() 解析，
     所以 file:// 与局域网 http 两种打开方式都能用
   · duration 单位为秒（ffprobe 实测）；alt 是页面惯用译名（如「建造者模式」）
   ========================================================================== */

window.SDA_VIDEOS = [
  { slug: "dip", title: "DIP 依赖倒置原则", chapter: "ch1", file: "videos/dip.mp4", poster: "videos/posters/dip.jpg", duration: 160.0 },
  { slug: "isp", title: "ISP 接口隔离原则", chapter: "ch1", file: "videos/isp.mp4", poster: "videos/posters/isp.jpg", duration: 176.7 },
  { slug: "lsp", title: "LSP 里氏替换原则", chapter: "ch1", file: "videos/lsp.mp4", poster: "videos/posters/lsp.jpg", duration: 176.7 },
  { slug: "ocp", title: "OCP 开闭原则", chapter: "ch1", file: "videos/ocp.mp4", poster: "videos/posters/ocp.jpg", duration: 170.2 },
  { slug: "srp", title: "SRP 单一职责原则", chapter: "ch1", file: "videos/srp.mp4", poster: "videos/posters/srp.jpg", duration: 172.7 },
  { slug: "abstract-factory", title: "抽象工厂模式", chapter: "ch4-creation", file: "videos/abstract-factory.mp4", poster: "videos/posters/abstract-factory.jpg", duration: 162.6 },
  { slug: "builder", title: "生成器模式（Builder）", chapter: "ch4-creation", file: "videos/builder.mp4", poster: "videos/posters/builder.jpg", duration: 163.2, alt: "建造者模式" },
  { slug: "factory-method", title: "工厂方法模式", chapter: "ch4-creation", file: "videos/factory-method.mp4", poster: "videos/posters/factory-method.jpg", duration: 168.7 },
  { slug: "simple-factory", title: "简单工厂模式", chapter: "ch4-creation", file: "videos/simple-factory.mp4", poster: "videos/posters/simple-factory.jpg", duration: 172.8 },
  { slug: "singleton", title: "单件模式（Singleton）", chapter: "ch4-creation", file: "videos/singleton.mp4", poster: "videos/posters/singleton.jpg", duration: 156.8, alt: "单例模式" },
  { slug: "adapter", title: "适配器模式", chapter: "ch4-structural", file: "videos/adapter.mp4", poster: "videos/posters/adapter.jpg", duration: 159.5 },
  { slug: "bridge", title: "桥梁模式（Bridge）", chapter: "ch4-structural", file: "videos/bridge.mp4", poster: "videos/posters/bridge.jpg", duration: 231.1, alt: "桥接模式" },
  { slug: "composite", title: "组合模式", chapter: "ch4-structural", file: "videos/composite.mp4", poster: "videos/posters/composite.jpg", duration: 173.8 },
  { slug: "decorator", title: "装饰模式（Decorator）", chapter: "ch4-structural", file: "videos/decorator.mp4", poster: "videos/posters/decorator.jpg", duration: 173.2, alt: "装饰器模式" },
  { slug: "facade", title: "外观模式", chapter: "ch4-structural", file: "videos/facade.mp4", poster: "videos/posters/facade.jpg", duration: 164.9 },
  { slug: "flyweight", title: "享元模式", chapter: "ch4-structural", file: "videos/flyweight.mp4", poster: "videos/posters/flyweight.jpg", duration: 176.1 },
  { slug: "proxy", title: "代理模式", chapter: "ch4-structural", file: "videos/proxy.mp4", poster: "videos/posters/proxy.jpg", duration: 168.9 },
  { slug: "chain", title: "责任链模式", chapter: "ch4-behavioral", file: "videos/chain.mp4", poster: "videos/posters/chain.jpg", duration: 163.4 },
  { slug: "command", title: "命令模式", chapter: "ch4-behavioral", file: "videos/command.mp4", poster: "videos/posters/command.jpg", duration: 170.0 },
  { slug: "iterator", title: "迭代器模式", chapter: "ch4-behavioral", file: "videos/iterator.mp4", poster: "videos/posters/iterator.jpg", duration: 163.5 },
  { slug: "mediator", title: "中介者模式", chapter: "ch4-behavioral", file: "videos/mediator.mp4", poster: "videos/posters/mediator.jpg", duration: 179.0 },
  { slug: "observer", title: "观察者模式", chapter: "ch4-behavioral", file: "videos/observer.mp4", poster: "videos/posters/observer.jpg", duration: 165.7 },
  { slug: "state", title: "状态模式", chapter: "ch4-behavioral", file: "videos/state.mp4", poster: "videos/posters/state.jpg", duration: 179.8 },
  { slug: "strategy", title: "策略模式", chapter: "ch4-behavioral", file: "videos/strategy.mp4", poster: "videos/posters/strategy.jpg", duration: 183.1 },
  { slug: "template-method", title: "模板方法模式", chapter: "ch4-behavioral", file: "videos/template-method.mp4", poster: "videos/posters/template-method.jpg", duration: 174.9 },
  { slug: "visitor", title: "访问者模式", chapter: "ch4-behavioral", file: "videos/visitor.mp4", poster: "videos/posters/visitor.jpg", duration: 177.3 },
  { slug: "broker", title: "Broker 架构", chapter: "ch5", file: "videos/broker.mp4", poster: "videos/posters/broker.jpg", duration: 180.4 },
  { slug: "layers", title: "分层架构", chapter: "ch5", file: "videos/layers.mp4", poster: "videos/posters/layers.jpg", duration: 174.6 },
  { slug: "mvc", title: "MVC 架构", chapter: "ch5", file: "videos/mvc.mp4", poster: "videos/posters/mvc.jpg", duration: 178.5 },
  { slug: "pipes-filters", title: "管道-过滤器架构", chapter: "ch5", file: "videos/pipes-filters.mp4", poster: "videos/posters/pipes-filters.jpg", duration: 163.1 },
  { slug: "plugins", title: "插件架构", chapter: "ch5", file: "videos/plugins.mp4", poster: "videos/posters/plugins.jpg", duration: 168.4 },
  { slug: "soa", title: "SOA 架构", chapter: "ch5", file: "videos/soa.mp4", poster: "videos/posters/soa.jpg", duration: 169.6 }
];

/* 便捷查询：按页面上下文取视频
     上下文 key = data-chapter（ch1 / ch5）或 data-chapter + "-" + data-subpage（ch4 的三个分册） */
window.SDA_VIDEOS_BY = function (key) {
  return (window.SDA_VIDEOS || []).filter(function (v) { return v.chapter === key; });
};
