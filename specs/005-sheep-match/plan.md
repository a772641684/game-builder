# 实施计划: 羊了个羊类三消游戏 (Sheep Match)

## 技术方案

### 1. 核心架构

- **控制器**: `SheepMatchControl.ts` (逻辑单例)
    - 职责：维护方块堆叠状态、处理消除算法、管理槽位数组。
- **UI 视图**: `UIPlayGroundGameSheepMatch.ts`
    - 职责：渲染背景、管理槽位容器节点、响应游戏胜负 UI。
- **预制体组件**: `PrefabGameTile.ts`
    - 职责：显示图标、响应点击事件、执行移动到槽位的动画。

### 2. 核心算法实现细节

#### A. 遮挡检测逻辑 (FR-002)

- **原理**: 每一个方块在点击或场景更新时，检测其上方（层级/Layer 更大）是否有重叠的方块。
- **实现**:
    - 通过 `cc.Rect` 碰撞检测判断两个方块矩形是否相交。
    - 如果相交且对方层级更高 (`targetLayer > selfLayer`)，则 `isBlocked = true`。
    - 点击事件中判断 `isBlocked`，若为 `true` 则不响应。

#### B. 槽位排序与消除逻辑 (FR-005)

- **进槽规则**: 点击方块后，方块移动到槽位中。
- **动态排序**:
    - 方块进入槽位后，相同的 `typeId` 的方块应排列在一起。
    - 每次进槽后扫描槽位数组，找到相同类型的方块。
    - 如果相同类型达到 3 个，触发消除动画并移除。
    - 槽位内的平滑重排：使用 `cc.tween` 同步更新所有在槽方块的 X 轴坐标。

### 3. 项目结构

```text
assets/
  script/
    logic/
      SheepMatchControl.ts  # 逻辑单例
      MatchDataTransfer.ts  # 接口定义 (ITileData 等)
    ui/
      UIPlayGroundGameSheepMatch.ts # 游戏主面板
    prefab/
      PrefabGameTile.ts     # 方块逻辑
  resources/
    prefabs/
      game/
        PrefabGameTile.prefab # 方块预制体
    ui/
      UIPlayGroundGameSheepMatch.prefab # UI 预制体
```

## 风险管理

- **性能**: 关卡方块较多时，每帧遍历所有方块进行遮挡计算会有压力。
    - **优化**: 仅在方块被移走时，更新受其影响的下层方块状态。
- **动画冲突**: 快速连续点击可能导致方块移动位置重叠。
    - **解决**: 使用队列处理移动，或在移动开始前锁定槽位占位符。

### 4. 撤销系统实现 (原则 IX)

- **状态快照**: 使用命令模式（Command Pattern）记录每一次点击操作：包括方块实例引用、原始本地位置、进槽时的索引位置。
- **回溯逻辑**: 点击撤销按钮时，弹出命令栈顶项。执行反向 `cc.tween` 动画将方块移回原始位置，并从槽位数据中移除。
- **全局刷新**: 方块回归场景后，调用 `SheepMatchControl` 重新触发受影响区域的遮挡检测。
