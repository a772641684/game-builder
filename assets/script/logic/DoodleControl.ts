import { Singleton } from "../../ace/logic/Singleton";
import { DEFAULT_DOODLE_CONFIG, IDoodleConfig } from "../config/GameConfig";
import { DifficultyManager } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/** 平台类型枚举 */
export enum PlatformType {
    /** 普通平台 */
    Normal = 1,
    /** 破碎平台 (踩一次后消失) */
    Breakable = 2,
    /** 弹簧平台 (跳得更高) */
    Spring = 3,
    /** 移动平台 (左右移动) */
    Moving = 4,
}

/** 平台数据接口 */
export interface IPlatformData {
    /** 唯一 ID */
    id: number;
    /** X 坐标 */
    x: number;
    /** Y 坐标 (世界空间，累加高度) */
    y: number;
    /** 平台类型 */
    type: PlatformType;
    /** 是否有金币 */
    hasCoin: boolean;
    /** 移动方向 (1=右, -1=左, 仅 Moving 类型) */
    moveDir: number;
}

/**
 * 涂鸦跳跃核心逻辑控制器
 * 配置驱动，管理分数与平台生成
 */
export class DoodleControl extends Singleton<DoodleControl> {
    /** 分数变化回调 */
    public onScoreChanged: (score: number) => void = null;
    /** 游戏配置 */
    private _config: IDoodleConfig = { ...DEFAULT_DOODLE_CONFIG };
    /** 当前分数 */
    private _score: number = 0;
    /** 最高到达高度 (用于计分) */
    private _maxHeight: number = 0;
    /** 平台 ID 自增计数器 */
    private _platformIdCounter: number = 0;
    /** 当前已生成的最高 Y 坐标 */
    private _lastSpawnY: number = 0;
    /** 上一个安全(非破碎)平台的 X 坐标，用于可达性校验 */
    private _lastSafeX: number = 0;

    /** 获取配置 */
    public get config(): IDoodleConfig {
        return this._config;
    }

    /** 获取当前分数 */
    public get score(): number {
        return this._score;
    }

    /** 获取最高高度 */
    public get maxHeight(): number {
        return this._maxHeight;
    }

    /** 获取当前已生成的最高 Y */
    public get lastSpawnY(): number {
        return this._lastSpawnY;
    }

    public static get instance(): DoodleControl {
        if (!this._instance) {
            this._instance = new DoodleControl();
            this._instance.init();
        }
        return this._instance;
    }

    public static getInstance(): DoodleControl {
        return this.instance;
    }

    protected init(): void {
        Logger.getInstance().info("Doodle", "DoodleControl 初始化完成");
    }

    /**
     * 开始新游戏
     * @param partialConfig 可选的外部配置覆盖
     */
    public startGame(partialConfig?: Partial<IDoodleConfig>): void {
        this._config = { ...DEFAULT_DOODLE_CONFIG, ...partialConfig };
        this._score = 0;
        this._maxHeight = 0;
        this._platformIdCounter = 0;
        this._lastSpawnY = 0;
        this._lastSafeX = 0;

        var lv = DifficultyManager.instance.getCurrentLevel("DOODLE");
        Logger.getInstance().info("Doodle", "开启涂鸦跳跃, 关卡: " + lv);
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
     * 更新最高高度并计分
     * @param height 当前角色世界高度
     */
    public updateHeight(height: number): void {
        if (height > this._maxHeight) {
            var delta = Math.floor((height - this._maxHeight) / 10);
            this._maxHeight = height;
            if (delta > 0) {
                this.addScore(delta);
            }
        }
    }

    /**
     * 请求生成一批新平台
     * 内置物理可达性校验，保证玩家一定能跳上去
     * @param startY 起始 Y 坐标
     * @param count 数量
     * @returns 平台数据数组
     */
    public requestMorePlatforms(startY: number, count: number): IPlatformData[] {
        var lv = DifficultyManager.instance.getCurrentLevel("DOODLE");
        var rawList = LevelGenerator.instance.generateDoodlePlatforms(lv, startY, count);
        var cfg = this._config;

        // ---- 物理可达性参数 ----
        // 最大跳跃高度 H = v² / (2g)
        var maxJumpH = (cfg.jumpSpeed * cfg.jumpSpeed) / (2 * cfg.gravity);
        // 安全系数 80%，留出操作容错
        var safeMaxGap = Math.floor(maxJumpH * 0.8);

        var result: IPlatformData[] = [];
        // 跟踪上一个安全(非破碎)平台，用于可达性验证
        var lastSafeX = this._lastSafeX;
        var lastSafeY = startY;

        for (var i = 0; i < rawList.length; i++) {
            var raw = rawList[i];
            var type = PlatformType.Normal;
            if (raw.type === 2) {
                type = PlatformType.Breakable;
            }
            // 叠加弹簧概率 (仅普通平台)
            if (type === PlatformType.Normal && Math.random() < cfg.springChance) {
                type = PlatformType.Spring;
            }
            // 叠加移动平台概率 (仅普通平台)
            if (type === PlatformType.Normal && Math.random() < cfg.movingChance) {
                type = PlatformType.Moving;
            }

            // ======== 可达性校验 ========
            var px = raw.x;
            var py = raw.y;
            var dy = py - lastSafeY;

            // 规则1: 禁止连续破碎平台 (破碎=踩不住，连续出现=必死)
            if (
                type === PlatformType.Breakable &&
                result.length > 0 &&
                result[result.length - 1].type === PlatformType.Breakable
            ) {
                type = PlatformType.Normal;
            }

            // 规则2: 垂直间距不得超过安全跳跃高度
            if (dy > safeMaxGap) {
                py = lastSafeY + safeMaxGap;
                dy = safeMaxGap;
            }

            // 规则3: 水平可达性验证
            // 在高度差 dy 下，角色处于该高度以上的滞空时间
            // airTime = 2 * sqrt(v² - 2g*dy) / g
            if (dy > 0 && dy < maxJumpH) {
                var vSq = cfg.jumpSpeed * cfg.jumpSpeed;
                var remain = vSq - 2 * cfg.gravity * dy;
                if (remain > 0) {
                    var airTimeAbove = (2 * Math.sqrt(remain)) / cfg.gravity;
                    // 水平最大移动距离 (安全系数 75%)
                    var maxReachX = cfg.moveSpeed * airTimeAbove * 0.75;

                    // 考虑屏幕穿越的有效距离
                    var rawDx = Math.abs(px - lastSafeX);
                    var wrapDx = 2 * cfg.halfWidth - rawDx;
                    var effectiveDx = Math.min(rawDx, wrapDx);

                    if (effectiveDx > maxReachX) {
                        // 水平距离超出可达范围，将平台拉向安全平台方向
                        var moveDir = px > lastSafeX ? 1 : -1;
                        px = lastSafeX + moveDir * Math.floor(maxReachX * 0.7);
                        // 限制在屏幕范围内
                        var edgeLimit = cfg.halfWidth - 60;
                        if (px > edgeLimit) px = edgeLimit;
                        if (px < -edgeLimit) px = -edgeLimit;
                    }
                } else {
                    // remain <= 0 意味着 dy 太大 (理论上被规则2拦截)
                    py = lastSafeY + Math.floor(maxJumpH * 0.6);
                    dy = py - lastSafeY;
                }
            }

            // 规则4: 破碎平台后的下一个安全平台必须从 lastSafe 可达
            // (已通过上面逻辑自动保证，因为 lastSafeX/Y 仅在非破碎时更新)

            // 金币概率 (非破碎平台)
            var hasCoin = type !== PlatformType.Breakable && Math.random() < cfg.coinChance;

            result.push({
                id: this._platformIdCounter++,
                x: px,
                y: py,
                type: type,
                hasCoin: hasCoin,
                moveDir: Math.random() > 0.5 ? 1 : -1,
            });

            // 仅非破碎平台更新安全参考点
            if (type !== PlatformType.Breakable) {
                lastSafeX = px;
                lastSafeY = py;
            }
        }

        // 持久化安全 X，供下批生成使用
        this._lastSafeX = lastSafeX;

        if (result.length > 0) {
            this._lastSpawnY = result[result.length - 1].y;
        }
        return result;
    }
}
