# 快速上手 (Quickstart)

## 开发者接入流程

本系统通过 `DifficultyManager` 单例为小游戏提供关卡与难度支持。

### 1. 初始化游戏

在游戏的 `onLoad` 或 `start` 中获取难度参数：

```typescript
// 示例：DoodleJump
import { DifficultyManager } from "./DifficultyManager";

onLoad() {
    const params = DifficultyManager.instance.getParams("doodle_jump");
    this.platformSpeed = params.speed;      // 速度随难度增长
    this.platformGap = params.density;     // 间距随难度增长
}
```

### 2. 实现生成逻辑

在 `LevelGenerator` 中注册你的算法：

```typescript
// LevelGenerator.ts
public generateDoodlePlatforms(seed: string) {
    const random = this.getRandomSource(seed);
    // 使用 random.next() 替代 Math.random()
}
```

### 3. 处理关卡结算

在游戏结束时调用管理器：

```typescript
// UISettlement.ts
DifficultyManager.instance.settle({
    gameId: "doodle_jump",
    level: this.currentLevel,
    baseScore: this.score,
    isPass: this.score >= targetScore
});
```

## 测试验证项

- [ ] **幂等性测试**: 重新开始第 5 关，生成的物体位置应与上次完全一致。
- [ ] **梯度测试**: 手动修改关卡到 50，观察运动速度是否明显快于第 1 关。
- [ ] **里程碑测试**: 连续通过 10 关，失败后点击重试，应从第 10 关而非第 1 关开始。
