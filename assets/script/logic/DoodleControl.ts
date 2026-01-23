import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";

/**
 * 涂鸦跳跃核心逻辑控制器
 */
export class DoodleControl extends Singleton<DoodleControl> {
    public onScoreChanged: (score: number) => void = null;
    public jumpForce: number = 800;
    private _score: number = 0;

    public static get instance(): DoodleControl {
        return super.instance as DoodleControl;
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
        Logger.getInstance().info("Doodle", "开启涂鸦跳跃游戏");
    }
}
