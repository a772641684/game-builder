import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 抓娃娃机 - 爪子组件
 * [Prefab 结构说明]
 * - ClawRoot (挂载此脚本, cc.PhysicsBoxCollider)
 *   - Rope (cc.Graphics)
 *   - Arm_L (cc.PhysicsBoxCollider, cc.RevoluteJoint)
 *   - Arm_R (cc.PhysicsBoxCollider, cc.RevoluteJoint)
 *   - Head (cc.Sprite)
 */
@ccclass
export default class PrefabGameClaw extends cc.Component {
    /** 绳索节点 */
    @property({ type: cc.Node, tooltip: "节点路径: Rope" })
    ropeNode: cc.Node = null;

    /** 左爪 */
    @property({ type: cc.Node, tooltip: "节点路径: Arm_L" })
    armL: cc.Node = null;

    /** 右爪 */
    @property({ type: cc.Node, tooltip: "节点路径: Arm_R" })
    armR: cc.Node = null;

    private _isGrabbing: boolean = false;
    private _originalRopeHeight: number = 0;

    onLoad() {
        // 初始化物理关节关联
        this._setupJoints();
        Logger.getInstance().info("Claw", "爪子物理组件初始化");
    }

    private _setupJoints() {
        const rootBody = this.getComponent(cc.RigidBody);

        const hingeL = this.armL.getComponent(cc.RevoluteJoint);
        if (hingeL) hingeL.connectedBody = rootBody;

        const hingeR = this.armR.getComponent(cc.RevoluteJoint);
        if (hingeR) hingeR.connectedBody = rootBody;
    }

    /**
     * 爪子开合控制
     * @param isOpen 是否开启
     */
    public setClawOpen(isOpen: boolean) {
        const targetAngle = isOpen ? -30 : 10; // 示意角度

        cc.tween(this.armL).to(0.3, { angle: targetAngle }).start();

        cc.tween(this.armR).to(0.3, { angle: -targetAngle }).start();
    }

    /**
     * 下升/上升动画
     * @param targetY 目标 Y 轴位置
     * @param onComplete 完成回调
     */
    public moveY(targetY: number, onComplete?: Function) {
        cc.tween(this.node)
            .to(1.0, { y: targetY }, { easing: "sineOut" })
            .call(() => {
                onComplete && onComplete();
            })
            .start();
    }
}
