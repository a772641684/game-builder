import { Singleton } from "../../ace/logic/Singleton";
import { DifficultyManager } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/**
 * 泡泡状态枚举
 */
export enum BubbleState {
    /** 空闲/静止 */
    Idle,
    /** 吸附中 */
    Snapping,
    /** 消除中 */
    Popping,
    /** 掉落中 */
    Dropping,
}

/**
 * 泡泡数据接口
 */
export interface BubbleData {
    /** 唯一标识 */
    id: string;
    /** 颜色索引 (1-6, 0 为空) */
    color: number;
    /** 行索引 */
    row: number;
    /** 列索引 */
    col: number;
    /** 当前状态 */
    state: BubbleState;
}

/**
 * 泡泡龙标准化配置接口
 */
export interface IBubbleConfig {
    /** 发射速度 */
    shootSpeed: number;
    /** 最小消除数量 */
    popMinCount: number;
    /** 射击冷却时间 (ms) */
    cooldown: number;
    /** 网格行数 */
    rows: number;
    /** 网格列数 */
    cols: number;
    /** 泡泡直径/间距 */
    bubbleSize: number;
}

/**
 * 泡泡龙默认配置
 */
export const DEFAULT_BUBBLE_CONFIG: Readonly<IBubbleConfig> = {
    shootSpeed: 2000,
    popMinCount: 3,
    cooldown: 400,
    rows: 10,
    cols: 8,
    bubbleSize: 60,
};

/**
 * 泡泡龙核心逻辑控制器
 */
export class BubbleControl extends Singleton<BubbleControl> {
    public onScoreChanged: (score: number) => void = null;
    private _score: number = 0;
    private _matrix: number[][] = [];
    private _config: IBubbleConfig = { ...DEFAULT_BUBBLE_CONFIG };

    /**
     * 获取单例实例
     */
    public static get instance(): BubbleControl {
        if (!this._instance) {
            this._instance = new BubbleControl();
            this._instance.init();
        }
        return this._instance;
    }

    /**
     * 兼容性获取单例实例
     */
    public static getInstance(): BubbleControl {
        return this.instance;
    }

    /**
     * 初始化控制器
     */
    protected init(): void {
        Logger.getInstance().info("Bubble", "BubbleControl 初始化完成");
    }

    /**
     * 增加得分
     * @param val 增加的分值
     */
    public addScore(val: number) {
        this._score += val;
        this.onScoreChanged && this.onScoreChanged(this._score);
    }

    /**
     * 开始游戏，初始化矩阵
     */
    public startGame(): void {
        this._score = 0;
        const lv = DifficultyManager.instance.getCurrentLevel("BUBBLE");

        // [US2] 注入随机矩阵生成 (使用配置中的行列数)
        this._matrix = LevelGenerator.instance.generateBubbleMatrix(lv, this._config.rows, this._config.cols);

        Logger.getInstance().info("Bubble", `开启泡泡龙游戏, 等级: ${lv}`);
    }

    /**
     * 获取当前总分
     */
    public getScore(): number {
        return this._score;
    }

    /**
     * 设置指定位置的矩阵状态
     * @param r 行
     * @param c 列
     * @param color 颜色
     */
    public setMatrixAt(r: number, c: number, color: number) {
        if (r >= 0 && r < this._config.rows && c >= 0 && c < this._config.cols) {
            this._matrix[r][c] = color;
        }
    }

    /**
     * 网格索引转坐标 (Pointy Top 六边形网格)
     * @param row 行索引
     * @param col 列索引
     * @returns 局部坐标
     */
    public gridToWorld(row: number, col: number): cc.Vec2 {
        const d = this._config.bubbleSize;
        const x = col * d + (row % 2 === 1 ? d / 2 : 0);
        const y = -row * (d * 0.866);
        return cc.v2(x, y);
    }

    /**
     * 坐标转最近网格索引
     * @param pos 局部坐标
     * @returns 网格索引
     */
    public worldToGrid(pos: cc.Vec2): { r: number; c: number } {
        const d = this._config.bubbleSize;
        const r = Math.round(-pos.y / (d * 0.866));
        const c = Math.round((pos.x - (r % 2 === 1 ? d / 2 : 0)) / d);
        return { r, c };
    }

    /**
     * 获取指定索引的邻居 (6个方向)
     * @param r 行索引
     * @param c 列索引
     */
    public getNeighbors(r: number, c: number): { r: number; c: number }[] {
        const neighbors: { r: number; c: number }[] = [];
        // 左右方向固定偏移
        neighbors.push({ r, c: c - 1 }, { r, c: c + 1 });

        // 上下邻居索引依赖于当前行的偏移规则 (Pointy Top / 奇偶行偏移)
        if (r % 2 === 0) {
            // 偶数行邻居
            neighbors.push({ r: r - 1, c: c - 1 }, { r: r - 1, c: c });
            neighbors.push({ r: r + 1, c: c - 1 }, { r: r + 1, c: c });
        } else {
            // 奇数行邻居
            neighbors.push({ r: r - 1, c: c }, { r: r - 1, c: c + 1 });
            neighbors.push({ r: r + 1, c: c }, { r: r + 1, c: c + 1 });
        }

        // 过滤越界索引
        return neighbors.filter((n) => n.r >= 0 && n.r < this._config.rows && n.c >= 0 && n.c < this._config.cols);
    }

    /**
     * 寻找同色连通块 (BFS)
     * @param row 起始行
     * @param col 起始列
     * @returns 匹配的坐标列表
     */
    public findMatches(row: number, col: number): { r: number; c: number }[] {
        const targetColor = this._matrix[row][col];
        if (targetColor === 0) return [];

        const matches: { r: number; c: number }[] = [];
        const queue: { r: number; c: number }[] = [{ r: row, c: col }];
        const visited: boolean[][] = Array.from({ length: this._config.rows }, () =>
            new Array(this._config.cols).fill(false)
        );

        visited[row][col] = true;

        while (queue.length > 0) {
            const curr = queue.shift();
            matches.push(curr);

            const neighbors = this.getNeighbors(curr.r, curr.c);
            for (const n of neighbors) {
                if (!visited[n.r][n.c] && this._matrix[n.r][n.c] === targetColor) {
                    visited[n.r][n.c] = true;
                    queue.push(n);
                }
            }
        }

        return matches;
    }

    /**
     * 消除泡泡并更新得分
     * @param coords 坐标列表
     */
    public popBubbles(coords: { r: number; c: number }[]): void {
        for (const coord of coords) {
            this._matrix[coord.r][coord.c] = 0;
        }
        this.addScore(coords.length * 10);
        Logger.getInstance().info("Bubble", `消除泡泡数量: ${coords.length}, 当前得分: ${this._score}`);
    }

    /**
     * 检查并处理悬空泡泡 (Mark-and-Sweep BFS)
     * @returns 掉落的坐标列表
     */
    public checkIslands(): { r: number; c: number }[] {
        const visited: boolean[][] = Array.from({ length: this._config.rows }, () =>
            new Array(this._config.cols).fill(false)
        );
        const queue: { r: number; c: number }[] = [];

        // 将顶层 (第 0 行) 所有非空泡泡作为基准种子
        for (let c = 0; c < this._config.cols; c++) {
            if (this._matrix[0][c] !== 0) {
                visited[0][c] = true;
                queue.push({ r: 0, c: c });
            }
        }

        // 传播已标记状态
        while (queue.length > 0) {
            const curr = queue.shift()!;
            const neighbors = this.getNeighbors(curr.r, curr.c);
            for (const n of neighbors) {
                if (!visited[n.r][n.c] && this._matrix[n.r][n.c] !== 0) {
                    visited[n.r][n.c] = true;
                    queue.push(n);
                }
            }
        }

        // 寻找未标记但有颜色的泡泡 (即为悬空)
        const islands: { r: number; c: number }[] = [];
        for (let r = 0; r < this._config.rows; r++) {
            for (let c = 0; c < this._config.cols; c++) {
                if (this._matrix[r][c] !== 0 && !visited[r][c]) {
                    islands.push({ r, c });
                    this._matrix[r][c] = 0; // 下落并清空
                }
            }
        }

        if (islands.length > 0) {
            this.addScore(islands.length * 20); // 悬空掉落奖励更高
            Logger.getInstance().info("Bubble", `掉落悬空泡泡数量: ${islands.length}`);
        }

        return islands;
    }
}
