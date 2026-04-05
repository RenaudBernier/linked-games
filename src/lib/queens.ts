import type { Json } from '@/types/database'

export function isNumberMatrix(value: Json): value is number[][] {
  if (!Array.isArray(value)) return false
  return value.every(
    (row) => Array.isArray(row) && row.every((cell) => typeof cell === 'number'),
  )
}

/**
 * Normalizes a square region grid for Queens.
 * - Admin/sample puzzles use `number[][]` (region ids 0, 1, 2, …).
 * - Imported LinkedIn-style puzzles use `string[][]` — same string = same region
 *   (see `scripts/queens-puzzles.json`: cells are `"rgb(…)"` strings).
 */
export function parseRegionGrid(value: Json): {
  regions: number[][]
  /** Original colors when cells were strings; otherwise use a palette from region ids. */
  rgbBackgrounds: string[][] | null
} | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const n = value.length
  const rows = value as unknown[][]
  if (!rows.every((row) => Array.isArray(row) && row.length === n)) return null

  const sample = rows[0][0]
  if (typeof sample === 'number') {
    if (!isNumberMatrix(value)) return null
    return { regions: value as number[][], rgbBackgrounds: null }
  }
  if (typeof sample === 'string') {
    const idMap = new Map<string, number>()
    let next = 0
    const regions: number[][] = []
    const rgbBackgrounds: string[][] = []
    for (let r = 0; r < n; r++) {
      regions[r] = []
      rgbBackgrounds[r] = []
      for (let c = 0; c < n; c++) {
        const cell = rows[r][c]
        if (typeof cell !== 'string') return null
        let id = idMap.get(cell)
        if (id === undefined) {
          id = next++
          idMap.set(cell, id)
        }
        regions[r][c] = id
        rgbBackgrounds[r][c] = cell
      }
    }
    return { regions, rgbBackgrounds }
  }
  return null
}

/** Parse stored solution: either [[r,c],...] or an n×n grid of 0/1. */
export function parseQueenPositions(solution: Json, n: number): Set<string> | null {
  if (!Array.isArray(solution) || solution.length === 0) return null

  const first = solution[0] as unknown
  if (Array.isArray(first) && first.length === 2 && typeof first[0] === 'number') {
    const set = new Set<string>()
    for (const pair of solution as unknown[]) {
      if (!Array.isArray(pair) || pair.length !== 2) return null
      const r = pair[0]
      const c = pair[1]
      if (typeof r !== 'number' || typeof c !== 'number') return null
      if (!Number.isInteger(r) || !Number.isInteger(c)) return null
      if (r < 0 || r >= n || c < 0 || c >= n) return null
      set.add(`${r},${c}`)
    }
    return set
  }

  if (!isNumberMatrix(solution as Json)) return null
  const grid = solution as number[][]
  if (grid.length !== n || grid.some((row) => row.length !== n)) return null
  const set = new Set<string>()
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 1) set.add(`${r},${c}`)
    }
  }
  return set
}

export function isValidQueensPlacement(
  regions: number[][],
  queens: Set<string>,
): { ok: true } | { ok: false; reason: string } {
  const n = regions.length
  if (n === 0 || regions.some((row) => row.length !== n)) {
    return { ok: false, reason: 'Invalid grid.' }
  }
  if (queens.size !== n) {
    return { ok: false, reason: `Place exactly ${n} queens (one per row, column, and region).` }
  }

  const rows = new Set<number>()
  const cols = new Set<number>()
  const regionCounts = new Map<number, number>()
  const positions: [number, number][] = []

  for (const key of queens) {
    const parts = key.split(',')
    const r = Number(parts[0])
    const c = Number(parts[1])
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= n || c < 0 || c >= n) {
      return { ok: false, reason: 'Invalid placement.' }
    }
    if (rows.has(r)) return { ok: false, reason: 'Only one queen per row.' }
    if (cols.has(c)) return { ok: false, reason: 'Only one queen per column.' }
    rows.add(r)
    cols.add(c)
    const reg = regions[r][c]
    regionCounts.set(reg, (regionCounts.get(reg) ?? 0) + 1)
    positions.push([r, c])
  }

  for (const [, count] of regionCounts) {
    if (count !== 1) return { ok: false, reason: 'Each color region needs exactly one queen.' }
  }

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dr = Math.abs(positions[i][0] - positions[j][0])
      const dc = Math.abs(positions[i][1] - positions[j][1])
      if (dr <= 1 && dc <= 1) {
        return { ok: false, reason: 'Queens cannot touch, even diagonally.' }
      }
    }
  }

  return { ok: true }
}

export function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const x of a) {
    if (!b.has(x)) return false
  }
  return true
}
