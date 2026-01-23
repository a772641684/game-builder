import { Singleton } from "../../ace/logic/Singleton";
import { DifficultyManager, IDifficultyFactor } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/**
 * 弹弹球核心逻辑控制器
 */
export class BouncyControl extends Singleton<BouncyControl> {
    public onGameOver: () => void = null;
    public onWin: () => void = null;

    private _difficulty: IDifficultyFactor = null;
    private _bricks: number[][] = [];

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

    public startGame(): void {
        // [US1] 注入难度参数
        this._difficulty = DifficultyManager.instance.getParams("BOUNCY");
        const lv = DifficultyManager.instance.getCurrentLevel("BOUNCY");

        // [US2] 注入 PCG 砖块布局
        this._bricks = LevelGenerator.instance.generateBouncyBricks(lv, this._difficulty.speed);

        Logger.getInstance().info(
            "Bouncy",
            `开启弹弹球游戏, 当前等级: ${lv}, 速度系数: ${this._difficulty.speed.toFixed(2)}`
        );
    }

    public getBricks(): number[][] {
        return this._bricks;
    }

    /**
     * 获取球的初始冲力
     */
    public getBallImpulse(): number {
        const baseImpulse = 500;
        return baseImpulse * (this._difficulty ? this._difficulty.speed : 1.0);
    }

    /**
     * 获取挡板宽度系数
     * 随着难度增加, 挡板变窄 (反比)
     */
    public getPaddleScale(): number {
        if (!this._difficulty) return 1.0;
        // 难度越高, speed 越大, 1/speed 越小
        return Math.max(0.4, 1.0 / this._difficulty.speed);
    }
}
