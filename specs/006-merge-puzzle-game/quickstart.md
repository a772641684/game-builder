# Quickstart: Merge Puzzle Game Implementation

## 1. 系统接入流程

### 第一步：创建 UI 面板

1. 在 `assets/resources/ui/` 创建 `UIPlayGroundMergeGame.prefab`。
2. 在 `assets/script/enums/UIEnum.ts` 中注册 `UI_ENUM.MERGE_GAME`。
3. 实现 `UIPlayGroundMergeGame.ts` 继承自基础面板类。

### 第二步：实现核心逻辑

1. 编写 `MergeGameLogic.ts`。
2. 使用 BFS 实现 `findConnected`。
3. 单元测试验证 M\*N 网格边界下落情况。

### 第三步：动画表现

1. `PrefabMergeSquare.ts` 挂载在方格预制体上。
2. 实现 `moveTo(targetPos)` 和 `upgradeTo(type)`。
3. 利用 `cc.tween` 实现顺滑的缩放和位移动画。

## 2. 关键代码片段

### 初始化

```typescript
// 推荐的居中网格计算
const gridWidth = cols * squareSize + (cols - 1) * spacing;
const startX = -gridWidth / 2 + squareSize / 2;
```

### 重力循环 (简版)

```typescript
while (this.checkAndApplyAutoMerge()) {
    await this.playGravityAnimation();
    await this.delay(300);
}
```

## 3. 验证清单

- [ ] 点击一个方块，周围同色方块消失并合并到点击处。
- [ ] 合成位置的方块数字/等级 +1。
- [ ] 上方的方块垂直下落填坑。
- [ ] 顶部生成新块补齐网格。
- [ ] 连续合成时，每步之间有约 300ms 停顿。
