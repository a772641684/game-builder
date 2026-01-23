import { DEFAULT_GAME_CONFIG } from "../config/GameConfig";
import MergeSystem from "../game/fruit/MergeSystem";
import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * [Prefab 结构说明]
 * - UIGameFruit (Root 挂载此脚本)
 *   - Background (Sprite)
 *   - GameLayer (Node)
 *     - SpawnPoint (Node)
 *     - WallContainer (Node)
 *       - BottomWall (Node cc.PhysicsBoxCollider)
 *       - LeftWall (Node cc.PhysicsBoxCollider)
 *       - RightWall (Node cc.PhysicsBoxCollider)
 *     - FruitContainer (Node)
 *     - OverflowSensor (Node cc.PhysicsBoxCollider 挂载 OverflowCheck)
 *   - UI_Overlay (Node)
 *     - BtnBack (Button)
 *     - ScoreLabel (Label)
 */
@ccclass
export default class UIGameFruit extends cc.Component {
    /** 节点路径: UI_Overlay/BtnBack */
    @property(cc.Node)
    btnBack: cc.Node = null;

    /** 节点路径: UI_Overlay/ScoreLabel */
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    /** 节点路径: GameLayer/SpawnPoint */
    @property(cc.Node)
    spawnPoint: cc.Node = null;

    /** 节点路径: GameLayer/FruitContainer */
    @property(cc.Node)
    fruitContainer: cc.Node = null;

    private _currentScore: number = 0;
    private _nextLevel: number = 0;

    protected onLoad() {
        Logger.getInstance().info("FruitGame", "硕果累累界面加载完成");
        this.btnBack.on("click", this.onBtnBackClick, this);

        // 初始化物理引擎
        const physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = true;
        physicsManager.gravity = cc.v2(0, -320 * DEFAULT_GAME_CONFIG.gravityScale);

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);

        this._nextLevel = 0;
    }

    private onTouchStart(event: cc.Event.EventTouch) {
        this.updateSpawnPosition(event);
    }

    private onTouchMove(event: cc.Event.EventTouch) {
        this.updateSpawnPosition(event);
    }

    private onTouchEnd(event: cc.Event.EventTouch) {
        this.spawnFruit(this._nextLevel, this.spawnPoint.position);
        // 随机生成下一个水果等级 (0-2)
        this._nextLevel = Math.floor(Math.random() * 3);
    }

    private updateSpawnPosition(event: cc.Event.EventTouch) {
        const pos = this.node.convertToNodeSpaceAR(event.getLocation());
        this.spawnPoint.x = cc.misc.clampf(pos.x, -250, 250);
    }

    /**
     * 生成水果
     * @param level 等级
     * @param pos 位置
     */
    private spawnFruit(level: number, pos: cc.Vec2) {
        const fruit = new cc.Node(`Fruit_L${level}`);
        fruit.parent = this.fruitContainer;
        fruit.position = cc.v3(pos.x, pos.y, 0);

        // 添加视觉组件 (这里简单使用 cc.Graphics 画圆)
        const graphics = fruit.addComponent(cc.Graphics);
        const radius = 20 + level * 15;
        const color = this._getFruitColor(level);
        graphics.fillColor = color;
        graphics.circle(0, 0, radius);
        graphics.fill();

        // 添加物理组件
        const body = fruit.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Dynamic;

        const collider = fruit.addComponent(cc.PhysicsCircleCollider);
        collider.radius = radius;
        collider.apply();

        // 添加合成逻辑
        const merge = fruit.addComponent(MergeSystem);
        merge.level = level;

        // 监听合成事件
        fruit.on(
            "fruit-merge",
            (data: any) => {
                this._handleMerge(data);
            },
            this
        );
    }

    private _handleMerge(data: any) {
        const { level, pos, nodeA, nodeB } = data;

        // 销毁旧水果
        if (nodeA && nodeA.isValid) nodeA.destroy();
        if (nodeB && nodeB.isValid) nodeB.destroy();

        // 增加得分
        this.updateScore((level + 1) * 10);

        // 生成高一级水果 (最高 10 级)
        if (level < 10) {
            this.spawnFruit(level + 1, pos);
        }

        Logger.getInstance().info("FruitGame", `合成成功: 等级 ${level} -> ${level + 1}`);
    }

    private _getFruitColor(level: number): cc.Color {
        const colors = [
            cc.Color.RED,
            cc.Color.GREEN,
            cc.Color.BLUE,
            cc.Color.YELLOW,
            cc.Color.ORANGE,
            cc.Color.CYAN,
            cc.Color.MAGENTA,
            cc.Color.WHITE,
            cc.Color.GRAY,
            cc.Color.BLACK,
            cc.Color.ORANGE,
        ];
        return colors[level % colors.length];
    }

    public updateScore(points: number) {
        this._currentScore += points;
        this.scoreLabel.string = `得分: ${this._currentScore}`;
    }

    private onBtnBackClick() {
        GameCenter.instance.returnToHome();
        Logger.getInstance().info("FruitGame", "返回主界面");
    }
}
