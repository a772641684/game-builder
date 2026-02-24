import { Singleton } from "../../ace/logic/Singleton";
import { DEFAULT_PIPE_CONFIG, IPipeConfig } from "../config/GameConfig";
import { DifficultyManager } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

// ===================== 枚举与接口 =====================

/** 方向位掩码 */
export const DIR_UP = 1;
export const DIR_RIGHT = 2;
export const DIR_DOWN = 4;
export const DIR_LEFT = 8;

/**
 * 管道类型枚举
 * 每种类型对应一个默认方向掩码 (未旋转时)
 */
export enum PipeType {
    /** 空白格 (无管道) */
    EMPTY = 0,
    /** 直管 (上下) — mask=5 */
    STRAIGHT = 1,
    /** 弯管 (上右) — mask=3 */
    BEND = 2,
    /** 三通 (上右下) — mask=7 */
    TEE = 3,
    /** 十字管 (四通) — mask=15 */
    CROSS = 4,
    /** 起点 (右出) — mask=2 */
    SOURCE = 5,
    /** 终点 (左入) — mask=8 */
    TARGET = 6,
}

/**
 * 获取管道类型的默认方向掩码 (未旋转状态)
 */
export function getDefaultMask(type: PipeType): number {
    switch (type) {
        case PipeType.STRAIGHT:
            return DIR_UP | DIR_DOWN; // 5
        case PipeType.BEND:
            return DIR_UP | DIR_RIGHT; // 3
        case PipeType.TEE:
            return DIR_UP | DIR_RIGHT | DIR_DOWN; // 7
        case PipeType.CROSS:
            return DIR_UP | DIR_RIGHT | DIR_DOWN | DIR_LEFT; // 15
        case PipeType.SOURCE:
            return DIR_RIGHT; // 2
        case PipeType.TARGET:
            return DIR_LEFT; // 8
        default:
            return 0;
    }
}

/**
 * 将方向掩码顺时针旋转 n 次 (每次90度)
 */
export function rotateMask(mask: number, rotations: number): number {
    let m = mask;
    const n = ((rotations % 4) + 4) % 4;
    for (let i = 0; i < n; i++) {
        m = ((m << 1) | (m >> 3)) & 0xf;
    }
    return m;
}

/**
 * 获取方向的反方向
 */
export function oppositeDir(dir: number): number {
    if (dir === DIR_UP) return DIR_DOWN;
    if (dir === DIR_DOWN) return DIR_UP;
    if (dir === DIR_LEFT) return DIR_RIGHT;
    if (dir === DIR_RIGHT) return DIR_LEFT;
    return 0;
}

/** 单个管道格数据 */
export interface IPipeCellData {
    /** 行索引 */
    row: number;
    /** 列索引 */
    col: number;
    /** 管道类型 */
    type: PipeType;
    /** 当前旋转次数 (0-3, 顺时针) */
    rotation: number;
    /** 是否被水流经过 */
    filled: boolean;
    /** 是否为正确路径上的格子 */
    onPath: boolean;
}

// ===================== 控制器 =====================

/**
 * 水管接通核心逻辑控制器
 * 管理网格、管道类型/旋转、BFS 连通检测、关卡生成、计分系统
 * 纯逻辑层，不依赖 cc 节点
 */
export class PipeControl extends Singleton<PipeControl> {
    /** 单例访问 */
    public static get instance(): PipeControl {
        if (!this._instance) {
            this._instance = new PipeControl();
            this._instance.init();
        }
        return this._instance;
    }

    /** 兼容 getInstance 调用 */
    public static getInstance(): PipeControl {
        return this.instance;
    }

    // ===== 配置 =====
    private _config: IPipeConfig = null;

    // ===== 网格数据 =====
    /** 二维数组 [row][col] */
    private _grid: IPipeCellData[][] = [];

    // ===== 起点/终点 =====
    private _sourceRow: number = 0;
    private _sourceCol: number = 0;
    private _targetRow: number = 0;
    private _targetCol: number = 0;

    // ===== 游戏状态 =====
    private _score: number = 0;
    private _moves: number = 0;
    private _level: number = 1;
    private _isCleared: boolean = false;
    private _isGameOver: boolean = false;
    /** 关卡生成重试计数 */
    private _retryCount: number = 0;

    // ===== Getter =====
    public get config(): IPipeConfig {
        return this._config;
    }
    public get grid(): ReadonlyArray<ReadonlyArray<IPipeCellData>> {
        return this._grid;
    }
    public get rows(): number {
        return this._config.rows;
    }
    public get cols(): number {
        return this._config.cols;
    }
    public get score(): number {
        return this._score;
    }
    public get moves(): number {
        return this._moves;
    }
    public get level(): number {
        return this._level;
    }
    public get isCleared(): boolean {
        return this._isCleared;
    }
    public get isGameOver(): boolean {
        return this._isGameOver;
    }
    public get sourceRow(): number {
        return this._sourceRow;
    }
    public get sourceCol(): number {
        return this._sourceCol;
    }
    public get targetRow(): number {
        return this._targetRow;
    }
    public get targetCol(): number {
        return this._targetCol;
    }

    /** 初始化 */
    protected init(): void {
        Logger.getInstance().info("Pipe", "PipeControl 初始化完成");
    }

    /**
     * 开始新游戏 (指定关卡)
     * @param level 关卡号 (从1开始)
     * @param partialConfig 外部配置
     */
    public startGame(level: number, partialConfig?: Partial<IPipeConfig>): void {
        this._config = { ...DEFAULT_PIPE_CONFIG, ...partialConfig };
        this._level = level;
        this._score = 0;
        this._moves = 0;
        this._isCleared = false;
        this._isGameOver = false;

        // 根据难度调整网格大小
        const params = DifficultyManager.instance.getParams("PIPE", level);
        const rows = this._config.rows + Math.floor((level - 1) / 3);
        const cols = this._config.cols + Math.floor((level - 1) / 4);
        // 限制最大尺寸
        this._config = {
            ...this._config,
            rows: Math.min(rows, 8),
            cols: Math.min(cols, 8),
        };

        // 生成关卡
        this._generateLevel();

        Logger.getInstance().info(
            "Pipe",
            `开启水管接通游戏, 关卡: ${level}, 网格: ${this._config.rows}x${this._config.cols}`
        );
    }

    /**
     * 旋转指定格子 (顺时针90度)
     * @returns 是否旋转成功
     */
    public rotateCell(row: number, col: number): boolean {
        if (this._isCleared || this._isGameOver) return false;

        const cell = this._getCell(row, col);
        if (!cell) return false;

        // 起点、终点、空白格不可旋转
        if (cell.type === PipeType.EMPTY || cell.type === PipeType.SOURCE || cell.type === PipeType.TARGET) {
            return false;
        }

        // 十字管旋转无意义 (全方向对称)
        if (cell.type === PipeType.CROSS) {
            return false;
        }

        cell.rotation = (cell.rotation + 1) % 4;
        this._moves++;

        // 检查步数限制
        if (this._config.moveLimit > 0 && this._moves >= this._config.moveLimit) {
            // 最后一步也要检查连通
            const connected = this._checkConnectivity();
            if (!connected) {
                this._isGameOver = true;
                Logger.getInstance().info("Pipe", `步数耗尽! 游戏结束, 得分: ${this._score}`);
            }
        }

        return true;
    }

    /**
     * 检查连通性 (BFS 从起点到终点)
     * @returns 是否连通
     */
    public checkAndUpdateConnectivity(): boolean {
        return this._checkConnectivity();
    }

    /**
     * 通关处理
     */
    public clearLevel(): void {
        if (this._isCleared) return;
        this._isCleared = true;

        // 计算得分
        const cfg = this._config;
        const moveScore = Math.max(0, cfg.baseScore * (cfg.rows * cfg.cols) - this._moves * 2);
        this._score = moveScore + cfg.clearBonus;

        Logger.getInstance().info("Pipe", `通关! 步数: ${this._moves}, 得分: ${this._score}`);
    }

    /**
     * 获取指定格子当前的实际方向掩码
     */
    public getActualMask(row: number, col: number): number {
        const cell = this._getCell(row, col);
        if (!cell) return 0;
        return rotateMask(getDefaultMask(cell.type), cell.rotation);
    }

    // ===================== 关卡生成 =====================

    /**
     * 生成关卡
     * 策略: 先生成一条连通路径, 然后填充其余格子, 最后打乱旋转
     */
    private _generateLevel(): void {
        const cfg = this._config;
        const rng = LevelGenerator.instance.getRandomSource("PIPE", this._level);

        // 1. 初始化空网格
        this._grid = [];
        for (let r = 0; r < cfg.rows; r++) {
            this._grid[r] = [];
            for (let c = 0; c < cfg.cols; c++) {
                this._grid[r][c] = {
                    row: r,
                    col: c,
                    type: PipeType.EMPTY,
                    rotation: 0,
                    filled: false,
                    onPath: false,
                };
            }
        }

        // 2. 确定起点和终点
        if (cfg.sourceRow >= 0 && cfg.sourceRow < cfg.rows) {
            this._sourceRow = cfg.sourceRow;
        } else {
            this._sourceRow = rng.nextInt(0, cfg.rows - 1);
        }
        this._sourceCol = cfg.sourceCol >= 0 ? Math.min(cfg.sourceCol, cfg.cols - 1) : 0;

        if (cfg.targetRow >= 0 && cfg.targetRow < cfg.rows) {
            this._targetRow = cfg.targetRow;
        } else {
            this._targetRow = rng.nextInt(0, cfg.rows - 1);
        }
        this._targetCol = cfg.targetCol >= 0 ? Math.min(cfg.targetCol, cfg.cols - 1) : cfg.cols - 1;

        // 设置起点和终点
        this._grid[this._sourceRow][this._sourceCol].type = PipeType.SOURCE;
        this._grid[this._sourceRow][this._sourceCol].onPath = true;
        this._grid[this._targetRow][this._targetCol].type = PipeType.TARGET;
        this._grid[this._targetRow][this._targetCol].onPath = true;

        // 3. 用随机DFS生成一条从起点到终点的路径
        const path = this._generatePath(rng);

        // 4. 根据路径设置管道类型和正确旋转
        this._assignPipesFromPath(path, rng);

        // 5. 填充非路径格子
        this._fillRemainingCells(rng);

        // 5.5 验证正确状态下的连通性 (安全校验)
        if (!this._checkConnectivity()) {
            Logger.getInstance().warn("Pipe", "生成的关卡连通性校验失败, 重新生成");
            // 重置并重新生成 (最多重试 5 次)
            this._retryCount = (this._retryCount || 0) + 1;
            if (this._retryCount <= 5) {
                this._generateLevel();
                return;
            }
            Logger.getInstance().error("Pipe", "重试次数耗尽, 使用当前布局");
        }
        this._retryCount = 0;

        // 6. 重置 filled 状态 (校验时会设置 filled)
        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                this._grid[r][c].filled = false;
            }
        }

        // 7. 打乱所有可旋转格子的朝向
        this._shuffleRotations(rng);
    }

    /**
     * 用随机 DFS 生成从起点到终点的路径
     * 返回路径坐标数组 (包含起点和终点)
     */
    private _generatePath(rng: any): Array<{ row: number; col: number }> {
        const cfg = this._config;
        const visited: boolean[][] = [];
        for (let r = 0; r < cfg.rows; r++) {
            visited[r] = [];
            for (let c = 0; c < cfg.cols; c++) {
                visited[r][c] = false;
            }
        }

        const path: Array<{ row: number; col: number }> = [];
        const found = this._dfsPath(
            this._sourceRow,
            this._sourceCol,
            this._targetRow,
            this._targetCol,
            visited,
            path,
            rng
        );

        if (!found) {
            // 退化方案: 生成直线路径
            Logger.getInstance().warn("Pipe", "DFS 未找到路径, 使用直线退化方案");
            path.length = 0;
            path.push({ row: this._sourceRow, col: this._sourceCol });
            let r = this._sourceRow;
            let c = this._sourceCol;
            // 先水平后垂直
            while (c !== this._targetCol) {
                c += c < this._targetCol ? 1 : -1;
                path.push({ row: r, col: c });
            }
            while (r !== this._targetRow) {
                r += r < this._targetRow ? 1 : -1;
                path.push({ row: r, col: c });
            }
        }

        // 标记路径上的格子
        for (const p of path) {
            this._grid[p.row][p.col].onPath = true;
        }

        return path;
    }

    /**
     * DFS 递归查找路径
     */
    private _dfsPath(
        r: number,
        c: number,
        tr: number,
        tc: number,
        visited: boolean[][],
        path: Array<{ row: number; col: number }>,
        rng: any
    ): boolean {
        const cfg = this._config;
        if (r < 0 || r >= cfg.rows || c < 0 || c >= cfg.cols) return false;
        if (visited[r][c]) return false;

        visited[r][c] = true;
        path.push({ row: r, col: c });

        if (r === tr && c === tc) return true;

        // 四方向随机打乱顺序
        const dirs = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 },
        ];
        // Fisher-Yates 洗牌
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = rng.nextInt(0, i);
            const temp = dirs[i];
            dirs[i] = dirs[j];
            dirs[j] = temp;
        }

        for (const d of dirs) {
            if (this._dfsPath(r + d.dr, c + d.dc, tr, tc, visited, path, rng)) {
                return true;
            }
        }

        path.pop();
        return false;
    }

    /**
     * 根据路径确定每个格子的管道类型和正确旋转
     */
    private _assignPipesFromPath(path: Array<{ row: number; col: number }>, rng: any): void {
        for (let i = 0; i < path.length; i++) {
            const cur = path[i];
            const cell = this._grid[cur.row][cur.col];

            // 起点和终点已设置
            if (cell.type === PipeType.SOURCE || cell.type === PipeType.TARGET) {
                // 计算起点/终点需要的朝向
                if (cell.type === PipeType.SOURCE && i + 1 < path.length) {
                    const next = path[i + 1];
                    const dirToNext = this._getDirection(cur.row, cur.col, next.row, next.col);
                    cell.rotation = this._findRotation(PipeType.SOURCE, dirToNext);
                }
                if (cell.type === PipeType.TARGET && i - 1 >= 0) {
                    const prev = path[i - 1];
                    const dirFromPrev = this._getDirection(prev.row, prev.col, cur.row, cur.col);
                    // 终点需要朝向 prev 方向的开口 (即 dirFromPrev 的反方向)
                    const neededDir = oppositeDir(dirFromPrev);
                    cell.rotation = this._findRotation(PipeType.TARGET, neededDir);
                }
                continue;
            }

            // 路径中间格: 需要连通 prev 和 next 两个方向
            const directions: number[] = [];
            if (i > 0) {
                const prev = path[i - 1];
                directions.push(this._getDirection(cur.row, cur.col, prev.row, prev.col));
            }
            if (i < path.length - 1) {
                const next = path[i + 1];
                directions.push(this._getDirection(cur.row, cur.col, next.row, next.col));
            }

            // 合并方向
            let neededMask = 0;
            for (const d of directions) {
                neededMask |= d;
            }

            // 选择合适的管道类型
            const { type, rotation } = this._findBestPipe(neededMask, rng);
            cell.type = type;
            cell.rotation = rotation;
        }
    }

    /**
     * 获取从 (r1,c1) 到 (r2,c2) 的方向
     */
    private _getDirection(r1: number, c1: number, r2: number, c2: number): number {
        if (r2 < r1) return DIR_UP;
        if (r2 > r1) return DIR_DOWN;
        if (c2 < c1) return DIR_LEFT;
        if (c2 > c1) return DIR_RIGHT;
        return 0;
    }

    /**
     * 寻找能覆盖 neededMask 的最佳管道类型和旋转
     * 优先选择刚好匹配的类型
     */
    private _findBestPipe(neededMask: number, rng: any): { type: PipeType; rotation: number } {
        // 按优先级尝试各类型
        const candidates: PipeType[] = [PipeType.STRAIGHT, PipeType.BEND, PipeType.TEE, PipeType.CROSS];

        for (const ptype of candidates) {
            const defaultM = getDefaultMask(ptype);
            for (let rot = 0; rot < 4; rot++) {
                const actual = rotateMask(defaultM, rot);
                if ((actual & neededMask) === neededMask) {
                    // 精确匹配优先
                    if (actual === neededMask) {
                        return { type: ptype, rotation: rot };
                    }
                }
            }
        }

        // 没有精确匹配, 找包含 neededMask 的最小超集
        for (const ptype of candidates) {
            const defaultM = getDefaultMask(ptype);
            for (let rot = 0; rot < 4; rot++) {
                const actual = rotateMask(defaultM, rot);
                if ((actual & neededMask) === neededMask) {
                    return { type: ptype, rotation: rot };
                }
            }
        }

        // 兜底: 十字管
        return { type: PipeType.CROSS, rotation: 0 };
    }

    /**
     * 找到使指定管道类型包含 targetDir 方向的旋转次数
     */
    private _findRotation(type: PipeType, targetDir: number): number {
        const defaultM = getDefaultMask(type);
        for (let rot = 0; rot < 4; rot++) {
            if (rotateMask(defaultM, rot) & targetDir) {
                return rot;
            }
        }
        return 0;
    }

    /**
     * 填充非路径上的剩余格子
     */
    private _fillRemainingCells(rng: any): void {
        const cfg = this._config;
        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                const cell = this._grid[r][c];
                if (cell.type !== PipeType.EMPTY) continue;
                if (cell.onPath) continue;

                // 根据概率生成类型
                const roll = rng.next();
                if (roll < cfg.emptyChance) {
                    cell.type = PipeType.EMPTY;
                } else if (roll < cfg.emptyChance + cfg.crossChance) {
                    cell.type = PipeType.CROSS;
                } else if (roll < cfg.emptyChance + cfg.crossChance + cfg.teeChance) {
                    cell.type = PipeType.TEE;
                } else if (roll < cfg.emptyChance + cfg.crossChance + cfg.teeChance + cfg.bendChance) {
                    cell.type = PipeType.BEND;
                } else {
                    cell.type = PipeType.STRAIGHT;
                }
                cell.rotation = rng.nextInt(0, 3);
            }
        }
    }

    /**
     * 打乱所有可旋转格子的朝向 (保存正确旋转后随机偏移)
     */
    private _shuffleRotations(rng: any): void {
        const cfg = this._config;
        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                const cell = this._grid[r][c];
                // 起点、终点、空白、十字管不打乱
                if (
                    cell.type === PipeType.EMPTY ||
                    cell.type === PipeType.SOURCE ||
                    cell.type === PipeType.TARGET ||
                    cell.type === PipeType.CROSS
                ) {
                    continue;
                }

                // 随机偏移 1~3 次旋转 (保证一定被打乱)
                const offset = rng.nextInt(1, 3);
                cell.rotation = (cell.rotation + offset) % 4;
            }
        }
    }

    // ===================== 连通性检测 =====================

    /**
     * BFS 检查从起点到终点是否连通
     * 同时更新每个格子的 filled 状态
     * @returns 是否连通
     */
    private _checkConnectivity(): boolean {
        const cfg = this._config;

        // 重置 filled 状态
        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                this._grid[r][c].filled = false;
            }
        }

        // BFS 从起点开始
        const queue: Array<{ row: number; col: number }> = [];
        queue.push({ row: this._sourceRow, col: this._sourceCol });
        this._grid[this._sourceRow][this._sourceCol].filled = true;

        // 方向偏移映射
        const dirOffsets: Array<{ dir: number; dr: number; dc: number }> = [
            { dir: DIR_UP, dr: -1, dc: 0 },
            { dir: DIR_RIGHT, dr: 0, dc: 1 },
            { dir: DIR_DOWN, dr: 1, dc: 0 },
            { dir: DIR_LEFT, dr: 0, dc: -1 },
        ];

        while (queue.length > 0) {
            const cur = queue.shift();
            const curMask = this.getActualMask(cur.row, cur.col);

            for (const off of dirOffsets) {
                // 当前格子是否有该方向的出口
                if (!(curMask & off.dir)) continue;

                const nr = cur.row + off.dr;
                const nc = cur.col + off.dc;

                // 越界检查
                if (nr < 0 || nr >= cfg.rows || nc < 0 || nc >= cfg.cols) continue;

                // 已访问
                if (this._grid[nr][nc].filled) continue;

                // 邻居格子是否为空
                if (this._grid[nr][nc].type === PipeType.EMPTY) continue;

                // 邻居是否有对向入口
                const neighborMask = this.getActualMask(nr, nc);
                const neededDir = oppositeDir(off.dir);
                if (!(neighborMask & neededDir)) continue;

                // 连通!
                this._grid[nr][nc].filled = true;
                queue.push({ row: nr, col: nc });
            }
        }

        // 判断终点是否被填充
        return this._grid[this._targetRow][this._targetCol].filled;
    }

    // ===================== 辅助方法 =====================

    /**
     * 获取指定格子
     */
    private _getCell(row: number, col: number): IPipeCellData | null {
        if (row < 0 || row >= this._config.rows || col < 0 || col >= this._config.cols) {
            return null;
        }
        return this._grid[row][col];
    }

    /**
     * 获取当前步数限制 (0=不限)
     */
    public get moveLimit(): number {
        return this._config.moveLimit;
    }

    /**
     * 获取剩余步数 (若有步数限制)
     */
    public get remainingMoves(): number {
        if (this._config.moveLimit <= 0) return -1;
        return Math.max(0, this._config.moveLimit - this._moves);
    }
}
