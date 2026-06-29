/**
 * fetch-results.mjs — 从 ESPN API 拉取最近完赛比分并输出
 *
 * 用法: node scripts/fetch-results.mjs
 *
 * 依赖: Node.js 18+ (内置 fetch)
 *
 * 支持的比赛:
 *   小组赛 — g-{A..L}-{0..5}
 *   淘汰赛 — ko-{YYYYMMDD}-{N} (按日期+顺序自动编号)
 */

const ESPN_TEAM_MAP = {
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

const GROUP_MATCHES = {
  A: [['mexico','south-africa'],['south-korea','czech-republic'],['czech-republic','south-africa'],['mexico','south-korea'],['czech-republic','mexico'],['south-africa','south-korea']],
  B: [['canada','bosnia'],['qatar','switzerland'],['switzerland','bosnia'],['canada','qatar'],['switzerland','canada'],['bosnia','qatar']],
  C: [['brazil','morocco'],['haiti','scotland'],['scotland','morocco'],['brazil','haiti'],['scotland','brazil'],['morocco','haiti']],
  D: [['usa','paraguay'],['australia','turkey'],['usa','australia'],['turkey','paraguay'],['turkey','usa'],['paraguay','australia']],
  E: [['germany','curacao'],['ivory-coast','ecuador'],['germany','ivory-coast'],['ecuador','curacao'],['curacao','ivory-coast'],['ecuador','germany']],
  F: [['netherlands','japan'],['sweden','tunisia'],['netherlands','sweden'],['tunisia','japan'],['japan','sweden'],['tunisia','netherlands']],
  G: [['belgium','egypt'],['iran','new-zealand'],['belgium','iran'],['new-zealand','egypt'],['egypt','iran'],['new-zealand','belgium']],
  H: [['spain','cape-verde'],['saudi-arabia','uruguay'],['spain','saudi-arabia'],['uruguay','cape-verde'],['cape-verde','saudi-arabia'],['uruguay','spain']],
  I: [['france','senegal'],['iraq','norway'],['france','iraq'],['norway','senegal'],['norway','france'],['senegal','iraq']],
  J: [['argentina','algeria'],['austria','jordan'],['argentina','austria'],['jordan','algeria'],['algeria','austria'],['jordan','argentina']],
  K: [['portugal','dr-congo'],['uzbekistan','colombia'],['portugal','uzbekistan'],['colombia','dr-congo'],['colombia','portugal'],['dr-congo','uzbekistan']],
  L: [['england','croatia'],['ghana','panama'],['england','ghana'],['panama','croatia'],['panama','england'],['croatia','ghana']],
}

// Build group match lookup
const matchLookup = {}
for (const [g, matches] of Object.entries(GROUP_MATCHES)) {
  matches.forEach(([home, away], mi) => {
    matchLookup[home + '-' + away] = `g-${g}-${mi}`
  })
}

// Knockout match counter (per date)
const koCounter = {}

function getTeamId(homeAbbr, awayAbbr) {
  const homeId = ESPN_TEAM_MAP[homeAbbr]
  const awayId = ESPN_TEAM_MAP[awayAbbr]
  if (homeId && awayId) return [homeId, awayId]
  return null
}

function getMatchId(homeId, awayId, dateStr) {
  const key = homeId + '-' + awayId
  // Try group match first
  const gid = matchLookup[key]
  if (gid) return gid
  // Fallback: knockout ID
  koCounter[dateStr] = (koCounter[dateStr] || 0) + 1
  return `ko-${dateStr}-${koCounter[dateStr]}`
}

async function fetchDate(dateStr) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`
  const res = await fetch(url)
  if (!res.ok) return { scores: {}, events: [] }
  const data = await res.json()
  const scores = {}
  const events = []
  for (const ev of data.events || []) {
    const comp = ev.competitions?.[0]
    if (!comp) continue
    const home = comp.competitors?.find(c => c.homeAway === 'home')
    const away = comp.competitors?.find(c => c.homeAway === 'away')
    if (!home || !away) continue
    const homeAbbr = home.team?.abbreviation
    const awayAbbr = away.team?.abbreviation
    if (!homeAbbr || !awayAbbr) continue
    const ids = getTeamId(homeAbbr, awayAbbr)
    if (!ids) {
      events.push({ dateStr, name: ev.name || `${homeAbbr} vs ${awayAbbr}`, matchId: null, reason: `unknown team: ${homeAbbr}/${awayAbbr}` })
      continue
    }
    const [homeId, awayId] = ids
    const matchId = getMatchId(homeId, awayId, dateStr)
    const completed = comp.status?.type?.completed || comp.status?.type?.state === 'post'
    const score = completed ? `${home.score}-${away.score}` : null
    if (score) {
      scores[matchId] = score
    }
    events.push({ dateStr, name: ev.name || `${homeAbbr} vs ${awayAbbr}`, matchId, score: score || '—', completed, state: comp.status?.type?.state })
  }
  return { scores, events }
}

async function main() {
  const today = new Date()
  const start = new Date(2026, 5, 11) // June 11, 2026
  const allScores = {}
  const allEvents = []

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const { scores, events } = await fetchDate(ds)
    Object.assign(allScores, scores)
    allEvents.push(...events)
  }

  // ── 赛事日历 ──
  console.log('\n=== 所有赛事日历 ===')
  for (const ev of allEvents.sort((a,b) => a.dateStr.localeCompare(b.dateStr) || (a.matchId||'').localeCompare(b.matchId||''))) {
    const flag = ev.completed ? '✅' : '⏳'
    const id = ev.matchId || '⚠️ 未匹配'
    console.log(`${flag} ${ev.dateStr} | ${id.padEnd(16)} | ${ev.name.padEnd(40)} | ${ev.score} | ${ev.state}`)
  }

  // ── 完赛比分 ──
  console.log('\n=== 最新完赛比分 ===')
  console.log(`共 ${Object.keys(allScores).length} 场已完赛比赛\n`)

  const sorted = Object.entries(allScores).sort(([a], [b]) => a.localeCompare(b))
  console.log('export const LIVE_SCORES: Record<string, string> = {')
  for (const [id, score] of sorted) {
    console.log(`  '${id}': '${score}',`)
  }
  console.log('}\n')

  // 小组赛已有ID集合
  const allGroupIds = new Set()
  for (const [g, matches] of Object.entries(GROUP_MATCHES)) {
    matches.forEach((_, mi) => { allGroupIds.add(`g-${g}-${mi}`) })
  }

  const newResults = sorted.filter(([id]) => !allGroupIds.has(id))
  if (newResults.length > 0) {
    console.log('=== 淘汰赛新结果（需添加注解）===')
    for (const [id, score] of newResults) {
      console.log(`${id}: ${score}`)
    }
  }
}

main().catch(console.error)
