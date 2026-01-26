# Implementation Plan - 泡泡龙游戏 (Bubble Shooter)

**Feature Branch**: `004-bubble-shooter`  
**Status**: Planning  
**Spec**: [spec.md](./spec.md)

## Technical Context

### Existing Infrastructure

- **项目框架**: Cocos Creator 2.4.x + TypeScript.
- **核心单例**: BubbleControl (逻辑管理), LevelGenerator (关卡生成), UIManager (界面控制).
- **现有脚本**:
    - BubbleControl.ts: 负责游戏状态、得分和矩阵数据。
    - UIPlayGroundGameBubble.ts: 负责输入处理、射手旋转和子弹发射。
    - LevelGenerator.ts: 已实现基础的 generateBubbleMatrix 逻辑。

### Technology Selection

- **网格系统**: 采用六边形网格（Hexagonal Grid）。由于偶数行和奇数行有半个单位的偏移，需要特殊的索引转换算法。
- **物理系统**: 虽然现有 UI 启用了 Box2D，但为了保证吸附精准度，建议射弹位置到达吸附判定范围时，停止物理模拟并转为坐标对齐。
- **算法**:
    - **消除判定**: BFS (广度优先搜索) 查找同色连通块。
    - **悬空判定**: BFS/DFS 遍历，从顶层泡泡开始搜索所有可达泡泡，未标记的即为悬空。

### Needs Clarification

- **吸附灵敏度**: 射弹在什么距离内触发吸附逻辑？
- **资源导出**: Bubble 预制体是否已有对应的 6 种颜色贴图？如果没有，是否使用颜色染色 (
  ode.color) 替代？
- **性能**: BFS 搜索在大规模（10x8）矩阵中对每帧的影响（通常极小，但需确认内存分配）。

## Constitution Check

| Principle       | Verification                                                   |
| --------------- | -------------------------------------------------------------- |
| I. 命名规范     | 类名使用 PascalCase，方法名 camelCase，遵循 Singleton 模式。   |
| II. 静态分析    | 使用 ===，禁用 ??，禁用 ar。                                   |
| IV. Loader 优先 | 泡泡实例化必须使用 Loader.instance.instantiate。               |
| V. 日志规范     | 使用 Logger.getInstance().info("Bubble", "...") 且消息为中文。 |
| VI. 注释规范    | 所有公共方法、算法逻辑需配备中文 JSDoc。                       |
| VIII. UI/Prefab | UI 脚本命名为 UIPlayGroundGameBubble，挂载在对应 Prefab 上。   |

## Proposed Design (Phase 1)

### Data Model (data-model.md)

- BubbleData: 颜色、矩阵坐标 (r, c)、状态（正常、掉落中、消除中）。
- BubbleMatrix: 二维数组/列表管理。
- **IGameConfig**: 定义包含 `shootSpeed`, `popMinCount`, `cooldown` 等参数的标准化接口。

### API / Contracts

- BubbleControl.findMatches(row, col): 查找连通块。
- BubbleControl.popBubbles(coords): 触发消除。
- BubbleControl.checkIslands(): 处理悬空。
- UIPlayGroundGameBubble.fireBullet(): 发射逻辑。

## Phase 0: Research

### Research Tasks

1. **[R001] 六边形网格坐标转换**: 研究 Cocos 坐标系与六边形网格索引相互转换的最佳实践。
2. **[R002] 悬空物体检测算法优化**: 寻找最高效的悬空泡泡扫描方式，避免重复遍历。

## Phase 1: Design & Contracts

### Tasks

1. [ ] 创建 specs/004-bubble-shooter/data-model.md。
2. [ ] 扩展 BubbleControl.ts 定义核心算法接口。
3. [ ] 运行脚本更新环境上下文信息。

## Phase 2: Implementation (TBD)

1. [ ] 完善 BubbleControl.ts 的 BFS 逻辑。
2. [ ] 实现 UIPlayGroundGameBubble.ts 的吸附逻辑。
3. [ ] 增加死亡线判定逻辑。
