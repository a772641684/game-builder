import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";

/**
 * 点线交织核心逻辑控制器
 */
export class PolyControl extends Singleton<PolyControl> {
    public static get instance(): PolyControl {
        return super.instance as PolyControl;
    }

    protected init(): void {
        Logger.getInstance().info("Poly", "PolyControl 初始化完成");
    }

    public startGame(): void {
        Logger.getInstance().info("Poly", "开启点线交织游戏");
    }
}
