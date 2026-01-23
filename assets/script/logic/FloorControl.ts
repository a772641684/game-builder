import { Singleton } from "../../ace/logic/Singleton";
import { DifficultyManager, IDifficultyFactor } from "./DifficultyManager";
import { ILayerPlatform, LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/**
 * 下一百层核心逻辑控制器
 */
export class FloorControl extends Singleton<FloorControl> {
    private _difficulty: IDifficultyFactor = null;

    public static get instance(): FloorControl {
        if (!this._instance) {
            this._instance = new FloorControl();
            this._instance.init();
        }
        return this._instance;
    }

    public static getInstance(): FloorControl {
        return this.instance;
    }

    protected init(): void {
        Logger.getInstance().info("Floor", "FloorControl 初始化完成");
    }

    public startGame(): void {
        // [US1] 注入难度参数
        this._difficulty = DifficultyManager.instance.getParams("FLOOR");
        const lv = DifficultyManager.instance.getCurrentLevel("FLOOR");
        Logger.getInstance().info(
            "Floor",
            `开启下一百层游戏, 当前等级: ${lv}, 速度倍率: ${this._difficulty.speed.toFixed(2)}`
        );
    }

    /**
     * [US2] 为下一层请求平台配置
     */
    public getNextPlatformConfig(subLevel: number): ILayerPlatform {
        const lv = DifficultyManager.instance.getCurrentLevel("FLOOR");
        return LevelGenerator.instance.generateLayerPlatform(lv + subLevel, this._difficulty.speed);
    }

    /**
     * 获取当前层级移动速度
     * 基础速度 200, 乘以难度系数
     */
    public getMoveSpeed(): number {
        const baseSpeed = 200;
        return baseSpeed * (this._difficulty ? this._difficulty.speed : 1.0);
    }
}
