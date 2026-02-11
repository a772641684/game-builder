import { DEFAULT_WHACK_MOLE_CONFIG, IWhackMoleConfig } from "../../config/GameConfig";

/**
 * 打地鼠游戏纯逻辑管理类
 * 处理地鼠出现/隐藏调度、得分、时间、连击等核心业务
 */
export default class WhackMoleGameLogic {
    private _config: IWhackMoleConfig;
    /** 每个洞的状态: 0=空, 1=地鼠露头, 2=被击中 */
    private _holes: number[] = [];
    /** 当前分数 */
    private _score: number = 0;
    /** 连击计数 */
    private _combo: number = 0;
    /** 最大连击 */
    private _maxCombo: number = 0;
    /** 剩余时间 (秒) */
    private _timeLeft: number = 0;
    /** 是否游戏进行中 */
    private _isPlaying: boolean = false;
    /** 累计地鼠出现次数 */
    private _totalMoles: number = 0;
    /** 已击中次数 */
    private _hitCount: number = 0;

    constructor(config: IWhackMoleConfig = DEFAULT_WHACK_MOLE_CONFIG) {
        this._config = config;
        this._holes = new Array(config.rows * config.cols).fill(0);
        this._timeLeft = config.timeLimit;
    }

    /** 获取网格总数 */
    public get totalHoles(): number {
        return this._config.rows * this._config.cols;
    }

    /** 获取配置 */
    public get config(): IWhackMoleConfig {
        return this._config;
    }

    /** 获取分数 */
    public get score(): number {
        return this._score;
    }

    /** 获取连击数 */
    public get combo(): number {
        return this._combo;
    }

    /** 获取剩余时间 */
    public get timeLeft(): number {
        return this._timeLeft;
    }

    /** 是否游戏进行中 */
    public get isPlaying(): boolean {
        return this._isPlaying;
    }

    /** 获取洞的状态 */
    public getHoleState(index: number): number {
        return this._holes[index] || 0;
    }

    /**
     * 开始游戏
     */
    public start(): void {
        this._score = 0;
        this._combo = 0;
        this._maxCombo = 0;
        this._timeLeft = this._config.timeLimit;
        this._isPlaying = true;
        this._totalMoles = 0;
        this._hitCount = 0;
        this._holes.fill(0);
    }

    /**
     * 每帧更新 (由 UI 层驱动)
     * @param dt 帧间隔 (秒)
     * @returns 是否游戏结束
     */
    public tick(dt: number): boolean {
        if (!this._isPlaying) return true;

        this._timeLeft -= dt;
        if (this._timeLeft <= 0) {
            this._timeLeft = 0;
            this._isPlaying = false;
            return true; // game over
        }
        return false;
    }

    /**
     * 尝试在随机空洞中弹出一只地鼠
     * @returns 弹出的洞索引, -1 表示没有空位或未触发
     */
    public trySpawnMole(): number {
        if (!this._isPlaying) return -1;

        // 统计当前空闲洞
        const emptyHoles: number[] = [];
        for (let i = 0; i < this._holes.length; i++) {
            if (this._holes[i] === 0) {
                emptyHoles.push(i);
            }
        }
        if (emptyHoles.length === 0) return -1;

        // 限制同时出现的地鼠数
        const activeMoles = this._holes.filter((s) => s === 1).length;
        if (activeMoles >= this._config.maxActiveMoles) return -1;

        // 随机选一个空洞
        const idx = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
        this._holes[idx] = 1;
        this._totalMoles++;
        return idx;
    }

    /**
     * 地鼠自动缩回 (超时未被击中)
     * @param index 洞索引
     */
    public hideMole(index: number): void {
        if (this._holes[index] === 1) {
            this._holes[index] = 0;
            // 断连击
            this._combo = 0;
        }
    }

    /**
     * 玩家点击某个洞
     * @param index 洞索引
     * @returns 得分 (0 表示未命中)
     */
    public whack(index: number): number {
        if (!this._isPlaying) return 0;
        if (this._holes[index] !== 1) return 0;

        // 命中!
        this._holes[index] = 2; // 标记为已击中, 等动画完成后再清 0
        this._hitCount++;
        this._combo++;
        if (this._combo > this._maxCombo) {
            this._maxCombo = this._combo;
        }

        // 分数 = 基础分 * (1 + combo奖励)
        const comboBonus = Math.min(this._combo - 1, 5) * 0.2; // 最多 +100%
        const points = Math.floor(this._config.baseScore * (1 + comboBonus));
        this._score += points;

        return points;
    }

    /**
     * 击中动画播完后清理
     */
    public clearHole(index: number): void {
        this._holes[index] = 0;
    }

    /**
     * 获取结算摘要
     */
    public getSummary(): { score: number; maxCombo: number; hitRate: number } {
        return {
            score: this._score,
            maxCombo: this._maxCombo,
            hitRate: this._totalMoles > 0 ? Math.floor((this._hitCount / this._totalMoles) * 100) : 0,
        };
    }
}
