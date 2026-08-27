export type DifficultyId =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert'
  | 'master'
  | 'extreme'

export interface Difficulty {
  id: DifficultyId
  label: string
  clues: number
  multiplier: number
}

export interface Puzzle {
  puzzle: number[]
  solution: number[]
}

export const DIFFICULTIES: Difficulty[] = [
  { id: 'easy', label: '简单', clues: 42, multiplier: 1 },
  { id: 'medium', label: '中等', clues: 36, multiplier: 1.25 },
  { id: 'hard', label: '困难', clues: 32, multiplier: 1.5 },
  { id: 'expert', label: '专家', clues: 29, multiplier: 1.8 },
  { id: 'master', label: '大师', clues: 27, multiplier: 2.1 },
  { id: 'extreme', label: '极限', clues: 25, multiplier: 2.5 },
]

const SIDE = 9
const BOX = 3
const FULL_MASK = 0b1111111110

function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function pattern(row: number, column: number): number {
  return (BOX * (row % BOX) + Math.floor(row / BOX) + column) % SIDE
}

function generateSolution(): number[] {
  const groups = [0, 1, 2]
  const rows = shuffle(groups).flatMap((group) =>
    shuffle(groups).map((row) => group * BOX + row),
  )
  const columns = shuffle(groups).flatMap((group) =>
    shuffle(groups).map((column) => group * BOX + column),
  )
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])

  return rows.flatMap((row) =>
    columns.map((column) => numbers[pattern(row, column)]),
  )
}

function countBits(value: number): number {
  let count = 0
  let remaining = value
  while (remaining !== 0) {
    remaining &= remaining - 1
    count += 1
  }
  return count
}

function countSolutions(input: number[], limit = 2): number {
  const board = [...input]
  const rowMasks = Array<number>(SIDE).fill(0)
  const columnMasks = Array<number>(SIDE).fill(0)
  const boxMasks = Array<number>(SIDE).fill(0)

  for (let index = 0; index < board.length; index += 1) {
    const value = board[index]
    if (value === 0) continue
    const row = Math.floor(index / SIDE)
    const column = index % SIDE
    const box = Math.floor(row / BOX) * BOX + Math.floor(column / BOX)
    const bit = 1 << value
    if ((rowMasks[row] | columnMasks[column] | boxMasks[box]) & bit) return 0
    rowMasks[row] |= bit
    columnMasks[column] |= bit
    boxMasks[box] |= bit
  }

  let solutions = 0

  const solve = () => {
    if (solutions >= limit) return

    let bestIndex = -1
    let bestMask = 0
    let smallestCandidateCount = 10

    for (let index = 0; index < board.length; index += 1) {
      if (board[index] !== 0) continue
      const row = Math.floor(index / SIDE)
      const column = index % SIDE
      const box = Math.floor(row / BOX) * BOX + Math.floor(column / BOX)
      const candidates =
        FULL_MASK & ~(rowMasks[row] | columnMasks[column] | boxMasks[box])
      const candidateCount = countBits(candidates)

      if (candidateCount === 0) return
      if (candidateCount < smallestCandidateCount) {
        smallestCandidateCount = candidateCount
        bestIndex = index
        bestMask = candidates
        if (candidateCount === 1) break
      }
    }

    if (bestIndex === -1) {
      solutions += 1
      return
    }

    const row = Math.floor(bestIndex / SIDE)
    const column = bestIndex % SIDE
    const box = Math.floor(row / BOX) * BOX + Math.floor(column / BOX)
    let candidates = bestMask

    while (candidates !== 0 && solutions < limit) {
      const bit = candidates & -candidates
      const value = Math.log2(bit)
      board[bestIndex] = value
      rowMasks[row] |= bit
      columnMasks[column] |= bit
      boxMasks[box] |= bit

      solve()

      board[bestIndex] = 0
      rowMasks[row] &= ~bit
      columnMasks[column] &= ~bit
      boxMasks[box] &= ~bit
      candidates &= candidates - 1
    }
  }

  solve()
  return solutions
}

export function createPuzzle(difficultyId: DifficultyId): Puzzle {
  const difficulty =
    DIFFICULTIES.find((item) => item.id === difficultyId) ?? DIFFICULTIES[0]
  const solution = generateSolution()
  const puzzle = [...solution]
  const positions = shuffle(Array.from({ length: SIDE * SIDE }, (_, index) => index))
  let clueCount = SIDE * SIDE

  for (const index of positions) {
    if (clueCount <= difficulty.clues) break
    const previous = puzzle[index]
    puzzle[index] = 0

    if (countSolutions(puzzle) === 1) {
      clueCount -= 1
    } else {
      puzzle[index] = previous
    }
  }

  return { puzzle, solution }
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function cellsArePeers(first: number, second: number): boolean {
  const firstRow = Math.floor(first / SIDE)
  const firstColumn = first % SIDE
  const secondRow = Math.floor(second / SIDE)
  const secondColumn = second % SIDE
  const sameBox =
    Math.floor(firstRow / BOX) === Math.floor(secondRow / BOX) &&
    Math.floor(firstColumn / BOX) === Math.floor(secondColumn / BOX)

  return firstRow === secondRow || firstColumn === secondColumn || sameBox
}
