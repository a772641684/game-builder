const { ccclass, property } = cc._decorator;
import { SheepMatchControl } from "../logic/SheepMatchControl";

/**
 * 羊了个羊三消游戏主界面
 * [Prefab 结构说明]:
 * - UIPlayGroundGameSheepMatch (Root): 容器节点。
 *   - SlotContainer: 处理收集槽方块渲染。
 *   - GameArea: 放置方块堆叠的区域。
 */
@ccclass
export default class UIPlayGroundGameSheepMatch extends cc.Component {
    /** 槽位容器 */
    @property({ type: cc.Node, displayName: "槽位容器" })
    public slotContainer: cc.Node = null;

    /** 游戏区域 */
    @property({ type: cc.Node, displayName: "游戏区域" })
    public gameArea: cc.Node = null;

    /** 方块预制体 (T006) */
    @property({ type: cc.Prefab, displayName: "方块预制体" })
    public tilePrefab: cc.Prefab = null;

    protected start(): void {
        // 将 UI 绑定到逻辑控制器
        SheepMatchControl.getInstance().setUI(this);
    }

    /**
     * 获取槽位中指定索引的世界坐标
     * @param index 槽位索引 (0-6)
     */
    public getSlotWorldPos(index: number): cc.Vec2 {
        if (!this.slotContainer) return cc.v2(0, -600);

        // 假设槽位子节点按顺序排列 (Slot0, Slot1...)
        const child = this.slotContainer.children[index];
        if (child) {
            return child.parent.convertToWorldSpaceAR(child.getPosition());
        }
        return cc.v2(0, -600);
    }

    /**
     * 播放移动到槽位的动画 (T011)
     */
    public playMoveToSlot(tileNode: cc.Node, index: number, callback: Function): void {
        const targetWorldPos = this.getSlotWorldPos(index);
        const targetLocalPos = this.node.convertToNodeSpaceAR(targetWorldPos);

        // 切换父节点到主 UI，避免坐标因原父节点（GameArea）缩放受影响
        tileNode.setParent(this.node);

        cc.tween(tileNode)
            .to(0.3, { position: targetLocalPos, scale: 0.8 }, { easing: "sineOut" })
            .call(() => {
                callback && callback();
            })
            .start();
    }

    /**
     * 更新存量方块在槽位中的位置 (T012)
     */
    public repositionSlotItem(tileNode: cc.Node, index: number): void {
        const targetWorldPos = this.getSlotWorldPos(index);
        const targetLocalPos = this.node.convertToNodeSpaceAR(targetWorldPos);

        cc.tween(tileNode).to(0.2, { position: targetLocalPos }, { easing: "sineIn" }).start();
    }

    /**
     * 播放消除特效 (T013)
     */
    public playEliminationEffect(tileNode: cc.Node): void {
        cc.tween(tileNode)
            .to(0.15, { scale: 1.2, opacity: 0 })
            .call(() => {
                tileNode.destroy();
            })
            .start();
    }

    /**
     * 播放撤销移动动画 (T025)
     */
    public playUndoMove(tileNode: cc.Node, originalPos: cc.Vec2, callback: Function): void {
        cc.tween(tileNode)
            .to(0.3, { position: originalPos, scale: 1.0 }, { easing: "sineIn" })
            .call(() => {
                callback && callback();
            })
            .start();
    }

    protected onDestroy(): void {
        // 遵循宪法原则 X，释放单例
        SheepMatchControl.destroyInstance();
    }
}
