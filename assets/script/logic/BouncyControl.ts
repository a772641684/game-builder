import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";

/**
 * 弹弹球核心逻辑控制器
 */
export class BouncyControl extends Singleton<BouncyControl> {
    public static get instance(): BouncyControl {
        return super.instance as BouncyControl;
    }

    protected init(): void {
        Logger.getInstance().info("Bouncy", "BouncyControl 初始化完成");
    }

    public startGame(): void {
        Logger.getInstance().info("Bouncy", "开启弹弹球游戏");
    }
}
