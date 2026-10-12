class SudokuGame {
  constructor() {
    this.board = [];
    this.solution = [];
    this.puzzle = [];
    this.selectedCell = null;
    this.difficulty = 'easy';
    this.hintsLeft = 3;
    this.mistakes = 0;
    this.maxMistakes = 5;
    this.timerInterval = null;
    this.startTime = 0;
    this.soundEnabled = true;
    this.leaderboard = this.loadLeaderboard();

    this.bindEvents();
    this.initNumberPad();
    this.newGame();
    this.renderLeaderboard();
    this.updateSoundButton();
  }

  bindEvents() {
    document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
    document.getElementById('hintBtn').addEventListener('click', () => this.giveHint());
    document.getElementById('clearBtn').addEventListener('click', () => this.clearSelected());
    document.getElementById('playAgainBtn').addEventListener('click', () => this.newGame());
    document.getElementById('retryBtn').addEventListener('click', () => this.newGame());
    document.getElementById('closeWinBtn').addEventListener('click', () => this.hideModal('winModal'));
    document.getElementById('closeGameOverBtn').addEventListener('click', () => this.hideModal('gameOverModal'));

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.level;
        this.newGame();
      });
    });

    document.getElementById('soundToggle').addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.updateSoundButton();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key >= '1' && event.key <= '9') {
        this.placeNumber(Number(event.key));
      } else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        this.clearSelected();
      }
    });
  }

  initNumberPad() {
    const pad = document.getElementById('numberPad');
    pad.innerHTML = '';

    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.className = 'num-btn';
      btn.textContent = i;
      btn.addEventListener('click', () => this.placeNumber(i));
      pad.appendChild(btn);
    }
  }

  loadLeaderboard() {
    const raw = localStorage.getItem('dogusoLeaderboard');
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveLeaderboard() {
    localStorage.setItem('dogusoLeaderboard', JSON.stringify(this.leaderboard));
  }

  renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';

    const entries = this.leaderboard.slice(0, 5);
    if (!entries.length) {
      list.innerHTML = '<div class="leaderboard-item"><span>Chưa có dữ liệu</span><span>—</span></div>';
      return;
    }

    entries.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-item';
      row.innerHTML = `
        <span><span class="medal">${['🥇', '🥈', '🥉'][index] || '🏅'}</span> #${index + 1}</span>
        <strong>${this.formatTime(entry.time)}</strong>
      `;
      list.appendChild(row);
    });
  }

  formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  updateSoundButton() {
    const btn = document.getElementById('soundToggle');
    btn.textContent = this.soundEnabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !this.soundEnabled);
  }

  beep(type = 'normal') {
    if (!this.soundEnabled) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    const frequencies = {
      normal: 520,
      success: 760,
      error: 180,
      win: 920,
      hint: 600,
    };

    oscillator.type = 'sine';
    oscillator.frequency.value = frequencies[type] || 520;
    gain.gain.value = 0.04;

    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    oscillator.stop(ctx.currentTime + 0.12);
  }

  generateSolvedBoard() {
    const base = Array.from({ length: 9 }, (_, row) =>
      Array.from({ length: 9 }, (_, col) => ((row * 3 + Math.floor(row / 3) + col) % 9) + 1)
    );

    // Shuffle rows in groups of 3
    const rowGroups = this.shuffle([0, 1, 2]).map(group => this.shuffle([group * 3, group * 3 + 1, group * 3 + 2])).flat();
    const colGroups = this.shuffle([0, 1, 2]).map(group => this.shuffle([group * 3, group * 3 + 1, group * 3 + 2])).flat();
    const digits = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const solved = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => {
        const row = rowGroups[r];
        const col = colGroups[c];
        return digits[(base[row][col] - 1) % 9];
      })
    );

    return solved;
  }

  shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  makePuzzle() {
    const solution = this.generateSolvedBoard();
    const puzzle = solution.map(row => [...row]);

    const cluesByDifficulty = {
      easy: 46,
      medium: 40,
      hard: 34,
      expert: 28,
    };

    const targetClues = cluesByDifficulty[this.difficulty] || 46;
    const totalCells = 81;
    let removeCount = totalCells - targetClues;
    const positions = this.shuffle(Array.from({ length: 81 }, (_, i) => i));

    for (const index of positions) {
      if (removeCount <= 0) break;
      const row = Math.floor(index / 9);
      const col = index % 9;
      puzzle[row][col] = 0;
      removeCount--;
    }

    return { puzzle, solution };
  }

  newGame() {
    const { puzzle, solution } = this.makePuzzle();
    this.puzzle = puzzle;
    this.solution = solution;
    this.board = puzzle.map(row => [...row]);
    this.selectedCell = null;
    this.hintsLeft = 3;
    this.mistakes = 0;
    this.startTime = Date.now();
    this.clearTimer();
    this.startTimer();
    this.render();
    this.updateStats();
    this.hideModal('winModal');
    this.hideModal('gameOverModal');
    this.beep('normal');
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      document.getElementById('timer').textContent = `${mins}:${secs}`;
    }, 1000);
  }

  render() {
    const grid = document.getElementById('sudokuGrid');
    grid.innerHTML = '';

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = document.createElement('div');
        const value = this.board[row][col];
        cell.className = 'cell';
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        if (this.puzzle[row][col] !== 0) {
          cell.classList.add('given');
        }

        if (this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col) {
          cell.classList.add('selected');
        }

        if (value !== 0) {
          cell.textContent = value;
        }

        if (this.selectedCell) {
          const sameRow = row === this.selectedCell.row;
          const sameCol = col === this.selectedCell.col;
          const sameBox = (Math.floor(row / 3) === Math.floor(this.selectedCell.row / 3) && Math.floor(col / 3) === Math.floor(this.selectedCell.col / 3));
          if ((sameRow || sameCol || sameBox) && !(sameRow && sameCol)) {
            cell.classList.add('related');
          }
        }

        if (this.puzzle[row][col] === 0 && value !== 0 && value === this.solution[row][col]) {
          cell.classList.add('correct');
        }

        if (value !== 0 && value !== this.solution[row][col] && this.puzzle[row][col] === 0) {
          cell.classList.add('error');
        }

        cell.addEventListener('click', () => this.selectCell(row, col));
        grid.appendChild(cell);
      }
    }

    this.updateStats();
  }

  selectCell(row, col) {
    if (this.puzzle[row][col] !== 0) {
      return;
    }

    this.selectedCell = { row, col };
    this.render();
  }

  clearSelected() {
    if (!this.selectedCell) return;

    const { row, col } = this.selectedCell;
    if (this.puzzle[row][col] !== 0) return;

    this.board[row][col] = 0;
    this.render();
    this.beep('hint');
  }

  placeNumber(value) {
    if (!this.selectedCell) return;

    const { row, col } = this.selectedCell;
    if (this.puzzle[row][col] !== 0) return;

    const current = this.board[row][col];
    const correct = this.solution[row][col] === value;

    if (current === value) {
      this.board[row][col] = 0;
      this.render();
      return;
    }

    if (correct) {
      this.board[row][col] = value;
      this.beep('success');
      this.render();
      this.checkWin();
      return;
    }

    this.board[row][col] = value;
    this.mistakes += 1;
    this.beep('error');
    this.render();

    if (this.mistakes >= this.maxMistakes) {
      this.showGameOver();
      return;
    }

    this.updateStats();
    setTimeout(() => {
      if (this.board[row][col] === value) {
        this.board[row][col] = 0;
        this.render();
      }
    }, 420);
  }

  giveHint() {
    if (this.hintsLeft <= 0) {
      return;
    }

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.puzzle[row][col] === 0 && this.board[row][col] !== this.solution[row][col]) {
          this.board[row][col] = this.solution[row][col];
          this.hintsLeft -= 1;
          this.render();
          this.updateStats();
          this.beep('hint');
          this.checkWin();
          return;
        }
      }
    }
  }

  updateStats() {
    const remaining = this.board.flat().filter(v => v === 0).length;
    document.getElementById('remaining').textContent = String(remaining);
    document.getElementById('mistakes').textContent = `${this.mistakes}/${this.maxMistakes}`;
    document.getElementById('hintCount').textContent = `(${this.hintsLeft})`;
  }

  checkWin() {
    const solved = this.board.every((row, r) => row.every((cell, c) => cell === this.solution[r][c]));
    if (!solved) return;

    this.clearTimer();
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.beep('win');

    this.leaderboard.push({ time: elapsed });
    this.leaderboard.sort((a, b) => a.time - b.time);
    this.leaderboard = this.leaderboard.slice(0, 5);
    this.saveLeaderboard();
    this.renderLeaderboard();

    const winText = `Bạn đã hoàn thành trong ${this.formatTime(elapsed)}.`;
    document.getElementById('winMessage').textContent = winText;
    this.showModal('winModal');
  }

  showGameOver() {
    this.clearTimer();
    document.getElementById('gameOverMessage').textContent = `Bạn đã dùng quá ${this.maxMistakes} lỗi. Hãy thử lại!`;
    this.showModal('gameOverModal');
  }

  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
  }

  hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.game = new SudokuGame();
});

if (typeof window !== 'undefined') {
  window.formatTime = function (seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };
}
