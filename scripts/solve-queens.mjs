import { readFileSync, writeFileSync } from "fs";

const puzzles = JSON.parse(readFileSync("queens-puzzles.json", "utf-8"));

// Solve a Queens puzzle using backtracking
// Rules: one queen per row, per column, per color region, no adjacent queens
function solve(grid) {
  const n = grid.length;

  // Map colors to region indices
  const colorSet = [...new Set(grid.flat())];
  const colorIndex = Object.fromEntries(colorSet.map((c, i) => [c, i]));
  const regionGrid = grid.map((row) => row.map((c) => colorIndex[c]));

  // Track which columns and regions have a queen
  const colUsed = new Array(n).fill(false);
  const regionUsed = new Array(colorSet.length).fill(false);
  // Store queen column for each row (-1 = not placed)
  const solution = new Array(n).fill(-1);

  function isAdjacentSafe(row, col) {
    // Check if placing at (row, col) conflicts with previously placed queens
    // Only need to check rows above (0..row-1) since we place row by row
    if (row > 0) {
      const prevCol = solution[row - 1];
      if (prevCol !== -1 && Math.abs(prevCol - col) <= 1) return false;
    }
    return true;
  }

  function backtrack(row) {
    if (row === n) return true;

    for (let col = 0; col < n; col++) {
      const region = regionGrid[row][col];
      if (colUsed[col] || regionUsed[region]) continue;
      if (!isAdjacentSafe(row, col)) continue;

      // Place queen
      solution[row] = col;
      colUsed[col] = true;
      regionUsed[region] = true;

      if (backtrack(row + 1)) return true;

      // Remove queen
      solution[row] = -1;
      colUsed[col] = false;
      regionUsed[region] = false;
    }
    return false;
  }

  if (backtrack(0)) {
    return solution.map((col, row) => [row, col]);
  }
  return null;
}

// Solve all puzzles
const solutions = {};
const sizes = Object.keys(puzzles).sort(
  (a, b) => parseInt(a) - parseInt(b)
);
let total = 0;
let failed = 0;

for (const size of sizes) {
  solutions[size] = {};
  const ids = Object.keys(puzzles[size])
    .map(Number)
    .sort((a, b) => a - b);

  for (const id of ids) {
    const grid = puzzles[size][id];
    const sol = solve(grid);
    if (sol) {
      solutions[size][id] = sol;
    } else {
      console.error(`No solution found: ${size}/${id}`);
      failed++;
    }
    total++;
  }
  console.log(`${size}: ${ids.length} solved`);
}

writeFileSync("queens-solutions.json", JSON.stringify(solutions, null, 2));
console.log(`\nDone: ${total} puzzles, ${failed} failed`);
console.log("Output: queens-solutions.json");
