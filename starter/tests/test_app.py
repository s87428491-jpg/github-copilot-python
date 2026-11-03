import app as sudoku_app
import sudoku_logic
import pytest


SOLUTION = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
]


@pytest.fixture

def client():
    sudoku_app.app.config.update(TESTING=True)
    sudoku_app.CURRENT.update(puzzle=None, solution=None)
    return sudoku_app.app.test_client()


def test_home_page_loads(client):
    response = client.get("/")

    assert response.status_code == 200


def test_new_game_returns_nine_by_nine_puzzle_with_default_clues(client):
    response = client.get("/new")
    puzzle = response.get_json()["puzzle"]

    assert response.status_code == 200
    assert len(puzzle) == 9
    assert all(len(row) == 9 for row in puzzle)
    assert sum(value != 0 for row in puzzle for value in row) == 35


@pytest.mark.parametrize("difficulty,clues", [("easy", 40), ("medium", 32), ("hard", 26)])
def test_new_game_difficulty_sets_clue_count(client, difficulty, clues):
    response = client.get(f"/new?difficulty={difficulty}")
    puzzle = response.get_json()["puzzle"]

    assert response.status_code == 200
    assert response.get_json()["difficulty"] == difficulty
    assert sum(value != 0 for row in puzzle for value in row) == clues


def test_new_game_rejects_unknown_difficulty(client):
    response = client.get("/new?difficulty=expert")

    assert response.status_code == 400


def test_check_requires_a_game_in_progress(client):
    response = client.post("/check", json={"board": SOLUTION})

    assert response.status_code == 400
    assert response.get_json() == {"error": "No game in progress"}


def test_check_reports_incorrect_cell_coordinates(client):
    sudoku_app.CURRENT["solution"] = SOLUTION
    board = [row[:] for row in SOLUTION]
    board[0][0] = 0

    response = client.post("/check", json={"board": board})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": [[0, 0]], "complete": False}


def test_hint_returns_a_solution_value_for_an_empty_cell(client):
    sudoku_app.CURRENT.update(puzzle=[[0] * 9 for _ in range(9)], solution=SOLUTION)
    board = [[0] * 9 for _ in range(9)]

    response = client.post("/hint", json={"board": board})

    assert response.status_code == 200
    assert response.get_json() == {"row": 0, "col": 0, "value": SOLUTION[0][0]}


@pytest.mark.parametrize("clues", [40, 32, 26])
def test_generated_puzzles_have_unique_solutions_and_requested_clues(clues):
    puzzle, solution = sudoku_logic.generate_puzzle(clues)

    assert sum(value != 0 for row in puzzle for value in row) == clues
    assert sudoku_logic.count_solutions(puzzle) == 1
    assert sudoku_logic.count_solutions(solution) == 1
