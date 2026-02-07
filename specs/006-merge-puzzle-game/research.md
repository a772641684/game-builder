# 技术调研: 合成类方格游戏逻辑

## 1. 连通区域搜索 (BFS)

**决策**: 使用广度优先搜索 (BFS) 算法查找同类连通区域。
**理由**: BFS 逻辑清晰，且在 Cocos Creator 运行环境下比递归 DFS 更安全，不易触发调用栈溢出。
**备选方案**: 递归 DFS（在大型网格下存在风险）。

### 代码实现思路

```typescript
/**
 * 查找指定坐标下所有相同类型的连通方块
 * @param grid 二维网格
 * @param startX 起始 X
 * @param startY 起始 Y
 */
function findConnected(grid: number[][], startX: number, startY: number): {x: number, y: number}[] {
    const type = grid[startX][startY];
    if (type === 0) return [];

    const connected: {x: number, y: number}[] = [];
    const queue: {x: number, y: number}[] = [{x: startX, y: startY}];
    const visited: boolean[][] = grid.map(row => row.map(() => false));
    const directions = [{x: 0, y: 1}, {x: 0, y: -1}, {x: 1, y: 0}, {x: -1, y: 0}];

    visited[startX][startY] = true;

    while (queue.length > 0) {
        const current = queue.shift()!;
        connected.push(current);

        for (const dir of directions) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;

            if (nx >= 0 && nx < grid.length && ny >= 0 && ny < grid[0].length &&
                !visited[nx][ny] && grid[nx][ny] === type) {
                visited[nx][ny] = true;
                queue.push({x: nx, y: ny});
            }
        }
    }
    return connected;
}
```

## 2. 重力下落与填充 (Cocos Creator 2.3.x)

**决策**: 采用数据驱动的异步动画队列。
**理由**: 利用 `Promise.all` 配合 `cc.tween` 确保动画同步，增强视觉一致性。遵循项目宪法指定的引擎版本。
**实现细节**:

1. **数据层更新**: 遍历每一列，将存活方块移动到最底部空位。
2. **动画层执行**: 为每个移动的方块创建 `cc.tween`，持续时间根据位移距离动态计算。
3. **补充**: 在列顶部计算空缺数量，利用 `Loader.instantiate` 获取预制体实例并执行入场动画。

## 3. 链式合成处理

**决策**: 使用 `async/await` 异步循环和 300ms 延迟。
**理由**: 比回调地狱更简洁，方便控制自动合成的节奏，且易于集成状态锁防止玩家在动画期间操作。
**延迟实现**:

```typescript
async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 4. 依赖项与兼容性

- **Engine Version**: 严格遵守项目宪法，使用 Cocos Creator 2.3.x 版环境进行接口调用与 UUID 管理。
- **Loader**: 必须使用项目内置s `Loader.getInstance().instantiate` 管理方格。
- **Logger**: 必须使用 `Logger.getInstance().info("MergeGame", "message")` 记录重要状态变化。
- **Standardized Config**: 严格遵循宪法 XIV，实现 `IGameConfig` 接口与 `DEFAULT_GAME_CONFIG` 模式。
- **No ?? Syntax**: 遵守项目宪法，使用 `(val !== null && val !== undefined) ? val : default` 实现空值合并。
