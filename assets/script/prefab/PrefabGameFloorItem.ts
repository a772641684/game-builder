const { ccclass, property } = cc._decorator;

/**
 * 下一百层 - 跳板组件
 * [Prefab 结构说明]
 * - FloorRoot (挂载此脚本, cc.PhysicsBoxCollider)
 *   - Visual (cc.Sprite)
 *   - Spike (cc.PhysicsBoxCollider, cc.Sprite, 可选)
 */
@ccclass
export default class PrefabGameFloorItem extends cc.Component {
    @property({ tooltip: "跳板类型: 0-普通, 1-尖刺, 2-易碎, 3-传送带" })
    type: number = 0;

    @property({ type: cc.Node, tooltip: "节点路径: Spike" })
    spikeNode: cc.Node = null;

    onLoad() {
        this.initType(this.type);
    }

    public initType(type: number) {
        this.type = type;
        if (this.spikeNode) {
            this.spikeNode.active = type === 1;
        }

        // 逻辑属性设置
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (collider) {
            collider.sensor = false;
        }
    }

    /**
     * 当角色踩到板上的反馈
     */
    public onStep() {
        if (this.type === 2) {
            // 易碎板
            cc.tween(this.node)
                .to(0.2, { opacity: 0 })
                .call(() => (this.node.active = false))
                .start();
        }
    }
}
