import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";

/**
 * 泡泡龙核心逻辑控制器
 */
export class BubbleControl extends Singleton<BubbleControl> {
    public onScoreChanged: (score: number) => void = null;
    private _score: number = 0;

    public static get instance(): BubbleControl {
        return super.instance as BubbleControl;
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
        Logger.getInstance().info("Bubble", "开启泡泡龙游戏");
    }
}
