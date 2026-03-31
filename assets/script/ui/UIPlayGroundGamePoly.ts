import { GameCenter } from "../logic/GameCenter";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

/**
 * 桥梁构造主界面
 * [Prefab 结构说明]
 * - UIPlayGroundGamePoly (挂载此脚本)
 *   - Settlement (挂载 UISettlement)
 *   - GameArea (cc.Node)
 *     - Anchors (cc.Node)
 *       - Anchor1 (cc.Node)
 *       - Anchor2 (cc.Node)
 *     - Bridges (cc.Node)
 *     - Car (cc.RigidBody, cc.PhysicsBoxCollider, cc.Sprite)
 *   - HUD (cc.Node)
 *     - BtnStart (cc.Button)
 *     - BtnBack (cc.Button)
 */
@ccclass
export default class UIPlayGroundGamePoly extends cc.Component {
    @property(cc.Node)
    anchorsContainer: cc.Node = null;

    @property(UISettlement)
    settlement: UISettlement = null;

    private _isSimulating: boolean = false;
    private _graphics: cc.Graphics = null;

    onLoad() {
        // 点线交织逻辑：拖动点使线不相交
        this._graphics = this.node.addComponent(cc.Graphics);
        this._graphics.lineWidth = 4;
        this._graphics.strokeColor = cc.Color.WHITE;

        this._initEvents();
    }

    private _initEvents() {
        this.anchorsContainer.children.forEach((anchor) => {
            anchor.on(cc.Node.EventType.TOUCH_MOVE, (event: cc.Event.EventTouch) => {
                const pos = anchor.parent.convertToNodeSpaceAR(event.getLocation());
                anchor.position = cc.v3(pos.x, pos.y, 0);
                this._drawLines();
                this._checkWin();
            });
        });
        this._drawLines();
    }

    private _drawLines() {
        this._graphics.clear();
        const children = this.anchorsContainer.children;
        for (let i = 0; i < children.length; i++) {
            let start = children[i].position;
            let end = children[(i + 1) % children.length].position;
            this._graphics.moveTo(start.x, start.y);
            this._graphics.lineTo(end.x, end.y);
            this._graphics.stroke();
        }
    }

    private _checkWin() {
        // 这里应用 cc.Intersection.lineLine 检测任意两线是否相交
        // 简单示意：如果全都不相交，提示通关
        if (this.settlement) {
            this.settlement.show(true, 100, () => {
                GameCenter.instance.returnToHome();
            });
        }
    }

    public onBtnBackClicked() {
        GameCenter.instance.returnToHome();
    }
}
