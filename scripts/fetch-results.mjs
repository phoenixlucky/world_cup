/**
 * fetch-results.mjs — 从 ESPN API 拉取最近完赛比分并输出
 *
 * 用法: node scripts/fetch-results.mjs
 *
 * 会将新比分输出到控制台，方便更新 src/data/results.ts
 *
 * 依赖: Node.js 18+ (内置 fetch)
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

// Group matches lookup: "home-away" -> "g-GROUP-INDEX"
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

const matchLookup = {}
for (const [g, matches] of Object.entries(GROUP_MATCHES)) {
  matches.forEach(([home, away], mi) => {
    matchLookup[home + '-' + away] = `g-${g}-${mi}`
  })
}

async function fetchDate(dateStr) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`
  const res = await fetch(url)
  if (!res.ok) return {}
  const data = await res.json()
  const result = {}
  for (const ev of data.events || []) {
    const comp = ev.competitions?.[0]
    if (!comp) continue
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
    const key = homeId + '-' + awayId
    const matchId = matchLookup[key]
    if (matchId) {
      result[matchId] = `${home.score}-${away.score}`
    }
  }
  return result
}

async function main() {
  const today = new Date()
  const start = new Date(2026, 5, 11) // June 11, 2026
  const all = {}

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const scores = await fetchDate(ds)
    Object.assign(all, scores)
  }

  console.log('\n=== 最新拉取结果 ===')
  console.log(`共 ${Object.keys(all).length} 场已完赛比赛\n`)

  // Sort by match ID
  const sorted = Object.entries(all).sort(([a], [b]) => a.localeCompare(b))

  console.log('export const LIVE_SCORES: Record<string, string> = {')
  for (const [id, score] of sorted) {
    console.log(`  '${id}': '${score}',`)
  }
  console.log('}\n')

  // Also output just the new ones (not in original)
  const original = new Set([
    'g-A-0','g-A-1','g-B-0','g-B-1','g-C-0','g-C-1','g-D-0','g-D-1',
    'g-E-0','g-E-1','g-F-0','g-F-1','g-G-0','g-G-1','g-H-0','g-H-1',
    'g-I-0','g-I-1','g-J-0','g-J-1',
  ])

  const newResults = sorted.filter(([id]) => !original.has(id))
  if (newResults.length > 0) {
    console.log('=== 新增结果（需添加注解）===')
    for (const [id, score] of newResults) {
      console.log(`${id}: ${score}`)
    }
  }
}

main().catch(console.error)
