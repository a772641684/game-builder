import { BouncyControl } from "../logic/BouncyControl";
import { GameCenter } from "../logic/GameCenter";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

/**
 * 弹性球闯关主界面
 * [Prefab 结构说明]
 * - UIPlayGroundGameBouncy (挂载此脚本)
 *   - Settlement (挂载 UISettlement)
 *   - GameArea (cc.Node)
 *     - Ball (挂载 PrefabGameBouncyBall, cc.RigidBody, cc.PhysicsCircleCollider, cc.Sprite)
 *     - MapContainer (cc.Node)
 *       - Ground (cc.PhysicsBoxCollider)
 *       - Spike (cc.PhysicsBoxCollider)
 *       - Goal (cc.PhysicsBoxCollider)
 *   - HUD (cc.Node)
 *     - BtnBack (cc.Button)
 */
@ccclass
export default class UIPlayGroundGameBouncy extends cc.Component {
    @property(cc.Node)
    ball: cc.Node = null;

    @property(UISettlement)
    settlement: UISettlement = null;

    onLoad() {
        cc.director.getPhysicsManager().enabled = true;

        BouncyControl.getInstance().onGameOver = () => {
            if (this.settlement) {
                this.settlement.show(false, 0, () => {
                    GameCenter.instance.enterGame("BOUNCY");
                });
            } else {
                GameCenter.instance.returnToHome();
            }
        };

        BouncyControl.getInstance().onWin = () => {
            if (this.settlement) {
                this.settlement.show(true, 100, () => {
                    GameCenter.instance.enterGame("BOUNCY");
                });
            } else {
                GameCenter.instance.returnToHome();
            }
        };

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onKeyDown(event: cc.Event.EventKeyboard) {
        const rb = this.ball.getComponent(cc.RigidBody);
        if (event.keyCode === cc.macro.KEY.a || event.keyCode === cc.macro.KEY.left) {
            rb.applyForceToCenter(cc.v2(-1000, 0), true);
        } else if (event.keyCode === cc.macro.KEY.d || event.keyCode === cc.macro.KEY.right) {
            rb.applyForceToCenter(cc.v2(1000, 0), true);
        } else if (event.keyCode === cc.macro.KEY.w || event.keyCode === cc.macro.KEY.up) {
            rb.applyForceToCenter(cc.v2(0, 5000), true);
        }
    }

    public onBtnBackClicked() {
        GameCenter.instance.returnToHome();
    }
}
