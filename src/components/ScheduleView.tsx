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
import { computeScores, DEFAULT_WEIGHTS, type TeamScores } from '../engine/scorer'
import { predictMostLikelyScore, predictScoreProbs } from '../engine/poisson'
import { computeAllStandings } from '../engine/standings'
import { LIVE_SCORES, FROZEN_PREDICTIONS, MATCH_NOTES, modelTag } from '../data/results'
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

  // ── Round of 32 (actual FIFA schedule) ────────────────
  const r32Schedule: { date: string; localTime: string; venueKey: string }[] = [
    // Match 73: South Africa vs Canada — June 28, 12:00 UTC-7, SoFi Stadium
    { date: '6月28日', localTime: '12:00', venueKey: 'SoFi体育场' },
    // Match 76: Brazil vs Japan — June 29, 12:00 UTC-5, NRG Stadium
    { date: '6月29日', localTime: '12:00', venueKey: 'NRG体育场' },
    // Match 74: Germany vs Paraguay — June 29, 16:30 UTC-4, Gillette Stadium
    { date: '6月29日', localTime: '16:30', venueKey: '吉列体育场' },
    // Match 75: Netherlands vs Morocco — June 29, 19:00 UTC-6, Estadio BBVA
    { date: '6月29日', localTime: '19:00', venueKey: 'BBVA体育场' },
    // Match 78: Ivory Coast vs Norway — June 30, 12:00 UTC-5, AT&T Stadium
    { date: '6月30日', localTime: '12:00', venueKey: 'AT&T体育场' },
    // Match 77: France vs Sweden — June 30, 17:00 UTC-4, MetLife Stadium
    { date: '6月30日', localTime: '17:00', venueKey: '大都会人寿体育场' },
    // Match 79: Mexico vs Ecuador — June 30, 19:00 UTC-6, Estadio Azteca
    { date: '6月30日', localTime: '19:00', venueKey: '阿兹特克体育场' },
    // Match 80: England vs DR Congo — July 1, 12:00 UTC-4, Mercedes-Benz Stadium
    { date: '7月1日', localTime: '12:00', venueKey: '梅赛德斯-宾士体育场' },
    // Match 82: Belgium vs Senegal — July 1, 13:00 UTC-7, Lumen Field
    { date: '7月1日', localTime: '13:00', venueKey: '流明球场' },
    // Match 81: USA vs Bosnia — July 1, 17:00 UTC-7, Levi's Stadium
    { date: '7月1日', localTime: '17:00', venueKey: '李维斯体育场' },
    // Match 84: Spain vs Austria — July 2, 12:00 UTC-7, SoFi Stadium
    { date: '7月2日', localTime: '12:00', venueKey: 'SoFi体育场' },
    // Match 83: Portugal vs Croatia — July 2, 19:00 UTC-4, BMO Field
    { date: '7月2日', localTime: '19:00', venueKey: 'BMO球场' },
    // Match 85: Switzerland vs Algeria — July 2, 20:00 UTC-7, BC Place
    { date: '7月2日', localTime: '20:00', venueKey: '卑诗体育馆' },
    // Match 88: Australia vs Egypt — July 3, 13:00 UTC-5, AT&T Stadium
    { date: '7月3日', localTime: '13:00', venueKey: 'AT&T体育场' },
    // Match 86: Argentina vs Cape Verde — July 3, 18:00 UTC-4, Hard Rock Stadium
    { date: '7月3日', localTime: '18:00', venueKey: '硬石体育场' },
    // Match 87: Colombia vs Ghana — July 3, 20:30 UTC-5, Arrowhead Stadium
    { date: '7月3日', localTime: '20:30', venueKey: '箭頭体育场' },
  ]

  for (let i = 0; i < r32Schedule.length; i++) {
    const { date, localTime, venueKey } = r32Schedule[i]
    const vi = venueMap[venueKey]
    matches.push({
      id: `r32-${i}`,
      date,
      dateNum: parseDateNum(date),
      localTime,
      utcOffset: vi.utcOffset,
      home: '', away: '',
      venue: vi.venue,
      city: vi.city,
      round: 'r32',
    })
  }

  // ── Other knockout rounds (generic) ───────────────────
  const koSchedule: { round: Match['round']; dates: string[]; count: number }[] = [
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
        setLiveScores(prev => {
          const merged = { ...prev, ...scores }
          localStorage.setItem('wc26-scores', JSON.stringify(merged))
          return merged
        })
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
): { score: [number, number]; probs: import('../engine/poisson').ScoreProbs; bestOverallScore: [number, number] } {
  const hs = tm.get(homeId) || 50
  const as = tm.get(awayId) || 50
  return predictScoreProbs(hs, as)
}

/** Format a probability 0-1 as a percentage string like "67.3" */
function fmtPct(p: number): string {
  return (p * 100).toFixed(1)
}


// ── Component ──────────────────────────────────────────────
export function ScheduleView() {
  const [filterRound, setFilterRound] = useState<string>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [filterVenue, setFilterVenue] = useState<string>('all')
  const [filterTeam, setFilterTeam] = useState<string>('all')

  const [liveScores, setLiveScores] = useState<Record<string, string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('wc26-scores') || '{}')
      return { ...LIVE_SCORES, ...stored }
    } catch {
      return { ...LIVE_SCORES }
    }
  })

  const teamScoreMap = useMemo(() => {
    const sc = computeScores(teams, DEFAULT_WEIGHTS)
    const map = new Map<string, number>()
    for (const s of sc) map.set(s.teamId, s.total)
    return map
  }, [])

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [])

  // ── Resolve 32强 actual team matchups from standings ─────
  const r32TeamIds = useMemo(() => {
    // Compute scores + standings (same weights as teamScoreMap)
    const sc = computeScores(teams, DEFAULT_WEIGHTS)
    let liveScores: Record<string, string> = {}
    try {
      liveScores = JSON.parse(localStorage.getItem('wc26-scores') || '{}')
    } catch {}
    liveScores = { ...LIVE_SCORES, ...liveScores }
    const standings = computeAllStandings(sc, liveScores)

    // Bracket resolution (same logic as Round32View / BracketView)
    const groups = new Map<string, TeamScores[]>()
    for (const s of sc) {
      if (!groups.has(s.group)) groups.set(s.group, [])
      groups.get(s.group)!.push(s)
    }

    const groupRanked = new Map<string, TeamScores[]>()
    for (const [g, gTeams] of groups) {
      const groupSt = standings.get(g)
      if (groupSt) {
        const rankMap = new Map(groupSt.map((s, i) => [s.teamId, i]))
        const sorted = [...gTeams].sort(
          (a, b) => (rankMap.get(a.teamId) ?? 99) - (rankMap.get(b.teamId) ?? 99),
        )
        groupRanked.set(g, sorted)
      } else {
        groupRanked.set(g, [...gTeams].sort((a, b) => b.total - a.total))
      }
    }

    const slotMap = new Map<string, TeamScores>()
    const allThird: { team: TeamScores; pts: number; gd: number; gf: number }[] = []
    for (const [g, ranked] of groupRanked) {
      if (ranked[0]) slotMap.set(`${g}1`, ranked[0])
      if (ranked[1]) slotMap.set(`${g}2`, ranked[1])
      if (ranked[2]) {
        const st = standings.get(g)?.find(s => s.teamId === ranked[2].teamId)
        allThird.push({ team: ranked[2], pts: st?.pts ?? 0, gd: st?.gd ?? 0, gf: st?.gf ?? 0 })
      }
    }

    allThird.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })
    const bestThird = allThird.slice(0, 8)

    const thirdMatchOrder = [74, 77, 79, 80, 81, 82, 85, 87]
    const assigned = new Map<number, TeamScores>()
    for (let i = 0; i < Math.min(bestThird.length, 8); i++) {
      assigned.set(thirdMatchOrder[i], bestThird[i].team)
    }

    const matchDefs: Record<number, [string, string]> = {
      73: ['A2', 'B2'],
      74: ['E1', assigned.get(74)?.teamId ?? ''],
      75: ['F1', 'C2'],
      76: ['C1', 'F2'],
      77: ['I1', assigned.get(77)?.teamId ?? ''],
      78: ['E2', 'I2'],
      79: ['A1', assigned.get(79)?.teamId ?? ''],
      80: ['L1', assigned.get(80)?.teamId ?? ''],
      81: ['D1', assigned.get(81)?.teamId ?? ''],
      82: ['G1', assigned.get(82)?.teamId ?? ''],
      83: ['K2', 'L2'],
      84: ['H1', 'J2'],
      85: ['B1', assigned.get(85)?.teamId ?? ''],
      86: ['J1', 'H2'],
      87: ['K1', assigned.get(87)?.teamId ?? ''],
      88: ['D2', 'G2'],
    }

    const resolveSlot = (slot: string): string | undefined => {
      if (/^[A-L][12]$/.test(slot)) return slotMap.get(slot)?.teamId
      return sc.find(s => s.teamId === slot)?.teamId
    }

    const result = new Map<string, { home: string; away: string }>()
    let matchIndex = 0
    for (let m = 73; m <= 88; m++) {
      const def = matchDefs[m]
      if (!def) continue
      const [homeSlot, awaySlot] = def
      const home = resolveSlot(homeSlot)
      const away = resolveSlot(awaySlot)
      if (!home || !away) continue
      result.set(`r32-${matchIndex}`, { home, away })
      matchIndex++
    }
    return result
  }, [])

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
      if (filterTeam !== 'all') {
        const r32Pair = !m.home && !m.away && m.round === 'r32' ? r32TeamIds.get(m.id) : undefined
        const h = r32Pair?.home ?? m.home
        const a = r32Pair?.away ?? m.away
        if (h !== filterTeam && a !== filterTeam) return false
      }
      return true
    })
  }, [filterRound, filterGroup, filterVenue, filterTeam])

  // Teams that have matches under current round/group/venue filters (excluding team filter)
  const availableTeams = useMemo(() => {
    const teamIds = new Set<string>()
    for (const m of allMatches) {
      if (filterRound !== 'all' && m.round !== filterRound) continue
      if (filterGroup !== 'all' && m.group !== filterGroup) continue
      if (filterVenue !== 'all' && m.venue !== filterVenue) continue
      if (m.home) teamIds.add(m.home)
      if (m.away) teamIds.add(m.away)
      // Include teams from resolved r32 matchups
      if (!m.home && !m.away && m.round === 'r32') {
        const p = r32TeamIds.get(m.id)
        if (p) { teamIds.add(p.home); teamIds.add(p.away) }
      }
    }
    // Always include the currently selected team even if filtered out
    if (filterTeam !== 'all') teamIds.add(filterTeam)
    return teams
      .filter(t => teamIds.has(t.id))
      .sort((a, b) => a.nameCN.localeCompare(b.nameCN, 'zh'))
  }, [filterRound, filterGroup, filterVenue, filterTeam])

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
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 max-w-[14rem]">
          <option value="all">全部球队</option>
          {availableTeams.map(t =>
            <option key={t.id} value={t.id}>{t.nameCN}（{t.group}组）</option>
          )}
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
                // For knockout matches with blank teams, fill from resolved r32 bracket
                const r32Pair = !m.home && !m.away && m.round === 'r32' ? r32TeamIds.get(m.id) : undefined
                const home = teamMap.get(r32Pair?.home ?? m.home)
                const away = teamMap.get(r32Pair?.away ?? m.away)
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
                  const predStr = FROZEN_PREDICTIONS[m.id] || frozenPreds[m.id] || cached || ''
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
                        {home && away && (() => {
                          const sp = predictScoreProbsW(home.id, away.id, teamScoreMap)
                          return sp.bestOverallScore[0] !== sp.score[0] || sp.bestOverallScore[1] !== sp.score[1]
                            ? <span className="text-orange-400">({sp.bestOverallScore[0]}-{sp.bestOverallScore[1]})</span>
                            : null
                        })()}
                        <span className="text-[9px] text-slate-600 font-mono ml-0.5">{modelTag(m.id)}</span>
                      </span>}
                      {comparison && comparison.label !== '预测准确' && (
                        <span className={`${comparison.color} text-[10px] font-medium whitespace-nowrap`}>{comparison.label}</span>
                      )}
                      {home && away && (() => {
                        const sp = predictScoreProbsW(home.id, away.id, teamScoreMap)
                        return (
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            胜{fmtPct(sp.probs.homeWin)} 平{fmtPct(sp.probs.draw)} 负{fmtPct(sp.probs.awayWin)}
                            <span className="ml-1.5 text-slate-500">比分{fmtPct(sp.probs.scoreProb)}</span>
                          </span>
                        )
                      })()}
                    </div>
                  )
                } else if (home && away) {
                  // 只有预测，无实际比分
                  let predStr = FROZEN_PREDICTIONS[m.id] || frozenPreds[m.id] || ''
                  if (!predStr) {
                    try {
                      const preds = JSON.parse(localStorage.getItem('wc26-predicted') || '{}')
                      predStr = preds[m.id] || ''
                    } catch {}
                  }
                  if (!predStr) {
                    const sp = predictScoreProbsW(home.id, away.id, teamScoreMap)
                    predStr = `${sp.score[0]}-${sp.score[1]}`
                  }
                  scoreContent = (
                    <div className="flex flex-col items-center">
                      <span className="text-orange-400 font-bold text-lg whitespace-nowrap">
                        预测 {predStr}
                        {home && away && (() => {
                          const sp = predictScoreProbsW(home.id, away.id, teamScoreMap)
                          return sp.bestOverallScore[0] !== sp.score[0] || sp.bestOverallScore[1] !== sp.score[1]
                            ? <span className="text-orange-400 text-sm font-normal">({sp.bestOverallScore[0]}-{sp.bestOverallScore[1]})</span>
                            : null
                        })()}
                        <span className="text-[9px] text-slate-600 font-mono ml-1">{modelTag(m.id)}</span>
                      </span>
                      {home && away && (() => {
                        const sp = predictScoreProbsW(home.id, away.id, teamScoreMap)
                        return (
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            胜{fmtPct(sp.probs.homeWin)} 平{fmtPct(sp.probs.draw)} 负{fmtPct(sp.probs.awayWin)}
                            <span className="ml-1.5 text-slate-500">比分{fmtPct(sp.probs.scoreProb)}</span>
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
                      {MATCH_NOTES[m.id] && (() => {
                        // Split "比分 vs 预测比分 | 分析原因"
                        const sep = MATCH_NOTES[m.id].indexOf(' | ')
                        const scoreComp = sep > 0 ? MATCH_NOTES[m.id].slice(0, sep) : ''
                        const reason = sep > 0 ? MATCH_NOTES[m.id].slice(sep + 3) : MATCH_NOTES[m.id]
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
