import { Logger } from "../../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 水果合成系统
 * 挂载在水果预制体上，处理碰撞与合并
 */
@ccclass
export default class MergeSystem extends cc.Component {
    @property({ type: cc.Integer, tooltip: "水果等级" })
    level: number = 0;

    private _isMerging: boolean = false;

    /**
     * 只在两个相同等级的水果且其中一个触发时调用
     */
    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (this._isMerging) return;

        const otherNode = otherCollider.node;
        const otherMerge = otherNode.getComponent(MergeSystem);

        if (otherMerge && otherMerge.level === this.level) {
            // 合并逻辑：相同等级且未在合并中
            this._isMerging = true;
            otherMerge.setMerging(true);

            // 通知 UI 或管理类合并
            Logger.getInstance().info("FruitGame", `等级 ${this.level} 水果合并`);

            // 计算合并点 (两者的中心)
            const pos = this.node.position.add(otherNode.position).mul(0.5);

            // 触发合并事件 (由父节点或全局监听)
            this.node.emit("fruit-merge", {
                level: this.level,
                pos: pos,
                nodeA: this.node,
                nodeB: otherNode,
            });
        }
    }

    public setMerging(val: boolean) {
        this._isMerging = val;
    }
}
