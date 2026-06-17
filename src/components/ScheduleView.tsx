/**
 * ScheduleView — real 2026 World Cup schedule from Wikipedia
 *
 * 72 group-stage matches (12 groups × 6 matches each) hardcoded from
 * https://zh.wikipedia.org/wiki/2026年國際足協世界盃
 *
 * Features:
 *   - Beijing time (UTC+8) as primary, local time + UTC offset as secondary
 *   - Editable scores for past matches (stored in localStorage)
 *   - Predicted scores for upcoming matches (from scorer engine)
 */
import { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react'
import { teams, groupNames } from '../data/teams'
import { computeScores, DEFAULT_WEIGHTS } from '../engine/scorer'
import { predictMostLikelyScore, predictScoreProbs } from '../engine/poisson'
import { FlagImg } from './FlagImg'

// ── Types ──────────────────────────────────────────────────
interface Match {
  id: string
  date: string         // e.g. "6月11日"
  dateNum: number      // month*100+day for comparison
  localTime: string    // e.g. "13:00"
  utcOffset: number    // e.g. -6
  home: string         // team id
  away: string
  venue: string        // Wikipedia venue name
  city: string         // Wikipedia city name
  round: 'ceremony' | 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final'
  group?: string
  ceremonyDetail?: { host: string; theme: string; artists: string }
}

const roundLabels: Record<string, string> = {
  ceremony: '仪式', group: '小组赛', r32: '32 强', r16: '16 强',
  qf: '四分之一决赛', sf: '半决赛', '3rd': '季军赛', final: '决赛',
}

// ── Venue / city data from Wikipedia ───────────────────────
interface VenueInfo { venue: string; city: string; utcOffset: number }

const venueMap: Record<string, VenueInfo> = {
  '阿兹特克体育场':     { venue: '阿兹特克体育场',   city: '墨西哥城',   utcOffset: -6 },
  '阿克伦球场':         { venue: '阿克伦球场',       city: '萨波潘',     utcOffset: -6 },
  '梅赛德斯-宾士体育场': { venue: '梅赛德斯-宾士体育场', city: '亚特兰大', utcOffset: -4 },
  'SoFi体育场':         { venue: 'SoFi体育场',       city: '英格尔伍德', utcOffset: -7 },
  'BMO球场':            { venue: 'BMO球场',          city: '多伦多',     utcOffset: -4 },
  '李维斯体育场':       { venue: '李维斯体育场',     city: '圣克拉拉',   utcOffset: -7 },
  '卑诗体育馆':         { venue: '卑诗体育馆',       city: '温哥华',     utcOffset: -7 },
  'AT&T体育场':         { venue: 'AT&T体育场',       city: '阿灵顿',     utcOffset: -5 },
  'BBVA体育场':         { venue: 'BBVA体育场',       city: '瓜达卢佩',   utcOffset: -6 },
  'NRG体育场':          { venue: 'NRG体育场',        city: '休斯敦',     utcOffset: -5 },
  '箭頭体育场':         { venue: '箭頭体育场',       city: '堪萨斯城',   utcOffset: -5 },
  '流明球场':           { venue: '流明球场',         city: '西雅图',     utcOffset: -7 },
  '大都会人寿体育场':   { venue: '大都会人寿体育场', city: '东拉瑟福德', utcOffset: -4 },
  '吉列体育场':         { venue: '吉列体育场',       city: '福克斯伯勒', utcOffset: -4 },
  '林肯金融球场':       { venue: '林肯金融球场',     city: '费城',       utcOffset: -4 },
  '硬石体育场':         { venue: '硬石体育场',       city: '迈阿密加登斯', utcOffset: -4 },
}

const allVenueKeys = Object.keys(venueMap)

// ── Group label colors ─────────────────────────────────────
const groupColors: Record<string, { bg: string; text: string }> = {
  A: { bg: '#1e3a5f', text: '#93c5fd' },
  B: { bg: '#3b1f4e', text: '#c4b5fd' },
  C: { bg: '#1e3a2f', text: '#86efac' },
  D: { bg: '#4a1a1a', text: '#fca5a5' },
  E: { bg: '#3a3a1a', text: '#fde68a' },
  F: { bg: '#1a2e3a', text: '#67e8f9' },
  G: { bg: '#2a1a3a', text: '#d8b4fe' },
  H: { bg: '#1a2a1a', text: '#a7f3d0' },
  I: { bg: '#3a1a2a', text: '#f9a8d4' },
  J: { bg: '#2a2a4a', text: '#a5b4fc' },
  K: { bg: '#3a2a1a', text: '#fdba74' },
  L: { bg: '#1a3a3a', text: '#5eead4' },
}

// ── Real group match data from Wikipedia ───────────────────
// Each entry: [date, time, utcOffset, venueKey, homeId, awayId]
type RawMatch = [string, string, string, string, string]

const groupMatches: Record<string, RawMatch[]> = {
  A: [
    ['6月11日', '13:00', '阿兹特克体育场',     'mexico', 'south-africa'],
    ['6月11日', '20:00', '阿克伦球场',         'south-korea', 'czech-republic'],
    ['6月18日', '12:00', '梅赛德斯-宾士体育场', 'czech-republic', 'south-africa'],
    ['6月18日', '19:00', '阿克伦球场',         'mexico', 'south-korea'],
    ['6月24日', '19:00', '阿兹特克体育场',     'czech-republic', 'mexico'],
    ['6月24日', '19:00', 'BBVA体育场',         'south-africa', 'south-korea'],
  ],
  B: [
    ['6月12日', '15:00', 'BMO球场',            'canada', 'bosnia'],
    ['6月13日', '12:00', '李维斯体育场',       'qatar', 'switzerland'],
    ['6月18日', '12:00', 'SoFi体育场',         'switzerland', 'bosnia'],
    ['6月18日', '15:00', '卑诗体育馆',         'canada', 'qatar'],
    ['6月24日', '12:00', '卑诗体育馆',         'switzerland', 'canada'],
    ['6月24日', '12:00', '流明球场',           'bosnia', 'qatar'],
  ],
  C: [
    ['6月13日', '18:00', '大都会人寿体育场',   'brazil', 'morocco'],
    ['6月13日', '21:00', '吉列体育场',         'haiti', 'scotland'],
    ['6月19日', '18:00', '吉列体育场',         'scotland', 'morocco'],
    ['6月19日', '21:00', '林肯金融球场',       'brazil', 'haiti'],
    ['6月24日', '18:00', '硬石体育场',         'scotland', 'brazil'],
    ['6月24日', '18:00', '梅赛德斯-宾士体育场', 'morocco', 'haiti'],
  ],
  D: [
    ['6月12日', '18:00', 'SoFi体育场',         'usa', 'paraguay'],
    ['6月13日', '21:00', '卑诗体育馆',         'australia', 'turkey'],
    ['6月19日', '12:00', '流明球场',           'usa', 'australia'],
    ['6月19日', '20:00', '李维斯体育场',       'turkey', 'paraguay'],
    ['6月25日', '19:00', 'SoFi体育场',         'turkey', 'usa'],
    ['6月25日', '19:00', '李维斯体育场',       'paraguay', 'australia'],
  ],
  E: [
    ['6月14日', '12:00', 'NRG体育场',          'germany', 'curacao'],
    ['6月14日', '19:00', '林肯金融球场',       'ivory-coast', 'ecuador'],
    ['6月20日', '16:00', 'BMO球场',            'germany', 'ivory-coast'],
    ['6月20日', '19:00', '箭頭体育场',         'ecuador', 'curacao'],
    ['6月25日', '16:00', '林肯金融球场',       'curacao', 'ivory-coast'],
    ['6月25日', '16:00', '大都会人寿体育场',   'ecuador', 'germany'],
  ],
  F: [
    ['6月14日', '15:00', 'AT&T体育场',         'netherlands', 'japan'],
    ['6月14日', '20:00', 'BBVA体育场',         'sweden', 'tunisia'],
    ['6月20日', '12:00', 'NRG体育场',          'netherlands', 'sweden'],
    ['6月20日', '22:00', 'BBVA体育场',         'tunisia', 'japan'],
    ['6月25日', '18:00', 'AT&T体育场',         'japan', 'sweden'],
    ['6月25日', '18:00', '箭頭体育场',         'tunisia', 'netherlands'],
  ],
  G: [
    ['6月15日', '12:00', '流明球场',           'belgium', 'egypt'],
    ['6月15日', '18:00', 'SoFi体育场',         'iran', 'new-zealand'],
    ['6月21日', '12:00', 'SoFi体育场',         'belgium', 'iran'],
    ['6月21日', '18:00', '卑诗体育馆',         'new-zealand', 'egypt'],
    ['6月26日', '20:00', '流明球场',           'egypt', 'iran'],
    ['6月26日', '20:00', '卑诗体育馆',         'new-zealand', 'belgium'],
  ],
  H: [
    ['6月15日', '12:00', '梅赛德斯-宾士体育场', 'spain', 'cape-verde'],
    ['6月15日', '18:00', '硬石体育场',         'saudi-arabia', 'uruguay'],
    ['6月21日', '12:00', '梅赛德斯-宾士体育场', 'spain', 'saudi-arabia'],
    ['6月21日', '18:00', '硬石体育场',         'uruguay', 'cape-verde'],
    ['6月26日', '19:00', 'NRG体育场',          'cape-verde', 'saudi-arabia'],
    ['6月26日', '18:00', '阿克伦球场',         'uruguay', 'spain'],
  ],
  I: [
    ['6月16日', '15:00', '大都会人寿体育场',   'france', 'senegal'],
    ['6月16日', '18:00', '吉列体育场',         'iraq', 'norway'],
    ['6月22日', '17:00', '林肯金融球场',       'france', 'iraq'],
    ['6月22日', '20:00', '大都会人寿体育场',   'norway', 'senegal'],
    ['6月26日', '15:00', '吉列体育场',         'norway', 'france'],
    ['6月26日', '15:00', 'BMO球场',            'senegal', 'iraq'],
  ],
  J: [
    ['6月16日', '20:00', '箭頭体育场',         'argentina', 'algeria'],
    ['6月16日', '21:00', '李维斯体育场',       'austria', 'jordan'],
    ['6月22日', '12:00', 'AT&T体育场',         'argentina', 'austria'],
    ['6月22日', '20:00', '李维斯体育场',       'jordan', 'algeria'],
    ['6月27日', '21:00', '箭頭体育场',         'algeria', 'austria'],
    ['6月27日', '21:00', 'AT&T体育场',         'jordan', 'argentina'],
  ],
  K: [
    ['6月17日', '12:00', 'NRG体育场',          'portugal', 'dr-congo'],
    ['6月17日', '20:00', '阿兹特克体育场',     'uzbekistan', 'colombia'],
    ['6月23日', '12:00', 'NRG体育场',          'portugal', 'uzbekistan'],
    ['6月23日', '20:00', '阿克伦球场',         'colombia', 'dr-congo'],
    ['6月27日', '19:30', '硬石体育场',         'colombia', 'portugal'],
    ['6月27日', '19:30', '梅赛德斯-宾士体育场', 'dr-congo', 'uzbekistan'],
  ],
  L: [
    ['6月17日', '15:00', 'AT&T体育场',         'england', 'croatia'],
    ['6月17日', '19:00', 'BMO球场',            'ghana', 'panama'],
    ['6月23日', '16:00', '吉列体育场',         'england', 'ghana'],
    ['6月23日', '19:00', 'BMO球场',            'panama', 'croatia'],
    ['6月27日', '17:00', '大都会人寿体育场',   'panama', 'england'],
    ['6月27日', '17:00', '林肯金融球场',       'croatia', 'ghana'],
  ],
}

/** Parse "6月11日" → month*100+day */
function parseDateNum(s: string): number {
  const m = s.match(/(\d+)月(\d+)日/)
  if (!m) return 0
  return parseInt(m[1]) * 100 + parseInt(m[2])
}

/** Check match is in the past */
function isMatchPast(dateNum: number): boolean {
  const now = new Date()
  const todayNum = (now.getMonth() + 1) * 100 + now.getDate()
  if (now.getFullYear() > 2026) return true
  if (now.getFullYear() < 2026) return false
  return dateNum < todayNum
}

/** Check if match is within N days from today (including today) */
function isMatchWithinDays(dateNum: number, days: number): boolean {
  const now = new Date()
  // Project today's month/day onto 2026 (all match data is 2026)
  const today2026 = new Date(2026, now.getMonth(), now.getDate())
  const month = Math.floor(dateNum / 100) - 1 // 0-based
  const day = dateNum % 100
  const matchDate = new Date(2026, month, day)
  const diffMs = matchDate.getTime() - today2026.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= days
}

// ── Frozen predictions (for matches within 2 days) ────────
const FROZEN_KEY = 'wc26-frozen-predictions'
const FROZEN_TS_KEY = 'wc26-frozen-timestamp'

function getFrozenPredictions(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(FROZEN_KEY) || '{}') } catch { return {} }
}
function setFrozenPredictions(preds: Record<string, string>) {
  localStorage.setItem(FROZEN_KEY, JSON.stringify(preds))
}
function getFrozenTimestamp(): string {
  return localStorage.getItem(FROZEN_TS_KEY) || ''
}
function setFrozenTimestamp() {
  localStorage.setItem(FROZEN_TS_KEY, new Date().toLocaleString('zh-CN', { hour12: false }))
}

/** Convert local time (HH:MM) + UTC offset → Beijing time (UTC+8) */
function localToBeijing(date: string, time: string, offset: number): { date: string; time: string } {
  const [h, m] = time.split(':').map(Number)
  const localMin = h * 60 + m
  const utcMin = localMin - offset * 60
  const bjTotalMin = utcMin + 8 * 60
  const bjDayOffset = bjTotalMin < 0 ? -1 : bjTotalMin >= 24 * 60 ? 1 : 0
  const bjMin = ((bjTotalMin % (24 * 60)) + 24 * 60) % (24 * 60)
  const bjH = Math.floor(bjMin / 60)
  const bjM = bjMin % 60

  // Compute Beijing date
  const dateMatch = date.match(/(\d+)月(\d+)日/)
  let bjDate = date
  if (dateMatch) {
    let month = parseInt(dateMatch[1])
    let day = parseInt(dateMatch[2]) + bjDayOffset
    const daysInMonth = [0, 31, 28, 30, 31, 30, 31, 31, 30, 31, 30, 31, 30]
    // 2026 is not a leap year
    if (day > daysInMonth[month]) { day -= daysInMonth[month]; month++ }
    else if (day < 1) { month--; day = daysInMonth[month] }
    bjDate = `${month}月${day}日`
  }

  return {
    date: bjDate,
    time: `${String(bjH).padStart(2, '0')}:${String(bjM).padStart(2, '0')}`,
  }
}

/** Build all matches */
function buildAllMatches(): Match[] {
  const matches: Match[] = []

  // ── Opening Ceremonies (3 host nations) ──────────────
  // Mexico — Azteca Stadium
  const mxVi = venueMap['阿兹特克体育场']
  matches.push({
    id: 'ceremony-mx',
    date: '6月11日',
    dateNum: parseDateNum('6月11日'),
    localTime: '11:30',
    utcOffset: mxVi.utcOffset,
    home: '', away: '',
    venue: mxVi.venue,
    city: mxVi.city,
    round: 'ceremony',
    ceremonyDetail: {
      host: '墨西哥',
      theme: '拉丁狂欢',
      artists: '夏奇拉（Shakira）领衔演唱官方主题曲《Dai Dai》；J·巴尔文（J Balvin）等众多拉丁美洲艺人助阵，包含原住民表演和无人机灯光秀',
    },
  })

  // Canada — BMO Field
  const caVi = venueMap['BMO球场']
  matches.push({
    id: 'ceremony-ca',
    date: '6月12日',
    dateNum: parseDateNum('6月12日'),
    localTime: '13:30',
    utcOffset: caVi.utcOffset,
    home: '', away: '',
    venue: caVi.venue,
    city: caVi.city,
    round: 'ceremony',
    ceremonyDetail: {
      host: '加拿大',
      theme: '文化马赛克',
      artists: '艾拉妮丝·莫莉塞特（Alanis Morissette）和迈克尔·布布莱（Michael Bublé）等加拿大知名音乐人登台',
    },
  })

  // USA — SoFi Stadium
  const usVi = venueMap['SoFi体育场']
  matches.push({
    id: 'ceremony-us',
    date: '6月12日',
    dateNum: parseDateNum('6月12日'),
    localTime: '16:30',
    utcOffset: usVi.utcOffset,
    home: '', away: '',
    venue: usVi.venue,
    city: usVi.city,
    round: 'ceremony',
    ceremonyDetail: {
      host: '美国',
      theme: '视觉盛宴',
      artists: '美国流行天后凯蒂·佩里（Katy Perry）以及韩国女团 Blackpink 成员 LISA 登台献艺',
    },
  })

  // ── Group stage ───────────────────────────────────────
  for (const [g, raw] of Object.entries(groupMatches)) {
    raw.forEach(([date, time, venueKey, home, away], mi) => {
      const vi = venueMap[venueKey]
      matches.push({
        id: `g-${g}-${mi}`,
        date,
        dateNum: parseDateNum(date),
        localTime: time,
        utcOffset: vi.utcOffset,
        home, away,
        venue: vi.venue,
        city: vi.city,
        round: 'group',
        group: g,
      })
    })
  }

  // Knockout (dates/venues approximate — real pairings TBD)
  const koSchedule: { round: Match['round']; dates: string[]; count: number }[] = [
    { round: 'r32', dates: ['6月28日','6月29日','6月30日','7月1日'], count: 16 },
    { round: 'r16', dates: ['7月3日','7月4日','7月5日','7月6日'], count: 8 },
    { round: 'qf',  dates: ['7月9日','7月10日'], count: 4 },
    { round: 'sf',  dates: ['7月13日','7月14日'], count: 2 },
    { round: '3rd', dates: ['7月18日'], count: 1 },
    { round: 'final', dates: ['7月19日'], count: 1 },
  ]

  for (const { round, dates, count } of koSchedule) {
    for (let i = 0; i < count; i++) {
      const date = dates[i % dates.length]
      const vk = allVenueKeys[i % allVenueKeys.length]
      const vi = venueMap[vk]
      matches.push({
        id: `${round}-${i}`,
        date,
        dateNum: parseDateNum(date),
        localTime: `${18 + (i % 3) * 2}:00`,
        utcOffset: vi.utcOffset,
        home: '', away: '',
        venue: vi.venue,
        city: vi.city,
        round,
      })
    }
  }

  // ── Closing Ceremony ────────────────────────────────
  const closeVi = venueMap['大都会人寿体育场']
  matches.push({
    id: 'ceremony-closing',
    date: '7月19日',
    dateNum: parseDateNum('7月19日'),
    localTime: '20:00',
    utcOffset: closeVi.utcOffset,
    home: '', away: '',
    venue: closeVi.venue,
    city: closeVi.city,
    round: 'ceremony',
    ceremonyDetail: {
      host: '闭幕式',
      theme: '告别之夜',
      artists: '冠军颁奖典礼及闭幕表演',
    },
  })

  return matches
}

const allMatches = buildAllMatches()

// ── Analysis notes for completed matches ──────────────────
// 格式：{ matchId: '实际比分 vs 预测比分 | 原因分析' }
export const matchNotes: Record<string, string> = {
  'g-E-0': '7-1 vs 预测5-0 | 德国全场26脚射门12射正，库拉索防线彻底崩溃；恩梅查6分钟闪击，施洛特贝克头槌，穆西亚拉造点，替补维尔茨和萨内各入一球。库拉索仅靠科梅嫩西亚一记世界波挽回颜面。模型低估了德国主场级别的火力(64.6%控球率)，高估了库拉索的防守韧性',
  'g-F-0': '2-2 vs 预测1-1 | 荷兰德容17分钟补射首开纪录，加克波68分钟单刀扩大比分；日本72分钟南野拓实补射扳回一城，89分钟伊东纯也传中导致范戴克乌龙绝平。模型未能预见日本在0-2落后下的顽强反击韧性，也未充分考虑日本近两届世界杯对阵强队屡屡爆冷的传统',
  'g-E-1': '1-0 vs 预测1-1 | 象牙海岸阿马德·迪亚洛90分钟绝杀；厄瓜多尔场面上不落下风(51.6%控球率12次射门)但最后一击乏力。模型错判为平局，低估了象牙海岸的主场级韧性，也高估了厄瓜多尔的攻坚火力',
  'g-F-1': '5-1 vs 预测3-0 | 瑞典阿亚里7分钟凌空斩首开纪录，伊萨克和哲凯赖什各建一功，突尼斯雷基克头槌扳回一城，下半场瑞典再入两球。模型预测瑞典取胜但低估了北欧海盗的主场级攻击力',
  'g-A-0': '2-0 vs 预测2-1 | 南非两人染红九人应战，进攻完全瘫痪；墨西哥控场但进球效率偏低',
  'g-A-1': '2-1 vs 预测1-1 | 韩国下半场逆转，替补吴贤揆80分钟绝杀；捷克领先后过于保守丢好局',
  'g-B-0': '1-1 vs 预测2-1 | 加拿大历史首分！波黑先开纪录，拉林78分钟扳平；主场气势加分但效率不足',
  'g-D-0': '4-1 vs 预测2-1 | 巴洛贡梅开二度创美国历史(96年来首次单场2+球)，巴拉圭防线全面崩溃',
  'g-B-1': '1-1 vs 预测1-3 | 恩博洛17分钟点球首开纪录；瑞士89分钟乌龙送礼（穆海姆），卡塔尔补时绝平拿历史首分',
  'g-C-0': '1-1 vs 预测2-1 | 摩洛哥赛巴里21分钟先拔头筹；维尼修斯32分钟凌空斩扳平，巴西狂攻未果',
  'g-C-1': '0-1 vs 预测0-3 | 海地密集防守顽强抵抗85分钟，麦金角球头槌绝杀；全场苏格兰控球72%却破门乏术',
  'g-D-1': '2-0 vs 预测1-2 | 伊兰昆达27分钟凌空抽射首秀破门，梅特卡夫75分钟单刀锁定胜局；土耳其控球72%狂射30脚无一命中',
  'g-G-0': '1-1 vs 预测2-0 | 埃及艾马姆·阿舒尔20分钟首开纪录，比利时66分钟依靠对手乌龙扳平。比利时控球53.6%但射门效率低下，模型错判为比利时轻松取胜，低估了埃及的防守韧性',
  'g-G-1': '2-2 vs 预测3-0 | 新西兰伊利亚·贾斯特7分钟凌空斩加54分钟单刀梅开二度，伊朗雷扎扬和莫赫比分别头槌扳平。模型预测伊朗大胜，但未考虑新西兰的快速反击效率',
  'g-H-0': '0-0 vs 预测4-0 | 西班牙控球74.3%狂射27脚7射正却无法破门，佛得角铁桶阵拿到历史性平局。模型严重低估了佛得角的密集防守能力和西班牙的破密集难题',
  'g-H-1': '1-1 vs 预测0-2 | 沙特阿尔阿姆里41分钟角球破门，乌拉圭狂射27脚10射正，阿劳霍80分钟凌空抽射扳平。模型错判为乌拉圭轻松客胜，低估了沙特的主场气势和定位球威胁',
  'g-I-0': '3-1 vs 预测2-0 | 姆巴佩66分钟首开纪录+90+6分钟锁定胜局，巴尔科拉82分钟扩大比分，塞内加尔90+5分钟头槌挽回颜面。模型方向正确但低估了法国的锋线火力和姆巴佩的巨星表现',
  'g-I-1': '1-4 vs 预测0-3 | 哈兰德29分钟+43分钟梅开二度，伊拉克侯赛因39分钟头槌扳平，厄斯蒂高76分钟头球+伊拉克90+6分钟乌龙锁定胜局。模型方向正确但低估了挪威的定位球威胁和伊拉克的防守失误',
  'g-J-1': '3-1 vs 预测4-0 | 奥地利施密德21分钟首开纪录+对手乌龙76分钟+阿瑙托维奇90+12分钟点球；约旦奥勒万50分钟扳平顽强抵抗70分钟。模型方向正确(主胜)但高估了奥地利进攻效率，约旦表现比预期顽强',
  'g-J-0': '3-0 vs 预测3-0 | 梅西17分钟+60分钟+76分钟帽子戏法追平克洛泽世界杯16球纪录，阿尔及利亚全场仅1射正。模型完全准确！✅',
}

// ── ESPN API sync ──────────────────────────────────────────

/** ESPN 3-letter abbreviation → our team id */
const ESPN_TEAM_MAP: Record<string, string> = {
  QAT: 'qatar', SUI: 'switzerland', BRA: 'brazil', MAR: 'morocco',
  HAI: 'haiti', SCO: 'scotland', MEX: 'mexico', RSA: 'south-africa',
  KOR: 'south-korea', CZE: 'czech-republic', CAN: 'canada', BIH: 'bosnia',
  USA: 'usa', PAR: 'paraguay', AUS: 'australia', TUR: 'turkey',
  GER: 'germany', CUW: 'curacao', CIV: 'ivory-coast', ECU: 'ecuador',
  NED: 'netherlands', JPN: 'japan', SWE: 'sweden', TUN: 'tunisia',
  BEL: 'belgium', EGY: 'egypt', IRN: 'iran', NZL: 'new-zealand',
  CPV: 'cape-verde', KSA: 'saudi-arabia', ESP: 'spain', URU: 'uruguay',
  FRA: 'france', IRQ: 'iraq', NOR: 'norway', SEN: 'senegal',
  ALG: 'algeria', ARG: 'argentina', AUT: 'austria', JOR: 'jordan',
  POR: 'portugal', COD: 'dr-congo', UZB: 'uzbekistan', COL: 'colombia',
  ENG: 'england', CRO: 'croatia', GHA: 'ghana', PAN: 'panama',
}

/** Fetch completed match scores from ESPN API for a given date (YYYYMMDD) */
async function fetchEspnDate(dateStr: string): Promise<Record<string, string>> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`
  const res = await fetch(url)
  if (!res.ok) return {}
  const data = await res.json() as {
    events?: Array<{
      competitions?: Array<{
        status?: { type?: { completed?: boolean; state?: string } }
        competitors?: Array<{
          score?: string
          team?: { abbreviation?: string }
          homeAway?: string
        }>
      }>
    }>
  }
  const result: Record<string, string> = {}
  for (const ev of data.events || []) {
    const comp = ev.competitions?.[0]
    if (!comp) continue
    // Only completed matches
    if (!comp.status?.type?.completed && comp.status?.type?.state !== 'post') continue
    const home = comp.competitors?.find(c => c.homeAway === 'home')
    const away = comp.competitors?.find(c => c.homeAway === 'away')
    if (!home || !away) continue
    const homeAbbr = home.team?.abbreviation
    const awayAbbr = away.team?.abbreviation
    if (!homeAbbr || !awayAbbr) continue
    const homeId = ESPN_TEAM_MAP[homeAbbr]
    const awayId = ESPN_TEAM_MAP[awayAbbr]
    if (!homeId || !awayId) continue
    // Find the match ID from our schedule (match by teams only, no date check — ESPN uses UTC date)
    const match = allMatches.find(m =>
      m.home === homeId && m.away === awayId
    )
    if (match) {
      result[match.id] = `${home.score}-${away.score}`
    }
  }
  return result
}

/** Fetch all completed scores from tournament start to today */
async function fetchAllEspnScores(): Promise<Record<string, string>> {
  const today = new Date()
  const start = new Date(2026, 5, 11) // June 11, 2026
  const all: Record<string, string> = {}
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const scores = await fetchEspnDate(ds)
    Object.assign(all, scores)
  }
  return all
}

// ── Sync button component ──────────────────────────────────
function SyncButton({ setLiveScores }: { setLiveScores: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setMsg(null)
    try {
      const scores = await fetchAllEspnScores()
      const count = Object.keys(scores).length
      if (count > 0) {
        setLiveScores(prev => ({ ...prev, ...scores }))
        localStorage.setItem('wc26-scores', JSON.stringify({ ...scores }))
        setMsg(`✅ 已同步 ${count} 场比分`)
      } else {
        setMsg('⚠️ 暂无新的已完赛比分')
      }
    } catch {
      setMsg('❌ 同步失败，请稍后重试')
    } finally {
      setSyncing(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }, [setLiveScores])

  return (
    <div className="relative flex items-center">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                   text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
      >
        {syncing ? '⏳ 同步中…' : '🔄 同步ESPN比分'}
      </button>
      {msg && (
        <span className="absolute top-full mt-1 right-0 text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded shadow whitespace-nowrap z-10">
          {msg}
        </span>
      )}
    </div>
  )
}

function predictScore(homeId: string, awayId: string, tm: Map<string, number>): [number, number] {
  const hs = tm.get(homeId) || 50
  const as = tm.get(awayId) || 50
  return predictMostLikelyScore(hs, as)
}

function predictScoreProbsW(
  homeId: string, awayId: string, tm: Map<string, number>,
): { score: [number, number]; probs: import('../engine/poisson').ScoreProbs } {
  const hs = tm.get(homeId) || 50
  const as = tm.get(awayId) || 50
  return predictScoreProbs(hs, as)
}

/** Matches predicted with old model (v2.0.0) — before sqrt damping + weight adjustment */
const OLD_MODEL_MATCHES = new Set([
  'g-A-0','g-A-1','g-B-0','g-B-1','g-C-0','g-C-1','g-D-0','g-D-1',
  'g-E-0','g-E-1','g-F-0','g-F-1','g-G-0','g-G-1','g-H-0','g-H-1',
  'g-I-0','g-I-1','g-J-0','g-J-1',
])

function modelTag(matchId: string): string {
  return OLD_MODEL_MATCHES.has(matchId) ? 'v2.0.0' : 'v2.0.1'
}

/** Format a probability 0-1 as a percentage string like "67.3" */
function fmtPct(p: number): string {
  return (p * 100).toFixed(1)
}

/** Hardcoded old-model predictions for the 8 default-score matches.
 *  Written in stone so algorithm updates don't affect completed matches. */
const DEFAULT_PREDICTIONS: Record<string, string> = {
  'g-A-0': '2-1',   // Mexico 2-1 South Africa
  'g-A-1': '1-1',   // South Korea 1-1 Czech Republic
  'g-B-0': '2-1',   // Canada 2-1 Bosnia
  'g-D-0': '2-1',   // USA 2-1 Paraguay
  'g-B-1': '1-3',   // Qatar 1-3 Switzerland
  'g-C-0': '2-1',   // Brazil 2-1 Morocco
  'g-C-1': '0-3',   // Haiti 0-3 Scotland
  'g-D-1': '1-2',   // Australia 1-2 Turkey
  'g-E-0': '5-0',   // Germany 5-0 Curacao
  'g-F-0': '1-1',   // Netherlands 1-1 Japan
  'g-E-1': '1-1',   // Ivory Coast 1-1 Ecuador
  'g-F-1': '3-0',   // Sweden 3-0 Tunisia
  'g-G-0': '2-0',   // Belgium 2-0 Egypt
  'g-G-1': '3-0',   // Iran 3-0 New Zealand
  'g-H-0': '4-0',   // Spain 4-0 Cape Verde
  'g-H-1': '0-2',   // Saudi Arabia 0-2 Uruguay
  'g-I-0': '2-0',   // France 2-0 Senegal
  'g-I-1': '0-3',   // Iraq 0-3 Norway
  'g-J-1': '4-0',   // Austria 4-0 Jordan (old model)
  'g-J-0': '3-0',   // Argentina 3-0 Algeria (old model)

  // ── Future group matches (new model v2.0.1) ─────────────
  'g-A-2': '2-1',   // Czech Republic vs South Africa
  'g-A-3': '1-1',   // Mexico vs South Korea
  'g-A-4': '1-1',   // Czech Republic vs Mexico
  'g-A-5': '1-1',   // South Africa vs South Korea
  'g-B-2': '1-1',   // Switzerland vs Bosnia
  'g-B-3': '1-1',   // Canada vs Qatar
  'g-B-4': '1-1',   // Switzerland vs Canada
  'g-B-5': '1-1',   // Bosnia vs Qatar
  'g-C-2': '1-1',   // Scotland vs Morocco
  'g-C-3': '3-0',   // Brazil vs Haiti
  'g-C-4': '1-1',   // Scotland vs Brazil
  'g-C-5': '2-0',   // Morocco vs Haiti
  'g-D-2': '1-1',   // USA vs Australia
  'g-D-3': '1-1',   // Turkey vs Paraguay
  'g-D-4': '1-1',   // Turkey vs USA
  'g-D-5': '1-1',   // Paraguay vs Australia
  'g-E-2': '2-1',   // Germany vs Ivory Coast
  'g-E-3': '3-0',   // Ecuador vs Curacao
  'g-E-4': '0-2',   // Curacao vs Ivory Coast
  'g-E-5': '1-1',   // Ecuador vs Germany
  'g-F-2': '1-1',   // Netherlands vs Sweden
  'g-F-3': '1-1',   // Tunisia vs Japan
  'g-F-4': '1-1',   // Japan vs Sweden
  'g-F-5': '0-2',   // Tunisia vs Netherlands
  'g-G-2': '1-1',   // Belgium vs Iran
  'g-G-3': '1-1',   // New Zealand vs Egypt
  'g-G-4': '1-1',   // Egypt vs Iran
  'g-G-5': '0-2',   // New Zealand vs Belgium
  'g-H-2': '2-0',   // Spain vs Saudi Arabia
  'g-H-3': '2-0',   // Uruguay vs Cape Verde
  'g-H-4': '1-1',   // Cape Verde vs Saudi Arabia
  'g-H-5': '1-1',   // Uruguay vs Spain
  'g-I-2': '2-0',   // France vs Iraq
  'g-I-3': '1-1',   // Norway vs Senegal
  'g-I-4': '1-1',   // Norway vs France
  'g-I-5': '2-0',   // Senegal vs Iraq
  'g-J-2': '1-1',   // Argentina vs Austria
  'g-J-3': '1-1',   // Jordan vs Algeria
  'g-J-4': '1-1',   // Algeria vs Austria
  'g-J-5': '0-2',   // Jordan vs Argentina
  'g-K-0': '2-0',   // Portugal vs DR Congo
  'g-K-1': '0-2',   // Uzbekistan vs Colombia
  'g-K-2': '2-0',   // Portugal vs Uzbekistan
  'g-K-3': '2-0',   // Colombia vs DR Congo
  'g-K-4': '1-1',   // Colombia vs Portugal
  'g-K-5': '1-1',   // DR Congo vs Uzbekistan
  'g-L-0': '1-1',   // England vs Croatia
  'g-L-1': '1-1',   // Ghana vs Panama
  'g-L-2': '2-0',   // England vs Ghana
  'g-L-3': '1-1',   // Panama vs Croatia
  'g-L-4': '0-2',   // Panama vs England
  'g-L-5': '1-1',   // Croatia vs Ghana
}

// ── Component ──────────────────────────────────────────────
export function ScheduleView() {
  const [filterRound, setFilterRound] = useState<string>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [filterVenue, setFilterVenue] = useState<string>('all')

  const [liveScores, setLiveScores] = useState<Record<string, string>>(() => {
    try {
      return {
        'g-A-0': '2-0',   // Mexico 2-0 South Africa  ✅
        'g-A-1': '2-1',   // South Korea 2-1 Czech Republic  ✅
        'g-B-0': '1-1',   // Canada 1-1 Bosnia (Canada历史首分)
        'g-D-0': '4-1',   // USA 4-1 Paraguay (Balogun梅开二度)
        'g-B-1': '1-1',   // Qatar 1-1 Switzerland
        'g-C-0': '1-1',   // Brazil 1-1 Morocco
        'g-C-1': '0-1',   // Haiti 0-1 Scotland
        'g-D-1': '2-0',   // Australia 2-0 Turkey
        'g-E-0': '7-1',   // Germany 7-1 Curacao
        'g-F-0': '2-2',   // Netherlands 2-2 Japan
        'g-E-1': '1-0',   // Ivory Coast 1-0 Ecuador
        'g-F-1': '5-1',   // Sweden 5-1 Tunisia
        'g-G-0': '1-1',   // Belgium 1-1 Egypt
        'g-H-0': '0-0',   // Spain 0-0 Cape Verde
        'g-H-1': '1-1',   // Saudi Arabia 1-1 Uruguay
        'g-G-1': '2-2',   // Iran 2-2 New Zealand
        'g-I-0': '3-1',   // France 3-1 Senegal
        'g-I-1': '1-4',   // Iraq 1-4 Norway (updated)
        'g-J-1': '3-1',   // Austria 3-1 Jordan
        'g-J-0': '3-0',   // Argentina 3-0 Algeria
        ...JSON.parse(localStorage.getItem('wc26-scores') || '{}'),
      }
    } catch { return {
      'g-A-0': '2-0', 'g-A-1': '2-1',
      'g-B-0': '1-1', 'g-D-0': '4-1',
      'g-B-1': '1-1', 'g-C-0': '1-1',
      'g-C-1': '0-1',
      'g-D-1': '2-0',
      'g-E-0': '7-1',   // Germany 7-1 Curacao
      'g-F-0': '2-2',   // Netherlands 2-2 Japan
      'g-E-1': '1-0',   // Ivory Coast 1-0 Ecuador
      'g-F-1': '5-1',   // Sweden 5-1 Tunisia
      'g-G-0': '1-1',   // Belgium 1-1 Egypt
      'g-H-0': '0-0',   // Spain 0-0 Cape Verde
      'g-H-1': '1-1',   // Saudi Arabia 1-1 Uruguay
      'g-G-1': '2-2',   // Iran 2-2 New Zealand
      'g-I-0': '3-1',   // France 3-1 Senegal
      'g-I-1': '1-4',   // Iraq 1-4 Norway (updated)
      'g-J-1': '3-1',   // Austria 3-1 Jordan
      'g-J-0': '3-0',   // Argentina 3-0 Algeria
    } }
  })

  const teamScoreMap = useMemo(() => {
    const sc = computeScores(teams, DEFAULT_WEIGHTS)
    const map = new Map<string, number>()
    for (const s of sc) map.set(s.teamId, s.total)
    return map
  }, [])

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [])

  // ── Frozen predictions for matches within 2 days ──────
  const [frozenPreds, setFrozenPreds] = useState<Record<string, string>>(getFrozenPredictions)
  const [frozenTs, setFrozenTs] = useState<string>(getFrozenTimestamp)

  // On mount, freeze predictions for upcoming matches within 2 days
  useEffect(() => {
    const frozen = getFrozenPredictions()
    let changed = false
    for (const m of allMatches) {
      if (!m.home || !m.away) continue
      if (isMatchPast(m.dateNum)) continue // only future matches
      if (!isMatchWithinDays(m.dateNum, 2)) continue // only within 2 days
      if (frozen[m.id]) continue // already frozen

      const home = teamMap.get(m.home)
      const away = teamMap.get(m.away)
      if (!home || !away) continue

      // Compute & freeze
      const [ph, pa] = predictScore(home.id, away.id, teamScoreMap)
      frozen[m.id] = `${ph}-${pa}`
      changed = true
    }
    if (changed) {
      setFrozenPredictions(frozen)
      setFrozenTimestamp()
      setFrozenPreds(frozen)
      setFrozenTs(getFrozenTimestamp())
    }
  }, [])

  // Detailed team stats for schedule display
  const teamStatsMap = useMemo(() => {
    const map = new Map<string, { attack: string; defense: string; opponent: string }>()
    const continentStrength: Record<string, number> = {
      UEFA: 1.15, CONMEBOL: 1.10, CONCACAF: 1.00, CAF: 0.95, AFC: 0.90, OFC: 0.85,
    }
    for (const t of teams) {
      map.set(t.id, {
        attack: (t.goalsFor20 / 20).toFixed(1),
        defense: (5 - t.goalsAgainst20 / 20).toFixed(1),
        opponent: (() => {
          const val = continentStrength[t.continent] ?? 1.0
          const pct = Math.round((1 - val) * 100)  // reversed: weak teams get +buff, strong teams get -buff
          return pct > 0 ? `+${pct}%` : pct < 0 ? `${pct}%` : '0%'
        })(),
      })
    }
    return map
  }, [])

  const filtered = useMemo(() => {
    return allMatches.filter(m => {
      if (filterRound !== 'all' && m.round !== filterRound) return false
      if (filterGroup !== 'all' && m.group !== filterGroup) return false
      if (filterVenue !== 'all' && m.venue !== filterVenue) return false
      return true
    })
  }, [filterRound, filterGroup, filterVenue])

  const byDate = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of filtered) {
      if (!map.has(m.date)) map.set(m.date, [])
      map.get(m.date)!.push(m)
    }
        // Sort matches within each date by UTC time so ceremonies/matches appear chronologically
        const sorted = Array.from(map.entries())
          .sort(([a], [b]) => parseDateNum(a) - parseDateNum(b))
          .map(([date, ms]) => [
            date,
            ms.sort((a, b) => {
              const utcA = (parseInt(a.localTime.split(':')[0]) * 60 + parseInt(a.localTime.split(':')[1])) - a.utcOffset * 60
              const utcB = (parseInt(b.localTime.split(':')[0]) * 60 + parseInt(b.localTime.split(':')[1])) - b.utcOffset * 60
              return utcA - utcB
            }),
          ]) as [string, Match[]][]
    return sorted
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <select value={filterRound} onChange={e => setFilterRound(e.target.value)}
          className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600">
          <option value="all">全部轮次</option>
          {Object.entries(roundLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
          className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600">
          <option value="all">全部小组</option>
          {groupNames.map(g => <option key={g} value={g}>{g} 组</option>)}
        </select>
        <select value={filterVenue} onChange={e => setFilterVenue(e.target.value)}
          className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600">
          <option value="all">全部场地</option>
          {allVenueKeys.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <span className="text-sm text-slate-400 self-center ml-auto">
          共 {filtered.length} 场
        </span>
        <SyncButton setLiveScores={setLiveScores} />
      </div>

      {/* Schedule */}
      <div className="space-y-3">
        {byDate.map(([date, matches]) => {
          // Use first match's Beijing time for the date header
          const bj = matches[0] ? localToBeijing(matches[0].date, matches[0].localTime, matches[0].utcOffset) : { date: '', time: '' }
          return (
          <div key={date} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-2">
              <span className="text-sm font-semibold text-yellow-400">北京时间 {bj.date}</span>
              <span className="text-xs text-slate-500">（{date}）</span>
            </div>
            <div className="divide-y divide-slate-700/50">
              {matches.map(m => {
                const home = teamMap.get(m.home)
                const away = teamMap.get(m.away)
                const past = isMatchPast(m.dateNum)
                const bjTime = localToBeijing(m.date, m.localTime, m.utcOffset)
                const storedScore = liveScores[m.id]

                let scoreContent: ReactNode = null
                // Store prediction in localStorage for future reference
                if (!past && home && away) {
                  const [ph, pa] = predictScore(home.id, away.id, teamScoreMap)
                  const predStr = `${ph}-${pa}`
                  try {
                    const preds = JSON.parse(localStorage.getItem('wc26-predicted') || '{}')
                    if (!preds[m.id]) {
                      preds[m.id] = predStr
                      localStorage.setItem('wc26-predicted', JSON.stringify(preds))
                    }
                  } catch {}
                } else {
                  // Ensure prediction is stored in localStorage for Accuracy page
                  try {
                    const preds = JSON.parse(localStorage.getItem('wc26-predicted') || '{}')
                    if (!preds[m.id] && home && away) {
                      if (frozenPreds[m.id]) {
                        preds[m.id] = frozenPreds[m.id]
                      } else {
                        const [ph, pa] = predictScore(home.id, away.id, teamScoreMap)
                        preds[m.id] = `${ph}-${pa}`
                      }
                      localStorage.setItem('wc26-predicted', JSON.stringify(preds))
                    }
                  } catch {}
                }

                if (past && storedScore && home && away) {
                  // 已完结比赛 — 读取存档预测，不重新计算
                  let cached = ''
                  try {
                    const preds = JSON.parse(localStorage.getItem('wc26-predicted') || '{}')
                    cached = preds[m.id] || ''
                  } catch {}
                  const predStr = DEFAULT_PREDICTIONS[m.id] || frozenPreds[m.id] || cached || ''
                  let comparison: { icon: string; label: string; color: string } | null = null
                  if (predStr) {
                    const [aH, aA] = storedScore.split('-').map(Number)
                    const [pH, pA] = predStr.split('-').map(Number)
                    if (aH === pH && aA === pA) {
                      comparison = { icon: '✅', label: '预测准确', color: 'text-green-400' }
                    } else {
                      const actualWinner = aH > aA ? 'home' : aA > aH ? 'away' : 'draw'
                      const predWinner = pH > pA ? 'home' : pA > pH ? 'away' : 'draw'
                      comparison = actualWinner === predWinner
                        ? { icon: '⚠️', label: '方向对·比分差', color: 'text-yellow-400' }
                        : { icon: '❌', label: '预测错误', color: 'text-red-400' }
                    }
                  }
                  scoreContent = (
                    <div className="flex flex-col items-center">
                      <span className="text-green-400 font-bold text-lg">{storedScore}</span>
                      {predStr && <span className="flex items-center gap-1 text-orange-400 text-xs font-medium whitespace-nowrap">
                        {comparison && <span className={comparison.color}>{comparison.icon}</span>}
                        预测 {predStr}
                        <span className="text-[9px] text-slate-600 font-mono ml-0.5">{modelTag(m.id)}</span>
                      </span>}
                      {comparison && comparison.label !== '预测准确' && (
                        <span className={`${comparison.color} text-[10px] font-medium whitespace-nowrap`}>{comparison.label}</span>
                      )}
                      {home && away && (() => {
                        const sp = predictScoreProbsW(home.id, away.id, teamScoreMap)
                        return (
                          <span className="text-[9px] text-slate-600 font-mono mt-0.5">
                            胜{fmtPct(sp.probs.homeWin)} 平{fmtPct(sp.probs.draw)} 负{fmtPct(sp.probs.awayWin)}
                            <span className="ml-1.5 text-slate-700">比分{fmtPct(sp.probs.scoreProb)}</span>
                          </span>
                        )
                      })()}
                    </div>
                  )
                } else if (home && away) {
                  // 只有预测，无实际比分
                  let predStr = DEFAULT_PREDICTIONS[m.id] || frozenPreds[m.id] || ''
                  if (!predStr) {
                    try {
                      const preds = JSON.parse(localStorage.getItem('wc26-predicted') || '{}')
                      predStr = preds[m.id] || ''
                    } catch {}
                  }
                  if (!predStr) {
                    const [ph, pa] = predictScore(home.id, away.id, teamScoreMap)
                    predStr = `${ph}-${pa}`
                  }
                  scoreContent = (
                    <div className="flex flex-col items-center">
                      <span className="text-orange-400 font-bold text-lg whitespace-nowrap">
                        预测 {predStr}
                        <span className="text-[9px] text-slate-600 font-mono ml-1">{modelTag(m.id)}</span>
                      </span>
                      {home && away && (() => {
                        const sp = predictScoreProbsW(home.id, away.id, teamScoreMap)
                        return (
                          <span className="text-[9px] text-slate-600 font-mono mt-0.5">
                            胜{fmtPct(sp.probs.homeWin)} 平{fmtPct(sp.probs.draw)} 负{fmtPct(sp.probs.awayWin)}
                            <span className="ml-1.5 text-slate-700">比分{fmtPct(sp.probs.scoreProb)}</span>
                          </span>
                        )
                      })()}
                    </div>
                  )
                }

                if (m.round === 'ceremony') {
                  const d = m.ceremonyDetail
                  const isClosing = m.id === 'ceremony-closing'
                  const icon = isClosing ? '🎆' : '🎭'
                  const label = isClosing ? '闭幕式' : `${d?.host || ''}开幕式`
                  return (
                    <div key={m.id} className="px-4 py-6 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-24 text-center">
                        <div className="text-yellow-400 font-mono text-base font-bold">{bjTime.date}<br/>{bjTime.time}</div>
                        <div className="text-slate-500 font-mono text-xs">
                          {m.localTime}<span className="text-slate-600"> UTC{m.utcOffset >= 0 ? '+' : ''}{m.utcOffset}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center text-center min-w-0 flex-1 px-2">
                        <div className="flex items-center gap-2 justify-center">
                          <span className="text-2xl">{icon}</span>
                          <span className="text-white text-lg font-bold">{label}</span>
                          {d?.theme && <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded">{d.theme}</span>}
                        </div>
                        {d?.artists && (
                          <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-lg">{d.artists}</p>
                        )}
                      </div>
                      <div className="text-slate-400 text-sm flex-shrink-0 text-right leading-snug hidden sm:block">
                        {m.venue}<br /><span className="text-slate-500">{m.city}</span>
                      </div>
                    </div>
                  )
                }

                if (m.round !== 'group' && !home && !away) {
                  return (
                    <div key={m.id} className="px-4 py-3 text-base text-slate-500 italic">
                      {roundLabels[m.round]} — 待定对阵
                    </div>
                  )
                }

                return (
                  <div key={m.id} className="px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    {/* Time column: mobile inline, desktop stacked */}
                    <div className="flex-shrink-0 w-full sm:w-24 text-center">
                      <div className="text-yellow-400 font-mono text-sm sm:text-base font-bold">
                        <span className="sm:hidden">{bjTime.date} {bjTime.time}</span>
                        <span className="hidden sm:inline">{bjTime.date}<br/>{bjTime.time}</span>
                      </div>
                      <div className="text-slate-500 font-mono text-xs hidden sm:block">
                        {m.localTime}<span className="text-slate-600"> UTC{m.utcOffset >= 0 ? '+' : ''}{m.utcOffset}</span>
                      </div>
                    </div>

                    {/* Teams + score */}
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 justify-center">
                      {/* Home team: stats below name on mobile / left of flag on desktop */}
                      <div className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1">
                        <div className="flex flex-col items-center order-1 sm:order-2">
                          <FlagImg code={home?.flagCode || ''} size={22} className="sm:w-7 sm:h-7" />
                          <span className="truncate text-white text-xs font-medium mt-0.5">{home?.nameCN || '待定'}</span>
                        </div>
                        {home && (() => {
                          const st = teamStatsMap.get(home.id)
                          return st ? (
                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-x-2 sm:gap-x-0 sm:mr-1 text-[11px] leading-tight order-2 sm:order-1">
                              <span className="text-green-400 font-bold">攻 {st.attack}</span>
                              <span className="text-blue-400 font-bold">防 {st.defense}</span>
                              <span className="text-purple-400 font-bold">状 {st.opponent}</span>
                            </div>
                          ) : null
                        })()}
                      </div>

                      <span className="mx-0 sm:mx-3 font-mono min-w-[4.5rem] sm:min-w-[6rem] text-center">
                        {scoreContent || <span className="text-slate-600">vs</span>}
                      </span>

                      {/* Away team: flag+name on the left, stats below on mobile / right of flag on desktop */}
                      <div className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1">
                        <div className="flex flex-col items-center order-1">
                          <FlagImg code={away?.flagCode || ''} size={22} className="sm:w-7 sm:h-7" />
                          <span className="truncate text-white text-xs font-medium mt-0.5">{away?.nameCN || '待定'}</span>
                        </div>
                        {away && (() => {
                          const st = teamStatsMap.get(away.id)
                          return st ? (
                            <div className="flex flex-row sm:flex-col items-center sm:items-start gap-x-2 sm:gap-x-0 sm:ml-1 text-[11px] leading-tight order-2">
                              <span className="text-green-400 font-bold">攻 {st.attack}</span>
                              <span className="text-blue-400 font-bold">防 {st.defense}</span>
                              <span className="text-purple-400 font-bold">状 {st.opponent}</span>
                            </div>
                          ) : null
                        })()}
                      </div>
                    </div>

                    {/* Status indicator — visible on both mobile and desktop */}
                    <div className="text-[10px] font-medium text-center sm:text-right sm:flex-shrink-0 sm:max-w-[12rem]">
                      {(past || storedScore || isMatchWithinDays(m.dateNum, 2))
                        ? <span className="text-slate-500">最后更新 {frozenTs || '—'}</span>
                        : <span className="text-slate-600">实时计算</span>
                      }
                    </div>

                    {/* Venue + analysis */}
                    <div className="text-slate-400 text-sm flex-shrink-0 text-right leading-snug hidden sm:block max-w-[12rem]">
                      {m.venue}<br /><span className="text-slate-500">{m.city}</span>
                      {matchNotes[m.id] && (() => {
                        // Split "比分 vs 预测比分 | 分析原因"
                        const sep = matchNotes[m.id].indexOf(' | ')
                        const scoreComp = sep > 0 ? matchNotes[m.id].slice(0, sep) : ''
                        const reason = sep > 0 ? matchNotes[m.id].slice(sep + 3) : matchNotes[m.id]
                        return (
                          <div className="mt-1 leading-tight">
                            {scoreComp && <div className="text-yellow-400 text-[11px] font-semibold">{scoreComp}</div>}
                            <div className="text-green-400/90 text-[11px]">{reason}</div>
                          </div>
                        )
                      })()}
                    </div>

                    {m.group && (() => {
                      const gc = groupColors[m.group] || { bg: '#334155', text: '#cbd5e1' }
                      return (
                      <span className="px-2 py-0.5 rounded text-sm font-mono flex-shrink-0 hidden sm:inline"
                        style={{ backgroundColor: gc.bg, color: gc.text }}>
                        {m.group}组
                      </span>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
