# Research: 002-extra-mini-games

## 1. 抓娃娃 (Claw Machine)

- **Decision**: 使用 `cc.PhysicsManager` 和 `cc.DistanceJoint`。
- **Rationale**: 爪子的物理抓取需要真实的碰撞检测和受力分析。`cc.DistanceJoint` 可以模拟绳索。
- **Alternatives**: 使用补间动画模拟。缺点：爪子与娃娃的交互不自然，缺乏随机性。
- **Details**: 爪子由 3-4 个分段杆件组成，通过 `cc.HingeJoint` 连接。设置 `enableContactListener` 来检测抓取。

## 2. 下一百层 (100 Floors)

- **Decision**: 使用物件池（Node Pool）管理踩板，动态修改世界坐标。
- **Rationale**: 无尽滚动模式下，频繁创建/销毁节点会导致性能抖动。
- **Alternatives**: 固定数量的板。缺点：无法处理“一百层”的扩展性。
- **Details**: 每一层板根据玩家深度定时加速下降。物理引擎负责重力感应。

## 3. 涂鸦跳跃 (Doodle Jump)

- **Decision**: 摄像机跟随后向上滚动，平台在下方移除。
- **Rationale**: 典型的向上卷轴游戏。
- **Details**: 角色仅与平台顶面发生单向碰撞检测。利用 `cc.PhysicsManager` 的 `onBeginContact` 过滤向下穿透的情况。

## 4. 点线交织 (Poly/Connect Dots)

- **Decision**: 向量几何计算 (Line-Line Intersection)。
- **Rationale**: 核心玩法是检测线段是否交叉。
- **Details**: 使用 `cc.Intersection.lineLine` 进行实时相交判定。UI 层使用 `cc.Graphics` 绘制动态线条。

## 5. 弹弹球 (Bouncy Ball)

- **Decision**: 物理材质 (Physics Material) 设置高弹性 (Elasticity)。
- **Rationale**: 简化反射计算，利用引擎原生碰撞逻辑。
- **Details**: 调整 `cc.PhysicsBoxCollider` 的 `friction: 0` 和 `restitution: 1`。

## 6. 泡泡龙 (Bubble Shooter)

- **Decision**: 六边形网格坐标系 (Hexagonal Grid)。
- **Rationale**: 泡泡的错位排列必须基于严格的网格逻辑。
- **Details**:
    - 坐标转换：奇数行偏移一个半径。
    - 消除算法：BFS (广度优先搜索) 查找同色连通。
    - 掉落判定：检测不与顶部连通的孤岛。

## 7. 性能最佳实践 (Best Practices)

- **Cocos Creator 2.3.x**: 必须在 `onLoad` 手动开启物理引擎 `cc.director.getPhysicsManager().enabled = true`。
- **DrawCall**: 所有游戏的 UI 元素尽可能合并到主图集中。
- **内存**: 退出游戏主界面时，调用 `Loader.getInstance().releaseRes` 释放当前游戏的 Prefab。
