# Feature Specification: Merge Puzzle Game (合成类方格游戏)

**Feature Branch**: `006-merge-puzzle-game`  
**Created**: 2026-02-07  
**Status**: Draft  
**Input**: User description: "新增合成类小游戏 他是 M\*N的方格地图，地图自动生成，有1-5的类型，点击方格后相邻同类的方格合成到点击的位置，并且type+1，自上而下填充已经被消除的方格。"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Core Merge Mechanic (Priority: P1)

As a player, I want to click on a square so that all adjacent squares of the same type merge into it and the square's type increases.

**Why this priority**: This is the core gameplay mechanic. Without it, there is no game.

**Independent Test**: Can be tested by creating a grid with at least two adjacent squares of type 1. Clicking one should result in a single square of type 2 at the clicked position.

**Acceptance Scenarios**:

1. **Given** a 3x3 grid with squares at (0,0) and (0,1) being Type 1, **When** the player clicks (0,0), **Then** (0,0) becomes Type 2 and (0,1) becomes empty.
2. **Given** a square with no adjacent squares of the same type, **When** the player clicks it, **Then** nothing happens.
3. **Given** multiple connected squares of Type 1 (e.g., a T-shape), **When** any part of the group is clicked, **Then** they all merge into the clicked square's type+1.

---

### User Story 2 - Gravity and Refill (Priority: P2)

As a player, I want the grid to automatically fill up after squares are merged so that I can continue playing.

**Why this priority**: Required for continuous gameplay loop.

**Independent Test**: After a merge at the bottom of a column, verify that squares above it move down one row and a new square appears at the top.

**Acceptance Scenarios**:

1. **Given** a column where a square at row 2 is removed, **When** gravity is applied, **Then** squares at rows 0 and 1 move to rows 1 and 2 respectively.
2. **Given** empty spaces at the top of the grid after gravity, **When** refill happens, **Then** new squares of type 1-5 are generated to fill the gaps.

---

### User Story 3 - Game Progression and End State (Priority: P3)

As a player, I want to know when I can no longer make moves so I can see my final result.

**Why this priority**: Provides a sense of completion and challenge.

**Independent Test**: Fill the board with a patterns where no two adjacent squares have the same type, and verify the system detects "Game Over".

**Acceptance Scenarios**:

1. **Given** a board with no adjacent matching types, **When** the player tries to click, **Then** a "No more moves" message is displayed.
2. **Given** a merge that results in a high-type square, **When** the player reaches a specific high level (e.g. Type 10), **Then** they receive a "New High Level" notification.

### Edge Cases

- **Boundary Condition**: Merging on the edges of the grid (corners and sides) should correctly identify only available neighbors.
- **Chain Merges**: When a new square type is created, if it matches adjacent squares, the system MUST automatically trigger a new merge sequence after a short delay (e.g., 300ms) to allow players to see the progression.
- **Grid Size**: What happens if M or N is 1? (Minimal grid, no possible merges).
- **Type overflow**: What happens when a type higher than 5 is created? (Should have visual representation/colors up to a reasonable limit).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST generate an M\*N grid (default 6x6) populated with random square types from 1 to 5.
- **FR-002**: System MUST identify all squares connected to a clicked square that have the same type (4-way connectivity: up, down, left, right).
- **FR-003**: System MUST remove all connected matching squares (except the clicked one) upon a valid click.
- **FR-004**: System MUST increment the type value of the clicked square by 1.
- **FR-005**: System MUST apply downward "gravity" to all squares above the removed positions.
- **FR-006**: System MUST fill vacancies at the top of the grid with new random squares (types 1-5).
- **FR-007**: System MUST provide a way to configure the M and N dimensions of the grid.
- **FR-008**: System MUST detect a "Game Over" state when no two adjacent squares have the same type.

### Key Entities

- **Grid**: The M\*N matrix managing the collection of Squares.
- **Square**: An individual tile in the grid with a `type` (integer) and `position` (x, y).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Grid generation takes less than 100ms.
- **SC-002**: The animation duration for merge and gravity should not exceed 500ms total.
- **SC-003**: 100% of game sessions must start with a board that has at least one possible merge move.
- **SC-004**: System correctly handles grids up to 10x10 without performance degradation on standard mobile devices.

### Assumptions

- The game is score-based, though specific scoring rules were not provided.
- New squares generated during refill are limited to types 1-5 to maintain difficulty.
- Visual representation of squares uses colors or icons to distinguish between types 1, 2, 3, 4, 5, and their upgraded versions.
