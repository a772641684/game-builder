import { DoodleControl } from "../logic/DoodleControl";

const { ccclass, property } = cc._decorator;

/**
 * 涂鸦跳跃角色组件
 * [Prefab 结构说明]
 * - Player (挂载此脚本, cc.RigidBody, cc.PhysicsCircleCollider, cc.Sprite)
 */
@ccclass
export default class PrefabGameDoodlePlayer extends cc.Component {
    private _rb: cc.RigidBody = null;

    onLoad() {
        this._rb = this.getComponent(cc.RigidBody);
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        // 只有向下落时碰撞才弹起
        if (this._rb.linearVelocity.y < 0) {
            this._rb.linearVelocity = cc.v2(0, DoodleControl.getInstance().jumpForce);
            DoodleControl.getInstance().addScore(10);
        }
    }

    update(dt: number) {
        // 屏幕穿透
        if (this.node.x > 320) this.node.x = -320;
        else if (this.node.x < -320) this.node.x = 320;
    }
}
