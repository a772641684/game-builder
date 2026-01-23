import { Singleton } from "../../ace/logic/Singleton";
import { DifficultyManager } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/**
 * 泡泡龙核心逻辑控制器
 */
export class BubbleControl extends Singleton<BubbleControl> {
    public onScoreChanged: (score: number) => void = null;
    private _score: number = 0;
    private _matrix: number[][] = [];

    public static get instance(): BubbleControl {
        if (!this._instance) {
            this._instance = new BubbleControl();
            this._instance.init();
        }
        return this._instance;
    }

    public static getInstance(): BubbleControl {
        return this.instance;
    }

    protected init(): void {
        Logger.getInstance().info("Bubble", "BubbleControl 初始化完成");
    }

    public addScore(val: number) {
        this._score += val;
        this.onScoreChanged && this.onScoreChanged(this._score);
    }

    public startGame(): void {
        this._score = 0;
        const lv = DifficultyManager.instance.getCurrentLevel("BUBBLE");

        // [US2] 注入随机矩阵生成 (10x8)
        this._matrix = LevelGenerator.instance.generateBubbleMatrix(lv, 10, 8);

        Logger.getInstance().info("Bubble", `开启泡泡龙游戏, 等级: ${lv}`);
    }

    public getMatrix(): number[][] {
        return this._matrix;
    }
}
