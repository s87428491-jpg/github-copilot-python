# Copilot Instructions

## Project Context

This repository is a Flask-based Sudoku game. The application lives in `starter/`, with Python game logic in `sudoku_logic.py`, Flask routes in `app.py`, and the browser UI in `templates/` and `static/`.

## Engineering Standards

- Keep changes focused, readable, and consistent with the existing Python, JavaScript, and CSS style.
- Preserve clear boundaries between puzzle logic, Flask routes, and browser behavior.
- Handle invalid input gracefully and avoid exposing the puzzle solution to the browser before completion.
- Add or update tests for behavior changes. Run `python -m pytest` from `starter/`.
- Prefer accessible semantic HTML, keyboard-operable controls, and responsive layouts.
- Explain tradeoffs when a suggestion affects puzzle correctness, persistence, or accessibility; do not assume generated suggestions are correct.

## Product Requirements

- Support Easy, Medium, and Hard puzzles with locked prefilled cells.
- Generate valid puzzles with exactly one solution.
- Provide live invalid-entry feedback, checking, hints, completion feedback, and a timer.
- Store the Top 10 scores in browser local storage with player name, time, difficulty, and hints used.
- Support light and dark themes and alternate colors across 3x3 regions.
