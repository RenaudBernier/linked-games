# Queens Puzzle

## About the game

Queens is a puzzle game originally featured on LinkedIn. The goal is to place exactly one queen in each row, column, and color region of the grid, such that no two queens are adjacent to each other (including diagonally).

### Rules

1. **One queen per row** — each row contains exactly one queen.
2. **One queen per column** — each column contains exactly one queen.
3. **One queen per color region** — each colored region contains exactly one queen.
4. **No adjacency** — no two queens can touch, not even diagonally. There must be at least one empty cell between any two queens in all directions (horizontal, vertical, and diagonal).

The number of queens to place always equals the grid size (e.g., a 7x7 grid has 7 color regions and requires 7 queens).

## Data files

### queens-puzzles.json

Contains 1,500 puzzles

**Structure:**

```json
{
  "<size>": {
    "<id>": [
      ["<color>", "<color>", ...],
      ["<color>", "<color>", ...],
      ...
    ]
  }
}
```

- **size**: Grid dimensions — one of `7x7`, `8x8`, `9x9`, `10x10`, `11x11`, `12x12`.
- **id**: Puzzle number from 1 to 250.
- **grid**: A 2D array of CSS RGB color strings (e.g., `"rgb(190, 18, 60)"`). Each cell's color indicates which region it belongs to. Cells sharing the same color string are part of the same region.

250 puzzles per size, 1,500 total.

### queens-solutions.json

Contains the solution for every puzzle in `queens-puzzles.json`.

**Structure:**

```json
{
  "<size>": {
    "<id>": [[row, col], [row, col], ...]
  }
}
```

- **size** and **id**: Same keys as `queens-puzzles.json`.
- **solution**: An array of `[row, col]` pairs (0-indexed) indicating where each queen is placed. The array is ordered by row (one entry per row).

**Example** — puzzle `7x7/1`:

```
Grid:             Solution:
R R R Y R R R     . . . Q . . .
G R R R R R E     . . . . . Q .
G G R R R E E     . Q . . . . .
G G G V V E E     . . . . . . Q
G O G V V E V     . . . . Q . .
O O O V V V V     . . Q . . . .
B O V V V V V     Q . . . . . .
```

Solution: `[[0,3], [1,5], [2,1], [3,6], [4,4], [5,2], [6,0]]`
