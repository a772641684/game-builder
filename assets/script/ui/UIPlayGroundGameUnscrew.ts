const { ccclass, property } = cc._decorator;
import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";
import { UnscrewControl } from "../logic/UnscrewControl";
import UISettlement from "./UISettlement";

/**
 * 拆螺丝益智游戏主 UI 面板
 * [Prefab 结构说明]:
 * - UIPlayGroundGameUnscrew
 *   - TopUI
 *   - GameArea
 *   - Settlement (挂载 UISettlement, active=false)
 */
@ccclass
export default class UIPlayGroundGameUnscrew extends cc.Component {
    /**
     * @description 顶部槽位容器
     * 节点路径: TopUI
     */
    @property(cc.Node)
    protected slotContainer: cc.Node = null;

    /**
     * @description 关卡物品容器
     * 节点路径: GameArea
     */
    @property(cc.Node)
    protected gameArea: cc.Node = null;

    /**
     * @description 结算面板
     * 节点路径: Settlement
     */
    @property(UISettlement)
    settlement: UISettlement = null;

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
     * 显示游戏结算界面
     * 由 UnscrewControl 在胜利/失败时调用
     * @param isWin 是否胜利
     * @param score 分数（默认按剩余操作步数计算）
     */
    public showGameOver(isWin: boolean, score?: number): void {
        const finalScore = score != null ? score : 0;
        Logger.getInstance().info("Unscrew", (isWin ? "胜利" : "失败") + " 得分: " + finalScore);

        if (this.settlement) {
            this.settlement.show(isWin, finalScore, () => {
                GameCenter.instance.returnToHome();
            });
        } else {
            this.scheduleOnce(() => {
                GameCenter.instance.returnToHome();
            }, 2);
        }
    }

    /**
     * 返回主页按钮
     */
    public onBtnBackClicked(): void {
        GameCenter.instance.returnToHome();
    }

    /**
     * 遵循宪法原则 X: 显式销毁单例以释放资源
     */
    protected onDestroy(): void {
        UnscrewControl.destroyInstance();
    }
}
