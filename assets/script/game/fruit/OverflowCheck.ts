import { Logger } from "../../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 溢出检查
 * 用于判定游戏结束
 */
@ccclass
export default class OverflowCheck extends cc.Component {
    private _timers: Map<cc.Node, number> = new Map();
    private _limitTime: number = 2.0;

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        const otherNode = otherCollider.node;
        if (otherNode.name.includes("Fruit")) {
            this._timers.set(otherNode, 0);
        }
    }

    onEndContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        this._timers.delete(otherCollider.node);
    }

    update(dt: number) {
        this._timers.forEach((time, node) => {
            const newTime = time + dt;
            this._timers.set(node, newTime);
            if (newTime >= this._limitTime) {
                Logger.getInstance().warn("FruitGame", "游戏结束: 溢出！");
                this.node.emit("game-over");
                this._timers.clear();
            }
        });
    }
}
