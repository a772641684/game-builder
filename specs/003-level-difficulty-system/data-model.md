# 数据模型 (Phase 1)

本文定义了难度系统与关卡控制的核心实体结构。

## 实体定义

### 1. DifficultyProfile (难度配置)

定义单一游戏的难度参数。

```typescript
interface DifficultyProfile {
    gameId: string;           // 游戏唯一标识
    baseSpeed: number;        // 基础速度
    maxDifficulty: number;    // 难度上限 (建议 5.0)
    growthRate: number;       // 每关难度增长率 (e.g., 0.05)
    parameters: {             // 动态参数映射
        [key: string]: number;
    };
}
```

### 2. LevelState (关卡状态)

用户在特定游戏中的进度。

```typescript
interface LevelState {
    gameId: string;
    currentLevel: number;     // 当前关卡
    maxUnlockedLevel: number; // 最大解锁关卡
    lastMilestone: number;    // 最近的存档点 (10, 20...)
    highScore: number;        // 最高分
}
```

### 3. LevelConfiguration (关卡配置)

用于生成关卡的种子和固定数据。

```typescript
interface LevelConfiguration {
    levelId: number;
    seed: string;             // 随机种子："${gameId}_${levelId}"
    difficulty: number;       // 计算得出的难度系数
    rewardMultiplier: number; // 得到的奖金倍率
}
```

## 存储方案

使用 `cc.sys.localStorage` 持久化，Key 规范：

- `MiniGame_Progress_${gameId}`: 存储 `LevelState` JSON 字符串。
- `MiniGame_GlobalSettings`: 全局配置（如是否静音）。

## 验证规则

1. `currentLevel` 永远不能大于 `maxUnlockedLevel + 1`。
2. 结算时的 `rewardMultiplier` 必须根据关卡数实时校验，防止本地破解。
3. `seed` 必须是幂等的，即输入相同 seed 生成的关卡必须完全一致。
