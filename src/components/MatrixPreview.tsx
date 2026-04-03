import type { Json } from '@/types/database'

function isNumberMatrix(value: Json): value is number[][] {
  if (!Array.isArray(value)) return false
  return value.every(
    (row) => Array.isArray(row) && row.every((cell) => typeof cell === 'number'),
  )
}

export function MatrixPreview({ matrix }: { matrix: Json | number[][] }) {
  const grid = isNumberMatrix(matrix as Json) ? (matrix as number[][]) : null
  if (!grid) {
    return <p className="muted small">Invalid matrix</p>
  }
  return (
    <div className="matrix">
      {grid.map((row, ri) => (
        <div key={ri} className="matrix-row">
          {row.map((cell, ci) => (
            <span key={ci} className="matrix-cell">
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
