import { BouncyControl } from "../logic/BouncyControl";

const { ccclass, property } = cc._decorator;

/**
 * 弹性球物体组件
 * [Prefab 结构说明]
 * - Ball (挂载此脚本, cc.RigidBody, cc.PhysicsCircleCollider, cc.Sprite)
 */
@ccclass
export default class PrefabGameBouncyBall extends cc.Component {
    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (otherCollider.node.name.indexOf("Spike") >= 0) {
            BouncyControl.getInstance().onGameOver();
        } else if (otherCollider.node.name.indexOf("Goal") >= 0) {
            BouncyControl.getInstance().onWin();
        }
    }
}
