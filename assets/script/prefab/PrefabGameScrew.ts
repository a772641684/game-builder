const { ccclass, property } = cc._decorator;
import { Logger } from "../logic/Logger";
import { UnscrewControl } from "../logic/UnscrewControl";

/**
 * 螺丝组件脚本
 * [Prefab 结构说明]:
 * - PrefabGameScrew
 *   - View
 */
@ccclass
export default class PrefabGameScrew extends cc.Component {
    /** 螺丝在关卡中的唯一 ID */
    public screwId: string = "";

    /**
     * 组件加载回调
     */
    protected onLoad(): void {
        this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
    }

    /**
     * 处理螺丝点击交互
     */
    private onClick(): void {
        Logger.getInstance().info("Unscrew", `螺丝被点击: ${this.screwId}`);
        // 调用逻辑控制器尝试拆卸
        UnscrewControl.getInstance().tryUnscrew(this);
    }
}
