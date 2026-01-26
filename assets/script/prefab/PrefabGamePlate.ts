const { ccclass, property } = cc._decorator;

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
    }

    /**
     * 更新板的重力状态
     * 当孔位为 0 时，将 RigidBody 类型切换为 Dynamic
     */
    public updatePhysicsState(): void {
        // TODO: 实现 FR-004
    }
}
