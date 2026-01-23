import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";
import PrefabGameClaw from "../prefab/PrefabGameClaw";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

/**
 * 抓娃娃主界面控制器
 * [Prefab 结构说明]
 * - UIPlayGroundGameClaw (挂载此脚本)
 *   - Settlement (挂载 UISettlement)
 *   - GameArea (cc.Node)
 *     - Wall_L (cc.PhysicsBoxCollider)
 *     - Wall_R (cc.PhysicsBoxCollider)
 *     - Floor (cc.PhysicsBoxCollider)
 *     - Claw (挂载 PrefabGameClaw, cc.PhysicsBoxCollider, cc.RigidBody)
 *       - Rope (cc.Graphics)
 *       - Arm_L (cc.PhysicsBoxCollider, cc.HingeJoint, cc.RigidBody)
 *       - Arm_R (cc.PhysicsBoxCollider, cc.HingeJoint, cc.RigidBody)
 *       - Head (cc.Sprite)
 *     - DollLayer (cc.Node)
 *   - HUD (cc.Node)
 *     - BtnGrab (cc.Button)
 *     - ScoreLabel (cc.Label [文本: "0"])
 *     - BtnBack (cc.Button)
 */
@ccclass
export default class UIPlayGroundGameClaw extends cc.Component {
    @property({ type: PrefabGameClaw, tooltip: "节点路径: GameArea/Claw" })
    claw: PrefabGameClaw = null;

    @property({ type: UISettlement, tooltip: "节点路径: Settlement" })
    settlement: UISettlement = null;

    @property({ type: cc.Label, tooltip: "节点路径: HUD/ScoreLabel" })
    scoreLabel: cc.Label = null;

    @property({ type: cc.Node, tooltip: "节点路径: GameArea/DollLayer" })
    dollLayer: cc.Node = null;

    private _score: number = 0;
    private _isClawMoving: boolean = false;
    private _moveDir: number = 0;

    onLoad() {
        // 开启物理
        cc.director.getPhysicsManager().enabled = true;
        Logger.getInstance().info("Claw", "进入抓娃娃游戏面板");

        // 生成装饰性娃娃 (实际项目中应用预制体)
        this._spawnDolls();

        // 绑定按键
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
    }

    private _spawnDolls() {
        for (let i = 0; i < 5; i++) {
            let doll = new cc.Node("Doll_" + i);
            doll.parent = this.dollLayer;
            doll.position = cc.v3(-200 + i * 100, -500, 0);

            // 添加显示
            let sprite = doll.addComponent(cc.Sprite);
            // 这里应该有图片资源，如果没有则跳过或使用默认

            // 添加物理
            let rb = doll.addComponent(cc.RigidBody);
            rb.type = cc.RigidBodyType.Dynamic;
            let collider = doll.addComponent(cc.PhysicsBoxCollider);
            collider.size = cc.size(60, 60);
            collider.apply();
        }
    }

    private _onKeyDown(event: cc.Event.EventKeyboard) {
        if (event.keyCode === cc.macro.KEY.a || event.keyCode === cc.macro.KEY.left) {
            this._moveDir = -1;
        } else if (event.keyCode === cc.macro.KEY.d || event.keyCode === cc.macro.KEY.right) {
            this._moveDir = 1;
        }
    }

    private _onKeyUp(event: cc.Event.EventKeyboard) {
        if (
            event.keyCode === cc.macro.KEY.a ||
            event.keyCode === cc.macro.KEY.left ||
            event.keyCode === cc.macro.KEY.d ||
            event.keyCode === cc.macro.KEY.right
        ) {
            this._moveDir = 0;
        }
    }

    update(dt: number) {
        if (this._isClawMoving) return;
        if (this._moveDir !== 0) {
            this.claw.node.x += this._moveDir * 200 * dt;
            // 范围限制
            if (this.claw.node.x < -300) this.claw.node.x = -300;
            if (this.claw.node.x > 300) this.claw.node.x = 300;
        }
    }

    /**
     * 点击抓取
     */
    public onBtnGrabClicked() {
        if (this._isClawMoving) return;
        this._isClawMoving = true;

        Logger.getInstance().info("Claw", "开始执行下抓动作");

        // 1. 下行
        this.claw.moveY(-400, () => {
            // 2. 抓取
            this.claw.setClawOpen(false);

            // 3. 等待半秒后上行
            this.scheduleOnce(() => {
                this.claw.moveY(0, () => {
                    this._isClawMoving = false;
                    this.claw.setClawOpen(true);
                    Logger.getInstance().info("Claw", "动作序列完成");

                    // 演示结算：抓取结束弹窗
                    if (this.settlement) {
                        this.settlement.show(true, this._score, () => {
                            Logger.getInstance().info("Claw", "准备新一轮抓取");
                        });
                    }
                });
            }, 0.5);
        });
    }

    public onBtnBackClicked() {
        GameCenter.instance.returnToHome();
    }
}
