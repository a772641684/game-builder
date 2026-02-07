# API Contracts: Merge Puzzle Game

## 1. 核心接口

### IMergeGameLogic

定义核心游戏逻辑的计算契约。

```typescript
interface IMergeGameLogic {
    /**
     * 初始化网格
     */
    initGrid(rows: number, cols: number): void;

    /**
     * 获取玩家点击后的合并细节
     * @param x
     * @param y
     */
    getMergeContext(x: number, y: number): IMergeContext | null;

    /**
     * 执行重力计算
     */
    calculateGravity(): IGravityStep;

    /**
     * 检测游戏是否结束
     */
    checkGameOver(): boolean;
}
```

## 2. 数据契约

### IMergeContext

```typescript
interface IMergeContext {
    targetPos: { x: number, y: number }; // 合成目标点
    sourcePoints: { x: number, y: number }[]; // 被吸入的方块坐标（不含目标点）
    newType: number; // 合成后的新等级
}
```

### IGravityStep

```typescript
interface IGravityStep {
    falls: { from: {x: number, y: number}, to: {x: number, y: number} }[]; // 下落轨迹
    refills: { x: number, y: number, type: number }[]; // 新生成的方块
}
```

## 3. 事件契约

### UI 事件

- `ON_SQUARE_CLICKED`: 用户点击方格。
- `ON_ANIMATION_COMPLETE`: 单步动画（合并或下落）完成。
- `ON_GAME_OVER`: 触发结束界面。
