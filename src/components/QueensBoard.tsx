import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  isValidQueensPlacement,
  parseQueenPositions,
  parseRegionGrid,
  setsEqual,
} from '@/lib/queens'
import type { Json } from '@/types/database'

const REGION_PALETTE = [
  '#3d4f6f',
  '#4a6b4a',
  '#6b4a5a',
  '#6b5a3a',
  '#4a5a6b',
  '#5a4a6b',
  '#6b6b4a',
  '#4a6b6b',
  '#5a6b4a',
  '#6b4a4a',
  '#4a4a6b',
  '#5a5a5a',
]

type CellMark = 'x' | 'queen'

type Props = {
  matrixChallenge: Json
  matrixSolution: Json
  disabled?: boolean
  onSolved: () => void
}

export function QueensBoard({ matrixChallenge, matrixSolution, disabled, onSolved }: Props) {
  const parsed = useMemo(() => parseRegionGrid(matrixChallenge), [matrixChallenge])
  const regions = parsed?.regions ?? null
  const rgbBackgrounds = parsed?.rgbBackgrounds ?? null
  const n = regions?.length ?? 0

  const expectedSolution = useMemo(() => {
    if (!regions || n === 0) return null
    return parseQueenPositions(matrixSolution, n)
  }, [matrixSolution, regions, n])

  const [marks, setMarks] = useState<Map<string, CellMark>>(() => new Map())
  const [message, setMessage] = useState<string | null>(null)

  const queens = useMemo(() => {
    const set = new Set<string>()
    for (const [key, mark] of marks) {
      if (mark === 'queen') set.add(key)
    }
    return set
  }, [marks])

  useEffect(() => {
    if (disabled || !regions || n === 0) return
    if (queens.size !== n) return

    const rules = isValidQueensPlacement(regions, queens)
    if (!rules.ok) {
      setMessage(rules.reason)
      return
    }
    if (expectedSolution && expectedSolution.size > 0) {
      if (!setsEqual(queens, expectedSolution)) {
        setMessage('That is a valid layout, but not the competition solution. Keep trying.')
        return
      }
    }
    setMessage(null)
    onSolved()
  }, [disabled, regions, n, queens, expectedSolution, onSolved])

  const cycle = useCallback(
    (r: number, c: number) => {
      if (disabled || !regions) return
      const key = `${r},${c}`
      setMarks((prev) => {
        const next = new Map(prev)
        const current = next.get(key)
        if (current === undefined) next.set(key, 'x')
        else if (current === 'x') next.set(key, 'queen')
        else next.delete(key)
        return next
      })
      setMessage(null)
    },
    [disabled, regions],
  )

  const clear = useCallback(() => {
    setMarks(new Map())
    setMessage(null)
  }, [])

  if (!regions || n === 0) {
    return (
      <p className="error">
        This puzzle grid is not supported. Use a square matrix of region numbers (0, 1, 2, …) or
        color strings per cell (same string = same region), as in{' '}
        <code>scripts/queens-puzzles.json</code>.
      </p>
    )
  }

  return (
    <div className="queens-play">
      <p className="muted small">
        Place exactly {n} queens — one per row, column, and colored region. Queens cannot touch,
        even diagonally. When your layout is a complete valid solution, the challenge completes
        automatically. Click a cell to mark it with an X (a square that can&apos;t hold a queen),
        click again to place a queen, and click once more to clear it.
      </p>
      <div className="queens-board">
        {regions.map((row, ri) => (
          <div key={ri} className="queens-row">
            {row.map((regionId, ci) => {
              const key = `${ri},${ci}`
              const mark = marks.get(key)
              const bg =
                rgbBackgrounds?.[ri]?.[ci] ??
                REGION_PALETTE[Math.abs(regionId) % REGION_PALETTE.length]
              const stateClass =
                mark === 'queen' ? ' has-queen' : mark === 'x' ? ' has-x' : ''
              const ariaLabel =
                mark === 'queen'
                  ? `Queen at row ${ri + 1}, column ${ci + 1}. Click to clear.`
                  : mark === 'x'
                    ? `Marked X at row ${ri + 1}, column ${ci + 1}. Click to place a queen.`
                    : `Cell row ${ri + 1}, column ${ci + 1}. Click to mark with X.`
              return (
                <button
                  key={key}
                  type="button"
                  className={`queens-cell${stateClass}`}
                  style={{ background: bg }}
                  onClick={() => cycle(ri, ci)}
                  disabled={disabled}
                  aria-label={ariaLabel}
                >
                  {mark === 'queen' ? '♛' : mark === 'x' ? '✕' : ''}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="queens-actions">
        <button type="button" className="btn secondary" disabled={disabled} onClick={clear}>
          Clear board
        </button>
      </div>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
    </div>
  )
}
