# Event Contracts: 002-extra-mini-games

所有的 UI 与逻辑解耦通过 `cc.director.emit/on` 实现。

## 1. 全局事件 (Global Events)

| 事件名             | 参数                | 发送方       | 说明             |
| ------------------ | ------------------- | ------------ | ---------------- |
| `EXTRA_GAME_START` | `{ gameId }`        | GameCenter   | 开始特定小游戏   |
| `EXTRA_GAME_OVER`  | `{ gameId, score }` | LogicControl | 游戏结束结算     |
| `EXTRA_GAME_QUIT`  | -                   | UIPlayGround | 强制退出当前游戏 |

## 2. 游戏内事件 (In-game Events)

### 抓娃娃 (Claw)

- `CLAW_GRAB_SUCCESS`: 抓取到娃娃。
- `CLAW_REACH_HOME`: 爪子回到原点。

### 泡泡龙 (Bubble)

- `BUBBLE_CONNECT`: 泡泡粘附到网格。
- `BUBBLE_BOOM`: 消除泡泡包。

### 点线交织 (Poly)

- `POLY_LINE_UPDATE`: 线段状态更新（是否交叉）。
- `POLY_LEVEL_WIN`: 成功解开所有交叉。
