const { ccclass, property } = cc._decorator;
import { UnscrewControl } from "../logic/UnscrewControl";

/**
 * 拆螺丝益智游戏主 UI 面板
 * [Prefab 结构说明]:
 * 根节点 (UIPlayGroundGameUnscrew): 容器节点。
 * ├── TopUI: 顶部槽位容器。
 * └── GameArea: 物理引擎作用的关卡物品容器。
 */
@ccclass
export default class UIPlayGroundGameUnscrew extends cc.Component {
    @property(cc.Node)
    protected slotContainer: cc.Node = null;

    /**
     * 获取指定索引槽位的世界坐标
     * 用于螺丝移动动画的目标点
     * @param index 槽位索引
     */
    public getSlotWorldPos(index: number): cc.Vec2 {
        if (!this.slotContainer || index < 0 || index >= this.slotContainer.childrenCount) {
            // 兜底返回屏幕顶部区域
            return cc.v2(0, 400);
        }
        const slotNode = this.slotContainer.children[index];
        // 转换为世界坐标，再由 UnscrewControl 转换回其父节点坐标（如果是同一个的话）
        return slotNode.convertToWorldSpaceAR(cc.Vec2.ZERO);
    }

    /**
     * 组件启动回调
     */
    protected start(): void {
        // 初始化游戏逻辑并注册 UI
        UnscrewControl.getInstance().setUI(this);
    }

    /**
     * 遵循宪法原则 X: 显式销毁单例以释放资源
     */
    protected onDestroy(): void {
        UnscrewControl.destroyInstance();
    }
}
