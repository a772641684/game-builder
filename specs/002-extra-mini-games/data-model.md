# Data Model: 002-extra-mini-games

## 1. 游戏配置 (Game Config)

所有 6 款游戏共享的基础结构。

### IGameConfig (Base)

| 字段      | 类型   | 说明              |
| --------- | ------ | ----------------- |
| gameId    | number | 游戏唯一 ID       |
| diffLevel | number | 难度系数          |
| timeLimit | number | 关卡时间限制 (秒) |

## 2. 核心实体 (Entities)

### 抓娃娃 (Claw)

- **ClawState**: IDLE, MOVING_X, MOVING_Y, GRABBING, RETURNING.
- **DollItem**: { id, score, weight, friction }.

### 下一百层 (Floor)

- **Platform**: { type (NORMAL, SPIKE, BREAKABLE, CONVEYOR), yPosition }.
- **PlayerState**: HP, score, depth.

### 涂鸦跳跃 (Doodle)

- **JumpPlatform**: { type (STATIC, MOVING, DISAPPEARING), height }.

### 点线交织 (Poly)

- **Point**: { x, y, isStatic }.
- **Edge**: { startPointId, endPointId, isIntersecting }.

### 弹弹球 (Bouncy)

- **Brick**: { hp, position, type }.
- **Ball**: { velocity, power }.

### 泡泡龙 (Bubble)

- **GridMap**: 2D Array `number[][]` (存储颜色 ID)。
- **BubbleProjectile**: { colorId, direction }.

## 3. 持久化数据 (Storage)

使用 `StorageControl` 存储。

- `EXTRA_GAME_HIGHSCORE`: Record<string, number> (Key 为 gameId)。
- `EXTRA_GAME_UNLOCKS`: Record<string, boolean>。
