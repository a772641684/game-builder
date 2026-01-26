const { ccclass, property } = cc._decorator;
import { Logger } from "../logic/Logger";
import { UnscrewControl } from "../logic/UnscrewControl";

/**
 * 螺丝组件脚本
 * [Prefab 结构说明]:
 * 根节点 (PrefabGameScrew): 挂载此脚本，包含 cc.RigidBody (Static) 和 cc.PhysicsCircleCollider。
 * └── View: 精灵图节点，显示螺丝样式。
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
        UnscrewControl.getInstance().tryUnscrew(this.screwId);
    }
}
