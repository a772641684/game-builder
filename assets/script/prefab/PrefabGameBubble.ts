const { ccclass, property } = cc._decorator;

/**
 * 泡泡组件
 * [Prefab 结构说明]
 * - PrefabGameBubble (挂载此脚本, cc.RigidBody, cc.PhysicsCircleCollider, cc.Sprite)
 */
@ccclass
export default class PrefabGameBubble extends cc.Component {
    @property(cc.Integer)
    colorType: number = 0;

    /** 碰撞回调（作为子弹时触发） */
    public onCollisionWithTarget: Function = null;
    /** 是否处于发射状态的子弹 */
    private _isBullet: boolean = false;

    /**
     * 初始化泡泡属性
     * @param color 颜色类型 (1-6)
     * @param isBullet 是否作为子弹
     */
    public init(color: number, isBullet: boolean = false) {
        this.colorType = color;
        this._isBullet = isBullet;
        this._updateAppearance();

        const rb = this.node.getComponent(cc.RigidBody);
        if (rb) {
            rb.enabledContactListener = isBullet;
        }
    }

    /**
     * 更新组件颜色表现
     */
    private _updateAppearance() {
        const colors = [
            cc.Color.WHITE, // 0 - 空
            cc.Color.RED, // 1
            cc.Color.GREEN, // 2
            cc.Color.BLUE, // 3
            cc.Color.YELLOW, // 4
            cc.Color.MAGENTA, // 5
            cc.Color.CYAN, // 6
        ];
        this.node.color = colors[this.colorType] || cc.Color.WHITE;
    }

    /**
     * 物理碰撞回调
     */
    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (!this._isBullet) return;

        const otherNode = otherCollider.node;
        // 碰到顶部天花板或者碰到其他泡泡
        if (otherNode.name === "Ceiling" || otherNode.getComponent(PrefabGameBubble)) {
            if (this.onCollisionWithTarget) {
                this.onCollisionWithTarget();
                this.onCollisionWithTarget = null;
            }
        }
    }
}
