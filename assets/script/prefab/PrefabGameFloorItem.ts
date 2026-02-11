import { FloorPlatformType } from "../logic/FloorControl";

const { ccclass, property } = cc._decorator;

/**
 * 下一百层 - 跳板组件 (已废弃物理碰撞)
 * 碰撞检测已迁移到 FloorControl 手动 AABB 碰撞
 * 此组件保留用于 Prefab 兼容和类型标记
 *
 * [Prefab 结构说明]
 * - FloorRoot (挂载此脚本)
 *   - Visual (cc.Graphics, 由 UIPlayGroundGameFloor 代码绘制)
 */
@ccclass
export default class PrefabGameFloorItem extends cc.Component {
    @property({ tooltip: "跳板类型: 0-普通, 1-尖刺, 2-易碎, 3-传送带" })
    type: number = 0;

    /**
     * 初始化跳板类型
     * @param type 平台类型 (FloorPlatformType 枚举值)
     */
    public initType(type: number): void {
        this.type = type;
    }

    /**
     * 获取平台类型枚举
     */
    public getPlatformType(): FloorPlatformType {
        return this.type as FloorPlatformType;
    }
}
