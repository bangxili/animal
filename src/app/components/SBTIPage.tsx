import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { MiniAppShell } from './MiniAppShell';
import { getPetProfileById, savePetProfile } from '../lib/petProfileDb';

// ─── 数据定义 ──────────────────────────────────────────────────────────────────

const questions = [
  { id: 1, text: '刚到一个完全陌生的新地方，TA脑子里更像在播哪句旁白？', options: ['"新地图已加载，先出去刷个脸。"', '"先逛一圈，看看今天值不值得营业。"', '"别急，我先站远点把局势看明白。"'] },
  { id: 2, text: '家里突然来了几个不常见的活物，TA通常会：', options: ['自动切到待客模式，像在说"欢迎光临"', '出来露个面，但不一定持续在线', '原地隐身，开启高位监听'] },
  { id: 3, text: '现场同时出现很多新声音、新气味、新对象时，TA更像：', options: ['信息越多越来劲，像系统突然开了高性能模式', '会被吸引，但还保留一点自我管理', '能量开始往回收，像要把自己放回安全区'] },
  { id: 4, text: '如果熟悉对象状态有点不对，TA更可能：', options: ['很快靠过去，像在问"怎么回事，我要参与"', '先观察一下，再决定要不要接这段剧情', '其实看见了，但更倾向安静待在附近'] },
  { id: 5, text: '被别人主动靠近时，TA更像在想：', options: ['"来都来了，认识一下。"', '"可以接触，但别一下太近。"', '"你先过审，我再决定给不给权限。"'] },
  { id: 6, text: '如果一整天没什么新鲜事发生，TA更可能：', options: ['自己给自己造节目，像在原地写综艺脚本', '接受现实，但会找点小乐子', '很快进入省电模式，主打一个低耗待机'] },
  { id: 7, text: '终于等到喜欢的东西，TA的快乐方式更像：', options: ['快乐当场实体化，根本藏不住', '开心归开心，但还能维持体面', '心里有烟花，脸上还是那张脸'] },
  { id: 8, text: '期待落空时，TA更像：', options: ['"那我现在就让全世界知道我不爽。"', '"有点难受，但先稳一下。"', '"我不说，但我会默默拉黑这段体验。"'] },
  { id: 9, text: '被打断、被抢先、被冒犯时，TA更像：', options: ['反应和态度都来得很快，主打即时反馈', '有情绪，但会先看局势', '表面没什么，实际已经记进小本本'] },
  { id: 10, text: '如果玩到上头，TA通常会：', options: ['越玩越疯，像根本没有收尾机制', '高兴，但还能踩住一点刹车', '差不多就收，不太会彻底失控'] },
  { id: 11, text: '熟悉流程突然被改掉，TA内心更像：', options: ['"什么？谁批准改流程的？"', '"行，给我一点时间重新加载。"', '"我先不说，但我需要缓冲很久。"'] },
  { id: 12, text: '被夸的时候，TA更像：', options: ['"继续夸，我还有下一段表演。"', '"我听到了，也会给点反应。"', '"知道了，收到，不必上热搜。"'] },
  { id: 13, text: '想要某样东西时，TA更擅长：', options: ['明着来，诉求写在全身', '给一点暗示，看你懂不懂', '不太直说，更多靠你自己感应'] },
  { id: 14, text: '真的不开心时，TA更像：', options: ['现场表达，绝不静音', '会露一点，但不至于全面开战', '把情绪收回去，自己处理'] },
  { id: 15, text: '受惊或者紧张时，TA更常见的是：', options: ['身体和情绪一起上线，根本演不了淡定', '会有反应，但还保持一点体面', '往后收，把波动先关在自己那边'] },
  { id: 16, text: '开心的时候，TA更像：', options: ['像突然被点燃，整只都在发光', '肉眼可见变好，但没那么夸张', '内心开心，外表继续维持统一包装'] },
  { id: 17, text: '被忽略的时候，TA更可能：', options: ['主动刷存在感，不接受自己沦为空气', '先试探，看你是不是故意的', '退回后台，启动自我封印'] },
  { id: 18, text: '犯错被抓包时，TA的应对策略更像：', options: ['先演，演技不够气势来凑', '会心虚，但还在计算后果', '降低存在感，力争从证据链里消失'] },
  { id: 19, text: '面对一个新玩具 / 新装置 / 新角落，TA最像哪种：', options: ['"这玩意怎么运作，我必须搞懂。"', '"先看看规则，不要失控。"', '"谁需要我陪着研究一下吗？"', '"哦。"'] },
  { id: 20, text: '如果今天完全自由活动，TA最可能把精力花在：', options: ['"我要去开新地图，看看还有什么剧情没触发。"', '"我要把节奏、边界、地盘都维持在舒服范围内。"', '"我要跟着大家转，哪里需要我就补哪一块。"', '"我要蒸发，今天谁也别找我。"'] },
  { id: 21, text: '给TA一个纸箱 / 小窝 / 新空间，TA更像：', options: ['"这东西值得拆解、改造、二次开发。"', '"从现在开始，这里归我定义规则。"', '"这个可以变成共享快乐据点。"', '"知道了，我没意见，也没行动。"'] },
  { id: 22, text: '如果TA有一句人生信条，更像哪句：', options: ['"先试，试了再说。"', '"先稳，稳了再动。"', '"先顾一下别人感受。"', '"先算了吧。"'] },
  { id: 23, text: '现场出现一点小摩擦时，TA更容易：', options: ['"先碰一下试试，会不会更刺激。"', '"先把局面拉回我能掌控的版本。"', '"别吵，我来看看能不能缓和一下。"', '"我先退，今天这戏我不接。"'] },
  { id: 24, text: '对"固定流程"这件事，TA更像：', options: ['"流程是拿来突破的，不是拿来供着的。"', '"流程能让世界少发疯一点。"', '"流程不是重点，大家顺就行。"', '"流程？我活着已经很配合了。"'] },
  { id: 25, text: '面对未知的人 / 事 / 物，TA底层逻辑更像：', options: ['"先碰一下，体验比答案重要。"', '"先判断边界，安全和秩序优先。"', '"先看别人的反应，我再决定怎么站位。"', '"不主动靠近，也不主动处理。"'] },
  { id: 26, text: '如果一整天都没人干预，TA最后最容易变成：', options: ['给自己找项目做的连续剧主角', '把地盘、路线、细节都安排明白的项目经理', '边路过边照应别人的热心 NPC', '一团稳定、安静、可有可无的背景气氛'] },
  { id: 27, text: 'Q：你觉得TA更像什么星座：', options: ['风向（动若脱兔 静若处子）', '火向（梭哈的一生）', '水向（我有点想哭）', '土向(以为淡淡的 就会顺顺的...)'] },
  { id: 28, text: 'Q：你觉得TA是什么塑：', options: ['狗塑（不管是不是小狗）', '猫塑（完全高冷咪子）', '水豚塑（我只是一坨土豆）', '兔塑（性格：cute～)'] },
  { id: 29, text: '熟悉的东西不在原位时，TA更像：', options: ['"世界本来就随机刷新，问题不大。"', '"我注意到了，但还能适应。"', '"不对，这事需要被确认一下。"'] },
  { id: 30, text: '如果要给TA拍 15 秒人格预告片，最适合哪句字幕：', options: ['"人生不静音，心情和动作都在线直播。"', '"能量有起伏，但整体还算运行稳定。"', '"很多东西都没说出口，但都被认真感受过。"'] },
];

type PetKey = 'GOOO' | 'IMAD' | 'LOVER' | 'QUEE' | 'MAMA' | 'BOOM' | 'PLAY' | 'CARE' | 'FAKE' | 'PASS' | 'BOSS' | 'DADO' | 'MSAO' | 'GOOD' | 'PHLO' | 'DEVIL' | 'JIAO' | 'MOMO' | 'CARY' | 'ZENG';

const pets: Record<PetKey, { code: string; name: string; desc: string }> = {
  GOOO: { code: 'EUOP', name: '比格大魔王', desc: '天生精力过剩，对世界充满"破坏式好奇"。行动快过思考，越被限制越想突破边界。需要大量消耗精力，否则很容易变成拆家核心。' },
  IMAD: { code: 'EUOP', name: '魔丸', desc: '情绪像火一样一点就着。开心很疯，生气也很炸，反应直接。外界刺激很容易带动它，需要稳定环境来降温。' },
  LOVER: { code: 'EUOP', name: '海王', desc: '社交欲极强，谁都想认识。适应陌生环境很快，但连接偏分散，关系扩展快、固定性弱。' },
  QUEE: { code: 'EUOC', name: '女王', desc: '主场意识强，喜欢掌控节奏，不喜欢被打乱。不是任性，而是对秩序有高要求。' },
  MAMA: { code: 'EUOA', name: '妈妈', desc: '天然照顾型，主动关注他人状态，情绪敏感、擅长安抚。温暖但也可能因过度在意别人而消耗自己。' },
  BOOM: { code: 'EUON', name: '炮仗', desc: '情绪来得快去得也快，爆发力强但不持久。随机性高，不稳定却有冲击力，是典型点火型人格。' },
  PLAY: { code: 'EDOP', name: '玩家', desc: '对世界有兴趣但不深陷，什么都能玩一下。适应力强，轻松自在，不太纠结结果。' },
  CARE: { code: 'EDOA', name: '保姆', desc: '愿意帮助别人，但更多是习惯性稳定行为。情绪投入不高，却会持续做"该做的事"。' },
  FAKE: { code: 'EDXN', name: '伪人', desc: '情绪存在感低，外界反应偏淡。会参与环境但不太外显，容易被误解为冷淡。' },
  PASS: { code: 'EDXP', name: '过路者', desc: '会接触环境但不停留，不深入、不投入。轻度探索，缺少持续动力。' },
  BOSS: { code: 'EDXC', name: '掌控者', desc: '冷静克制，有控制欲。不会情绪化表达，但会在背后调整环境，安静却有力量。' },
  DADO: { code: 'IUXP', name: '刀盾', desc: '内心敏感但不表达，外表安静、内在活跃。会偷偷探索，需要安全感才会真正打开。' },
  MSAO: { code: 'IUXC', name: '闷骚', desc: '控制欲和情绪都强，但压在内部。表面很稳，内心波动大，熟了之后反差明显。' },
  GOOD: { code: 'IUXA', name: '老好人', desc: '默默照顾别人，不太表达自己。低存在感但持续付出，不争不抢、稳稳做事。' },
  PHLO: { code: 'IUXN', name: '哲学家', desc: '更关注内在世界，对外界反应慢。喜欢观察和感受，常常先想后动。' },
  DEVIL: { code: 'IDXP', name: '捣蛋鬼', desc: '表面安静，实际很会偷偷搞事。不是高调型，但行动里总有点小坏心思。' },
  JIAO: { code: 'IDXC', name: '病娇', desc: '情绪压在内部，又带强控制欲。依赖感与占有欲并存，触发后表现会很明显。' },
  MOMO: { code: 'IDXA', name: 'NPC', desc: '顺着环境走，不主动也不抗拒。会配合，但很少表现强烈主导意愿。' },
  CARY: { code: 'IDXN', name: '摆烂者', desc: '低波动低参与，对多数事情兴趣不大。稳定但不积极，是典型佛系状态。' },
  ZENG: { code: 'IDXN', name: '佛子', desc: '比摆烂更超脱，不只是没兴趣，而是不执着。情绪平稳、环境要求极低，最松弛的一类。' },
};

const mapping: Record<string, PetKey[]> = {
  EUOP: ['GOOO', 'IMAD', 'LOVER'],
  EUOC: ['QUEE'],
  EUOA: ['MAMA'],
  EUON: ['BOOM'],
  EDOP: ['PLAY'],
  EDOC: ['BOSS'],
  EDOA: ['CARE'],
  EDXN: ['FAKE'],
  EDXP: ['PASS'],
  EDXC: ['BOSS'],
  IUXP: ['DADO'],
  IUXC: ['MSAO'],
  IUXA: ['GOOD'],
  IUXN: ['PHLO'],
  IDXP: ['DEVIL'],
  IDXC: ['JIAO'],
  IDXA: ['MOMO'],
  IDXN: ['CARY', 'ZENG'],
};

const biDimensionMap: Record<number, [string, string]> = {
  1: ['E', 'I'], 2: ['E', 'I'], 3: ['E', 'I'], 4: ['E', 'I'], 5: ['E', 'I'], 6: ['E', 'I'],
  7: ['U', 'D'], 8: ['U', 'D'], 9: ['U', 'D'], 10: ['U', 'D'], 11: ['U', 'D'], 12: ['U', 'D'], 29: ['U', 'D'],
  13: ['O', 'X'], 14: ['O', 'X'], 15: ['O', 'X'], 16: ['O', 'X'], 17: ['O', 'X'], 18: ['O', 'X'], 30: ['O', 'X'],
};

const driveQuestions = new Set([19, 20, 21, 22, 23, 24, 25, 26, 27, 28]);

const petLines: Record<PetKey, string> = {
  GOOO: '建议给家里装监控，不是怕它丢，是怕你回家认不出自己的家。拆家、刨地、乱咬、乱叫，它不是狗，是移动型自然灾害。',
  IMAD: '我命由我不由天 ！上一秒开心到起飞，下一秒气到原地爆炸。情绪从不拐弯，主打一个直来直去的精神状态美丽。',
  LOVER: '我只是想让世界都有一个家。不是花心，只是博爱型社交天花板，全世界都是它的好朋友',
  QUEE: '这个家，它说行就行，不行也行。你以为你是主人，其实你只是负责端茶倒水的贴身仆人。',
  MAMA: '你的使命还没结束！看见谁委屈都要上去哄一哄，自带治愈光环。操心命，但没办法，谁让它是整个群体的安全感来源。',
  BOOM: '一点就炸，一炸就响，炸完立马没事。脾气来得比网速快，去得比渣男还快，易燃易爆易自愈。',
  PLAY: '主打一个：开心最重要，别的都随便。玩归玩，闹归闹，谁也别想让它认真付出情绪代价。',
  BOSS: '不吵不闹，但全场都得听它的。表面安静，实则暗中控场的幕后大佬。',
  CARE: '永远在收拾烂摊子，永远在兜底。存在感不高，但没它真的不行。',
  FAKE: '表面：嗯嗯好好行行行。内心：毫无波澜，甚至有点想睡，情绪全是演的。',
  PASS: '热闹是你们的，它什么也没有。主打一个路过、看看、走了，不沾因果，不惹是非。',
  DADO: '外表：我超凶！别碰我！内心：呜呜别骂我，我害怕，又凶又怂又能吃。',
  MSAO: '表面：淡定、稳重、无所谓。内心：八百集小剧场已经演完了，安静的外表下全是戏。',
  GOOD: '谁都能欺负，谁都能使唤，主打一个脾气好到没边。心软是病，可它治不好。',
  PHLO: '每日思考猫生/狗生/兔生/鼠生的终极奥义？青铜门的背后到底是...',
  DEVIL: '不凶，但特别贱。安安静静搞点小破坏，然后一脸无辜看着你。',
  JIAO: '两只眼睛不许乱看盯着我的眼，老实交代昨天晚上为何回家晚。表面安静，内心：你敢看别的猫狗一眼，试试。',
  MOMO: '安静、乖巧、不抢戏、不闹事。像系统自带的背景板，存在即合理，不惹事也不发光。',
  CARY: '以为淡淡的就会顺顺的...天塌下来？被压着好舒服',
  ZENG: '跳跃不是罪过～情绪稳定到离谱，吵架吵不起来，生气不存在。自带看破红尘的松弛，万物皆可原谅。',
};

// ─── 计算逻辑 ─────────────────────────────────────────────────────────────────

type Scores = Record<string, number>;

function initScores(): Scores {
  return { E: 0, I: 0, U: 0, D: 0, O: 0, X: 0, P: 0, C: 0, A: 0, N: 0 };
}

function pickByRule(score: Scores) {
  const S = score.E > score.I ? 'E' : 'I';
  const M = score.U > score.D ? 'U' : 'D';
  const T = score.O > score.X ? 'O' : 'X';
  const drivePriority = ['P', 'C', 'A', 'N'];
  const A = drivePriority.reduce((best, cur) => score[cur] > score[best] ? cur : best, 'P');
  return {
    S, M, T, A,
    middle: {
      S: Math.abs(score.E - score.I) <= 2,
      M: Math.abs(score.U - score.D) <= 2,
      T: Math.abs(score.O - score.X) <= 2,
    },
    typeCode: S + M + T + A,
  };
}

function resolveCandidates(typeCode: string): PetKey[] {
  if (mapping[typeCode]?.length) return mapping[typeCode];
  const target = typeCode.split('');
  let bestScore = -1;
  let bestList: PetKey[] = [];
  for (const code of Object.keys(mapping)) {
    const cur = code.split('');
    let s = 0;
    if (cur[0] === target[0]) s += 4;
    if (cur[1] === target[1]) s += 3;
    if (cur[2] === target[2]) s += 2;
    if (cur[3] === target[3]) s += 5;
    if (s > bestScore) { bestScore = s; bestList = mapping[code]; }
  }
  return bestList;
}

function resolvePetBySubtype(typeCode: string, answers: Record<number, string>, fallback: PetKey[]): PetKey {
  if (typeCode === 'EUOP') {
    const goooScore = [19, 21, 23, 25].filter(id => answers[id] === 'A').length;
    const imadScore = [7, 8, 9, 10, 11].filter(id => answers[id] === 'A').length;
    const loverScore = [1, 2, 4, 6].filter(id => answers[id] === 'A').length;
    const ranked = [['GOOO', goooScore], ['IMAD', imadScore], ['LOVER', loverScore]] as [PetKey, number][];
    ranked.sort((a, b) => b[1] - a[1]);
    return ranked[0][1] > 0 ? ranked[0][0] : fallback[Math.floor(Math.random() * fallback.length)];
  }
  if (typeCode === 'IDXN') {
    const caryScore =
      [20, 24, 26].filter(id => answers[id] === 'D').length +
      (answers[28] === 'C' || answers[28] === 'D' ? 1 : 0);
    const zengScore = [3, 15, 18, 30].filter(id => answers[id] === 'C').length;
    return zengScore > caryScore ? 'ZENG' : 'CARY';
  }
  return fallback[Math.floor(Math.random() * fallback.length)];
}

function pairPercent(l: number, r: number): [number, number] {
  const sum = l + r;
  if (sum <= 0) return [50, 50];
  const pL = Math.round((l / sum) * 100);
  return [pL, 100 - pL];
}

function fourDrivePercents(score: Scores): [number, number, number, number] {
  const w = [score.P, score.C, score.A, score.N];
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return [25, 25, 25, 25];
  const raw = w.map(v => (v / total) * 100);
  const ints = raw.map(v => Math.floor(v));
  let rem = 100 - ints.reduce((a, b) => a + b, 0);
  const frac = raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
  for (let r = 0; r < rem; r++) ints[frac[r % 4].i]++;
  return ints as [number, number, number, number];
}

function buildBodyText(picked: ReturnType<typeof pickByRule>, petKey: PetKey): string {
  const social = picked.S === 'E'
    ? '它常常把世界当成一张待签到的地图：先靠近、再判断，存在感像聚光灯一样自然落在它身上。'
    : '它更习惯把世界先收进眼底：距离感不是冷漠，而是一种为自己留出判断空间的温柔方式。';
  const mood = picked.M === 'U'
    ? '情绪的潮汐来得快、浪也高，快乐与不满都鲜明可触；你需要学会和它一起调节节奏，而不是只压制浪头。'
    : '情绪更像深流，表面平静却耐力十足；它不一定立刻给你戏剧化反馈，但稳定本身就是它的力量。';
  const express = picked.T === 'O'
    ? '它把心事写在动作里：靠近、催促、停顿，全是句子；你读得懂时，默契会像默契的舞步。'
    : '它把许多话留在沉默里：不是无话可说，而是更相信时间与细节会把意思慢慢递到你手上。';
  const driveMap: Record<string, string> = {
    P: '它的人生关键词像是"下一片草地"：新鲜、变化、尝试，会让它的眼睛重新亮起来。',
    C: '它心里有一套看不见的动线：节奏对了就安心，节奏乱了就会用方式把局面拉回可控。',
    A: '它对关系的温度很敏感：你在，它的世界就更稳；它也在用陪伴回应你对它的意义。',
    N: '它不争不抢的样子里，有一种低消耗的哲学：舒服、不过度、刚刚好，就是它的心安之所。',
  };
  const subtypeText: Partial<Record<PetKey, string>> = {
    GOOO: '它不是单纯精力旺，而是对边界天然有一种"非要试试看"的冲动。很多麻烦并非恶意，而是它把世界当成了一个永远没关掉的互动装置。',
    IMAD: '它的魅力和麻烦都来自同一件事: 情绪启动太快。开心是烟火，委屈也是烟火，所以你会觉得它像一团鲜活的火在屋里跑。',
    LOVER: '它对连接有天然天赋，关系对它来说不是任务，而是本能。它会把每个出现的对象都当成可能发生故事的入口。',
    CARY: '它像把锋芒都收起来的旧毛毯，不抢镜、不争先，只想把自己放进最省力的角落里慢慢存在。',
    ZENG: '它身上有一种近乎抽离的松弛感，不是懒，也不是冷，而像已经提前和世界达成了"都可以"的和解。',
  };
  const tipsMap: Record<PetKey, string> = {
    GOOO: '相处灵感别试图压制它的探索欲，越堵越容易爆发拆家。多给它"可破坏"的出口：咬胶、嗅闻垫、藏食玩具，把精力合法消耗掉。',
    IMAD: '相处灵感它的情绪直来直去，相处最忌硬碰硬。提前识别它烦躁的信号，及时撤离刺激源，比事后安抚更有用。',
    LOVER: '相处灵感它的快乐来自社交，不必强行限制它"只粘你一个"。在家多安排互动游戏，让它把一部分社交需求转向你。',
    QUEE: '相处灵感和它相处核心是"尊重边界，不挑衅地位"。不强行搂抱、不突然打扰，用温柔但坚定的口令建立规则。',
    MAMA: '相处灵感它天生爱照顾、爱安抚，很容易因外界情绪紧绷。减少家庭内的争吵与大声喧哗，环境越平和，它越安心。',
    BOOM: '相处灵感它点火快、熄火也快，相处关键在"提前降温"。日常多做慢节奏嗅闻、轻抚摸等平静活动。',
    PLAY: '相处灵感它对世界好奇但不执着，相处要保持轻松感。多换玩具、多换路线，保持新鲜感，它会更愿意配合。',
    BOSS: '相处灵感它不爱吵闹，但心里很有数。指令清晰、前后一致，它会自然遵守，不用反复强调。',
    CARE: '相处灵感它习惯兜底、习惯照顾别人，容易默默压抑。相处时多关注它的状态，别把它的付出当成理所当然。',
    FAKE: '相处灵感它情绪淡、反应浅，不是冷漠，是不习惯外露。用低压力、慢节奏的方式建立信任。',
    PASS: '相处灵感它喜欢旁观、不爱卷入，相处重点是"不打扰、不强迫"。让它以自己的节奏参与生活。',
    DADO: '相处灵感它外怂内敏，相处先建立安全感再谈教育。少惊吓、少突然动作，多用温柔predictable的日常降低戒备。',
    MSAO: '相处灵感它内心戏多但不爱表现，相处要学会"读它而非逼它"。不公开调侃、不强行逗弄，保留它的体面。',
    GOOD: '相处灵感它温和退让，很容易被忽略或欺负。相处时多保护它、多肯定它，避免它在群体中长期受压。',
    PHLO: '相处灵感它慢热、爱发呆，相处别催它反应、别逼它热闹。互动以安静陪伴为主，少高强度刺激。',
    DEVIL: '相处灵感它爱小坏、爱试探，相处别过度反应，不然它会觉得"捣乱=获得关注"。',
    JIAO: '相处灵感它占有欲强、敏感黏人，相处要建立稳定的分离安全感。适度社交、规律独处练习，减少过度依赖。',
    MOMO: '相处灵感它安静低调、不爱抢戏，相处重在"稳定陪伴"。保持日常规律，环境少变动，它会一直安稳可靠。',
    CARY: '相处灵感它佛系松弛，相处别给它过高期待，不卷不逼最舒服。减少压力指令，以轻松互动为主。',
    ZENG: '相处灵感它自带平静气场，只要顺着它的节奏即可。不强迫社交、不制造紧张，它会一直保持平和健康的状态。',
  };

  const middleHints = [];
  if (picked.middle.S) middleHints.push('社交上偏中间型');
  if (picked.middle.M) middleHints.push('情绪强度偏中间型');
  if (picked.middle.T) middleHints.push('表达方式偏中间型');
  const middleText = middleHints.length
    ? `画像提示：${middleHints.join('、')}——它会在不同场景里切换策略，像天气一样有晴有阴。`
    : '画像提示：整体气质跨场景较一致，像一条清晰的性格主线贯穿日常。';

  return [
    middleText,
    subtypeText[petKey] || '',
    social,
    mood,
    express,
    driveMap[picked.A],
    tipsMap[petKey] || '先摸清它的节奏，再给稳定、简单的规则；把注意力放在"能量管理"和"安全感"，你们会相处得越来越顺。',
  ].filter(Boolean).join('\n\n');
}

// ─── 维度颜色配置 ─────────────────────────────────────────────────────────────

const dimColors: Record<string, [string, string]> = {
  e: ['#6f8f72', '#4e6e52'],
  i: ['#7a8ea0', '#5d7081'],
  u: ['#c78677', '#a06255'],
  d: ['#86a6b5', '#5f8394'],
  o: ['#c8a06d', '#a97f4f'],
  x: ['#8f86a3', '#6f667f'],
  p: ['#6b8a6a', '#4f6d4f'],
  c: ['#9a7f63', '#7b6149'],
  a: ['#b68a9a', '#916878'],
  n: ['#9a9fa6', '#767b82'],
};

function DimBar({ label1, label2, pct1, pct2, cls1, cls2 }: {
  label1: string; label2: string; pct1: number; pct2: number; cls1: string; cls2: string;
}) {
  const [c1a, c1b] = dimColors[cls1];
  const [c2a, c2b] = dimColors[cls2];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#5c4a32', marginBottom: 4 }}>
        <span>{label1} {pct1}%</span>
        <span>{label2} {pct2}%</span>
      </div>
      <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', border: '2px solid #5c4a2e', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)' }}>
        <div style={{ width: `${pct1}%`, background: `linear-gradient(180deg, ${c1a}, ${c1b})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {pct1 >= 20 ? `${label1.split('')[0]} ${pct1}%` : ''}
        </div>
        <div style={{ width: `${pct2}%`, background: `linear-gradient(180deg, ${c2a}, ${c2b})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {pct2 >= 20 ? `${label2.split('')[0]} ${pct2}%` : ''}
        </div>
      </div>
    </div>
  );
}

function DriveDimBar({ pcts }: { pcts: [number, number, number, number] }) {
  const labels = ['探索', '控制', '关怀', '松弛'];
  const clss = ['p', 'c', 'a', 'n'];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#5c4a32', marginBottom: 4 }}>
        <span>行为驱动</span>
        <span style={{ fontSize: 10 }}>{labels.map((l, i) => `${l} ${pcts[i]}%`).join(' · ')}</span>
      </div>
      <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', border: '2px solid #5c4a2e', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)' }}>
        {pcts.map((pct, i) => {
          const [ca, cb] = dimColors[clss[i]];
          return (
            <div key={i} style={{ width: `${pct}%`, background: `linear-gradient(180deg, ${ca}, ${cb})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
              {pct >= 16 ? `${labels[i]} ${pct}%` : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

type Phase = 'quiz' | 'result';

export function SBTIPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<Phase>('quiz');
  const [errorId, setErrorId] = useState<number | null>(null);
  const [result, setResult] = useState<{
    petKey: PetKey;
    pet: (typeof pets)[PetKey];
    score: Scores;
    picked: ReturnType<typeof pickByRule>;
    bodyText: string;
    drivePercents: [number, number, number, number];
  } | null>(null);

  const handleSelect = useCallback((qId: number, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    if (errorId === qId) setErrorId(null);
  }, [errorId]);

  const handleCalculate = () => {
    // 找第一道没答的题
    const missing = questions.find(q => !answers[q.id]);
    if (missing) {
      setErrorId(missing.id);
      const el = document.getElementById(`q-${missing.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const score = initScores();
    for (const q of questions) {
      const ans = answers[q.id];
      if (biDimensionMap[q.id]) {
        const [left, right] = biDimensionMap[q.id];
        if (ans === 'A') score[left] += 2;
        if (ans === 'B') { score[left] += 1; score[right] += 1; }
        if (ans === 'C') score[right] += 2;
      }
      if (driveQuestions.has(q.id)) {
        if (ans === 'A') score.P += 2;
        if (ans === 'B') score.C += 2;
        if (ans === 'C') score.A += 2;
        if (ans === 'D') score.N += 2;
      }
    }
    const picked = pickByRule(score);
    const candidates = resolveCandidates(picked.typeCode);
    const petKey = resolvePetBySubtype(picked.typeCode, answers, candidates);
    const pet = pets[petKey];
    const bodyText = buildBodyText(picked, petKey);
    const drivePercents = fourDrivePercents(score);
    setResult({ petKey, pet, score, picked, bodyText, drivePercents });
    setPhase('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 自动保存结果到宠物档案
    (async () => {
      try {
        const petId = localStorage.getItem('current-pet-id');
        if (!petId) return;
        const profile = await getPetProfileById(petId);
        if (!profile) return;
        const [e, i] = pairPercent(score.E, score.I);
        const [u, d] = pairPercent(score.U, score.D);
        const [o, x] = pairPercent(score.O, score.X);
        await savePetProfile({
          ...profile,
          sbtiResult: {
            petKey,
            petName: pet.name,
            petDesc: pet.desc,
            typeCode: picked.typeCode,
            petLine: petLines[petKey],
            bodyText,
            drivePercents,
            dimE: e, dimI: i,
            dimU: u, dimD: d,
            dimO: o, dimX: x,
            savedAt: new Date().toISOString(),
          },
        });
        // 同步更新 localStorage 缓存（不含 Blob 字段）
        const { frontPhoto, sidePhoto, ...cacheable } = profile as any;
        localStorage.setItem('current-pet-cache', JSON.stringify({
          ...cacheable,
          sbtiResult: {
            petKey, petName: pet.name, petDesc: pet.desc, typeCode: picked.typeCode,
            petLine: petLines[petKey], bodyText, drivePercents,
            dimE: e, dimI: i, dimU: u, dimD: d, dimO: o, dimX: x,
            savedAt: new Date().toISOString(),
          },
        }));
      } catch (err) {
        console.error('SBTI result save failed', err);
      }
    })();
  };

  const handleReset = () => {
    setAnswers({});
    setErrorId(null);
    setResult(null);
    setPhase('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MiniAppShell title="宠物版SBTI" showBack onBack={() => navigate('/home')}>
      <div
        className="flex-1 overflow-y-auto"
        style={{
          background: 'radial-gradient(circle at 10% 10%, rgba(184,146,88,0.06), transparent 32%), radial-gradient(circle at 90% 20%, rgba(74,111,75,0.06), transparent 32%), #f3efe6',
          fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        }}
      >
        <div style={{ padding: '16px 14px 100px' }}>

          {/* 顶部标题卡 */}
          <div
            style={{
              background: '#fcfaf5',
              border: '1px solid #d6ccb8',
              borderRadius: 14,
              padding: '16px 16px 14px',
              marginBottom: 14,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', right: 14, top: 12, color: '#d6c39f', fontSize: 18, letterSpacing: 4 }}>🐾 🐾 🐾</div>
            <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#2c251c' }}>🐾 你的宠物是什么性格？</h1>
            <p style={{ margin: 0, color: '#786a57', fontSize: 13 }}>根据宠物的客观观察进行选择；共30题，按第一反应作答即可。</p>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'quiz' && (
              <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* 题目列表 */}
                {questions.map((q) => {
                  const isError = errorId === q.id;
                  return (
                    <div
                      key={q.id}
                      id={`q-${q.id}`}
                      style={{
                        background: '#fcfaf5',
                        border: `1px solid ${isError ? '#c0392b' : '#d6ccb8'}`,
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 10,
                        boxShadow: '0 4px 12px rgba(90,70,39,0.06)',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14, color: isError ? '#c0392b' : '#2c251c', lineHeight: 1.5 }}>
                        {q.id}. {q.text}
                        {isError && <span style={{ fontSize: 12, marginLeft: 6, color: '#c0392b' }}>← 请选择</span>}
                      </div>
                      <div style={{ display: 'grid', gap: 7 }}>
                        {q.options.map((opt, idx) => {
                          const val = ['A', 'B', 'C', 'D'][idx];
                          const selected = answers[q.id] === val;
                          return (
                            <motion.button
                              key={idx}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelect(q.id, val)}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 8,
                                padding: '9px 11px',
                                border: `1.5px solid ${selected ? '#4a6f4b' : '#d6ccb8'}`,
                                borderRadius: 10,
                                cursor: 'pointer',
                                background: selected ? '#eef3ea' : '#fff',
                                textAlign: 'left',
                                fontSize: 13,
                                color: '#2c251c',
                                lineHeight: 1.5,
                                transition: 'all 0.15s',
                                fontFamily: 'inherit',
                              }}
                            >
                              <span
                                style={{
                                  flexShrink: 0,
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  border: `2px solid ${selected ? '#4a6f4b' : '#d6ccb8'}`,
                                  background: selected ? '#4a6f4b' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginTop: 1,
                                }}
                              >
                                {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                              </span>
                              <span><b>{val}.</b> {opt}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* 操作栏 */}
                <div style={{ marginTop: 16, position: 'sticky', bottom: 0 }}>
                  <div
                    style={{
                      background: '#fcfaf5',
                      border: '1px solid #d6ccb8',
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleCalculate}
                      style={{ flex: 1, background: '#4a6f4b', color: '#fff', border: 0, borderRadius: 10, padding: '11px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      🔍 计算结果
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleReset}
                      style={{ background: '#ebe3d4', color: '#3a3126', border: 0, borderRadius: 10, padding: '11px 16px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      清空
                    </motion.button>
                    <span style={{ fontSize: 12, color: '#786a57', flexShrink: 0 }}>
                      {Object.keys(answers).length}/30
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {phase === 'result' && result && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* 结果海报：动物园木牌风格 */}
                <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', position: 'relative', paddingTop: 28 }}>
                  {/* 挂钩 */}
                  <div
                    style={{
                      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                      width: 120, height: 24,
                      background: 'repeating-linear-gradient(90deg, #eed699 0 6px, #a67c1a 6px 12px)',
                      borderRadius: '4px 4px 0 0',
                      boxShadow: '0 2px 0 rgba(0,0,0,0.12)',
                      zIndex: 2,
                    }}
                  >
                    {/* 铁环 */}
                    <div style={{
                      position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                      width: 8, height: 18,
                      border: '3px solid #5c4a2e',
                      borderRadius: '50% 50% 0 0',
                      borderBottom: 'none',
                    }} />
                  </div>

                  {/* 木牌主体 */}
                  <div
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 40%), linear-gradient(145deg, #f4e8d4 0%, #e8d5b8 45%, #dcc9a8 100%)',
                      border: '10px solid #6b4e2e',
                      borderRadius: 6,
                      boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.25), inset 0 2px 8px rgba(0,0,0,0.08), 0 12px 28px rgba(60,40,20,0.22)',
                      padding: '22px 18px 20px',
                      position: 'relative',
                    }}
                  >
                    {/* 装饰文字 */}
                    <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 13, opacity: 0.7, letterSpacing: 2 }}>🌿 🦁 🌿</div>
                    <div style={{ position: 'absolute', bottom: 12, right: 14, fontSize: 17, opacity: 0.45 }}>🐾</div>

                    {/* 副标题 */}
                    <div style={{ textAlign: 'center', fontSize: 11, letterSpacing: '0.35em', color: '#5c4a32', textTransform: 'uppercase', marginBottom: 8, paddingTop: 6 }}>
                      动物性格园 · 鉴定书
                    </div>

                    {/* 主标题 */}
                    <h2 style={{ fontSize: 21, fontWeight: 800, color: '#3d2e1f', textAlign: 'center', lineHeight: 1.35, margin: '0 0 10px', textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}>
                      您的宠物是天生的{result.pet.name}！
                    </h2>

                    {/* 类型徽章 */}
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#4a6f4b', padding: '6px 16px', background: 'rgba(255,255,255,0.55)', borderRadius: 999, border: '1px dashed #b89a6e', display: 'inline-block' }}>
                        {result.petKey}｜{result.pet.name}
                      </span>
                    </div>

                    {/* 宠物插图 */}
                    <img
                      src={`/sbti-assets/${result.petKey}1.png`}
                      alt={result.pet.name}
                      style={{ width: '100%', height: 200, objectFit: 'contain', margin: '6px 0 10px', borderRadius: 12, background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(92,74,46,0.22)', display: 'block' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />

                    {/* 简介 */}
                    <p style={{ fontSize: 13, color: '#4a3d2e', lineHeight: 1.7, margin: '0 0 12px', textAlign: 'justify' }}>
                      {result.pet.desc}
                    </p>

                    {/* 金句 */}
                    <div style={{ fontSize: 13, color: '#4a3d2e', fontStyle: 'italic', lineHeight: 1.65, margin: '0 0 16px', padding: '12px 14px', background: 'rgba(255,255,255,0.45)', borderRadius: 10, borderLeft: '3px solid #b89258' }}>
                      {petLines[result.petKey]}
                    </div>

                    {/* 维度比例 */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#5c4a32', letterSpacing: '0.2em', marginBottom: 10, textAlign: 'center' }}>性格维度比例</div>
                    {(() => {
                      const [ePct, iPct] = pairPercent(result.score.E, result.score.I);
                      const [uPct, dPct] = pairPercent(result.score.U, result.score.D);
                      const [oPct, xPct] = pairPercent(result.score.O, result.score.X);
                      return (
                        <>
                          <DimBar label1="外放" label2="内倾" pct1={ePct} pct2={iPct} cls1="e" cls2="i" />
                          <DimBar label1="高能" label2="平稳" pct1={uPct} pct2={dPct} cls1="u" cls2="d" />
                          <DimBar label1="外显" label2="内敛" pct1={oPct} pct2={xPct} cls1="o" cls2="x" />
                          <DriveDimBar pcts={result.drivePercents} />
                        </>
                      );
                    })()}

                    {/* 深度分析 */}
                    <div style={{ fontSize: 13, color: '#4a3d2e', lineHeight: 1.75, marginTop: 16, paddingTop: 14, borderTop: '2px dashed #c4a882', whiteSpace: 'pre-wrap' }}>
                      {result.bodyText}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleReset}
                    style={{ flex: 1, background: '#4a6f4b', color: '#fff', border: 0, borderRadius: 12, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    🔄 重新测试
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/home')}
                    style={{ background: '#ebe3d4', color: '#3a3126', border: 0, borderRadius: 12, padding: '13px 18px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    返回首页
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MiniAppShell>
  );
}
