/**
 * Generate frozen knockout predictions using 尉缭子分析法 (Poisson engine).
 * Run: node scripts/freeze-predictions.mjs
 * Output: knockout predictions as a frozen data structure for results.ts
 */
import fs from 'fs'
import path from 'path'

// Read the teams data and results
const teamsPath = path.resolve('src/data/teams.ts')
const resultsPath = path.resolve('src/data/results.ts')

// Since we can't import TS directly, let's parse the relevant data
const teamsContent = fs.readFileSync(teamsPath, 'utf-8')
const resultsContent = fs.readFileSync(resultsPath, 'utf-8')

// Extract LIVE_SCORES
const liveScoresMatch = resultsContent.match(/export const LIVE_SCORES: Record<string, string> = \{([^}]+)\}/s)
let liveScores = {}
if (liveScoresMatch) {
  const lines = liveScoresMatch[1].split('\n')
  for (const line of lines) {
    const m = line.match(/'([^']+)':\s*'([^']+)'/)
    if (m) liveScores[m[1]] = m[2]
  }
}

// We can't fully execute TS, so let's just compute using the existing build
// Actually, let's use tsx or tsm to run this
console.log('To run this, use: npx tsx scripts/freeze-predictions.ts (TypeScript version)')
