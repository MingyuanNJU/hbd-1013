// ============================================================
//  这是整个网站唯一需要你改的文件。
//  带 TODO 的地方是草稿或占位，换成你自己的话就好。
//  改完保存、刷新页面即可看到效果。
// ============================================================

window.CONTENT = {
  // 网站上怎么称呼她 —— TODO
  name: 'WWS',

  // 信末的署名 —— TODO
  from: '明远',

  // 0 · 检票口：她要输入暗号才能上车
  gate: {
    title: '生日列车 · 检票口',
    question: '请出示车票：输入只有你知道的暗号',
    hint: '提示：今天是几月几号？（4 位数字）', // TODO 换成你的提示
    // TODO 暗号，可以写多个；大小写、空格不敏感。写成 [] 就不设检票口。
    answers: ['1013'],
  },

  // 1 · 许愿站
  wish: {
    candles: 5, // TODO 蜡烛数（建议 3–9 根，太多会挤）
    prompt: '先许个愿，再把蜡烛吹灭吧',
    title: '生日快乐，{name}！',
    sub: '今天是属于你的日子。列车马上出发，带你回看我们一起走过的地方。',
  },

  // 2 · 甜蜜点滴：时间线（按顺序显示）
  // img 是 assets/photos/ 里的文件；place / date / text 都可以改
  timeline: [
    { img: 'assets/photos/01.jpg', place: '中部国际机场', date: 'TODO 日期',
      text: '出发啦。走在长长的连廊里，我就在想：和你去哪儿都算旅行。' },
    { img: 'assets/photos/02.jpg', place: '名古屋站', date: 'TODO 日期',
      text: '等车也要嘟嘴卖萌的人，是我的女朋友。' },
    { img: 'assets/photos/03.jpg', place: '新干线上', date: 'TODO 日期',
      text: '你在看窗外的风景，我在看车窗里的你。' },
    { img: 'assets/photos/04.jpg', place: '电车上', date: 'TODO 日期',
      text: '小懒猫又睡着了。我负责记站名，你负责好好睡觉。' },
    { img: 'assets/photos/05.jpg', place: 'TODO 店名', date: 'TODO 日期',
      text: '吃饭最认真的人，连最后一口汤都不放过。' },
    { img: 'assets/photos/06.jpg', place: '东京 · 雨夜', date: 'TODO 日期',
      text: '雨下得再大，透明伞下面也是一整个晴天。' },
    { img: 'assets/photos/07.jpg', place: '涩谷', date: 'TODO 日期',
      text: '整座城市的霓虹都亮着，我还是只看得见你。' },
    { img: 'assets/photos/08.jpg', place: '回程的电车', date: 'TODO 日期',
      text: '我的肩膀，永远是你的专属枕头。' },
  ],

  // 3 · 回忆翻牌：选 6 张照片，组成 12 张牌
  memory: {
    photos: [
      'assets/photos/02.jpg', 'assets/photos/03.jpg', 'assets/photos/05.jpg',
      'assets/photos/06.jpg', 'assets/photos/07.jpg', 'assets/photos/08.jpg',
    ],
    intro: '翻开两张一样的照片就算配对成功。看看你记不记得我们去过的地方～',
    done: '全部配对成功！就像我们俩一样，天生一对。',
  },

  // 4 · 抓小懒猫（打地鼠）
  whack: {
    seconds: 30,
    mole: 'assets/img/mole.jpg',
    intro: '洞里会冒出一只叫「明远」的小懒猫，平时惹你生气的账，今天一次算清！偶尔会冒出蛋糕，打中加 3 分。',
    hitLines: ['哎哟！', '知道错了！', '轻点轻点～', '再也不敢了', '我错了宝贝', '好痛但值得'],
    // 按分数给评语（从高到低匹配 min）—— TODO 奖励可以换成你真的会兑现的
    results: [
      { min: 30, text: '打地鼠冠军！奖励：接下来一周的碗都我洗。' },
      { min: 15, text: '打得好！今天你说什么都对。' },
      { min: 0,  text: '手下留情了呀，看来还是舍不得打我～' },
    ],
  },

  // 5 · 照片墙
  wall: {
    title: '我们的照片墙',
    intro: '这里会一直留着。你也可以把喜欢的照片贴上来，配一句话，我这边也能看到。',
  },

  // 6 · 终点站：给她的信 —— TODO 强烈建议换成你自己的话
  letter: `亲爱的{name}：

生日快乐！

这一年里，我们一起赶过新干线，一起在电车上打过盹，一起在雨夜的街头撑过一把透明伞，也一起站在高处看过涩谷的灯海。翻照片的时候我才发现，最好看的风景里总有你。

谢谢你愿意陪我去那么多地方，也谢谢你在我累的时候借我一个肩膀，或者干脆把你的脑袋靠在我的肩上。

新的一岁，希望你每天都开开心心，想吃的都能吃到，想去的地方我们一起去。

往后的每一站，我都想和你一起坐。`,

  // 照片墙的云端存储（Supabase）。留空则照片只存在打开网页的这台设备上。
  // 按「使用说明.md」配置好后，把 Project URL 和 anon / publishable key 填在这里。
  supabase: {
    url: '',      // 例如 'https://abcdefgh.supabase.co'
    anonKey: '',  // 例如 'eyJhbGciOi...' 或 'sb_publishable_...'
    bucket: 'wall',
    table: 'wall_photos',
  },
};
