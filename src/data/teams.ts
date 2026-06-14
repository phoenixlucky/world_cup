/**
 * 2026 FIFA World Cup — Team seed data
 *
 * Groups A–L (48 teams, 4 per group)
 */

export interface Team {
  id: string
  name: string
  nameCN: string
  group: string
  continent: string
  flag: string
  flagCode: string      // ISO 3166-1 alpha-2 for flagcdn.com
  fifaRank: number      // 1 = best
  marketVal: number     // € millions
  recentForm: string    // e.g. "WDLWW" – last 5
  goalsFor20: number    // goals scored in last 20
  goalsAgainst20: number
  wins20: number
  draws20: number
  losses20: number
  worldCupPerf: number  // 本次世界杯表现得分(0-100) – 基于历史战绩与预期
}

/** Get flag image URL from flagcdn.com */
export function getFlagUrl(code: string): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`
}

export const teams: Team[] = [
  // ── Group A ──────────────────────────────────────────────
  {
    id: 'czech-republic', name: 'Czech Republic', nameCN: '捷克',
    group: 'A', continent: 'UEFA', flag: '🇨🇿', flagCode: 'CZ',
    fifaRank: 42, marketVal: 187, recentForm: 'WDWLW',
    goalsFor20: 30, goalsAgainst20: 22, wins20: 9, draws20: 4, losses20: 7,
    worldCupPerf: 36,
  },
  {
    id: 'mexico', name: 'Mexico', nameCN: '墨西哥',
    group: 'A', continent: 'CONCACAF', flag: '🇲🇽', flagCode: 'MX',
    fifaRank: 15, marketVal: 245, recentForm: 'WLWDW',
    goalsFor20: 28, goalsAgainst20: 18, wins20: 10, draws20: 5, losses20: 5,
    worldCupPerf: 68,
  },
  {
    id: 'south-africa', name: 'South Africa', nameCN: '南非',
    group: 'A', continent: 'CAF', flag: '🇿🇦', flagCode: 'ZA',
    fifaRank: 60, marketVal: 68, recentForm: 'WDLDL',
    goalsFor20: 22, goalsAgainst20: 24, wins20: 6, draws20: 5, losses20: 9,
    worldCupPerf: 40,
  },
  {
    id: 'south-korea', name: 'South Korea', nameCN: '韩国',
    group: 'A', continent: 'AFC', flag: '🇰🇷', flagCode: 'KR',
    fifaRank: 23, marketVal: 195, recentForm: 'WWDLW',
    goalsFor20: 31, goalsAgainst20: 20, wins20: 11, draws20: 4, losses20: 5,
    worldCupPerf: 66,
  },

  // ── Group B ──────────────────────────────────────────────
  {
    id: 'bosnia', name: 'Bosnia and Herzegovina', nameCN: '波黑',
    group: 'B', continent: 'UEFA', flag: '🇧🇦', flagCode: 'BA',
    fifaRank: 55, marketVal: 82, recentForm: 'LWDWL',
    goalsFor20: 20, goalsAgainst20: 25, wins20: 6, draws20: 5, losses20: 9,
    worldCupPerf: 36,
  },
  {
    id: 'canada', name: 'Canada', nameCN: '加拿大',
    group: 'B', continent: 'CONCACAF', flag: '🇨🇦', flagCode: 'CA',
    fifaRank: 37, marketVal: 198, recentForm: 'WDWWL',
    goalsFor20: 27, goalsAgainst20: 21, wins20: 9, draws20: 4, losses20: 7,
    worldCupPerf: 38,
  },
  {
    id: 'qatar', name: 'Qatar', nameCN: '卡塔尔',
    group: 'B', continent: 'AFC', flag: '🇶🇦', flagCode: 'QA',
    fifaRank: 48, marketVal: 55, recentForm: 'LDWLD',
    goalsFor20: 19, goalsAgainst20: 23, wins20: 5, draws20: 6, losses20: 9,
    worldCupPerf: 25,
  },
  {
    id: 'switzerland', name: 'Switzerland', nameCN: '瑞士',
    group: 'B', continent: 'UEFA', flag: '🇨🇭', flagCode: 'CH',
    fifaRank: 18, marketVal: 278, recentForm: 'WLWDW',
    goalsFor20: 29, goalsAgainst20: 19, wins20: 11, draws20: 4, losses20: 5,
    worldCupPerf: 62,
  },

  // ── Group C ──────────────────────────────────────────────
  {
    id: 'brazil', name: 'Brazil', nameCN: '巴西',
    group: 'C', continent: 'CONMEBOL', flag: '🇧🇷', flagCode: 'BR',
    fifaRank: 5, marketVal: 980, recentForm: 'WWWDL',
    goalsFor20: 38, goalsAgainst20: 14, wins20: 14, draws20: 3, losses20: 3,
    worldCupPerf: 95,
  },
  {
    id: 'haiti', name: 'Haiti', nameCN: '海地',
    group: 'C', continent: 'CONCACAF', flag: '🇭🇹', flagCode: 'HT',
    fifaRank: 85, marketVal: 18, recentForm: 'LDLLW',
    goalsFor20: 14, goalsAgainst20: 30, wins20: 3, draws20: 4, losses20: 13,
    worldCupPerf: 20,
  },
  {
    id: 'morocco', name: 'Morocco', nameCN: '摩洛哥',
    group: 'C', continent: 'CAF', flag: '🇲🇦', flagCode: 'MA',
    fifaRank: 14, marketVal: 340, recentForm: 'WWDWW',
    goalsFor20: 30, goalsAgainst20: 16, wins20: 12, draws20: 5, losses20: 3,
    worldCupPerf: 60,
  },
  {
    id: 'scotland', name: 'Scotland', nameCN: '苏格兰',
    group: 'C', continent: 'UEFA', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', flagCode: 'GB-SCT',
    fifaRank: 36, marketVal: 210, recentForm: 'WDLWW',
    goalsFor20: 24, goalsAgainst20: 22, wins20: 9, draws20: 4, losses20: 7,
    worldCupPerf: 46,
  },

  // ── Group D ──────────────────────────────────────────────
  {
    id: 'australia', name: 'Australia', nameCN: '澳大利亚',
    group: 'D', continent: 'AFC', flag: '🇦🇺', flagCode: 'AU',
    fifaRank: 39, marketVal: 72, recentForm: 'WDWLD',
    goalsFor20: 23, goalsAgainst20: 21, wins20: 7, draws20: 6, losses20: 7,
    worldCupPerf: 48,
  },
  {
    id: 'paraguay', name: 'Paraguay', nameCN: '巴拉圭',
    group: 'D', continent: 'CONMEBOL', flag: '🇵🇾', flagCode: 'PY',
    fifaRank: 44, marketVal: 132, recentForm: 'LWDWL',
    goalsFor20: 18, goalsAgainst20: 22, wins20: 6, draws20: 5, losses20: 9,
    worldCupPerf: 55,
  },
  {
    id: 'turkey', name: 'Turkey', nameCN: '土耳其',
    group: 'D', continent: 'UEFA', flag: '🇹🇷', flagCode: 'TR',
    fifaRank: 28, marketVal: 312, recentForm: 'WWLWD',
    goalsFor20: 28, goalsAgainst20: 20, wins20: 10, draws20: 4, losses20: 6,
    worldCupPerf: 52,
  },
  {
    id: 'usa', name: 'United States', nameCN: '美国',
    group: 'D', continent: 'CONCACAF', flag: '🇺🇸', flagCode: 'US',
    fifaRank: 16, marketVal: 360, recentForm: 'WWWDL',
    goalsFor20: 32, goalsAgainst20: 18, wins20: 12, draws20: 3, losses20: 5,
    worldCupPerf: 63,
  },

  // ── Group E ──────────────────────────────────────────────
  {
    id: 'curacao', name: 'Curaçao', nameCN: '库拉索',
    group: 'E', continent: 'CONCACAF', flag: '🇨🇼', flagCode: 'CW',
    fifaRank: 90, marketVal: 12, recentForm: 'LDLLD',
    goalsFor20: 11, goalsAgainst20: 32, wins20: 2, draws20: 4, losses20: 14,
    worldCupPerf: 18,
  },
  {
    id: 'ecuador', name: 'Ecuador', nameCN: '厄瓜多尔',
    group: 'E', continent: 'CONMEBOL', flag: '🇪🇨', flagCode: 'EC',
    fifaRank: 31, marketVal: 225, recentForm: 'WDLWW',
    goalsFor20: 25, goalsAgainst20: 19, wins20: 9, draws20: 5, losses20: 6,
    worldCupPerf: 52,
  },
  {
    id: 'germany', name: 'Germany', nameCN: '德国',
    group: 'E', continent: 'UEFA', flag: '🇩🇪', flagCode: 'DE',
    fifaRank: 9, marketVal: 820, recentForm: 'WWWWD',
    goalsFor20: 40, goalsAgainst20: 15, wins20: 14, draws20: 4, losses20: 2,
    worldCupPerf: 90,
  },
  {
    id: 'ivory-coast', name: 'Ivory Coast', nameCN: '科特迪瓦',
    group: 'E', continent: 'CAF', flag: '🇨🇮', flagCode: 'CI',
    fifaRank: 38, marketVal: 175, recentForm: 'WDLWW',
    goalsFor20: 24, goalsAgainst20: 20, wins20: 9, draws20: 5, losses20: 6,
    worldCupPerf: 58,
  },

  // ── Group F ──────────────────────────────────────────────
  {
    id: 'japan', name: 'Japan', nameCN: '日本',
    group: 'F', continent: 'AFC', flag: '🇯🇵', flagCode: 'JP',
    fifaRank: 20, marketVal: 290, recentForm: 'WLWWD',
    goalsFor20: 29, goalsAgainst20: 17, wins20: 11, draws20: 5, losses20: 4,
    worldCupPerf: 64,
  },
  {
    id: 'netherlands', name: 'Netherlands', nameCN: '荷兰',
    group: 'F', continent: 'UEFA', flag: '🇳🇱', flagCode: 'NL',
    fifaRank: 7, marketVal: 760, recentForm: 'WWWDL',
    goalsFor20: 35, goalsAgainst20: 16, wins20: 13, draws20: 4, losses20: 3,
    worldCupPerf: 78,
  },
  {
    id: 'sweden', name: 'Sweden', nameCN: '瑞典',
    group: 'F', continent: 'UEFA', flag: '🇸🇪', flagCode: 'SE',
    fifaRank: 27, marketVal: 265, recentForm: 'WDLWW',
    goalsFor20: 26, goalsAgainst20: 21, wins20: 10, draws20: 4, losses20: 6,
    worldCupPerf: 65,
  },
  {
    id: 'tunisia', name: 'Tunisia', nameCN: '突尼斯',
    group: 'F', continent: 'CAF', flag: '🇹🇳', flagCode: 'TN',
    fifaRank: 50, marketVal: 62, recentForm: 'LDWLD',
    goalsFor20: 17, goalsAgainst20: 24, wins20: 5, draws20: 6, losses20: 9,
    worldCupPerf: 44,
  },

  // ── Group G ──────────────────────────────────────────────
  {
    id: 'belgium', name: 'Belgium', nameCN: '比利时',
    group: 'G', continent: 'UEFA', flag: '🇧🇪', flagCode: 'BE',
    fifaRank: 6, marketVal: 680, recentForm: 'WWWLD',
    goalsFor20: 34, goalsAgainst20: 17, wins20: 13, draws20: 3, losses20: 4,
    worldCupPerf: 70,
  },
  {
    id: 'egypt', name: 'Egypt', nameCN: '埃及',
    group: 'G', continent: 'CAF', flag: '🇪🇬', flagCode: 'EG',
    fifaRank: 33, marketVal: 195, recentForm: 'WDWLD',
    goalsFor20: 22, goalsAgainst20: 20, wins20: 8, draws20: 6, losses20: 6,
    worldCupPerf: 48,
  },
  {
    id: 'iran', name: 'Iran', nameCN: '伊朗',
    group: 'G', continent: 'AFC', flag: '🇮🇷', flagCode: 'IR',
    fifaRank: 22, marketVal: 160, recentForm: 'WWLWD',
    goalsFor20: 25, goalsAgainst20: 18, wins20: 10, draws20: 4, losses20: 6,
    worldCupPerf: 50,
  },
  {
    id: 'new-zealand', name: 'New Zealand', nameCN: '新西兰',
    group: 'G', continent: 'OFC', flag: '🇳🇿', flagCode: 'NZ',
    fifaRank: 105, marketVal: 42, recentForm: 'WDLWL',
    goalsFor20: 20, goalsAgainst20: 26, wins20: 6, draws20: 5, losses20: 9,
    worldCupPerf: 35,
  },

  // ── Group H ──────────────────────────────────────────────
  {
    id: 'cape-verde', name: 'Cape Verde', nameCN: '佛得角',
    group: 'H', continent: 'CAF', flag: '🇨🇻', flagCode: 'CV',
    fifaRank: 70, marketVal: 40, recentForm: 'WLDWL',
    goalsFor20: 18, goalsAgainst20: 25, wins20: 6, draws20: 4, losses20: 10,
    worldCupPerf: 22,
  },
  {
    id: 'saudi-arabia', name: 'Saudi Arabia', nameCN: '沙特阿拉伯',
    group: 'H', continent: 'AFC', flag: '🇸🇦', flagCode: 'SA',
    fifaRank: 52, marketVal: 58, recentForm: 'LWWLD',
    goalsFor20: 20, goalsAgainst20: 24, wins20: 6, draws20: 5, losses20: 9,
    worldCupPerf: 42,
  },
  {
    id: 'spain', name: 'Spain', nameCN: '西班牙',
    group: 'H', continent: 'UEFA', flag: '🇪🇸', flagCode: 'ES',
    fifaRank: 3, marketVal: 905, recentForm: 'WWWDW',
    goalsFor20: 39, goalsAgainst20: 12, wins20: 15, draws20: 3, losses20: 2,
    worldCupPerf: 82,
  },
  {
    id: 'uruguay', name: 'Uruguay', nameCN: '乌拉圭',
    group: 'H', continent: 'CONMEBOL', flag: '🇺🇾', flagCode: 'UY',
    fifaRank: 11, marketVal: 430, recentForm: 'WLWWD',
    goalsFor20: 30, goalsAgainst20: 18, wins20: 12, draws20: 4, losses20: 4,
    worldCupPerf: 76,
  },

  // ── Group I ──────────────────────────────────────────────
  {
    id: 'france', name: 'France', nameCN: '法国',
    group: 'I', continent: 'UEFA', flag: '🇫🇷', flagCode: 'FR',
    fifaRank: 2, marketVal: 1050, recentForm: 'WWWDW',
    goalsFor20: 42, goalsAgainst20: 11, wins20: 16, draws20: 2, losses20: 2,
    worldCupPerf: 88,
  },
  {
    id: 'iraq', name: 'Iraq', nameCN: '伊拉克',
    group: 'I', continent: 'AFC', flag: '🇮🇶', flagCode: 'IQ',
    fifaRank: 58, marketVal: 45, recentForm: 'WLDWL',
    goalsFor20: 18, goalsAgainst20: 26, wins20: 5, draws20: 5, losses20: 10,
    worldCupPerf: 30,
  },
  {
    id: 'norway', name: 'Norway', nameCN: '挪威',
    group: 'I', continent: 'UEFA', flag: '🇳🇴', flagCode: 'NO',
    fifaRank: 25, marketVal: 420, recentForm: 'WWLWD',
    goalsFor20: 32, goalsAgainst20: 20, wins20: 11, draws20: 4, losses20: 5,
    worldCupPerf: 50,
  },
  {
    id: 'senegal', name: 'Senegal', nameCN: '塞内加尔',
    group: 'I', continent: 'CAF', flag: '🇸🇳', flagCode: 'SN',
    fifaRank: 19, marketVal: 280, recentForm: 'WDWLW',
    goalsFor20: 25, goalsAgainst20: 19, wins20: 10, draws20: 5, losses20: 5,
    worldCupPerf: 54,
  },

  // ── Group J ──────────────────────────────────────────────
  {
    id: 'algeria', name: 'Algeria', nameCN: '阿尔及利亚',
    group: 'J', continent: 'CAF', flag: '🇩🇿', flagCode: 'DZ',
    fifaRank: 35, marketVal: 155, recentForm: 'WDLWW',
    goalsFor20: 22, goalsAgainst20: 21, wins20: 8, draws20: 5, losses20: 7,
    worldCupPerf: 52,
  },
  {
    id: 'argentina', name: 'Argentina', nameCN: '阿根廷',
    group: 'J', continent: 'CONMEBOL', flag: '🇦🇷', flagCode: 'AR',
    fifaRank: 1, marketVal: 820, recentForm: 'WWWDW',
    goalsFor20: 40, goalsAgainst20: 10, wins20: 16, draws20: 3, losses20: 1,
    worldCupPerf: 92,
  },
  {
    id: 'austria', name: 'Austria', nameCN: '奥地利',
    group: 'J', continent: 'UEFA', flag: '🇦🇹', flagCode: 'AT',
    fifaRank: 26, marketVal: 270, recentForm: 'WLWWD',
    goalsFor20: 27, goalsAgainst20: 20, wins20: 10, draws20: 5, losses20: 5,
    worldCupPerf: 48,
  },
  {
    id: 'jordan', name: 'Jordan', nameCN: '约旦',
    group: 'J', continent: 'AFC', flag: '🇯🇴', flagCode: 'JO',
    fifaRank: 68, marketVal: 28, recentForm: 'LDWLD',
    goalsFor20: 15, goalsAgainst20: 27, wins20: 4, draws20: 6, losses20: 10,
    worldCupPerf: 20,
  },

  // ── Group K ──────────────────────────────────────────────
  {
    id: 'colombia', name: 'Colombia', nameCN: '哥伦比亚',
    group: 'K', continent: 'CONMEBOL', flag: '🇨🇴', flagCode: 'CO',
    fifaRank: 12, marketVal: 380, recentForm: 'WWLWD',
    goalsFor20: 29, goalsAgainst20: 19, wins20: 11, draws20: 4, losses20: 5,
    worldCupPerf: 67,
  },
  {
    id: 'dr-congo', name: 'DR Congo', nameCN: '刚果民主共和国',
    group: 'K', continent: 'CAF', flag: '🇨🇩', flagCode: 'CD',
    fifaRank: 64, marketVal: 78, recentForm: 'WLDWL',
    goalsFor20: 18, goalsAgainst20: 24, wins20: 5, draws20: 5, losses20: 10,
    worldCupPerf: 24,
  },
  {
    id: 'portugal', name: 'Portugal', nameCN: '葡萄牙',
    group: 'K', continent: 'UEFA', flag: '🇵🇹', flagCode: 'PT',
    fifaRank: 8, marketVal: 880, recentForm: 'WWWDW',
    goalsFor20: 37, goalsAgainst20: 13, wins20: 14, draws20: 4, losses20: 2,
    worldCupPerf: 74,
  },
  {
    id: 'uzbekistan', name: 'Uzbekistan', nameCN: '乌兹别克斯坦',
    group: 'K', continent: 'AFC', flag: '🇺🇿', flagCode: 'UZ',
    fifaRank: 74, marketVal: 35, recentForm: 'WLDWL',
    goalsFor20: 18, goalsAgainst20: 26, wins20: 5, draws20: 5, losses20: 10,
    worldCupPerf: 20,
  },

  // ── Group L ──────────────────────────────────────────────
  {
    id: 'croatia', name: 'Croatia', nameCN: '克罗地亚',
    group: 'L', continent: 'UEFA', flag: '🇭🇷', flagCode: 'HR',
    fifaRank: 13, marketVal: 375, recentForm: 'WLWWD',
    goalsFor20: 28, goalsAgainst20: 20, wins20: 11, draws20: 5, losses20: 4,
    worldCupPerf: 72,
  },
  {
    id: 'england', name: 'England', nameCN: '英格兰',
    group: 'L', continent: 'UEFA', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', flagCode: 'GB-ENG',
    fifaRank: 4, marketVal: 1150, recentForm: 'WWWDW',
    goalsFor20: 38, goalsAgainst20: 12, wins20: 15, draws20: 3, losses20: 2,
    worldCupPerf: 80,
  },
  {
    id: 'ghana', name: 'Ghana', nameCN: '加纳',
    group: 'L', continent: 'CAF', flag: '🇬🇭', flagCode: 'GH',
    fifaRank: 46, marketVal: 130, recentForm: 'WLDWW',
    goalsFor20: 21, goalsAgainst20: 23, wins20: 7, draws20: 5, losses20: 8,
    worldCupPerf: 56,
  },
  {
    id: 'panama', name: 'Panama', nameCN: '巴拿马',
    group: 'L', continent: 'CONCACAF', flag: '🇵🇦', flagCode: 'PA',
    fifaRank: 45, marketVal: 52, recentForm: 'LWWLD',
    goalsFor20: 19, goalsAgainst20: 25, wins20: 6, draws20: 5, losses20: 9,
    worldCupPerf: 28,
  },
]

/** Group helpers */
export const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export function getTeamsByGroup(g: string): Team[] {
  return teams.filter(t => t.group === g).sort((a, b) => a.fifaRank - b.fifaRank)
}

export function getTeam(id: string): Team | undefined {
  return teams.find(t => t.id === id)
}
