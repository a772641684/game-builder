import { Singleton } from "../../ace/logic/Singleton";
import { DifficultyManager } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/**
 * 涂鸦跳跃核心逻辑控制器
 */
export class DoodleControl extends Singleton<DoodleControl> {
    public onScoreChanged: (score: number) => void = null;
    public jumpForce: number = 800;
    private _score: number = 0;
    private _difficulty: number = 1.0;

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

    public get score(): number {
        return this._score;
    }

    protected init(): void {
        Logger.getInstance().info("Doodle", "DoodleControl 初始化完成");
    }

    public addScore(val: number) {
        this._score += val;
        this.onScoreChanged && this.onScoreChanged(this._score);
    }

    public startGame(): void {
        this._score = 0;
        const lv = DifficultyManager.instance.getCurrentLevel("DOODLE");
        const diff = DifficultyManager.instance.getParams("DOODLE");
        this._difficulty = diff.speed;

        Logger.getInstance().info("Doodle", `开启涂鸦跳跃游戏, 关卡: ${lv}, 难度系数: ${this._difficulty.toFixed(2)}`);
    }

    /**
     * [US2] 为地图生成一批新平台
     */
    public requestMorePlatforms(startY: number, count: number) {
        const lv = DifficultyManager.instance.getCurrentLevel("DOODLE");
        return LevelGenerator.instance.generateDoodlePlatforms(lv, startY, count);
    }
}
