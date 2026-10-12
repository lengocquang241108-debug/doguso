class SudokuGame {
    constructor() {
        this.board = [];
        this.original = [];
        this.solution = [];
        this.selectedCell = null;
        this.errors = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.difficulty = 'easy';
        this.hints = 3;
        
        this.initEventListeners();
        this.newGame();
    }

    initEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('hintBtn').addEventListener('click', () => this.giveHint());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCell());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.newGame());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());

        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.difficulty = e.target.dataset.level;
                this.newGame();
            });
        });
    }

    generateBoard() {
        this.solution = this.createEmptyBoard();
        this.fillBoard(this.solution);
        this.board = this.solution.map(row => [...row]);
        this.original = this.solution.map(row => [...row]);
        this.removeNumbers();
    }

    createEmptyBoard() {
        return Array(9).fill(null).map(() => Array(9).fill(0));
    }

    fillBoard(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (let num of numbers) {
                        if (this.isValid(board, row, col, num)) {
                            board[row][col] = num;
                            if (this.fillBoard(board)) return true;
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    isValid(board, row, col, num) {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (board[row][x] === num) return false;
        }

        // Check column
        for (let x = 0; x < 9; x++) {
            if (board[x][col] === num) return false;
        }

        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (board[i][j] === num) return false;
            }
        }

        return true;
    }

    removeNumbers() {
        const difficulty = {
            easy: 40,
            medium: 50,
            hard: 60,
            expert: 70
        };
        
        let cellsToRemove = difficulty[this.difficulty] || 40;
        let removed = 0;

        while (removed < cellsToRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            
            if (this.board[row][col] !== 0) {
                const temp = this.board[row][col];
                this.board[row][col] = 0;
                removed++;
            }
        }
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    newGame() {
        this.errors = 0;
        this.selectedCell = null;
        this.hints = 3;
        clearInterval(this.timerInterval);
        this.startTime = Date.now();
        this.generateBoard();
        this.render();
        this.startTimer();
        this.closeModal();
        document.getElementById('errors').textContent = '0';
    }

    render() {
        const grid = document.getElementById('sudokuGrid');
        grid.innerHTML = '';
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (this.original[row][col] !== 0) {
                    cell.classList.add('given');
                    cell.textContent = this.original[row][col];
                } else if (this.board[row][col] !== 0) {
                    cell.textContent = this.board[row][col];
                }
                
                cell.addEventListener('click', () => this.selectCell(row, col, cell));
                grid.appendChild(cell);
            }
        }
        
        this.updateRemaining();
    }

    selectCell(row, col, cellElement) {
        if (this.original[row][col] !== 0) return; // Can't select given cells

        if (this.selectedCell) {
            this.selectedCell.classList.remove('selected', 'related');
        }

        cellElement.classList.add('selected');
        this.selectedCell = cellElement;
        this.highlightRelated(row, col);
    }

    highlightRelated(row, col) {
        const cells = document.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            
            if ((r === row || c === col || 
                (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3))) &&
                !(r === row && c === col)) {
                cell.classList.add('related');
            }
        });
    }

    placeNumber(num) {
        if (!this.selectedCell) return;
        
        const row = parseInt(this.selectedCell.dataset.row);
        const col = parseInt(this.selectedCell.dataset.col);
        
        if (this.original[row][col] !== 0) return;
        
        this.board[row][col] = num;
        this.selectedCell.textContent = num;
        
        if (num !== this.solution[row][col]) {
            this.selectedCell.classList.add('error');
            this.errors++;
            document.getElementById('errors').textContent = this.errors;
            
            setTimeout(() => {
                this.selectedCell.classList.remove('error');
                this.board[row][col] = 0;
                this.selectedCell.textContent = '';
            }, 500);
        } else {
            this.selectedCell.classList.remove('error');
            this.updateRemaining();
            this.checkWin();
        }
    }

    clearCell() {
        if (!this.selectedCell) return;
        
        const row = parseInt(this.selectedCell.dataset.row);
        const col = parseInt(this.selectedCell.dataset.col);
        
        if (this.original[row][col] === 0) {
            this.board[row][col] = 0;
            this.selectedCell.textContent = '';
            this.selectedCell.classList.remove('error');
            this.updateRemaining();
        }
    }

    giveHint() {
        if (this.hints <= 0) {
            alert('Bạn đã hết gợi ý!');
            return;
        }
        
        let found = false;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === 0 && this.original[row][col] === 0) {
                    this.board[row][col] = this.solution[row][col];
                    found = true;
                    this.hints--;
                    break;
                }
            }
            if (found) break;
        }
        
        if (found) {
            this.render();
            this.updateRemaining();
            this.checkWin();
        }
    }

    updateRemaining() {
        let remaining = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === 0) remaining++;
            }
        }
        document.getElementById('remaining').textContent = remaining;
    }

    checkWin() {
        let complete = true;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === 0 || this.board[row][col] !== this.solution[row][col]) {
                    complete = false;
                    break;
                }
            }
            if (!complete) break;
        }
        
        if (complete) {
            clearInterval(this.timerInterval);
            const time = document.getElementById('timer').textContent;
            const message = `Chúc mừng! Bạn hoàn thành trong ${time}!`;
            document.getElementById('winMessage').textContent = message;
            this.showModal();
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timer').textContent = 
                String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        }, 1000);
    }

    showModal() {
        document.getElementById('winModal').classList.add('show');
    }

    closeModal() {
        document.getElementById('winModal').classList.remove('show');
    }
}

// Initialize number pad
function initNumberPad() {
    const numberPad = document.getElementById('numberPad');
    numberPad.innerHTML = '';
    
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.textContent = i;
        btn.addEventListener('click', () => game.placeNumber(i));
        numberPad.appendChild(btn);
    }
    
    const clearBtn = document.createElement('button');
    clearBtn.className = 'num-btn';
    clearBtn.textContent = 'C';
    clearBtn.style.gridColumn = 'span 1';
    clearBtn.addEventListener('click', () => game.clearCell());
    numberPad.appendChild(clearBtn);
}

let game;
document.addEventListener('DOMContentLoaded', () => {
    initNumberPad();
    game = new SudokuGame();
    
    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.key >= '1' && e.key <= '9') {
            game.placeNumber(parseInt(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            game.clearCell();
        }
    });
});