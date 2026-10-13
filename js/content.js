// ============================================================
//  网站上所有的文字都在这个文件里。改完保存、刷新页面即可。
//  - {name} 会自动换成她的称呼；其它 {xxx} 是程序填的数字，保留即可
//  - 以 TODO 开头的文字不会显示（防止忘改时露馅）
//  - 「文案清单.md」里有带编号的完整列表，可以照着编号改
// ============================================================

window.CONTENT = {
  name: 'WWS',      // 网站上怎么称呼她
  from: '明远',     // 信末署名

  // ---------- 线路图：每一站的站名（默认用江之电从藤沢开往鎌倉的真实站名） ----------
  stations: {
    gate:     { name: '藤沢',       roman: 'FUJISAWA' },
    wish:     { name: '江ノ島',     roman: 'ENOSHIMA' },
    timeline: { name: '腰越',       roman: 'KOSHIGOE' },
    runner:   { name: '鎌倉高校前', roman: 'KAMAKURA-KOKOMAE' },
    whack:    { name: '七里ヶ浜',   roman: 'SHICHIRIGAHAMA' },
    wall:     { name: '稲村ヶ崎',   roman: 'INAMURAGASAKI' },
    letter:   { name: '鎌倉',       roman: 'KAMAKURA' },
  },

  // ---------- 通用 ----------
  common: {
    pageTitle: '生日快乐，{name}',
    next: '开往下一站 →',
    nextToEnd: '开往终点站 →',
    trainSign: '生日快乐号',        // 换站时报站 LED 第一行（左）
    trainDest: '開往 永遠',         // 报站 LED 第一行（右）
    nextIs: '次は',                 // 报站 LED：次は 江ノ島（下一站）
  },

  // ---------- 0 · 检票口（踏切） ----------
  gate: {
    brand: 'SHONAN BIRTHDAY EXPRESS',
    ticketNo: 'No. 1013',
    title: '生日列车 · 检票口',
    routeFrom: '今天',
    routeTo: '永远',
    question: '请出示车票：输入只有你知道的暗号',
    placeholder: '暗号',
    button: '检票上车',
    hint: '提示：今天是几月几号？（4 位数字）',
    wrong: '车票好像不太对，再试一次？',
    wrongAgain: '再想想～ 提示就在上面哦',
    answers: ['1013'],              // 暗号，可写多个；大小写、空格、横杠不敏感。写成 [] 则不设检票口
  },

  // ---------- 1 · 许愿 ----------
  wish: {
    kicker: '第一站 · 许愿',
    candles: 5,                     // 蜡烛数（建议 3–9）
    prompt: '先许个愿，再把蜡烛吹灭吧',
    micButton: '对着麦克风吹',
    micListening: '正在听…用力吹！',
    micTip: '也可以直接点蜡烛把它吹灭',
    micUnsupported: '这个浏览器用不了麦克风，直接点蜡烛就好～',
    micDenied: '没拿到麦克风权限，直接点蜡烛把它吹灭吧～',
    afterPrompt: '愿望一定会实现的！',
    title: '生日快乐，王哇塞！！！',
    sub: '今天是哇塞姐姐的破壳日！电车马上沿着海岸线开动，带你回看我们一起走过的地方～',
  },

  // ---------- 2 · 甜蜜点滴（时间线，也是小猫闯关里要收集的回忆） ----------
  timeline: {
    kicker: '第二站 · 甜蜜点滴',
    title: '我们一起走过的地方',
    items: [
      { img: 'assets/photos/01.jpg', place: '中部国际机场', date: 'TODO 日期',
        text: '出发啦。走在长长的连廊里，我就在想：和你去哪儿都算旅行。' },
      { img: 'assets/photos/02.jpg', place: '名古屋站', date: 'TODO 日期',
        text: '等车也要嘟嘴卖萌的人。' },
      { img: 'assets/photos/03.jpg', place: '新干线上', date: 'TODO 日期',
        text: '你在看窗外的风景，我在看车窗里的你。' },
      { img: 'assets/photos/04.jpg', place: '电车上', date: 'TODO 日期',
        text: '小懒猪又睡着了。我负责记站名，你负责好好睡觉。' },
      { img: 'assets/photos/05.jpg', place: 'TODO 店名', date: 'TODO 日期',
        text: '就我们两个人的寿喜烧之旅！虽然知道你更喜欢那天的麻辣锅嘻嘻。' },
      { img: 'assets/photos/06.jpg', place: '东京 · 雨夜', date: 'TODO 日期',
        text: '雨下得再大，透明伞下面也是一整个晴天。' },
      { img: 'assets/photos/07.jpg', place: '涩谷', date: 'TODO 日期',
        text: '整座城市的霓虹都亮着，我还是只看得见你。' },
      { img: 'assets/photos/08.jpg', place: '回程的电车', date: 'TODO 日期',
        text: '我的肩膀，永远是你的专属枕头。' },
    ],
  },

  // ---------- 3 · 小猫闯关（横版跑酷） ----------
  runner: {
    kicker: '第三站 · 小猫闯关',
    title: '小猫赶电车',
    intro: '帮小猫沿着海边一路跑到车站！路上散落着我们的回忆照片和小鱼干，小心螃蟹、海鸥和海沟～',
    controls: '点一下画面（或按空格）跳跃，空中再点一下二段跳。踩螃蟹有奖励！',
    start: '出发！',
    fishLabel: '小鱼干',
    photoLabel: '回忆',
    photoFound: '找到回忆：{place}',
    ouch: '哎呀！',
    stomp: '踩到啦 +2',
    gullWarn: '海鸥来了！别跳！',
    goalSign: '终点',
    doneTitle: '赶上电车啦！',
    doneStats: '找到 {photos} / {total} 段回忆，吃到 {fish} 条小鱼干',
    again: '再跑一次',
    // 按得分给评语（得分 = 小鱼干 + 回忆 × 5），从高到低匹配
    results: [
      { min: 80, text: '满分小猫！今天的你无所不能。' },
      { min: 45, text: '跑得真棒，小猫吃得饱饱的～' },
      { min: 0,  text: '小猫平安赶上电车，最重要的是你开心！' },
    ],
  },

  // ---------- 4 · 打小猪 ----------
  whack: {
    kicker: '第四站 · 打小猪',
    title: '今天你说了算',
    intro: '沙滩上会冒出一只只小猪，平时惹你生气的账，今天一次算清！偶尔会冒出蛋糕，打中加 3 分。',
    start: '开始！',
    scoreLabel: '得分',
    timeLabel: '剩余',
    secondsUnit: '秒',
    seconds: 30,
    moleImage: '',                  // 留空 = 你的像素头像 + 猪鼻子猪耳朵；也可以填别的图片路径
    cakeText: '蛋糕 +3',
    hitLines: ['哼哼！', '猪猪知错了', '轻点轻点～', '再也不敢了', '哼唧！', '好痛但值得'],
    finalLabel: '得分',
    again: '再打一局',
    // 按分数给评语，从高到低匹配
    results: [
      { min: 30, text: '打猪冠军！奖励：接下来一周的碗都我洗。' },
      { min: 15, text: '打得好！今天你说什么都对。' },
      { min: 0,  text: '手下留情了呀，看来还是舍不得打我～' },
    ],
  },

  // ---------- 5 · 照片墙 ----------
  wall: {
    kicker: '第五站 · 照片墙',
    title: '我们的照片墙',
    intro: '这里会一直留着。你也可以把喜欢的照片贴上来，配一句话，我这边也能看到。',
    addButton: '贴一张照片',
    modalTitle: '贴到照片墙',
    captionLabel: '写一句话（可选）',
    captionPlaceholder: '比如：这张是我最喜欢的',
    cancel: '取消',
    ok: '贴上去',
    loading: '正在加载照片…',
    uploading: '正在贴第 {i} / {n} 张…',
    done: '贴好啦！',
    badFormat: '{n} 张照片格式打不开，换一张试试？',
    localOnly: '照片暂存在这台设备上',
    cloudDown: '暂时连不上云端，新照片会先存在这台设备上，之后自动同步',
    localTag: '仅本机',
  },

  // ---------- 6 · 终点站：信 ----------
  letter: {
    kicker: '终点站',
    title: '写给你的信',
    skipTip: '（点一下信纸可以直接看完）',
    toWall: '去照片墙',
    again: '再坐一次',
    dateLine: '{year} 年 10 月 13 日',
    body: `亲爱的王哇塞女士：


生日快乐！

好难忘的东京之行！虽然嘴上不愿意承认，但是有你陪我一起探索我还是好开心好开心！我们一起江之岛看海，等来灿烂的日落和富士山剪影；赶过新干线，一起在电车上打过盹，一起在雨夜的街头撑过一把透明伞，也一起站在高处看过涩谷的灯海。翻照片的时候我才发现，最好看的风景里总有你。

谢谢你愿意陪我去那么多地方，也谢谢你在我累的时候借我一个肩膀，或者干脆把你的脑袋靠在我的肩上。

知道你现在面临很多压力，一如我之前曾经面对的那样，但是要相信，总有拨云见日时，两颗互相理解的心，能够让幸福传递很远，远到跨过万水千山，远到克服所有困难。

新的一岁，希望你每天都开开心心，想吃的都能吃到，想去的地方我们一起去。

往后的每一站，我都想和你一起坐。`,
  },

  // ---------- 声音 ----------
  // 把音频文件放进 assets/audio/ 文件夹，再把路径填在这里；留空就用网页自己合成的声音。
  audio: {
    bgm: '',              // 背景音乐（循环播放），例如 'assets/audio/bgm.mp3'
    bgmVolume: 0.35,      // 背景音乐音量 0–1
    train: '',            // 电车驶过的录音，例如 'assets/audio/train.mp3'（会自动对准最响的那一段）
    trainVolume: 0.9,
    crossing: '',         // 踏切「当当」声的录音；留空就用合成的铃声
    crossingVolume: 0.7,
  },

  // ---------- 照片墙云端存储（Supabase），见「使用说明.md」 ----------
  supabase: {
    url: 'https://frqtenijfnjnqwkegddx.supabase.co',
    anonKey: 'sb_publishable_QgcnakHXGHSppfjhK0Uk4A_jyxBPLP5',
    bucket: 'wall',
    table: 'wall_photos',
  },
};
