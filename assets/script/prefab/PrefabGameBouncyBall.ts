const { ccclass, property } = cc._decorator;

/**
 * 弹弹球物体组件 (旧版物理组件，现已废弃)
 * 碰撞检测已迁移至 UIPlayGroundGameBouncy 的手动 AABB 碰撞系统
 *
 * [Prefab 结构说明]
 * - Ball (挂载此脚本)
 */
@ccclass
export default class PrefabGameBouncyBall extends cc.Component {
    // 此组件已废弃，碰撞逻辑现在由 UIPlayGroundGameBouncy 直接管理
}
