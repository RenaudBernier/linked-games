import { useCallback, useMemo, useState } from 'react'
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

  const [queens, setQueens] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState<string | null>(null)

  const toggle = useCallback(
    (r: number, c: number) => {
      if (disabled || !regions) return
      const key = `${r},${c}`
      setQueens((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
      setMessage(null)
    },
    [disabled, regions],
  )

  const submit = useCallback(() => {
    if (!regions || n === 0) return
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
  }, [regions, n, queens, expectedSolution, onSolved])

  const clear = useCallback(() => {
    setQueens(new Set())
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
        even diagonally. Click a cell to place or remove a queen.
      </p>
      <div className="queens-board">
        {regions.map((row, ri) => (
          <div key={ri} className="queens-row">
            {row.map((regionId, ci) => {
              const key = `${ri},${ci}`
              const has = queens.has(key)
              const bg =
                rgbBackgrounds?.[ri]?.[ci] ??
                REGION_PALETTE[Math.abs(regionId) % REGION_PALETTE.length]
              return (
                <button
                  key={key}
                  type="button"
                  className={`queens-cell${has ? ' has-queen' : ''}`}
                  style={{ background: bg }}
                  onClick={() => toggle(ri, ci)}
                  disabled={disabled}
                  aria-label={
                    has ? `Remove queen from row ${ri + 1}, column ${ci + 1}` : `Cell row ${ri + 1} column ${ci + 1}`
                  }
                >
                  {has ? '♛' : ''}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="queens-actions">
        <button type="button" className="btn primary" disabled={disabled} onClick={submit}>
          Submit solution
        </button>
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
