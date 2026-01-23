import { DifficultyManager } from "../logic/DifficultyManager";
import { GameCenter } from "../logic/GameCenter";
import { LevelGenerator } from "../logic/LevelGenerator";
import { Logger } from "../logic/Logger";
import PrefabGameFloorItem from "../prefab/PrefabGameFloorItem";
import UIGameHUD from "./UIGameHUD";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

/**
 * 下一百层主界面
 * [Prefab 结构说明]
 * - UIPlayGroundGameFloor (挂载此脚本)
 *   - Settlement (挂载 UISettlement)
 *   - GameArea (cc.Node)
 *     - Player (cc.RigidBody, cc.PhysicsBoxCollider, cc.Sprite)
 *     - FloorContainer (cc.Node)
 *     - Ceiling (cc.PhysicsBoxCollider, cc.Sprite)
 *   - HUD (cc.Node)
 *     - ScoreLabel (cc.Label [文本: "0"])
 *     - LevelHUD (添加挂载 UIGameHUD)
 *     - BtnBack (cc.Button)
 */
@ccclass
export default class UIPlayGroundGameFloor extends cc.Component {
    @property({ type: cc.Node, tooltip: "节点路径: GameArea/Player" })
    player: cc.Node = null;

    @property({ type: cc.Node, tooltip: "节点路径: GameArea/FloorContainer" })
    floorContainer: cc.Node = null;

    @property({ type: cc.Label, tooltip: "节点路径: HUD/ScoreLabel" })
    scoreLabel: cc.Label = null;

    @property({ type: UISettlement, tooltip: "节点路径: Settlement" })
    settlement: UISettlement = null;

    @property(UIGameHUD)
    levelHUD: UIGameHUD = null;

    private _isGameOver: boolean = false;
    private _score: number = 0;
    private _spawnTimer: number = 0;
    private _moveSpeed: number = 200;
    private _baseSpawnInterval: number = 1.2;

    onLoad() {
        cc.director.getPhysicsManager().enabled = true;
        Logger.getInstance().info("Floor", "进入下一百层游戏 (难度系统已注入)");

        // 绑定输入
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);

        // 初始化难度
        this._updateDifficulty();

        // 初始生成一些地面
        this._spawnFloor(0, -200);
        this._spawnFloor(0, -400);
    }

    private _updateDifficulty() {
        // 虚拟等级: 每 10 分升一级
        const virtualLevel = 1 + Math.floor(this._score / 10);
        const params = DifficultyManager.instance.getParams("FLOOR", virtualLevel);

        this._moveSpeed = 200 * params.speed;
        this._baseSpawnInterval = 1.2 / params.density; // 密度越高，生成间隔越短

        if (this.levelHUD) {
            this.levelHUD.refresh();
        }
    }

    private onKeyDown(event: cc.Event.EventKeyboard) {
        if (this._isGameOver) return;

        const rb = this.player.getComponent(cc.RigidBody);
        if (!rb) return;

        if (event.keyCode === cc.macro.KEY.a || event.keyCode === cc.macro.KEY.left) {
            rb.linearVelocity = cc.v2(-400, rb.linearVelocity.y);
        } else if (event.keyCode === cc.macro.KEY.d || event.keyCode === cc.macro.KEY.right) {
            rb.linearVelocity = cc.v2(400, rb.linearVelocity.y);
        }
    }

    update(dt: number) {
        if (this._isGameOver) return;

        // 生成逻辑
        this._spawnTimer += dt;
        if (this._spawnTimer > this._baseSpawnInterval) {
            this._spawnTimer = 0;
            const random = LevelGenerator.instance.getRandomSource("FLOOR", this._score);
            this._spawnFloor(random.nextInt(0, 3), -650);

            this._score++;
            this.scoreLabel.string = this._score.toString();

            // 每过一定分数同步难度
            if (this._score % 10 === 0) {
                this._updateDifficulty();
            }
        }

        // 平台向上移动 (修改 Kinematic 刚体速度)
        this.floorContainer.children.forEach((child) => {
            child.y += this._moveSpeed * dt;
            if (child.y > 650) {
                child.destroy();
            }
        });

        // 检测掉落或顶死
        if (this.player.y < -680 || this.player.y > 580) {
            this.gameOver();
        }
    }

    private _spawnFloor(type: number, y: number) {
        let node = new cc.Node("Floor");
        node.parent = this.floorContainer;

        // 使用种子随机化位置 (T012)
        const random = LevelGenerator.instance.getRandomSource("FLOOR_POS", this._score + y);
        node.position = cc.v3(random.nextInt(-200, 200), y, 0);

        // 挂载显示组件
        let sprite = node.addComponent(cc.Sprite);
        node.color = type === 1 ? cc.Color.RED : type === 2 ? cc.Color.YELLOW : cc.Color.WHITE;

        // 核心物理
        let rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Kinematic;

        let collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(200, 30);
        collider.apply();

        // 挂载脚本
        let script = node.addComponent(PrefabGameFloorItem);
        script.type = type;
    }

    private gameOver() {
        if (this._isGameOver) return;
        this._isGameOver = true;
        Logger.getInstance().info("Floor", "游戏结束");

        if (this.settlement) {
            this.settlement.show(false, this._score, () => {
                GameCenter.instance.enterGame("FLOOR");
            });
        } else {
            GameCenter.instance.returnToHome();
        }
    }

    public onBtnBackClicked() {
        this.gameOver();
    }
}
