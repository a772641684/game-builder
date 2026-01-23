import { BubbleControl } from "../logic/BubbleControl";
import { GameCenter } from "../logic/GameCenter";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

/**
 * 泡泡龙消消乐主界面
 * [Prefab 结构说明]
 * - UIPlayGroundGameBubble (挂载此脚本)
 *   - Settlement (挂载 UISettlement)
 *   - GameArea (cc.Node)
 *     - Cannon (cc.Node)
 *       - Shooter (cc.Sprite)
 *     - BubbleContainer (cc.Node)
 *     - Walls (cc.Node)
 *       - Wall_L (cc.PhysicsBoxCollider)
 *       - Wall_R (cc.PhysicsBoxCollider)
 *       - Ceiling (cc.PhysicsBoxCollider)
 *   - HUD (cc.Node)
 *     - ScoreLabel (cc.Label [文本: "0"])
 *     - BtnBack (cc.Button)
 */
@ccclass
export default class UIPlayGroundGameBubble extends cc.Component {
    @property(cc.Node)
    shooter: cc.Node = null;

    @property(cc.Node)
    bubbleContainer: cc.Node = null;

    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property(UISettlement)
    settlement: UISettlement = null;

    private _isShooting: boolean = false;
    private _nextColor: number = 0;

    onLoad() {
        cc.director.getPhysicsManager().enabled = true;

        BubbleControl.getInstance().onScoreChanged = (score: number) => {
            this.scoreLabel.string = score.toString();
        };

        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);

        this._prepareNextBubble();
    }

    private _prepareNextBubble() {
        this._nextColor = Math.floor(Math.random() * 5);
        this.shooter.color = this._getColorByNum(this._nextColor);
    }

    private _getColorByNum(num: number): cc.Color {
        const colors = [cc.Color.RED, cc.Color.GREEN, cc.Color.BLUE, cc.Color.YELLOW, cc.Color.MAGENTA];
        return colors[num] || cc.Color.WHITE;
    }

    private onTouchMove(event: cc.Event.EventTouch) {
        const pos = event.getLocation();
        const localPos = this.shooter.parent.convertToNodeSpaceAR(pos);
        const angle = (Math.atan2(localPos.y, localPos.x) * 180) / Math.PI;
        this.shooter.angle = angle - 90;
    }

    private onTouchEnd(event: cc.Event.EventTouch) {
        if (this._isShooting) return;
        this._isShooting = true;

        let bubble = new cc.Node("Bullet");
        bubble.parent = this.bubbleContainer;
        bubble.position = this.shooter.parent.position;
        bubble.color = this._getColorByNum(this._nextColor);

        let sprite = bubble.addComponent(cc.Sprite);
        bubble.width = bubble.height = 50;

        let rb = bubble.addComponent(cc.RigidBody);
        rb.bullet = true;

        let collider = bubble.addComponent(cc.PhysicsCircleCollider);
        collider.radius = 25;
        collider.apply();

        // 计算方向
        let rad = ((this.shooter.angle + 90) * Math.PI) / 180;
        let dir = cc.v2(Math.cos(rad), Math.sin(rad));
        rb.linearVelocity = dir.mul(800);

        this.scheduleOnce(() => {
            this._isShooting = false;
            this._prepareNextBubble();
        }, 1.0);
    }

    public onBtnBackClicked() {
        GameCenter.instance.returnToHome();
    }
}
