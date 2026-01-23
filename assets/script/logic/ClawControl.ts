import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";

/**
 * 抓娃娃核心逻辑控制器
 */
export class ClawControl extends Singleton<ClawControl> {
    public static get instance(): ClawControl {
        return super.instance as ClawControl;
    }

    protected init(): void {
        Logger.getInstance().info("Claw", "ClawControl 初始化完成");
    }

    public startGame(): void {
        Logger.getInstance().info("Claw", "开启抓娃娃游戏");
    }
}
