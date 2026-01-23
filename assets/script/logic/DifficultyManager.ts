import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";
import { StorageControl } from "./StorageControl";

/**
 * 游戏结束结算简报
 */
export interface IGameSettlement {
    gameId: string;
    level: number;
    baseScore: number;
    isPass: boolean;
}

/**
 * 难度权重调节因子
 */
export interface IDifficultyFactor {
    speed: number; // 速度系数 (默认 1.0)
    density: number; // 密度系数 (默认 1.0)
    timeLimit: number; // 时间限制系数 (默认 1.0)
    enemyCount: number; // 敌人数量系数 (默认 1.0)
}

/**
 * 各小游戏的难度增长配置
 */
interface DifficultyProfile {
    baseRate: number; // 基础增长率
    milestoneGap: number; // 存档点间距 (默认 10)
    isEndless: boolean; // 是否为无尽模式 (随分数/时间实时增长)
}

/**
 * 难度管理器
 * 负责全局关卡进度、难度因子计算与里程碑存档
 */
export class DifficultyManager extends Singleton<DifficultyManager> {
    private _gameProgression: { [gameId: string]: number } = {};
    private _profiles: { [gameId: string]: DifficultyProfile } = {};

    protected init(): void {
        super.init();
        // 初始化 11 款游戏的增长配置
        const defaultProfile: DifficultyProfile = { baseRate: 0.05, milestoneGap: 10, isEndless: false };
        const endlessProfile: DifficultyProfile = { baseRate: 0.04, milestoneGap: 1, isEndless: true };

        // P1: 关卡制游戏
        this.registerProfile("DIFFERENCES", defaultProfile);
        this.registerProfile("FRUIT", defaultProfile);
        this.registerProfile("PIPE", defaultProfile);
        this.registerProfile("PUZZLE", defaultProfile);
        this.registerProfile("BUBBLE", { ...defaultProfile, baseRate: 0.03 });
        this.registerProfile("CLAW", { ...defaultProfile, baseRate: 0.1 });
        this.registerProfile("POLY", { ...defaultProfile, baseRate: 0.06 });

        // P1: 无尽增量游戏
        this.registerProfile("HORSE", endlessProfile);
        this.registerProfile("DOODLE", { ...endlessProfile, baseRate: 0.08 });
        this.registerProfile("FLOOR", { ...endlessProfile, baseRate: 0.05 });
        this.registerProfile("BOUNCY", { ...endlessProfile, baseRate: 0.07 });

        this.registerProfile("default", defaultProfile);

        Logger.getInstance().info("DifficultyManager", "11 款游戏难度特性配置已完成 (ID 已对齐)");
    }

    /**
     * 注册特定游戏的难度配置
     */
    public registerProfile(gameId: string, profile: DifficultyProfile): void {
        this._profiles[gameId] = profile;
    }

    /**
     * 获取当前游戏的难度参数
     * 公式: Parameter = 1.0 + (Level - 1) * Rate
     */
    public getParams(gameId: string, virtualLevel?: number): IDifficultyFactor {
        const level = virtualLevel || this.getCurrentLevel(gameId);
        const profile = this._profiles[gameId] || this._profiles["default"];

        // 难度增长率计算
        const growth = (level - 1) * profile.baseRate;

        return {
            speed: 1.0 + growth,
            density: 1.0 + growth * 0.5,
            timeLimit: Math.max(0.5, 1.0 - growth * 0.2),
            enemyCount: Math.floor(1.0 + growth * 2.0),
        };
    }

    /**
     * 获取当前关卡级别
     */
    public getCurrentLevel(gameId: string): number {
        if (this._gameProgression[gameId] === undefined) {
            // 尝试从本地存储恢复
            this._gameProgression[gameId] = StorageControl.instance.getNumber(`Level_${gameId}`, 1);
        }
        return this._gameProgression[gameId];
    }

    /**
     * 结算并更新进度
     */
    public settle(report: IGameSettlement): void {
        const profile = this._profiles[report.gameId] || this._profiles["default"];

        if (report.isPass) {
            // 通过关卡
            this._gameProgression[report.gameId] = report.level + 1;
            StorageControl.instance.setNumber(`Level_${report.gameId}`, this._gameProgression[report.gameId]);
            Logger.getInstance().info(
                "DifficultyManager",
                `${report.gameId} 关卡通过，当前等级: ${this._gameProgression[report.gameId]}`
            );
        } else {
            // 挑战失败，执行里程碑回退 (T017)
            this.backToMilestone(report.gameId);
            Logger.getInstance().info("DifficultyManager", `${report.gameId} 挑战失败，已应用里程碑回退`);
        }
    }

    /**
     * 回退到上一个存档点
     */
    public backToMilestone(gameId: string): number {
        const current = this.getCurrentLevel(gameId);
        const profile = this._profiles[gameId] || this._profiles["default"];
        const milestone = Math.max(1, Math.floor((current - 1) / profile.milestoneGap) * profile.milestoneGap + 1);

        this._gameProgression[gameId] = milestone;
        StorageControl.instance.setNumber(`Level_${gameId}`, milestone);

        Logger.getInstance().warn("DifficultyManager", `${gameId} 已回退至里程碑: ${milestone}`);
        return milestone;
    }

    public destroy(): void {
        this._gameProgression = {};
    }
}
