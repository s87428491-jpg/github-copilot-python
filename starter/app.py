from flask import Flask, render_template, jsonify, request
import sudoku_logic

app = Flask(__name__)

DIFFICULTY_CLUES = {
    'easy': 40,
    'medium': 32,
    'hard': 26,
}

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', '').lower()
    try:
        clues = DIFFICULTY_CLUES[difficulty] if difficulty else int(request.args.get('clues', 35))
        puzzle, solution = sudoku_logic.generate_puzzle(clues)
    except (KeyError, ValueError):
        return jsonify({'error': 'Choose easy, medium, or hard difficulty'}), 400
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    return jsonify({'puzzle': puzzle, 'difficulty': difficulty or 'custom'})


def _is_valid_request_board(board):
    return (
        isinstance(board, list)
        and len(board) == sudoku_logic.SIZE
        and all(
            isinstance(row, list)
            and len(row) == sudoku_logic.SIZE
            and all(type(value) is int and 0 <= value <= sudoku_logic.SIZE for value in row)
            for row in board
        )
    )

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.get_json(silent=True) or {}
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    board = data.get('board')
    if not _is_valid_request_board(board):
        return jsonify({'error': 'Board must be a 9 by 9 grid of numbers from 0 to 9'}), 400
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect, 'complete': not incorrect})


@app.route('/hint', methods=['POST'])
def give_hint():
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    data = request.get_json(silent=True) or {}
    board = data.get('board')
    if not _is_valid_request_board(board):
        return jsonify({'error': 'Board must be a 9 by 9 grid of numbers from 0 to 9'}), 400

    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if board[row][col] == 0:
                value = solution[row][col]
                CURRENT['puzzle'][row][col] = value
                return jsonify({'row': row, 'col': col, 'value': value})
    return jsonify({'error': 'There are no empty cells to hint'}), 400

if __name__ == '__main__':
    app.run(debug=True)