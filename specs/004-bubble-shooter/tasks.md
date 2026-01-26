# Tasks: 泡泡龙游戏 (Bubble Shooter)

**Input**: Design documents from `specs/004-bubble-shooter/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and contract definition

- [x] T001 Define `BubbleState` enum and `BubbleData` interface in `assets/script/logic/BubbleControl.ts`
- [x] T001b **[CONSTITUTION]** Implement `IBubbleConfig` and `DEFAULT_BUBBLE_CONFIG` per Principle XIV
- [x] T002 [P] Update `UI_ENUM` in `assets/script/enums/UIEnum.ts` to ensure "ui/UIPlayGroundGameBubble" is correctly mapped
- [x] T003 [P] Configure `Logger` tags for "Bubble" in `assets/script/logic/Logger.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core grid utility functions and basic singleton setup

- [x] T004 Implement `gridToWorld` coordinate conversion in `assets/script/logic/BubbleControl.ts` per `research.md` [R001]
- [x] T005 Implement `worldToGrid` coordinate conversion in `assets/script/logic/BubbleControl.ts` per `research.md` [R001]
- [x] T006 [P] Implement `getNeighbors` logic handles hexagonal index differences for odd/even rows in `assets/script/logic/BubbleControl.ts`

**Checkpoint**: Foundation ready - core hexagonal math is verified.

---

## Phase 3: User Story 1 - 基础射击与消除 (Priority: P1) 🎯 MVP

**Goal**: Implement the core loop of aiming, shooting, and matching bubbles.

**Independent Test**: Bubbles can be fired from the cannon and stick to the grid. Groups of 3+ same-colored bubbles disappear on impact.

### Implementation for User Story 1

- [x] T007 [P] [US1] Create BFS-based `findMatches` method in `assets/script/logic/BubbleControl.ts` to find connected bubbles of the same color
- [x] T008 [US1] Implement bubble snapping logic in `assets/script/ui/UIPlayGroundGameBubble.ts` (convert collision point to nearest grid index)
- [x] T009 [US1] Implement `popBubbles` method in `assets/script/logic/BubbleControl.ts` to clear matched segments and update score
- [x] T010 [US1] Update `onTouchEnd` in `assets/script/ui/UIPlayGroundGameBubble.ts` to trigger sequence: Shoot -> Snap -> FindMatches -> Pop
- [x] T011 [US1] Implement "Island Detection" (Mark-and-Sweep BFS) in `assets/script/logic/BubbleControl.ts` as specified in `research.md` [R002]
- [x] T012 [US1] Add animations for bubble popping using `cc.tween` in `assets/script/ui/UIPlayGroundGameBubble.ts`

**Checkpoint**: Core gameplay loop (Shoot -> Match -> Drop) is functional.

---

## Phase 4: User Story 2 - 关卡生成与难度适配 (Priority: P2)

**Goal**: Dynamically generate initial bubble layouts based on level data and DifficultyManager.

**Independent Test**: Switching difficulty/levels in the menu changes the color distribution and density of the starting bubble matrix.

### Implementation for User Story 2

- [x] T013 [P] [US2] Update `LevelGenerator.ts` to utilize 6 colors for high-difficulty levels as per US2 requirement
- [x] T014 [US2] Implement `generateBubbleMatrix` detail in `assets/script/logic/LevelGenerator.ts` ensuring a solvable initial state
- [x] T015 [US2] Integrate `LevelGenerator` into `BubbleControl.startGame()` to initialize `_matrix`
- [x] T016 [US2] Implement visual rendering of the initial matrix in `UIPlayGroundGameBubble.ts` load sequence

**Checkpoint**: Game starts with varied, level-appropriate layouts.

---

## Phase 5: User Story 3 - 游戏结算与失败判定 (Priority: P3)

**Goal**: Detect victory (all bubbles cleared) and defeat (bubbles cross the dead-line).

**Independent Test**: Settlement UI appears when the grid is cleared or when a bubble reaches the bottom line.

### Implementation for User Story 3

- [x] T017 [US3] Implement `checkVictory` in `assets/script/logic/BubbleControl.ts` (checks if matrix is empty)
- [x] T018 [US3] Implement `checkGameOver` in `assets/script/logic/BubbleControl.ts` (checks if any bubble exists in Row >= 10)
- [x] T019 [US3] Connect logic to `UISettlement` prefab in `assets/script/ui/UIPlayGroundGameBubble.ts` to show Win/Loss result
- [x] T020 [US3] Add "Back to Home" functionality and cleanup of the game state

**Checkpoint**: Full game session lifecycle (Start -> Play -> End) is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and implementation detail cleanup.

- [x] T021 [P] Ensure all public methods have Chinese JSDoc per project Constitution Principle VI
- [x] T022 [P] Verify all `Logger` calls follow the `(Tag, Message)` order in Chinese
- [x] T023 [P] Additional unit tests for hexagonal grid neighbor calculations (if manual testing identifies edge cases)
- [x] T024 Perform final compilation check and ESLint validation (Mandatory per Principle II)
- [x] T025 **[METRICS]** Validate performance (SC-001/002) using `console.time` for BFS and input lag
- [x] T026 **[UX]** Add a simple "Slide to Aim" visual guide for new users (SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on T001 (Setup). Blocks all User Stories.
- **User Stories (Phase 3+)**: Depend on Foundational (Phase 2). Can proceed in order P1 -> P2 -> P3.

### Parallel Opportunities

- T002, T003 can run in parallel with T001.
- T006 can run in parallel with T004/T005.
- T013 can run in parallel with US1 tasks.
- Final Polish tasks (T021, T022) can run in parallel.

---

## Implementation Strategy

1. **MVP First**: Focus on `UIPlayGroundGameBubble.ts` shooting and `BubbleControl.ts` matching (Phase 3).
2. **Incremental Delivery**: Deliver US1 for core mechanic feel, then US2 for progression, finally US3 for game loop closure.
3. **Hexagonal Precision**: Prioritize T004-T006 (Grid Math) as any errors here will break the entire game logic.
