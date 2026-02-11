import { Singleton } from "../../ace/logic/Singleton";
import { DEFAULT_BOUNCY_CONFIG, IBouncyConfig } from "../config/GameConfig";
import { DifficultyManager } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/**
 * 砖块数据接口
 */
export interface IBrickData {
    /** 行 */
    r: number;
    /** 列 */
    c: number;
    /** 剩余生命值 (0=已消除) */
    hp: number;
    /** 初始生命值 */
    maxHp: number;
}

/**
 * 弹弹球(打砖块)核心逻辑控制器
 * 配置驱动，管理砖块矩阵、分数、生命、连击
 */
export class BouncyControl extends Singleton<BouncyControl> {
    /** 分数变化回调 */
    public onScoreChanged: (score: number) => void = null;
    /** 生命变化回调 */
    public onLivesChanged: (lives: number) => void = null;
    /** 砖块消除回调 (r, c, 得分) */
    public onBrickDestroyed: (r: number, c: number, score: number) => void = null;
    /** 砖块被击中回调 (r, c, 剩余hp) */
    public onBrickHit: (r: number, c: number, remainHp: number) => void = null;
    /** 游戏结束回调 (isWin) */
    public onGameEnd: (isWin: boolean) => void = null;

    /** 游戏配置 */
    private _config: IBouncyConfig = { ...DEFAULT_BOUNCY_CONFIG };
    /** 砖块矩阵 */
    private _bricks: IBrickData[][] = [];
    /** 当前分数 */
    private _score: number = 0;
    /** 剩余生命 */
    private _lives: number = 3;
    /** 连击计数 (每次球碰挡板重置) */
    private _combo: number = 0;
    /** 剩余砖块总数 */
    private _remainingBricks: number = 0;
    /** 游戏是否正在进行 */
    private _isPlaying: boolean = false;

    /** 获取配置 */
    public get config(): IBouncyConfig {
        return this._config;
    }

    /** 获取当前分数 */
    public get score(): number {
        return this._score;
    }

    /** 获取剩余生命 */
    public get lives(): number {
        return this._lives;
    }

    /** 获取连击数 */
    public get combo(): number {
        return this._combo;
    }

    /** 获取剩余砖块数 */
    public get remainingBricks(): number {
        return this._remainingBricks;
    }

    /** 获取砖块矩阵 */
    public get bricks(): IBrickData[][] {
        return this._bricks;
    }

    /** 获取砖块行数 */
    public get brickRows(): number {
        return this._bricks.length;
    }

    /** 是否在游戏中 */
    public get isPlaying(): boolean {
        return this._isPlaying;
    }

    public static get instance(): BouncyControl {
        if (!this._instance) {
            this._instance = new BouncyControl();
            this._instance.init();
        }
        return this._instance;
    }

    public static getInstance(): BouncyControl {
        return this.instance;
    }

    protected init(): void {
        Logger.getInstance().info("Bouncy", "BouncyControl 初始化完成");
    }

    /**
     * 开始新游戏
     * @param partialConfig 可选的外部配置覆盖
     */
    public startGame(partialConfig?: Partial<IBouncyConfig>): void {
        this._config = { ...DEFAULT_BOUNCY_CONFIG, ...partialConfig };
        this._score = 0;
        this._combo = 0;
        this._lives = this._config.lives;
        this._isPlaying = true;

        // 获取难度参数
        var lv = DifficultyManager.instance.getCurrentLevel("BOUNCY");
        var diff = DifficultyManager.instance.getParams("BOUNCY");

        // 生成砖块矩阵
        var rawBricks = LevelGenerator.instance.generateBouncyBricks(lv, diff.speed);
        this._bricks = [];
        this._remainingBricks = 0;

        for (var r = 0; r < rawBricks.length; r++) {
            this._bricks[r] = [];
            for (var c = 0; c < rawBricks[r].length; c++) {
                var hp = rawBricks[r][c];
                this._bricks[r][c] = {
                    r: r,
                    c: c,
                    hp: hp,
                    maxHp: hp,
                };
                if (hp > 0) {
                    this._remainingBricks++;
                }
            }
        }

        Logger.getInstance().info("Bouncy", "开启弹弹球游戏, 关卡: " + lv + ", 砖块数: " + this._remainingBricks);
    }

    /**
     * 增加分数
     * @param val 增加的分值
     */
    public addScore(val: number): void {
        this._score += val;
        if (this.onScoreChanged) {
            this.onScoreChanged(this._score);
        }
    }

    /**
     * 击中砖块
     * @param r 行
     * @param c 列
     * @returns 砖块是否被消除
     */
    public hitBrick(r: number, c: number): boolean {
        if (r < 0 || r >= this._bricks.length) return false;
        if (c < 0 || c >= this._bricks[r].length) return false;

        var brick = this._bricks[r][c];
        if (brick.hp <= 0) return false;

        brick.hp--;
        this._combo++;

        if (brick.hp <= 0) {
            // 砖块消除
            this._remainingBricks--;
            var brickScore = this._config.baseScore * brick.maxHp + this._combo * this._config.comboBonus;
            this.addScore(brickScore);

            if (this.onBrickDestroyed) {
                this.onBrickDestroyed(r, c, brickScore);
            }

            // 检查胜利
            if (this._remainingBricks <= 0) {
                this._isPlaying = false;
                if (this.onGameEnd) {
                    this.onGameEnd(true);
                }
            }
            return true;
        } else {
            // 砖块被击中但未消除
            if (this.onBrickHit) {
                this.onBrickHit(r, c, brick.hp);
            }
            return false;
        }
    }

    /**
     * 球碰到挡板时重置连击
     */
    public resetCombo(): void {
        this._combo = 0;
    }

    /**
     * 丢失一条命
     * @returns 是否游戏结束
     */
    public loseLife(): boolean {
        this._lives--;
        if (this.onLivesChanged) {
            this.onLivesChanged(this._lives);
        }
        if (this._lives <= 0) {
            this._isPlaying = false;
            if (this.onGameEnd) {
                this.onGameEnd(false);
            }
            return true;
        }
        return false;
    }

    /**
     * 根据行列获取砖块在游戏区域中的中心坐标
     * @param r 行
     * @param c 列
     * @returns {x, y} 中心坐标 (游戏区域空间, 原点在中心)
     */
    public getBrickCenter(r: number, c: number): { x: number; y: number } {
        var cfg = this._config;
        var totalW = cfg.brickCols * (cfg.brickWidth + cfg.brickSpacing) - cfg.brickSpacing;
        var startX = -totalW / 2 + cfg.brickWidth / 2;
        var startY = cfg.areaHalfHeight - cfg.brickTopOffset - cfg.brickHeight / 2;

        return {
            x: startX + c * (cfg.brickWidth + cfg.brickSpacing),
            y: startY - r * (cfg.brickHeight + cfg.brickSpacing),
        };
    }
}
