import { Logger } from "./Logger";

const { ccclass, property } = cc._decorator;

/**
 * 物理系统初始化组件
 * 启用内置物理引擎 (Box2D)
 */
@ccclass
export default class PhysicsInit extends cc.Component {
    @property({ tooltip: "是否显示调试绘制" })
    debugDraw: boolean = false;

    @property({ tooltip: "重力向量" })
    gravity: cc.Vec2 = cc.v2(0, -960);

    onLoad() {
        const manager = cc.director.getPhysicsManager();
        manager.enabled = true;
        manager.gravity = this.gravity;

        if (this.debugDraw) {
            manager.debugDrawFlags =
                cc.PhysicsManager.DrawBits.e_aabbBit |
                cc.PhysicsManager.DrawBits.e_pairBit |
                cc.PhysicsManager.DrawBits.e_centerOfMassBit |
                cc.PhysicsManager.DrawBits.e_jointBit |
                cc.PhysicsManager.DrawBits.e_shapeBit;
        }

        Logger.getInstance().info("Physics", "物理系统初始化完成");
    }
}
