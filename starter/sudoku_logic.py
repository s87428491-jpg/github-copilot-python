import copy
import random

SIZE = 9
EMPTY = 0

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def count_solutions(board, limit=2):
    if limit < 1 or len(board) != SIZE or any(len(row) != SIZE for row in board):
        return 0

    for row in range(SIZE):
        values = [value for value in board[row] if value != EMPTY]
        if any(value < 1 or value > SIZE for value in values) or len(values) != len(set(values)):
            return 0
        values = [board[index][row] for index in range(SIZE) if board[index][row] != EMPTY]
        if len(values) != len(set(values)):
            return 0

    for box_row in range(0, SIZE, 3):
        for box_col in range(0, SIZE, 3):
            values = [
                board[row][col]
                for row in range(box_row, box_row + 3)
                for col in range(box_col, box_col + 3)
                if board[row][col] != EMPTY
            ]
            if len(values) != len(set(values)):
                return 0

    def search():
        best_cell = None
        best_candidates = None
        for row in range(SIZE):
            for col in range(SIZE):
                if board[row][col] != EMPTY:
                    continue
                candidates = [
                    value for value in range(1, SIZE + 1)
                    if is_safe(board, row, col, value)
                ]
                if not candidates:
                    return 0
                if best_candidates is None or len(candidates) < len(best_candidates):
                    best_cell = (row, col)
                    best_candidates = candidates
                    if len(candidates) == 1:
                        break
            if best_candidates is not None and len(best_candidates) == 1:
                break

        if best_cell is None:
            return 1

        row, col = best_cell
        total = 0
        for value in best_candidates:
            board[row][col] = value
            total += search()
            board[row][col] = EMPTY
            if total >= limit:
                break
        return total

    return search()

def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True

def remove_cells(board, clues):
    if not 17 <= clues <= SIZE * SIZE:
        raise ValueError('clues must be between 17 and 81')

    cells = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(cells)
    remaining = SIZE * SIZE
    for row, col in cells:
        if remaining <= clues:
            break
        value = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(board) == 1:
            remaining -= 1
        else:
            board[row][col] = value

def generate_puzzle(clues=35):
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, clues)
    puzzle = deep_copy(board)
    return puzzle, solution
