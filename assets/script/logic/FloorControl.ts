import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";

/**
 * 下一百层核心逻辑控制器
 */
export class FloorControl extends Singleton<FloorControl> {
    public static get instance(): FloorControl {
        return super.instance as FloorControl;
    }

    protected init(): void {
        Logger.getInstance().info("Floor", "FloorControl 初始化完成");
    }

    public startGame(): void {
        Logger.getInstance().info("Floor", "开启下一百层游戏");
    }
}
