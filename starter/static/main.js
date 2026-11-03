const SIZE = 9;
const STORAGE_KEY = 'daily-grid.leaderboard.v1';
const THEME_KEY = 'daily-grid.theme.v1';
const boardElement = document.getElementById('sudoku-board');
const cells = [];
let elapsedSeconds = 0;
let timerStartedAt = 0;
let timerInterval = null;
let hintsUsed = 0;
let currentDifficulty = 'medium';
let gameCompleted = false;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function updateTimer() {
  elapsedSeconds = Math.floor((Date.now() - timerStartedAt) / 1000);
  document.getElementById('timer').value = formatTime(elapsedSeconds);
  document.getElementById('timer').textContent = formatTime(elapsedSeconds);
}

function startTimer() {
  window.clearInterval(timerInterval);
  elapsedSeconds = 0;
  timerStartedAt = Date.now();
  updateTimer();
  timerInterval = window.setInterval(updateTimer, 1000);
}

function stopTimer() {
  window.clearInterval(timerInterval);
  updateTimer();
}

function createBoard() {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const cell = document.createElement('input');
      cell.type = 'text';
      cell.inputMode = 'numeric';
      cell.maxLength = 1;
      cell.autocomplete = 'off';
      cell.className = 'sudoku-cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
      if ((Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 0) {
        cell.classList.add('box-tone-a');
      } else {
        cell.classList.add('box-tone-b');
      }
      if (col < SIZE - 1 && (col + 1) % 3 === 0) cell.classList.add('box-right');
      if (row < SIZE - 1 && (row + 1) % 3 === 0) cell.classList.add('box-bottom');
      cells.push(cell);
      boardElement.appendChild(cell);
    }
  }
}

function renderPuzzle(puzzle) {
  puzzle.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const cell = cells[rowIndex * SIZE + colIndex];
      cell.value = value === 0 ? '' : value;
      cell.readOnly = value !== 0;
      cell.classList.toggle('prefilled', value !== 0);
      cell.classList.remove('hinted', 'incorrect', 'conflict');
    });
  });
}

function getBoard() {
  return Array.from({length: SIZE}, (_, row) =>
    Array.from({length: SIZE}, (_, col) => {
      const value = cells[row * SIZE + col].value;
      return value ? Number.parseInt(value, 10) : 0;
    })
  );
}

function validateConflicts() {
  cells.forEach((cell) => cell.classList.remove('conflict'));
  const groups = [];
  for (let index = 0; index < SIZE; index += 1) {
    groups.push(Array.from({length: SIZE}, (_, offset) => cells[index * SIZE + offset]));
    groups.push(Array.from({length: SIZE}, (_, offset) => cells[offset * SIZE + index]));
  }
  for (let boxRow = 0; boxRow < SIZE; boxRow += 3) {
    for (let boxCol = 0; boxCol < SIZE; boxCol += 3) {
      const group = [];
      for (let row = boxRow; row < boxRow + 3; row += 1) {
        for (let col = boxCol; col < boxCol + 3; col += 1) {
          group.push(cells[row * SIZE + col]);
        }
      }
      groups.push(group);
    }
  }
  groups.forEach((group) => {
    const values = new Map();
    group.forEach((cell) => {
      if (!cell.value) return;
      const matching = values.get(cell.value) || [];
      matching.push(cell);
      values.set(cell.value, matching);
    });
    values.forEach((matching) => {
      if (matching.length > 1) matching.forEach((cell) => cell.classList.add('conflict'));
    });
  });
}

function setMessage(text, kind = '') {
  const message = document.getElementById('message');
  message.textContent = text;
  message.className = `message${kind ? ` message-${kind}` : ''}`;
}

async function newGame() {
  const button = document.getElementById('new-game');
  button.disabled = true;
  setMessage('Preparing a unique puzzle…');
  try {
    const selectedDifficulty = document.getElementById('difficulty').value;
    const response = await fetch(`/new?difficulty=${encodeURIComponent(selectedDifficulty)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not start a new puzzle.');
    currentDifficulty = data.difficulty;
    renderPuzzle(data.puzzle);
    hintsUsed = 0;
    gameCompleted = false;
    document.getElementById('hint-count').textContent = 'Hints: 0';
    document.getElementById('score-form').hidden = true;
    document.getElementById('player-name').value = '';
    document.getElementById('check-solution').disabled = false;
    document.getElementById('hint-button').disabled = false;
    setMessage('');
    validateConflicts();
    startTimer();
  } catch (error) {
    setMessage(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

function finishGame() {
  if (gameCompleted) return;
  gameCompleted = true;
  stopTimer();
  cells.forEach((cell) => { cell.readOnly = true; });
  document.getElementById('hint-button').disabled = true;
  document.getElementById('check-solution').disabled = true;
  document.getElementById('score-form').hidden = false;
  setMessage(`Puzzle solved in ${formatTime(elapsedSeconds)}. Nicely done!`, 'success');
  document.getElementById('player-name').focus();
}

async function checkSolution() {
  try {
    const response = await fetch('/check', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({board: getBoard()})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not check this puzzle.');
    cells.forEach((cell) => cell.classList.remove('incorrect'));
    data.incorrect.forEach(([row, col]) => {
      const cell = cells[row * SIZE + col];
      if (!cell.readOnly) cell.classList.add('incorrect');
    });
    if (data.complete) {
      finishGame();
    } else {
      const count = data.incorrect.length;
      setMessage(`${count} ${count === 1 ? 'cell needs' : 'cells need'} attention.`, 'error');
      validateConflicts();
    }
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

async function requestHint() {
  try {
    const response = await fetch('/hint', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({board: getBoard()})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No hint is available.');
    const cell = cells[data.row * SIZE + data.col];
    cell.value = data.value;
    cell.readOnly = true;
    cell.classList.add('hinted');
    cell.classList.remove('incorrect');
    hintsUsed += 1;
    document.getElementById('hint-count').textContent = `Hints: ${hintsUsed}`;
    setMessage('A correct number was added and locked.', 'success');
    validateConflicts();
    if (getBoard().every((row) => row.every(Boolean))) await checkSolution();
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function readLeaderboard() {
  try {
    const entries = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(entries) ? entries.filter((entry) =>
      entry && typeof entry.name === 'string' && Number.isFinite(entry.seconds)
    ) : [];
  } catch {
    return [];
  }
}

function renderLeaderboard() {
  const entries = readLeaderboard().sort((first, second) => first.seconds - second.seconds).slice(0, 10);
  const body = document.getElementById('leaderboard-body');
  body.replaceChildren();
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    [index + 1, entry.name, formatTime(entry.seconds), entry.difficulty, entry.hints].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  document.getElementById('leaderboard-empty').hidden = entries.length > 0;
}

function saveScore(event) {
  event.preventDefault();
  const name = document.getElementById('player-name').value.trim();
  if (!name || !gameCompleted) return;
  const entries = readLeaderboard();
  entries.push({name, seconds: elapsedSeconds, difficulty: currentDifficulty, hints: hintsUsed});
  entries.sort((first, second) => first.seconds - second.seconds);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 10)));
    renderLeaderboard();
    document.getElementById('score-form').hidden = true;
    setMessage('Your time has been saved to the leaderboard.', 'success');
  } catch {
    setMessage('Could not save your score in this browser.', 'error');
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  const button = document.getElementById('theme-toggle');
  button.setAttribute('aria-pressed', String(isDark));
  document.getElementById('theme-label').textContent = isDark ? 'Light mode' : 'Dark mode';
}

function initializeTheme() {
  let savedTheme = 'light';
  try {
    savedTheme = window.localStorage.getItem(THEME_KEY) || 'light';
  } catch {
    savedTheme = 'light';
  }
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
}

function onCellInput(event) {
  const cell = event.target;
  if (!cell.matches('.sudoku-cell') || cell.readOnly) return;
  cell.value = cell.value.replace(/[^1-9]/g, '').slice(0, 1);
  cells.forEach((item) => item.classList.remove('incorrect'));
  setMessage('');
  validateConflicts();
  if (getBoard().every((row) => row.every(Boolean))) checkSolution();
}

function moveWithArrow(event) {
  const directions = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};
  if (!directions[event.key]) return;
  const cell = event.target;
  const row = Number(cell.dataset.row) + directions[event.key][0];
  const col = Number(cell.dataset.col) + directions[event.key][1];
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return;
  event.preventDefault();
  cells[row * SIZE + col].focus();
}

createBoard();
initializeTheme();
renderLeaderboard();
document.getElementById('new-game').addEventListener('click', newGame);
document.getElementById('check-solution').addEventListener('click', checkSolution);
document.getElementById('hint-button').addEventListener('click', requestHint);
document.getElementById('theme-toggle').addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  try {
    window.localStorage.setItem(THEME_KEY, nextTheme);
  } catch {
    setMessage('Theme preference could not be saved.', 'error');
  }
});
document.getElementById('score-form').addEventListener('submit', saveScore);
boardElement.addEventListener('input', onCellInput);
boardElement.addEventListener('keydown', moveWithArrow);
newGame();