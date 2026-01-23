import { DoodleControl } from "../logic/DoodleControl";
import { GameCenter } from "../logic/GameCenter";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

/**
 * 涂鸦跳跃主界面
 * [Prefab 结构说明]
 * - UIPlayGroundGameDoodle (挂载此脚本)
 *   - Settlement (挂载 UISettlement)
 *   - GameArea (cc.Node)
 *     - Player (挂载 PrefabGameDoodlePlayer, cc.RigidBody, cc.PhysicsCircleCollider, cc.Sprite)
 *     - PlatformContainer (cc.Node)
 *   - HUD (cc.Node)
 *     - ScoreLabel (cc.Label [文本: "0"])
 *     - BtnBack (cc.Button)
 */
@ccclass
export default class UIPlayGroundGameDoodle extends cc.Component {
    @property({ type: cc.Node, tooltip: "节点路径: GameArea/Player" })
    player: cc.Node = null;

    @property({ type: cc.Node, tooltip: "节点路径: GameArea/PlatformContainer" })
    platformContainer: cc.Node = null;

    @property({ type: cc.Label, tooltip: "节点路径: HUD/ScoreLabel" })
    scoreLabel: cc.Label = null;

    @property({ type: UISettlement, tooltip: "节点路径: Settlement" })
    settlement: UISettlement = null;

    private _isGameOver: boolean = false;
    private _lastSpawnY: number = -400;

    onLoad() {
        cc.director.getPhysicsManager().enabled = true;

        // 绑定陀螺仪或左右键
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);

        DoodleControl.getInstance().onScoreChanged = (score: number) => {
            this.scoreLabel.string = score.toString();
        };

        // 初始平台
        this._spawnPlatforms();
    }

    private _spawnPlatforms() {
        while (this._lastSpawnY < this.player.y + 1000) {
            this._lastSpawnY += 150 + Math.random() * 100;
            let plate = new cc.Node("Platform");
            plate.parent = this.platformContainer;
            plate.position = cc.v3(Math.random() * 500 - 250, this._lastSpawnY, 0);

            let sprite = plate.addComponent(cc.Sprite);
            plate.width = 120;
            plate.height = 30;

            let collider = plate.addComponent(cc.PhysicsBoxCollider);
            collider.size = cc.size(120, 30);
            collider.apply();

            // 只有向上跳时穿透，向下落时踩住 (简单实现：通过脚本在 PrefabGameDoodlePlayer 中判断速度)
        }
    }

    private onKeyDown(event: cc.Event.EventKeyboard) {
        if (this._isGameOver) return;
        const rb = this.player.getComponent(cc.RigidBody);
        if (event.keyCode === cc.macro.KEY.a || event.keyCode === cc.macro.KEY.left) {
            rb.linearVelocity = cc.v2(-600, rb.linearVelocity.y);
        } else if (event.keyCode === cc.macro.KEY.d || event.keyCode === cc.macro.KEY.right) {
            rb.linearVelocity = cc.v2(600, rb.linearVelocity.y);
        }
    }

    update(dt: number) {
        if (this._isGameOver) return;

        // 摄像机跟随：当玩家向上移动时，移动 container 向下
        if (this.player.y > 0) {
            let offset = this.player.y;
            this.player.y = 0;
            this.platformContainer.y -= offset;

            // 补全计分 (简单以高度计)
            DoodleControl.getInstance().addScore(Math.floor(offset / 10));
        }

        // 动态生成
        if (this._lastSpawnY + this.platformContainer.y < 800) {
            this._spawnPlatforms();
        }

        // 清理下方平台
        this.platformContainer.children.forEach((child) => {
            if (child.y + this.platformContainer.y < -800) {
                child.destroy();
            }
        });

        if (this.player.y < -700) {
            this.gameOver();
        }
    }

    private gameOver() {
        if (this._isGameOver) return;
        this._isGameOver = true;

        if (this.settlement) {
            this.settlement.show(false, DoodleControl.getInstance().score, () => {
                GameCenter.instance.enterGame("DOODLE");
            });
        } else {
            GameCenter.instance.returnToHome();
        }
    }

    public onBtnBackClicked() {
        this.gameOver();
    }
}
