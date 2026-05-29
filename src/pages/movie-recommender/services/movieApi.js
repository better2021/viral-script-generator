/**
 * 电影数据服务
 * 支持 TMDB API（实时数据）和内置片库（离线 fallback）两种模式
 */

import {
  searchMoviesTMDB,
  discoverMoviesTMDB,
  getMovieDetailTMDB,
  getGenreListTMDB,
  getCachedGenres,
  mapSearchResult,
  mapDetailResult,
} from './tmdbApi.js'

const TMDB_LS_KEY = 'viral_tmdb_api_key'

export function getStoredTmdbApiKey() {
  try { return localStorage.getItem(TMDB_LS_KEY) || '' }
  catch { return '' }
}

export function saveTmdbApiKey(key) {
  try { localStorage.setItem(TMDB_LS_KEY, key) }
  catch { /* 忽略 */ }
}

export function clearTmdbApiKey() {
  try { localStorage.removeItem(TMDB_LS_KEY) }
  catch { /* 忽略 */ }
}

const MOVIES = [
  { id: 1, title: '让子弹飞', year: 2010, rating: 9.0, genres: ['剧情', '喜剧', '动作'], summary: '北洋年间，南部中国。悍匪张牧之劫持了马邦德的车队，冒充县长去鹅城上任，与恶霸黄四郎展开一场智斗。', director: '姜文', cast: '姜文 / 周润发 / 葛优 / 刘嘉玲' },
  { id: 2, title: '霸王别姬', year: 1993, rating: 9.6, genres: ['剧情', '爱情', '历史'], summary: '段小楼与程蝶衣从小在戏班学艺，历经半个世纪的悲欢离合。程蝶衣对段小楼的感情超越友情，在时代的洪流中走向悲剧。', director: '陈凯歌', cast: '张国荣 / 张丰毅 / 巩俐 / 葛优' },
  { id: 3, title: '无间道', year: 2002, rating: 9.3, genres: ['剧情', '犯罪', '悬疑'], summary: '警匪双方各自安排卧底潜入对方组织，两个身份错位的男人在无间地狱中挣扎求存。', director: '刘伟强 / 麦兆辉', cast: '刘德华 / 梁朝伟 / 黄秋生 / 曾志伟' },
  { id: 4, title: '功夫', year: 2004, rating: 8.9, genres: ['喜剧', '动作', '奇幻'], summary: '街头混混阿星误闯猪笼城寨，卷入一场江湖恩怨。在生死关头领悟了功夫的真谛，从一个混混蜕变为真正的武者。', director: '周星驰', cast: '周星驰 / 元华 / 元秋 / 黄圣依' },
  { id: 5, title: '大话西游之大圣娶亲', year: 1995, rating: 9.2, genres: ['喜剧', '爱情', '奇幻'], summary: '至尊宝穿越时空回到五百年前，遇见了给他三颗痣的紫霞仙子。在月光宝盒的光芒中，他领悟了爱与责任的真谛。', director: '刘镇伟', cast: '周星驰 / 朱茵 / 莫文蔚 / 吴孟达' },
  { id: 6, title: '活着', year: 1994, rating: 9.3, genres: ['剧情', '历史'], summary: '富家少爷福贵嗜赌成性，输光家产后开始了坎坷的一生。在时代的巨变中，他经历了亲人相继离世的悲痛，却依然坚韧地活着。', director: '张艺谋', cast: '葛优 / 巩俐 / 郭涛' },
  { id: 7, title: '我不是药神', year: 2018, rating: 9.0, genres: ['剧情', '喜剧'], summary: '中年保健品贩子程勇为了赚钱，从印度代购廉价白血病仿制药。在利益与道德的拉扯中，他逐渐走上了一条救赎之路。', director: '文牧野', cast: '徐峥 / 王传君 / 周一围 / 谭卓' },
  { id: 8, title: '流浪地球', year: 2019, rating: 8.6, genres: ['科幻', '灾难', '冒险'], summary: '太阳即将毁灭，人类在地球表面建造巨型推进器，开启长达2500年的流浪之旅。在穿越木星的过程中，一场危机悄然降临。', director: '郭帆', cast: '吴京 / 屈楚萧 / 赵今麦 / 李光洁' },
  { id: 9, title: '哪吒之魔童降世', year: 2019, rating: 8.4, genres: ['动画', '奇幻', '喜剧'], summary: '天地灵气孕育出混元珠，被元始天尊一分为二。魔丸转世为哪吒，在偏见中成长，最终逆天改命，我命由我不由天。', director: '饺子', cast: '吕艳婷 / 囧森瑟夫 / 陈浩' },
  { id: 10, title: '你好，李焕英', year: 2021, rating: 8.1, genres: ['喜剧', '剧情', '奇幻'], summary: '贾晓玲穿越回1981年，遇到了年轻时的母亲李焕英。她想让母亲过上更好的生活，却发现了母亲藏在心底的秘密。', director: '贾玲', cast: '贾玲 / 张小斐 / 沈腾 / 陈赫' },
  { id: 11, title: '肖申克的救赎', year: 1994, rating: 9.7, genres: ['剧情', '犯罪'], summary: '银行家安迪被冤枉谋杀妻子，关进肖申克监狱。在漫长的牢狱生涯中，他用智慧和毅力完成了史上最伟大的越狱。', director: '弗兰克·德拉邦特', cast: '蒂姆·罗宾斯 / 摩根·弗里曼' },
  { id: 12, title: '蝙蝠侠：黑暗骑士', year: 2008, rating: 9.2, genres: ['动作', '犯罪', '剧情'], summary: '蝙蝠侠、检察官哈维·丹特和警长戈登联手打击哥谭市的有组织犯罪，却遇到了恐怖的对手——小丑。', director: '克里斯托弗·诺兰', cast: '克里斯蒂安·贝尔 / 希斯·莱杰 / 艾伦·艾克哈特' },
  { id: 13, title: '盗梦空间', year: 2010, rating: 9.3, genres: ['科幻', '悬疑', '动作'], summary: '专业的窃梦者柯布被委托完成一项不可能的任务——在目标人物的潜意识中植入一个想法。多层梦境交错，现实与梦境的边界逐渐模糊。', director: '克里斯托弗·诺兰', cast: '莱昂纳多·迪卡普里奥 / 渡边谦 / 约瑟夫·高登-莱维特' },
  { id: 14, title: '星际穿越', year: 2014, rating: 9.4, genres: ['科幻', '冒险', '剧情'], summary: '前NASA宇航员库珀被选中参与一项穿越虫洞的星际旅行，为人类寻找新的家园。在浩瀚的宇宙中，时间与爱的力量超越了维度。', director: '克里斯托弗·诺兰', cast: '马修·麦康纳 / 安妮·海瑟薇 / 杰西卡·查斯坦' },
  { id: 15, title: '黑客帝国', year: 1999, rating: 9.1, genres: ['科幻', '动作'], summary: '程序员尼奥发现看似正常的现实世界其实是一个由人工智能创造的虚拟程序。他选择了红色药丸，踏上了反抗机器统治的旅程。', director: '沃卓斯基姐妹', cast: '基努·里维斯 / 劳伦斯·菲什伯恩 / 凯瑞-安·莫斯' },
  { id: 16, title: '搏击俱乐部', year: 1999, rating: 9.0, genres: ['剧情', '悬疑', '犯罪'], summary: '一个不满自己生活的白领遇到了肥皂商人泰勒·德顿，两人创立了一个秘密的地下搏击俱乐部。随着俱乐部的发展，事态走向了失控。', director: '大卫·芬奇', cast: '布拉德·皮特 / 爱德华·诺顿 / 海伦娜·伯翰·卡特' },
  { id: 17, title: '低俗小说', year: 1994, rating: 8.9, genres: ['剧情', '犯罪'], summary: '几个看似无关的故事在洛杉矶的犯罪地下世界中交错展开。杀手、拳击手、黑帮老大和他们的女人，每个人的命运都交织在一起。', director: '昆汀·塔伦蒂诺', cast: '约翰·特拉沃尔塔 / 乌玛·瑟曼 / 塞缪尔·杰克逊' },
  { id: 18, title: '阿甘正传', year: 1994, rating: 9.5, genres: ['剧情', '爱情'], summary: '智商只有75的阿甘，凭借着一股傻劲和永不放弃的精神，参与并见证了几十年来美国历史中的重大事件。', director: '罗伯特·泽米吉斯', cast: '汤姆·汉克斯 / 罗宾·怀特 / 加里·西尼斯' },
  { id: 19, title: '寄生虫', year: 2019, rating: 8.8, genres: ['剧情', '悬疑', '喜剧'], summary: '金家四口全是无业游民，长子通过伪造学历进入富豪朴社长家担任家教。两个家庭的命运开始纠缠，最终走向了不可收拾的结局。', director: '奉俊昊', cast: '宋康昊 / 李善均 / 赵汝贞 / 崔宇植' },
  { id: 20, title: '千与千寻', year: 2001, rating: 9.4, genres: ['动画', '奇幻', '冒险'], summary: '十岁的千寻随父母搬家途中误入了一个神灵世界。为了拯救变成猪的父母，她在汤婆婆的澡堂工作，经历了一段奇妙的成长之旅。', director: '宫崎骏', cast: '柊瑠美 / 入野自由 / 夏木真理' },
  { id: 21, title: '你的名字', year: 2016, rating: 8.4, genres: ['动画', '爱情', '奇幻'], summary: '乡下女孩三叶和东京男孩�的互换了身体，两人在时空交错中渐渐产生了羁绊。当他们试图见面时，发现背后隐藏着一个更大的秘密。', director: '新海诚', cast: '神木隆之介 / 上白石萌音' },
  { id: 22, title: '泰坦尼克号', year: 1997, rating: 9.4, genres: ['剧情', '爱情', '灾难'], summary: '1912年，泰坦尼克号首航。穷画家杰克和贵族少女罗丝在船上相遇相恋，却在冰海沉船的灾难中面临生离死别。', director: '詹姆斯·卡梅隆', cast: '莱昂纳多·迪卡普里奥 / 凯特·温丝莱特' },
  { id: 23, title: '辛德勒的名单', year: 1993, rating: 9.5, genres: ['剧情', '历史', '战争'], summary: '二战期间，德国商人奥斯卡·辛德勒目睹了纳粹对犹太人的残酷迫害，倾尽家财保护了1100多名犹太人的生命。', director: '史蒂文·斯皮尔伯格', cast: '连姆·尼森 / 本·金斯利 / 拉尔夫·费因斯' },
  { id: 24, title: '教父', year: 1972, rating: 9.3, genres: ['剧情', '犯罪'], summary: '维托·柯里昂是纽约最大的黑帮家族首领。在他的小儿子迈克尔逐渐卷入家族事务后，一场权力更替的序幕拉开。', director: '弗朗西斯·福特·科波拉', cast: '马龙·白兰度 / 阿尔·帕西诺 / 詹姆斯·凯恩' },
  { id: 25, title: '指环王：王者归来', year: 2003, rating: 9.3, genres: ['奇幻', '冒险', '动作'], summary: '弗罗多和山姆在咕噜的引导下深入魔多，试图将至尊魔戒投入末日火山。与此同时，中土世界联合军与索伦的黑暗军团展开决战。', director: '彼得·杰克逊', cast: '伊利亚·伍德 / 维果·莫滕森 / 伊恩·麦凯伦' },
  { id: 26, title: '楚门的世界', year: 1998, rating: 9.3, genres: ['剧情', '喜剧', '科幻'], summary: '楚门·伯班克从出生起就生活在一个巨大的摄影棚中，他的一生是一场全球直播的真人秀。直到他发现了这个世界的破绽。', director: '彼得·威尔', cast: '金·凯瑞 / 劳拉·琳妮 / 艾德·哈里斯' },
  { id: 27, title: '当幸福来敲门', year: 2006, rating: 9.2, genres: ['剧情', '传记'], summary: '单身父亲克里斯·加德纳带着5岁的儿子流落街头。他争取到一家证券公司的实习机会，但实习期间没有薪水。在绝望中，他从未放弃。', director: '加布里尔·穆奇诺', cast: '威尔·史密斯 / 贾登·史密斯' },
  { id: 28, title: '疯狂动物城', year: 2016, rating: 9.2, genres: ['动画', '喜剧', '冒险'], summary: '兔子朱迪成为动物城第一位兔子警官，与狐狸尼克搭档破获了一桩失踪案。在破案过程中，他们发现了一个威胁动物城的大阴谋。', director: '拜伦·霍华德 / 里奇·摩尔', cast: '金妮弗·古德温 / 杰森·贝特曼' },
  { id: 29, title: '摔跤吧！爸爸', year: 2016, rating: 9.0, genres: ['剧情', '运动', '传记'], summary: '前摔跤冠军马哈维亚发现两个女儿有摔跤天赋，决定训练她们成为摔跤手。在保守的印度乡村，这条路充满了挑战与非议。', director: '尼特什·提瓦瑞', cast: '阿米尔·汗 / 法缇玛·萨那·纱卡' },
  { id: 30, title: '绿皮书', year: 2018, rating: 8.9, genres: ['剧情', '喜剧', '传记'], summary: '1962年，意裔美国人托尼被聘为非裔钢琴家唐·谢利的司机。两人在种族隔离严重的南方巡演途中，逐渐打破了偏见与隔阂。', director: '彼得·法雷利', cast: '维果·莫滕森 / 马赫沙拉·阿里' },
  { id: 31, title: '药神', year: 2018, rating: 9.0, genres: ['剧情', '社会'], summary: '一个普通人在利益与良知的挣扎中，成为了无数白血病患者的希望。', director: '文牧野', cast: '徐峥 / 王传君 / 谭卓' },
  { id: 32, title: '釜山行', year: 2016, rating: 8.6, genres: ['动作', '恐怖', '剧情'], summary: '基金经理石宇带着女儿乘坐KTX列车前往釜山。列车爆发丧尸病毒，乘客们在封闭的空间中为了生存而殊死搏斗。', director: '延尚昊', cast: '孔刘 / 郑裕美 / 马东锡 / 金秀安' },
  { id: 33, title: '看不见的客人', year: 2016, rating: 8.8, genres: ['悬疑', '犯罪', '剧情'], summary: '成功企业家被指控谋杀情人，他聘请了一位金牌律师为自己辩护。在一次次的对峙中，真相层层反转，远超所有人的想象。', director: '奥里奥尔·保罗', cast: '马里奥·卡萨斯 / 阿娜·瓦格纳' },
  { id: 34, title: '三傻大闹宝莱坞', year: 2009, rating: 9.2, genres: ['喜剧', '剧情', '爱情'], summary: '兰彻是帝国工程学院最特立独行的学生，他的两个好友跟着他一起挑战僵化的教育体制。多年后，一场寻人之旅揭开了一个秘密。', director: '拉库马·希拉尼', cast: '阿米尔·汗 / 马德哈万 / 沙曼·乔希' },
  { id: 35, title: '飞屋环游记', year: 2009, rating: 9.1, genres: ['动画', '冒险', '剧情'], summary: '78岁的老人卡尔为了实现与亡妻的约定，用上万只气球把自己的房子升上天空，带8岁的小男孩小罗一起飞往南美洲。', director: '彼特·道格特', cast: '爱德华·阿斯纳 / 乔丹·长井' },
  { id: 36, title: '哈尔的移动城堡', year: 2004, rating: 9.1, genres: ['动画', '奇幻', '爱情'], summary: '少女苏菲被荒野女巫变成了老婆婆，她误打误撞进入了魔法师哈尔的移动城堡。在朝夕相处中，她找回了自信与青春。', director: '宫崎骏', cast: '倍赏千惠子 / 木村拓哉' },
  { id: 37, title: '唐探3', year: 2021, rating: 5.3, genres: ['喜剧', '动作', '悬疑'], summary: '唐仁和秦风受日本侦探邀请来到东京，调查一桩密室杀人案。在异国他乡，他们遇到了前所未有的挑战。', director: '陈思诚', cast: '王宝强 / 刘昊然 / 妻夫木聪' },
  { id: 38, title: '长津湖', year: 2021, rating: 7.6, genres: ['战争', '历史', '剧情'], summary: '1950年，中国人民志愿军第9兵团在长津湖地区与美军展开了惨烈的对决。在极寒的条件下，战士们用血肉之躯书写了壮烈史诗。', director: '陈凯歌 / 徐克 / 林超贤', cast: '吴京 / 易烊千玺 / 段奕宏' },
  { id: 39, title: '侏罗纪公园', year: 1993, rating: 8.2, genres: ['科幻', '冒险', '动作'], summary: '亿万富翁利用恐龙DNA在一个小岛上建起了侏罗纪公园。当恐龙们突破围栏，来参观的科学家和孩子们开始了生死逃亡。', director: '史蒂文·斯皮尔伯格', cast: '山姆·尼尔 / 劳拉·邓恩 / 杰夫·高布伦' },
  { id: 40, title: '触不可及', year: 2011, rating: 9.3, genres: ['剧情', '喜剧', '传记'], summary: '白人富翁菲利普因滑翔伞事故瘫痪，招聘了来自贫民区的黑人德里斯作为看护。两个截然不同的灵魂在碰撞中建立了深厚的友谊。', director: '奥利维耶·纳卡什 / 埃里克·托莱达诺', cast: '弗朗索瓦·克鲁塞 / 奥马尔·赛' },
]

const ALL_GENRES = [...new Set(MOVIES.flatMap(m => m.genres))].sort()

const POSTER_GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
  ['#f5576c', '#ff6f00'],
  ['#667eea', '#43e97b'],
]

export function getPosterColors(id) {
  return POSTER_GRADIENTS[id % POSTER_GRADIENTS.length]
}

/**
 * 搜索电影
 * TMDB Key 存在时优先调 TMDB API，否则使用本地数据
 * @param {object} params
 * @param {string} [params.query] 关键词搜索标题
 * @param {string} [params.genre] 按类型筛选（中文类型名）
 * @returns {Promise<Array>}
 */
export async function searchMovies({ query = '', genre = '' } = {}) {
  const tmdbKey = getStoredTmdbApiKey()

  if (tmdbKey) {
    try {
      // 确保类型缓存已加载
      let genreMap = getCachedGenres()
      if (!genreMap) {
        await getGenreListTMDB(tmdbKey)
        genreMap = getCachedGenres()
      }

      // 中文类型名 → TMDB 类型 ID
      let genreId = ''
      if (genre && genreMap) {
        const matched = Object.entries(genreMap).find(([, name]) => name === genre)
        if (matched) genreId = matched[0]
      }

      let results = []
      if (query.trim()) {
        const data = await searchMoviesTMDB({ query: query.trim() }, tmdbKey)
        results = data.results || []
      } else if (genreId) {
        const data = await discoverMoviesTMDB({ genreIds: [Number(genreId)] }, tmdbKey)
        results = data.results || []
      } else {
        const data = await discoverMoviesTMDB({}, tmdbKey)
        results = data.results || []
      }

      let mapped = results.map(m => mapSearchResult(m, genreMap))

      // 按类型名二次过滤
      if (genre) {
        mapped = mapped.filter(m => m.genres.includes(genre))
      }

      return mapped.slice(0, 20)
    } catch (e) {
      console.warn('TMDB 搜索失败，降级到本地数据:', e.message)
      // 降级到本地
    }
  }

  // === 本地数据 fallback（原有逻辑） ===
  await new Promise(r => setTimeout(r, 300 + Math.random() * 400))

  let results = [...MOVIES]

  if (query.trim()) {
    const q = query.trim().toLowerCase()
    results = results.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.director.toLowerCase().includes(q) ||
      m.cast.toLowerCase().includes(q)
    )
  }

  if (genre) {
    results = results.filter(m => m.genres.includes(genre))
  }

  return results
}

/**
 * 获取电影详情
 * TMDB Key 存在时优先调 TMDB API（含 credits）
 * 失败时尝试从搜索结果中已有信息构建基础详情
 */
export async function getMovieDetail(id) {
  const tmdbKey = getStoredTmdbApiKey()

  if (tmdbKey) {
    try {
      const detail = await getMovieDetailTMDB(id, tmdbKey)
      const genreMap = getCachedGenres()
      return mapDetailResult(detail, genreMap)
    } catch (e) {
      console.warn('TMDB 详情获取失败:', e.message)
      // TMDB 有 Key 时不走本地 fallback（ID 不匹配）
      throw e
    }
  }

  // === 本地数据 ===
  await new Promise(r => setTimeout(r, 100))
  return MOVIES.find(m => m.id === id) || null
}

export function getAllGenres() {
  return ALL_GENRES
}
