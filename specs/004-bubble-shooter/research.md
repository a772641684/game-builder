# Research: 泡泡龙核心算法 (Bubble Shooter Core Algorithms)

## [R001] 六边形网格坐标转换 (Hexagonal Grid Mapping)

### Decision
采用 **Pointy Top** (尖顶) 六边形网格布局。

### Rationale
泡泡龙的经典布局是水平行排列，奇偶行相互错开半个球宽，这符合 Pointy Top 布局。

### 关键数学公式
假设泡泡直径为 D:
- **水平间距**: D
- **垂直间距 (Row Height)**: D * sin(60)  D * 0.866
- **坐标偏移**:
  - x = column * D + (row % 2 === 1 ? D / 2 : 0)
  - y = -row * (D * 0.866) (以左上角为原点向下延伸)

## [R002] 悬空物体检测 (Island Detection)

### Decision
采用 **标记-清除 (Mark-and-Sweep)** 风格的 BFS。

### Rationale
由于泡泡矩阵规模较小（10x8），全量扫描的性能开销可以忽略不计。

### 算法流程
1. **初始化标记**: 创建一个与矩阵同维度的 isited 布尔数组。
2. **种子搜索**: 将所有位于第 0 行的泡泡加入 BFS 队列，并标记为 isited。
3. **传播**: 标准 BFS。检测 6 个相邻方向（注意奇偶行邻居索引差异）。
4. **判定**: 遍历整个矩阵，凡是 color > 0 且 isited === false 的泡泡均为悬空，触发下落。

### 邻居判定逻辑 (Pointy Top)
对于 (r, c)，其邻居为：
- (r, c-1), (r, c+1) (左右)
- 如果  为偶数: (r-1, c-1), (r-1, c), (r+1, c-1), (r+1, c)
- 如果  为奇数: (r-1, c), (r-1, c+1), (r+1, c), (r+1, c+1)

## 冲突解析 (Conflict Resolution)
- **物理 vs 逻辑**: 射弹撞击时，先根据物理碰撞点寻找最近的网格空位 (r, c)。
- **吸附策略**: 若空位已被占用，寻找该空位周围最靠近碰撞轨迹的空位。
