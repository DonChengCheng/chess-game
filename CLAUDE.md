# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a standalone HTML5 chess game implementation featuring a strategic triangle vs. circle board game. The entire game is contained in a single `index.html` file with embedded CSS and JavaScript.

## Architecture

### Single-File Application
- **index.html**: Contains all game logic, styling, and markup
  - Lines 1-234: HTML structure and CSS styling
  - Lines 291-589: JavaScript game logic
  - No external dependencies or build process required

### Game Components

1. **Board System** (lines 299-365)
   - 5x5 grid board stored as 2D array
   - Triangles start at top (3 pieces)
   - Circles fill bottom 3 rows (15 pieces)

2. **Move Validation** (lines 419-452)
   - Triangle pieces: Must jump exactly 2 squares (horizontal/vertical/diagonal)
   - Circle pieces: Move 1 square to adjacent empty positions

3. **Game State Management**
   - Turn-based system with player switching
   - Move history tracking with undo capability
   - Win condition checking (lines 489-546)

## Common Development Tasks

### Testing the Game
```bash
# Open directly in browser
open index.html
# Or use a local server
python3 -m http.server 8000
```

### Debugging
- Use browser developer console for JavaScript debugging
- Game state accessible via global variables: `board`, `currentPlayer`, `moveHistory`

## Key Functions and Logic Locations

- **Board initialization**: `initBoard()` at line 300
- **Move validation**: `isValidMove()` at line 420
- **Game status checking**: `checkGameStatus()` at line 489
- **Piece rendering**: `renderBoard()` at line 336
- **Move execution**: `makeMove()` at line 455
- **Undo functionality**: `undoMove()` at line 570

## Game Rules Implementation

- Triangles win by eliminating all circles
- Circles win by surrounding triangles (no valid moves)
- Draw occurs when neither player can move