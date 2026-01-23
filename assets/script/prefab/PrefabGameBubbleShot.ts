import { BubbleControl } from "../logic/BubbleControl";

const { ccclass, property } = cc._decorator;

/**
 * 泡泡龙子弹组件
 * [Prefab 结构说明]
 * - Bullet (挂载此脚本, cc.RigidBody, cc.PhysicsCircleCollider, cc.Sprite)
 */
@ccclass
export default class PrefabGameBubbleShot extends cc.Component {
    @property(cc.Integer)
    colorType: number = 0;

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        const otherBubble = otherCollider.getComponent(PrefabGameBubbleShot);
        if (otherBubble && otherBubble.colorType === this.colorType) {
            // 消除逻辑 (简单模拟: 销毁自身)
            this.node.destroy();
            otherBubble.node.destroy();
            BubbleControl.getInstance().addScore(20);
        }
    }
}
