const { ccclass, property } = cc._decorator;
import { UnscrewControl } from "../logic/UnscrewControl";

/**
 * 金属板组件脚本
 * [Prefab 结构说明]:
 * 根节点 (PrefabGamePlate): 挂载此脚本，包含 cc.RigidBody (Static) 和 cc.PhysicsPolygonCollider。
 * └── Content: 渲染金属板形状的节点。
 */
@ccclass
export default class PrefabGamePlate extends cc.Component {
    /** 金属板唯一 ID */
    public plateId: string = "";

    /** 关联的物理孔位数量 (由多少个螺丝固定) */
    private holeCount: number = 0;

    /**
     * 初始化金属板状态
     * @param id 唯一 ID
     * @param initialHoles 初始固定孔位数
     */
    public init(id: string, initialHoles: number): void {
        this.plateId = id;
        this.holeCount = initialHoles;
        // 初始确保刚体类型
        const rb = this.getComponent(cc.RigidBody);
        if (rb) {
            rb.type = cc.RigidBodyType.Dynamic; // 保持动态，由 WeldJoint 固定
        }
    }

    /**
     * 响应螺丝移除
     * FR-004: 当所有孔位螺丝移除后，金属板应自然掉落
     */
    public onScrewRemoved(): void {
        this.holeCount--;
        if (this.holeCount <= 0) {
            this.holeCount = 0;
            // 板块已自由，物理引擎会自动处理掉落 (因为类型是 Dynamic)
        }
    }

    /**
     * 响应螺丝恢复 (撤销操作)
     */
    public onScrewRestored(): void {
        this.holeCount++;
        // 如果之前已经掉落了一部分，恢复约束后会停止继续加速掉落
    }

    /**
     * 每一帧检查是否超出屏幕 (T014)
     */
    protected update(dt: number): void {
        if (this.node.y < -cc.winSize.height / 2 - 200) {
            UnscrewControl.getInstance().onPlateDestroyed(); // 报告销毁以进行胜利检测
            this.node.destroy();
        }
    }
}
