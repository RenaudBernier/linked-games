import { useMemo } from 'react'

export type LeaderboardEventRow = {
  user_id: string
  username: string
  finished_at: string
}

const PALETTE = [
  '#6c9cff',
  '#e070c0',
  '#5fd4a4',
  '#f0b44e',
  '#a78bfa',
  '#f87171',
  '#22d3ee',
  '#c4b5fd',
]

type Series = { userId: string; username: string; color: string; points: { t: number; y: number }[] }

function buildSeries(
  events: LeaderboardEventRow[],
  windowStart: number,
  windowEnd: number,
): { series: Series[]; maxY: number } {
  const sorted = [...events].sort(
    (a, b) => new Date(a.finished_at).getTime() - new Date(b.finished_at).getTime(),
  )
  const userOrder: string[] = []
  const seen = new Set<string>()
  for (const e of sorted) {
    if (!seen.has(e.user_id)) {
      seen.add(e.user_id)
      userOrder.push(e.user_id)
    }
  }
  const eventsByUser = new Map<string, LeaderboardEventRow[]>()
  for (const e of sorted) {
    const list = eventsByUser.get(e.user_id) ?? []
    list.push(e)
    eventsByUser.set(e.user_id, list)
  }
  const series: Series[] = userOrder.map((userId, i) => {
    const userEvents = eventsByUser.get(userId) ?? []
    const username = userEvents[0]?.username ?? 'Player'
    const points: { t: number; y: number }[] = [{ t: windowStart, y: 0 }]
    let y = 0
    for (const e of userEvents) {
      const t = new Date(e.finished_at).getTime()
      points.push({ t, y })
      y += 1
      points.push({ t, y })
    }
    const last = points[points.length - 1]
    if (last.t < windowEnd) points.push({ t: windowEnd, y: last.y })
    return {
      userId,
      username,
      color: PALETTE[i % PALETTE.length],
      points,
    }
  })
  let maxY = 1
  for (const s of series) {
    for (const p of s.points) maxY = Math.max(maxY, p.y)
  }
  return { series, maxY }
}

type Props = {
  events: LeaderboardEventRow[]
  windowStartIso: string
  windowEndIso: string
}

const W = 720
const H = 260
const PAD_L = 36
const PAD_R = 12
const PAD_T = 12
const PAD_B = 28

export function CompetitionLeaderboardChart({ events, windowStartIso, windowEndIso }: Props) {
  const windowStart = new Date(windowStartIso).getTime()
  const windowEnd = new Date(windowEndIso).getTime()
  const span = Math.max(windowEnd - windowStart, 60_000)

  const { series, maxY, polyLines, yTicks } = useMemo(() => {
    const { series: s, maxY: m } = buildSeries(events, windowStart, windowEnd)
    const innerW = W - PAD_L - PAD_R
    const innerH = H - PAD_T - PAD_B
    const xOf = (t: number) => PAD_L + ((t - windowStart) / span) * innerW
    const yMax = Math.max(m, 1)
    const yOf = (y: number) => PAD_T + innerH - (y / yMax) * innerH
    const polyLines = s.map((ser) => {
      const d = ser.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.t).toFixed(2)} ${yOf(p.y).toFixed(2)}`)
        .join(' ')
      return { ...ser, d }
    })
    const yTicks =
      m <= 5
        ? Array.from({ length: m + 1 }, (_, i) => i)
        : [0, Math.ceil(m / 2), m]
    return { series: s, maxY: m, polyLines, yTicks }
  }, [events, windowStart, windowEnd, span])

  if (events.length === 0) {
    return (
      <div className="leaderboard-chart-empty muted small">
        No completed challenges yet during this event. Scores appear when players finish linked
        questions.
      </div>
    )
  }

  return (
    <div className="leaderboard-chart">
      <svg
        className="leaderboard-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Points over time by player"
      >
        <rect x={0} y={0} width={W} height={H} fill="transparent" />
        {yTicks.map((tick) => {
          const innerH = H - PAD_T - PAD_B
          const y = PAD_T + innerH - (tick / Math.max(maxY, 1)) * innerH
          return (
            <g key={tick}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                stroke="var(--border)"
                strokeOpacity={0.6}
                strokeDasharray="4 4"
              />
              <text x={4} y={y + 4} fill="var(--muted)" fontSize={10}>
                {tick}
              </text>
            </g>
          )
        })}
        {polyLines.map((pl) => (
          <path
            key={pl.userId}
            d={pl.d}
            fill="none"
            stroke={pl.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        <text x={PAD_L} y={H - 6} fill="var(--muted)" fontSize={10}>
          Start
        </text>
        <text x={W - PAD_R} y={H - 6} fill="var(--muted)" fontSize={10} textAnchor="end">
          {windowEnd > Date.now() - 60_000 ? 'Now' : 'End'}
        </text>
      </svg>
      <ul className="leaderboard-legend">
        {series.map((s, i) => (
          <li key={s.userId}>
            <span className="leaderboard-legend-swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span>{s.username}</span>
            <span className="muted small">
              {s.points[s.points.length - 1]?.y ?? 0} pt
              {s.points[s.points.length - 1]?.y === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
