import { Singleton } from "../../ace/logic/Singleton";
import { DEFAULT_FLOOR_CONFIG, IFloorConfig } from "../config/GameConfig";
import { DifficultyManager } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/** 平台类型枚举 */
export enum FloorPlatformType {
    /** 普通平台 */
    NORMAL = 0,
    /** 尖刺平台 (踩上去扣血) */
    SPIKE = 1,
    /** 易碎平台 (踩后短暂消失) */
    BREAKABLE = 2,
    /** 传送带平台 (附加水平推力) */
    CONVEYOR = 3,
}

/** 单个平台数据 */
export interface IFloorPlatformData {
    /** 唯一ID (自增) */
    id: number;
    /** 平台类型 */
    type: FloorPlatformType;
    /** 中心 X 坐标 */
    x: number;
    /** 中心 Y 坐标 */
    y: number;
    /** 平台宽度 */
    width: number;
    /** 平台高度 */
    height: number;
    /** 传送带方向 (1=右推, -1=左推, 0=无) */
    conveyorDir: number;
    /** 是否已被踩碎 (易碎平台) */
    broken: boolean;
    /** 碎裂计时 (秒) */
    breakTimer: number;
    /** 是否已被计分 (防止重复加分) */
    scored: boolean;
}

/**
 * 下一百层核心逻辑控制器
 * 管理平台生成、角色物理、碰撞检测、生命/分数系统
 * 纯逻辑层，不依赖 cc 节点
 */
export class FloorControl extends Singleton<FloorControl> {
    /** 单例访问 */
    public static get instance(): FloorControl {
        if (!this._instance) {
            this._instance = new FloorControl();
            this._instance.init();
        }
        return this._instance;
    }

    /** 兼容 getInstance 调用 */
    public static getInstance(): FloorControl {
        return this.instance;
    }

    // ===== 配置 =====
    private _config: IFloorConfig = null;

    // ===== 平台数据 =====
    /** 所有活跃平台列表 */
    private _platforms: IFloorPlatformData[] = [];
    /** 平台自增ID */
    private _nextPlatformId: number = 0;
    /** 已生成层数 (用作种子) */
    private _spawnedLayers: number = 0;

    // ===== 角色状态 =====
    /** 角色 X 坐标 */
    private _playerX: number = 0;
    /** 角色 Y 坐标 */
    private _playerY: number = 0;
    /** 角色竖直速度 (正=向上, 负=向下) */
    private _playerVy: number = 0;
    /** 角色是否在平台上 */
    private _onPlatform: boolean = false;
    /** 角色当前站立的平台 ID (-1=无) */
    private _standingPlatformId: number = -1;

    // ===== 游戏状态 =====
    /** 分数 */
    private _score: number = 0;
    /** 生命 */
    private _lives: number = 3;
    /** 连续安全层数 (连击) */
    private _combo: number = 0;
    /** 游戏是否结束 */
    private _isGameOver: boolean = false;
    /** 无敌剩余时间 (秒) */
    private _invincibleTimer: number = 0;
    /** 当前难度速度乘数 */
    private _speedMultiplier: number = 1.0;
    /** 已通过层数 (用于难度递进) */
    private _passedLayers: number = 0;

    /** 获取配置 */
    public get config(): IFloorConfig {
        return this._config;
    }
    /** 获取分数 */
    public get score(): number {
        return this._score;
    }
    /** 获取生命 */
    public get lives(): number {
        return this._lives;
    }
    /** 获取连击数 */
    public get combo(): number {
        return this._combo;
    }
    /** 获取是否游戏结束 */
    public get isGameOver(): boolean {
        return this._isGameOver;
    }
    /** 获取角色位置 X */
    public get playerX(): number {
        return this._playerX;
    }
    /** 获取角色位置 Y */
    public get playerY(): number {
        return this._playerY;
    }
    /** 获取角色是否在平台上 */
    public get onPlatform(): boolean {
        return this._onPlatform;
    }
    /** 获取无敌状态 */
    public get isInvincible(): boolean {
        return this._invincibleTimer > 0;
    }
    /** 获取所有平台 */
    public get platforms(): ReadonlyArray<IFloorPlatformData> {
        return this._platforms;
    }
    /** 获取平台上升速度 (含难度加成) */
    public get currentRiseSpeed(): number {
        return this._config.platformRiseSpeed * this._speedMultiplier;
    }

    /** 初始化 */
    protected init(): void {
        Logger.getInstance().info("Floor", "FloorControl 初始化完成");
    }

    /**
     * 开始新游戏
     * @param partialConfig 外部配置 (与默认值合并)
     */
    public startGame(partialConfig?: Partial<IFloorConfig>): void {
        this._config = { ...DEFAULT_FLOOR_CONFIG, ...partialConfig };
        this._platforms = [];
        this._nextPlatformId = 0;
        this._spawnedLayers = 0;
        this._playerX = 0;
        this._playerY = this._config.areaHalfHeight - 80;
        this._playerVy = 0;
        this._onPlatform = false;
        this._standingPlatformId = -1;
        this._score = 0;
        this._lives = this._config.lives;
        this._combo = 0;
        this._isGameOver = false;
        this._invincibleTimer = 0;
        this._passedLayers = 0;

        // 初始化难度
        this._updateDifficulty();

        // 生成初始平台
        this._generateInitialPlatforms();

        Logger.getInstance().info(
            "Floor",
            `开启下一百层游戏, 生命: ${this._lives}, 上升速度: ${this.currentRiseSpeed.toFixed(1)}`
        );
    }

    /**
     * 更新难度因子
     */
    private _updateDifficulty(): void {
        const virtualLevel = 1 + Math.floor(this._passedLayers / 10);
        const params = DifficultyManager.instance.getParams("FLOOR", virtualLevel);
        this._speedMultiplier = params.speed;
    }

    /**
     * 生成初始平台
     */
    private _generateInitialPlatforms(): void {
        const cfg = this._config;
        // 底部放一个宽平台，保证角色安全着陆
        this._addPlatform(
            FloorPlatformType.NORMAL,
            0,
            -cfg.areaHalfHeight + 30,
            cfg.platformWidth * 1.8,
            cfg.platformHeight
        );

        // 从下往上均匀分布平台
        for (let i = 1; i < cfg.initialPlatformCount; i++) {
            const y = -cfg.areaHalfHeight + 30 + i * cfg.platformGapY;
            this._spawnRandomPlatform(y);
        }
    }

    /**
     * 根据种子生成一个随机平台
     * @param y 平台 Y 坐标
     */
    private _spawnRandomPlatform(y: number): IFloorPlatformData {
        const cfg = this._config;
        const rng = LevelGenerator.instance.getRandomSource("FLOOR", this._spawnedLayers);
        this._spawnedLayers++;

        // 随机 X 偏移
        const x = (rng.next() - 0.5) * 2 * cfg.platformMaxOffsetX;

        // 随机类型
        const roll = rng.next();
        let type: FloorPlatformType = FloorPlatformType.NORMAL;
        if (roll < cfg.spikeChance) {
            type = FloorPlatformType.SPIKE;
        } else if (roll < cfg.spikeChance + cfg.breakableChance) {
            type = FloorPlatformType.BREAKABLE;
        } else if (roll < cfg.spikeChance + cfg.breakableChance + cfg.conveyorChance) {
            type = FloorPlatformType.CONVEYOR;
        }

        // 传送带方向
        const convDir = type === FloorPlatformType.CONVEYOR ? (rng.next() > 0.5 ? 1 : -1) : 0;

        // 平台宽度略有随机
        const w = cfg.platformWidth * (0.85 + rng.next() * 0.3);

        return this._addPlatform(type, x, y, w, cfg.platformHeight, convDir);
    }

    /**
     * 添加平台到列表
     */
    private _addPlatform(
        type: FloorPlatformType,
        x: number,
        y: number,
        width: number,
        height: number,
        conveyorDir: number = 0
    ): IFloorPlatformData {
        const p: IFloorPlatformData = {
            id: this._nextPlatformId++,
            type: type,
            x: x,
            y: y,
            width: width,
            height: height,
            conveyorDir: conveyorDir,
            broken: false,
            breakTimer: 0,
            scored: false,
        };
        this._platforms.push(p);
        return p;
    }

    /**
     * 每帧逻辑更新
     * @param dt 帧时间 (秒)
     * @param moveDir 移动方向 (-1=左, 0=不动, 1=右)
     * @returns 本帧新增平台列表、被移除平台ID列表、是否踩到尖刺、是否踩碎平台
     */
    public tick(
        dt: number,
        moveDir: number
    ): { added: IFloorPlatformData[]; removed: number[]; hitSpike: boolean; brokeFloor: boolean } {
        if (this._isGameOver) return { added: [], removed: [], hitSpike: false, brokeFloor: false };

        const cfg = this._config;
        const riseSpeed = this.currentRiseSpeed;
        let hitSpike = false;
        let brokeFloor = false;

        // 1. 无敌计时
        if (this._invincibleTimer > 0) {
            this._invincibleTimer -= dt;
        }

        // 2. 平台上升
        for (let i = this._platforms.length - 1; i >= 0; i--) {
            const p = this._platforms[i];
            p.y += riseSpeed * dt;

            // 易碎平台碎裂倒计时
            if (p.broken) {
                p.breakTimer -= dt;
            }
        }

        // 3. 角色水平移动
        this._playerX += moveDir * cfg.playerMoveSpeed * dt;
        // 边界约束
        const halfW = cfg.playerWidth / 2;
        if (this._playerX < -cfg.areaHalfWidth + halfW) {
            this._playerX = -cfg.areaHalfWidth + halfW;
        }
        if (this._playerX > cfg.areaHalfWidth - halfW) {
            this._playerX = cfg.areaHalfWidth - halfW;
        }

        // 4. 传送带推力 (若站在传送带上)
        if (this._onPlatform && this._standingPlatformId >= 0) {
            const standing = this._findPlatform(this._standingPlatformId);
            if (standing && standing.type === FloorPlatformType.CONVEYOR && !standing.broken) {
                this._playerX += standing.conveyorDir * cfg.conveyorSpeed * dt;
            }
        }

        // 5. 重力 + 竖直运动
        this._playerVy -= cfg.gravity * dt;
        if (this._playerVy < -cfg.maxFallSpeed) {
            this._playerVy = -cfg.maxFallSpeed;
        }
        this._playerY += this._playerVy * dt;

        // 角色也随平台一起上升
        this._playerY += riseSpeed * dt;

        // 6. 碰撞检测 — 只在角色下落时检测
        this._onPlatform = false;
        this._standingPlatformId = -1;
        if (this._playerVy <= 0) {
            for (const p of this._platforms) {
                if (p.broken && p.breakTimer <= 0) continue;
                if (this._checkLanding(p)) {
                    this._onPlatform = true;
                    this._standingPlatformId = p.id;
                    this._playerY = p.y + p.height / 2 + cfg.playerHeight / 2;
                    this._playerVy = 0;

                    // 平台特殊效果
                    if (p.type === FloorPlatformType.SPIKE && !this.isInvincible) {
                        hitSpike = true;
                        this._loseLife();
                    }
                    if (p.type === FloorPlatformType.BREAKABLE && !p.broken) {
                        p.broken = true;
                        p.breakTimer = 0.3;
                        brokeFloor = true;
                    }

                    // 计分
                    if (!p.scored) {
                        p.scored = true;
                        this._addScore(p);
                    }
                    break;
                }
            }
        }

        // 7. 天花板/底部死亡判定
        if (this._playerY > cfg.areaHalfHeight - cfg.playerHeight / 2) {
            if (cfg.ceilingKills) {
                this._gameOver();
            } else {
                this._playerY = cfg.areaHalfHeight - cfg.playerHeight / 2;
                this._playerVy = 0;
            }
        }
        if (this._playerY < -cfg.areaHalfHeight - cfg.playerHeight) {
            this._gameOver();
        }

        // 8. 回收超出顶部的平台 + 在底部生成新平台
        const removed: number[] = [];
        for (let i = this._platforms.length - 1; i >= 0; i--) {
            const p = this._platforms[i];
            if (p.y > cfg.areaHalfHeight + 50 || (p.broken && p.breakTimer <= 0)) {
                removed.push(p.id);
                this._platforms.splice(i, 1);
            }
        }

        // 找到当前最低的平台
        const added: IFloorPlatformData[] = [];
        let lowestY = cfg.areaHalfHeight;
        for (const p of this._platforms) {
            if (p.y < lowestY) lowestY = p.y;
        }

        // 如果最低平台不够低，则在下方生成新平台
        while (lowestY > -cfg.areaHalfHeight - 20) {
            lowestY -= cfg.platformGapY;
            const newP = this._spawnRandomPlatform(lowestY);
            added.push(newP);
        }

        // 9. 每通过10层更新难度
        const newPassed = Math.floor(this._score / cfg.baseScore);
        if (newPassed > this._passedLayers) {
            this._passedLayers = newPassed;
            if (this._passedLayers % 10 === 0) {
                this._updateDifficulty();
            }
        }

        return { added, removed, hitSpike, brokeFloor };
    }

    /**
     * 检测角色是否落在平台上
     * 角色底部刚好在平台顶部附近时判定为着陆
     */
    private _checkLanding(p: IFloorPlatformData): boolean {
        const cfg = this._config;
        const playerLeft = this._playerX - cfg.playerWidth / 2;
        const playerRight = this._playerX + cfg.playerWidth / 2;
        const playerBottom = this._playerY - cfg.playerHeight / 2;

        const platLeft = p.x - p.width / 2;
        const platRight = p.x + p.width / 2;
        const platTop = p.y + p.height / 2;

        // 水平重叠判定
        if (playerRight < platLeft + 5 || playerLeft > platRight - 5) return false;

        // 竖直方向: 角色底部在平台顶部附近 (容差范围)
        const tolerance = Math.max(8, Math.abs(this._playerVy) * 0.03);
        if (playerBottom >= platTop - tolerance && playerBottom <= platTop + tolerance + 2) {
            return true;
        }

        return false;
    }

    /**
     * 查找平台
     */
    private _findPlatform(id: number): IFloorPlatformData | null {
        for (const p of this._platforms) {
            if (p.id === id) return p;
        }
        return null;
    }

    /**
     * 加分
     */
    private _addScore(platform: IFloorPlatformData): void {
        const cfg = this._config;
        if (platform.type === FloorPlatformType.SPIKE) return;
        this._combo++;
        const bonus = cfg.baseScore + this._combo * cfg.comboBonus;
        this._score += bonus;
    }

    /**
     * 扣血
     */
    private _loseLife(): void {
        this._lives--;
        this._combo = 0;
        this._invincibleTimer = this._config.invincibleDuration;
        Logger.getInstance().info("Floor", `踩到尖刺! 剩余生命: ${this._lives}`);
        if (this._lives <= 0) {
            this._gameOver();
        }
    }

    /**
     * 游戏结束
     */
    private _gameOver(): void {
        if (this._isGameOver) return;
        this._isGameOver = true;
        Logger.getInstance().info("Floor", `游戏结束! 最终得分: ${this._score}`);
    }

    /**
     * 重置连击
     */
    public resetCombo(): void {
        this._combo = 0;
    }
}
