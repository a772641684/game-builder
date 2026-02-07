import { DEFAULT_MERGE_GAME_CONFIG, IMergeGameConfig } from "../enums/MergeGameEnum";

/**
 * 合成游戏逻辑管理类
 * 处理网格数据、合并算法、重力填充等核心业务
 */
export default class MergeGameLogic {
    private _config: IMergeGameConfig;
    /** 网格数据 [col][row]，存储 type 值，0 表示为空 */
    private _grid: number[][] = [];
    /** 分数 */
    private _score: number = 0;

    constructor(config: IMergeGameConfig = DEFAULT_MERGE_GAME_CONFIG) {
        this._config = config;
        this.initGrid();
    }

    /**
     * 初始化网格
     */
    public initGrid(): void {
        const { rows, cols, initTypeMax } = this._config;
        this._grid = [];
        for (let x = 0; x < cols; x++) {
            this._grid[x] = [];
            for (let y = 0; y < rows; y++) {
                // 随机填充 1 到 initTypeMax
                this._grid[x][y] = Math.floor(Math.random() * initTypeMax) + 1;
            }
        }
    }

    /**
     * 获取指定位置的类型
     */
    public getType(x: number, y: number): number {
        if (this._grid[x] && this._grid[x][y] !== undefined) {
            return this._grid[x][y];
        }
        return 0;
    }

    /**
     * 获取整个网格数据
     */
    public get grid(): number[][] {
        return this._grid;
    }

    /**
     * 获取当前分数
     */
    public get score(): number {
        return this._score;
    }

    /**
     * 获取相邻且同类型的方块坐标列表 (BFS)
     * @param startX 起始 X
     * @param startY 起始 Y
     */
    public getConnectedSquares(startX: number, startY: number): { x: number; y: number }[] {
        const targetType = this.getType(startX, startY);
        if (targetType === 0) return [];

        const connected: { x: number; y: number }[] = [];
        const visited: boolean[][] = [];
        for (let x = 0; x < this._config.cols; x++) {
            visited[x] = [];
        }

        const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
        visited[startX][startY] = true;

        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        while (queue.length > 0) {
            const current = queue.shift();
            connected.push(current);

            for (const dir of directions) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;

                if (nx >= 0 && nx < this._config.cols && ny >= 0 && ny < this._config.rows) {
                    if (!visited[nx][ny] && this.getType(nx, ny) === targetType) {
                        visited[nx][ny] = true;
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        return connected;
    }

    /**
     * 执行合并动作
     * @param x 点击的 X
     * @param y 点击的 Y
     * @returns 返回合并掉的坐标列表（不含目标点）
     */
    public merge(x: number, y: number): { x: number; y: number }[] {
        const connected = this.getConnectedSquares(x, y);
        if (connected.length <= 1) return [];

        const targetType = this.getType(x, y);

        // 1. 更新目标点类型
        this._grid[x][y] = targetType + 1;

        // 2. 清空其他相连点
        const removed: { x: number; y: number }[] = [];
        for (const pos of connected) {
            if (pos.x === x && pos.y === y) continue;
            this._grid[pos.x][pos.y] = 0;
            removed.push(pos);
        }

        // 3. 计算分数 (简单的 N^2 逻辑)
        this._score += connected.length * targetType * 10;

        return removed;
    }

    /**
     * 处理重力下落
     * @returns 返回每个方块的位移信息 [{fromX, fromY, toX, toY, type}]
     */
    public applyGravity(): { fromX: number; fromY: number; toX: number; toY: number; type: number }[] {
        const movements: any[] = [];
        const { rows, cols, initTypeMax } = this._config;

        for (let x = 0; x < cols; x++) {
            let emptyCount = 0;
            // 从下往上扫描
            for (let y = 0; y < rows; y++) {
                if (this._grid[x][y] === 0) {
                    emptyCount++;
                } else if (emptyCount > 0) {
                    // 现有方块下落
                    const oldY = y;
                    const newY = y - emptyCount;
                    const type = this._grid[x][y];

                    this._grid[x][newY] = type;
                    this._grid[x][y] = 0;

                    movements.push({ fromX: x, fromY: oldY, toX: x, toY: newY, type });
                }
            }

            // 补充新方块 (在顶部生成)
            for (let i = 0; i < emptyCount; i++) {
                const newY = rows - emptyCount + i;
                const type = Math.floor(Math.random() * initTypeMax) + 1;
                this._grid[x][newY] = type;

                // fromY 设为屏幕上方
                movements.push({ fromX: x, fromY: rows + i, toX: x, toY: newY, type });
            }
        }

        return movements;
    }

    /**
     * 检查是否还有可能的合成动作
     */
    public hasPossibleMoves(): boolean {
        const { rows, cols } = this._config;
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const type = this.getType(x, y);
                if (type === 0) continue;

                // 检查右边和上边即可
                if (x + 1 < cols && this.getType(x + 1, y) === type) return true;
                if (y + 1 < rows && this.getType(x, y + 1) === type) return true;
            }
        }
        return false;
    }
}
