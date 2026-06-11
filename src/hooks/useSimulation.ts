/**
 * useSimulation — runs Monte Carlo simulation in a non-blocking way
 */

import { useState, useRef, useCallback } from 'react'
import type { TeamScores } from '../engine/scorer'
import { type SimulationResult, runSimulation } from '../engine/simulator'

interface UseSimulationReturn {
  result: SimulationResult | null
  running: boolean
  progress: number
  start: (scores: TeamScores[], numSims?: number) => void
  cancel: () => void
}

export function useSimulation(): UseSimulationReturn {
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const cancelledRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  const cancel = useCallback(() => {
    cancelledRef.current = true
    setRunning(false)
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const start = useCallback((scores: TeamScores[], numSims = 10000) => {
    cancel()
    cancelledRef.current = false
    setRunning(true)
    setProgress(0)
    setResult(null)

    // Chunk the work so the UI stays responsive
    const chunkSize = Math.min(500, Math.max(100, Math.floor(numSims / 20)))
    let completed = 0
    const allCounts: Record<string, { champ: number; semi: number; ko: number }> = {}

    for (const s of scores) {
      allCounts[s.teamId] = { champ: 0, semi: 0, ko: 0 }
    }

    const runChunk = () => {
      if (cancelledRef.current) return

      const chunkEnd = Math.min(completed + chunkSize, numSims)
      const chunkResult = runSimulation(scores, chunkEnd - completed)

      // Merge
      for (const [id, cnt] of Object.entries(chunkResult.championCounts)) {
        if (allCounts[id]) allCounts[id].champ += cnt
      }
      for (const [id, cnt] of Object.entries(chunkResult.semiFinalCounts)) {
        if (allCounts[id]) allCounts[id].semi += cnt
      }
      for (const [id, cnt] of Object.entries(chunkResult.knockoutCounts)) {
        if (allCounts[id]) allCounts[id].ko += cnt
      }

      completed = chunkEnd
      setProgress(Math.round((completed / numSims) * 100))

      if (completed >= numSims || cancelledRef.current) {
        // Build final result
        const championCounts: Record<string, number> = {}
        const semiFinalCounts: Record<string, number> = {}
        const knockoutCounts: Record<string, number> = {}
        for (const [id, c] of Object.entries(allCounts)) {
          championCounts[id] = c.champ
          semiFinalCounts[id] = c.semi
          knockoutCounts[id] = c.ko
        }
        setResult({
          championCounts,
          semiFinalCounts,
          knockoutCounts,
          totalSims: completed,
        })
        setRunning(false)
        return
      }

      timeoutRef.current = window.setTimeout(runChunk, 0)
    }

    timeoutRef.current = window.setTimeout(runChunk, 50)
  }, [cancel])

  return { result, running, progress, start, cancel }
}
