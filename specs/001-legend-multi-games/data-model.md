# Data Model: Multi-Game Collection

## Entities

### UserProgress (持久化)

- `lastGameId`: string (最后一次玩的游戏)
- `gameScores`: Map<string, number> (各游戏最高分)
- `unlockedLevels`: Map<string, number> (各游戏解锁关卡)

### IGameConfig (标准化配置)

- `gameMode`: string
- `difficulty`: number
- `gravityScale`: number (硕果累累专用)
- `maxLineLength`: number (一马当先专用)

### GameSession (运行时)

- `currentScore`: number
- `comboCount`: number
- `isGameOver`: boolean
