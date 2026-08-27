import { useEffect, useMemo, useState } from 'react'
import {
  DIFFICULTIES,
  cellsArePeers,
  createPuzzle,
  formatTime,
  type DifficultyId,
} from './game.ts'
import { playSound, type SoundEffect } from './sounds.ts'

type IconName =
  | 'undo'
  | 'erase'
  | 'note'
  | 'hint'
  | 'pause'
  | 'play'
  | 'sound'
  | 'mute'
  | 'restart'
  | 'chevron'
  | 'check'

interface GameState {
  difficulty: DifficultyId
  puzzle: number[]
  solution: number[]
  board: number[]
  notes: number[]
  selected: number | null
  mistakes: number
  hints: number
  elapsed: number
  paused: boolean
  completed: boolean
}

type Snapshot = Pick<
  GameState,
  'board' | 'notes' | 'selected' | 'mistakes' | 'hints' | 'completed'
>

const STORAGE_KEY = 'sudoku-state-v1'
const SOUND_STORAGE_KEY = 'sudoku-sound-enabled'
const LEGACY_STORAGE_KEY = ['sudoku', 'game', 'state', 'v1'].join('-')
const MAX_MISTAKES = 3

function loadSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function makeGame(difficulty: DifficultyId): GameState {
  const { puzzle, solution } = createPuzzle(difficulty)
  return {
    difficulty,
    puzzle,
    solution,
    board: [...puzzle],
    notes: Array<number>(81).fill(0),
    selected: puzzle.findIndex((value) => value === 0),
    mistakes: 0,
    hints: 3,
    elapsed: 0,
    paused: false,
    completed: false,
  }
}

function loadGame(): GameState {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!saved) return makeGame('easy')
    const parsed = JSON.parse(saved) as GameState
    const isValid =
      DIFFICULTIES.some((item) => item.id === parsed.difficulty) &&
      parsed.puzzle?.length === 81 &&
      parsed.solution?.length === 81 &&
      parsed.board?.length === 81 &&
      parsed.notes?.length === 81
    if (!isValid) return makeGame('easy')
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return { ...parsed, paused: false }
  } catch {
    return makeGame('easy')
  }
}

function takeSnapshot(game: GameState): Snapshot {
  return {
    board: [...game.board],
    notes: [...game.notes],
    selected: game.selected,
    mistakes: game.mistakes,
    hints: game.hints,
    completed: game.completed,
  }
}

function Icon({ name }: { name: IconName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      {name === 'undo' && (
        <>
          <path d="M8 7H4V3" />
          <path d="M4.5 7.2A8.5 8.5 0 1 1 4 16" />
        </>
      )}
      {name === 'erase' && (
        <>
          <path d="m4.3 14.4 8.8-8.8a2.4 2.4 0 0 1 3.4 0l1.9 1.9a2.4 2.4 0 0 1 0 3.4l-8.8 8.8H6.8l-2.5-2.5a2 2 0 0 1 0-2.8Z" />
          <path d="m11 7.7 5.3 5.3M9.6 19.7h10.1" />
        </>
      )}
      {name === 'note' && (
        <>
          <path d="m4 16-.8 4 4-.8L18.5 7.9a2 2 0 0 0 0-2.8l-.6-.6a2 2 0 0 0-2.8 0L4 16Z" />
          <path d="m13.5 6.1 4.4 4.4M4 16l3.2 3.2" />
        </>
      )}
      {name === 'hint' && (
        <>
          <path d="M9 18h6M9.8 21h4.4" />
          <path d="M8.3 15.3A6 6 0 1 1 15.7 15c-.8.6-1.1 1.3-1.2 2H9.6c-.1-.7-.5-1.2-1.3-1.7Z" />
        </>
      )}
      {name === 'pause' && (
        <>
          <path d="M9 7v10M15 7v10" />
        </>
      )}
      {name === 'play' && <path d="m9 7 8 5-8 5V7Z" />}
      {name === 'chevron' && <path d="m6 9.5 6 6 6-6" />}
      {name === 'check' && <path d="m5 12.5 4.5 4.5L19 7.5" />}
      {name === 'restart' && (
        <>
          <path d="M8 7H4V3" />
          <path d="M4.5 7.2A8.5 8.5 0 1 1 4 16" />
        </>
      )}
      {name === 'sound' && (
        <>
          <path d="M11 5 7 9H4v6h3l4 4V5Z" />
          <path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10" />
        </>
      )}
      {name === 'mute' && (
        <>
          <path d="M11 5 7 9H4v6h3l4 4V5Z" />
          <path d="m15 10 5 5M20 10l-5 5" />
        </>
      )}
    </svg>
  )
}

function App() {
  const [game, setGame] = useState<GameState>(loadGame)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [notesMode, setNotesMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(loadSoundEnabled)
  const [toast, setToast] = useState('')
  const [difficultyOpen, setDifficultyOpen] = useState(false)

  const difficulty =
    DIFFICULTIES.find((item) => item.id === game.difficulty) ?? DIFFICULTIES[0]
  const gameOver = game.mistakes >= MAX_MISTAKES
  const correctEntries = game.board.filter(
    (value, index) => game.puzzle[index] === 0 && value === game.solution[index],
  ).length
  const emptyCells = game.board.filter((value) => value === 0).length
  const score = Math.max(
    0,
    Math.round(
      correctEntries * 100 * difficulty.multiplier -
        game.elapsed -
        game.mistakes * 100 -
        (3 - game.hints) * 200,
    ),
  )
  const progress = Math.round(((81 - emptyCells) / 81) * 100)

  const selectedValue =
    game.selected === null ? 0 : game.board[game.selected]

  const numberCounts = useMemo(
    () =>
      Array.from({ length: 9 }, (_, index) =>
        game.board.filter((value) => value === index + 1).length,
      ),
    [game.board],
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
  }, [game])

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled))
    } catch {
      // 存储不可用时，音效开关仍在当前页面内有效。
    }
  }, [soundEnabled])

  useEffect(() => {
    if (game.paused || game.completed || gameOver) return
    const timer = window.setInterval(() => {
      setGame((current) => ({ ...current, elapsed: current.elapsed + 1 }))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [game.paused, game.completed, gameOver])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    // iOS Safari 需要存在 touchstart 监听才会触发按钮的 :active 按压反馈。
    const enableActiveState = () => {}
    document.addEventListener('touchstart', enableActiveState, {
      passive: true,
    })
    return () =>
      document.removeEventListener('touchstart', enableActiveState)
  }, [])

  const sound = (effect: SoundEffect) => {
    if (soundEnabled) void playSound(effect)
  }

  const remember = () => {
    setHistory((current) => [...current.slice(-39), takeSnapshot(game)])
  }

  const startNewGame = (nextDifficulty: DifficultyId = game.difficulty) => {
    sound('newGame')
    setGame(makeGame(nextDifficulty))
    setHistory([])
    setNotesMode(false)
    setToast('新棋局已生成')
  }

  const toggleSound = () => {
    if (!soundEnabled) void playSound('toggle')
    setSoundEnabled((current) => !current)
    setToast(soundEnabled ? '音效已关闭' : '音效已开启')
  }

  const toggleNotes = () => {
    if (game.paused || game.completed || gameOver) return
    sound('toggle')
    setNotesMode((current) => !current)
  }

  const togglePause = () => {
    if (game.completed || gameOver) return
    sound(game.paused ? 'resume' : 'pause')
    setGame((current) => ({ ...current, paused: !current.paused }))
  }

  const resumeGame = () => {
    sound('resume')
    setGame((current) => ({ ...current, paused: false }))
  }

  const selectCell = (index: number) => {
    if (index === game.selected) {
      setGame((current) => ({ ...current, selected: null }))
      return
    }
    sound('select')
    setGame((current) => ({ ...current, selected: index }))
  }

  const isLockedCorrectly = (index: number) =>
    game.board[index] !== 0 && game.board[index] === game.solution[index]

  const enterNumber = (value: number) => {
    const index = game.selected
    if (
      index === null ||
      game.puzzle[index] !== 0 ||
      game.paused ||
      game.completed ||
      gameOver
    ) {
      return
    }

    if (numberCounts[value - 1] >= 9) {
      sound('error')
      setToast(`数字 ${value} 已全部填完`)
      return
    }

    if (isLockedCorrectly(index)) {
      sound('error')
      setToast('这一格已填对，不能再修改')
      return
    }

    remember()

    if (notesMode) {
      sound('note')
      setGame((current) => {
        const notes = [...current.notes]
        notes[index] ^= 1 << value
        return { ...current, notes }
      })
      return
    }

    const isCorrect = value === game.solution[index]
    const nextBoard = [...game.board]
    nextBoard[index] = value
    const completed = nextBoard.every(
      (cellValue, cellIndex) => cellValue === game.solution[cellIndex],
    )
    const failed = !isCorrect && game.mistakes + 1 >= MAX_MISTAKES
    sound(completed ? 'complete' : isCorrect ? 'correct' : failed ? 'failure' : 'error')

    setGame((current) => {
      const board = [...current.board]
      const notes = [...current.notes]
      board[index] = value
      notes[index] = 0
      const mistakes = current.mistakes + (isCorrect ? 0 : 1)

      if (isCorrect) {
        for (let peer = 0; peer < 81; peer += 1) {
          if (cellsArePeers(index, peer)) notes[peer] &= ~(1 << value)
        }
      }

      return { ...current, board, notes, mistakes, completed }
    })
  }

  const erase = () => {
    const index = game.selected
    if (
      index === null ||
      game.puzzle[index] !== 0 ||
      game.paused ||
      game.completed
    ) {
      return
    }
    if (isLockedCorrectly(index)) {
      sound('error')
      setToast('这一格已填对，不能再修改')
      return
    }
    if (game.board[index] === 0 && game.notes[index] === 0) return
    sound('erase')
    remember()
    setGame((current) => {
      const board = [...current.board]
      const notes = [...current.notes]
      board[index] = 0
      notes[index] = 0
      return { ...current, board, notes }
    })
  }

  const undo = () => {
    const previous = history.at(-1)
    if (!previous || game.paused) return
    sound('undo')
    setHistory((current) => current.slice(0, -1))
    setGame((current) => ({
      ...current,
      ...previous,
      board: [...previous.board],
      notes: [...previous.notes],
    }))
  }

  const revealHint = () => {
    if (game.hints === 0) {
      sound('error')
      setToast('本局提示已用完')
      return
    }
    if (game.paused || game.completed || gameOver) return

    const selected = game.selected
    const canRevealSelected =
      selected !== null &&
      game.puzzle[selected] === 0 &&
      game.board[selected] !== game.solution[selected]
    const index = canRevealSelected
      ? selected
      : game.board.findIndex(
          (value, cellIndex) =>
            game.puzzle[cellIndex] === 0 && value !== game.solution[cellIndex],
        )

    if (index === -1) return
    const nextBoard = [...game.board]
    nextBoard[index] = game.solution[index]
    const completed = nextBoard.every(
      (cellValue, cellIndex) => cellValue === game.solution[cellIndex],
    )
    sound(completed ? 'complete' : 'hint')
    remember()
    setGame((current) => {
      const board = [...current.board]
      const notes = [...current.notes]
      const value = current.solution[index]
      board[index] = value
      notes[index] = 0
      for (let peer = 0; peer < 81; peer += 1) {
        if (cellsArePeers(index, peer)) notes[peer] &= ~(1 << value)
      }
      return {
        ...current,
        board,
        notes,
        selected: index,
        hints: current.hints - 1,
        completed,
      }
    })
    setToast('已为你填入一格')
  }

  useEffect(() => {
    const handleArrowKey = (event: KeyboardEvent) => {
      const moves: Record<string, readonly [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }
      const move = moves[event.key]
      if (!move) return

      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      event.preventDefault()
      const [rowDelta, columnDelta] = move
      setGame((current) => {
        const selected = current.selected ?? 0
        const row = Math.floor(selected / 9)
        const column = selected % 9
        const nextRow = (row + rowDelta + 9) % 9
        const nextColumn = (column + columnDelta + 9) % 9
        return { ...current, selected: nextRow * 9 + nextColumn }
      })
    }

    window.addEventListener('keydown', handleArrowKey)
    return () => window.removeEventListener('keydown', handleArrowKey)
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      undo()
      return
    }
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault()
      enterNumber(Number(event.key))
      return
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      erase()
      return
    }

    const actions: Record<string, () => void> = {
      n: toggleNotes,
      N: toggleNotes,
      h: revealHint,
      H: revealHint,
      m: toggleSound,
      M: toggleSound,
      p: togglePause,
      P: togglePause,
      ' ': togglePause,
    }
    const action = actions[event.key]
    if (action) {
      event.preventDefault()
      action()
    }
  }

  return (
    <main className="app" onKeyDown={handleKeyDown}>
      <header className="topbar">
        <button
          className="mobile-header-action mobile-restart"
          type="button"
          aria-label="重新开始本难度游戏"
          onClick={() => startNewGame()}
        >
          <Icon name="restart" />
        </button>

        <a className="brand" href="#game" aria-label="Sudoku 首页">
          <img
            className="brand-mark"
            src={`${import.meta.env.BASE_URL}sudoku-icon.png`}
            alt=""
            aria-hidden="true"
          />
          <span>
            <strong>
              <span className="desktop-brand-title">SUDOKU</span>
              <span className="mobile-brand-title">Sudoku</span>
            </strong>
            <small>清醒思考，安静解题</small>
          </span>
        </a>

        <nav className="difficulty-nav" aria-label="选择游戏难度">
          {DIFFICULTIES.map((item) => (
            <button
              className={item.id === game.difficulty ? 'active' : ''}
              key={item.id}
              type="button"
              onClick={() => startNewGame(item.id)}
              aria-current={item.id === game.difficulty ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="score-area">
          <button
            className={`sound-button${soundEnabled ? '' : ' muted'}`}
            type="button"
            aria-label={soundEnabled ? '关闭音效' : '开启音效'}
            aria-pressed={!soundEnabled}
            title={`${soundEnabled ? '关闭' : '开启'}音效（M）`}
            onClick={toggleSound}
          >
            <Icon name={soundEnabled ? 'sound' : 'mute'} />
          </button>
          <div className="score-block" aria-label={`本局得分 ${score}`}>
            <small>本局得分</small>
            <strong>{score.toLocaleString()}</strong>
          </div>
        </div>
      </header>

      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className="mobile-statusbar" aria-label="本局状态">
        <div className={`mobile-status mobile-difficulty${difficultyOpen ? ' open' : ''}`}>
          <button
            type="button"
            className="difficulty-trigger"
            aria-haspopup="listbox"
            aria-expanded={difficultyOpen}
            onClick={() => setDifficultyOpen((open) => !open)}
          >
            <span>难度</span>
            <strong>
              {difficulty.label}
              <Icon name="chevron" />
            </strong>
          </button>
          {difficultyOpen && (
            <>
              <button
                type="button"
                className="difficulty-backdrop"
                aria-label="关闭难度菜单"
                tabIndex={-1}
                onClick={() => setDifficultyOpen(false)}
              />
              <div className="difficulty-menu" role="listbox" aria-label="选择游戏难度">
                <small>选择难度将开始新一局</small>
                {DIFFICULTIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={item.id === game.difficulty}
                    className={item.id === game.difficulty ? 'active' : ''}
                    onClick={() => {
                      setDifficultyOpen(false)
                      if (item.id !== game.difficulty) startNewGame(item.id)
                    }}
                  >
                    {item.label}
                    {item.id === game.difficulty && <Icon name="check" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="mobile-status">
          <span>错误</span>
          <strong className={game.mistakes > 0 ? 'danger' : ''}>
            {game.mistakes}<em>/{MAX_MISTAKES}</em>
          </strong>
        </div>
        <div className="mobile-status">
          <span>分数</span>
          <strong>{score.toLocaleString()}</strong>
        </div>
        <div className="mobile-status mobile-time">
          <span>时间</span>
          <strong>{formatTime(game.elapsed)}</strong>
          <button
            type="button"
            aria-label={game.paused ? '继续游戏' : '暂停游戏'}
            disabled={game.completed || gameOver}
            onClick={togglePause}
          >
            <Icon name={game.paused ? 'play' : 'pause'} />
          </button>
        </div>
      </section>

      <section className="game-shell" id="game">
        <div className="board-column">
          <div className="board-wrap">
            <div className="sudoku-board" role="grid" aria-label="9乘9数独棋盘">
              {game.board.map((value, index) => {
                const row = Math.floor(index / 9)
                const column = index % 9
                const fixed = game.puzzle[index] !== 0
                const selected = game.selected === index
                const peer =
                  game.selected !== null &&
                  index !== game.selected &&
                  cellsArePeers(game.selected, index)
                const sameValue =
                  selectedValue !== 0 && value === selectedValue && !selected
                const incorrect = value !== 0 && value !== game.solution[index]
                const classes = [
                  'cell',
                  fixed ? 'fixed' : 'editable',
                  selected ? 'selected' : '',
                  peer ? 'peer' : '',
                  sameValue ? 'same-value' : '',
                  incorrect ? 'incorrect' : '',
                  column === 2 || column === 5 ? 'box-right' : '',
                  row === 2 || row === 5 ? 'box-bottom' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    className={classes}
                    key={index}
                    type="button"
                    role="gridcell"
                    aria-selected={selected}
                    aria-label={`第 ${row + 1} 行第 ${column + 1} 列${
                      value ? `，数字 ${value}` : '，空白'
                    }${fixed ? '，题目数字' : ''}`}
                    onClick={() => selectCell(index)}
                  >
                    {value !== 0 ? (
                      <span className="cell-value">{value}</span>
                    ) : (
                      <span className="notes-grid" aria-hidden="true">
                        {Array.from({ length: 9 }, (_, noteIndex) => {
                          const noted =
                            (game.notes[index] & (1 << (noteIndex + 1))) !== 0
                          const highlight =
                            noted && selectedValue === noteIndex + 1
                          return (
                            <i
                              key={noteIndex}
                              className={highlight ? 'note-highlight' : ''}
                            >
                              {noted ? noteIndex + 1 : ''}
                            </i>
                          )
                        })}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {game.paused && !game.completed && (
              <div className="board-overlay">
                <div className="overlay-icon">
                  <Icon name="pause" />
                </div>
                <h2>游戏已暂停</h2>
                <p>放松一下，回来再继续。</p>
                <button
                  className="primary compact"
                  type="button"
                  onClick={resumeGame}
                >
                  继续游戏
                </button>
              </div>
            )}

            {(game.completed || gameOver) && (
              <div className="board-overlay result-overlay">
                <span className="result-kicker">
                  {game.completed ? 'CHALLENGE COMPLETE' : 'TRY AGAIN'}
                </span>
                <h2>{game.completed ? '漂亮，全部完成！' : '差一点就成功了'}</h2>
                <p>
                  {game.completed
                    ? `用时 ${formatTime(game.elapsed)}，获得 ${score.toLocaleString()} 分。`
                    : '本局已出现 3 次错误，换一道题重新挑战吧。'}
                </p>
                <button
                  className="primary compact"
                  type="button"
                  onClick={() => startNewGame()}
                >
                  再来一局
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="control-panel" aria-label="游戏控制面板">
          <div className="stats">
            <div className="stat">
              <span>难度</span>
              <strong>{difficulty.label}</strong>
            </div>
            <div className="stat">
              <span>错误</span>
              <strong className={game.mistakes > 0 ? 'danger' : ''}>
                {game.mistakes}<em>/{MAX_MISTAKES}</em>
              </strong>
            </div>
            <div className="stat time-stat">
              <span>用时</span>
              <strong>{formatTime(game.elapsed)}</strong>
              <button
                className="pause-button"
                type="button"
                aria-label={game.paused ? '继续游戏' : '暂停游戏'}
                disabled={game.completed || gameOver}
                onClick={togglePause}
              >
                <Icon name={game.paused ? 'play' : 'pause'} />
              </button>
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              onClick={undo}
              disabled={!history.length || game.paused}
            >
              <span className="action-icon"><Icon name="undo" /></span>
              <strong>撤销</strong>
              <small>⌘ Z</small>
            </button>
            <button type="button" onClick={erase} disabled={game.paused}>
              <span className="action-icon"><Icon name="erase" /></span>
              <strong>擦除</strong>
              <small>Delete</small>
            </button>
            <button
              className={notesMode ? 'active' : ''}
              type="button"
              onClick={toggleNotes}
              disabled={game.paused || game.completed || gameOver}
            >
              <span className="action-icon"><Icon name="note" /></span>
              <strong>笔记</strong>
              <small>{notesMode ? '已开启' : '按 N'}</small>
              <i className="mode-pill">{notesMode ? 'ON' : 'OFF'}</i>
            </button>
            <button
              type="button"
              onClick={revealHint}
              disabled={game.paused || game.completed || gameOver}
            >
              <span className="action-icon"><Icon name="hint" /></span>
              <strong>提示</strong>
              <small>剩余 {game.hints} 次</small>
              <i className="hint-count">{game.hints}</i>
            </button>
          </div>

          <div className="number-pad" aria-label="数字键盘">
            {Array.from({ length: 9 }, (_, index) => index + 1).map((number) => (
              <button
                type="button"
                key={number}
                onClick={() => enterNumber(number)}
                disabled={
                  numberCounts[number - 1] >= 9 ||
                  game.paused ||
                  game.completed ||
                  gameOver
                }
                aria-label={`填写数字 ${number}`}
              >
                <strong>{number}</strong>
                <small>{9 - numberCounts[number - 1]}</small>
              </button>
            ))}
          </div>

          <button className="primary new-game" type="button" onClick={() => startNewGame()}>
            新游戏
            <span>生成另一道{difficulty.label}题目</span>
          </button>

          <p className="keyboard-tip">
            <kbd>1–9</kbd> 填数 <kbd>N</kbd> 笔记 <kbd>H</kbd> 提示 <kbd>M</kbd> 静音
          </p>
        </aside>
      </section>

      <footer>
        <p>专注当下这一格，每一步都算数。</p>
        <span>题目均为随机生成，并经过唯一解校验</span>
      </footer>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}

export default App
