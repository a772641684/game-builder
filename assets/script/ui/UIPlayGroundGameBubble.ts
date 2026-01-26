import { BubbleControl } from "../logic/BubbleControl";
import { GameCenter } from "../logic/GameCenter";
import { Loader } from "../logic/Loader";
import PrefabGameBubble from "../prefab/PrefabGameBubble";
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

    @property(cc.Prefab)
    bubblePrefab: cc.Prefab = null;

    private _isShooting: boolean = false;
    private _nextColor: number = 0;
    private _bubbleNodes: (cc.Node | null)[][] = [];
    private _currentBullet: cc.Node = null;

    /**
     * 生命周期初始化
     */
    onLoad() {
        const manager = cc.director.getPhysicsManager();
        manager.enabled = true;

        BubbleControl.getInstance().onScoreChanged = (score: number) => {
            if (this.scoreLabel) {
                this.scoreLabel.string = score.toString();
            }
        };

        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);

        BubbleControl.instance.startGame();
        this._initGridNodes();
        this._prepareNextBubble();

        // 启用碰撞监听
        cc.director.getCollisionManager().enabled = true;
    }

    /**
     * 生命周期销毁
     */
    onDestroy() {
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    /**
     * 初始化网格节点
     */
    private _initGridNodes() {
        const config = BubbleControl.instance.config;
        this._bubbleNodes = Array.from({ length: config.rows }, () => new Array(config.cols).fill(null));

        const matrix = BubbleControl.instance.getMatrix();
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    this._spawnBubbleAt(r, c, matrix[r][c]);
                }
            }
        }
    }

    /**
     * 准备下一个待发射的气泡
     */
    private _prepareNextBubble() {
        this._isShooting = false;
        this._nextColor = Math.floor(Math.random() * 6) + 1; // 1-6

        if (this.bubblePrefab) {
            const node = Loader.instance.instantiate(this.bubblePrefab);
            node.parent = this.node;
            node.position = this.shooter.position;
            const ctrl = node.getComponent(PrefabGameBubble);
            if (ctrl) {
                ctrl.init(this._nextColor, true);
                // 设置子弹击中逻辑
                ctrl.onCollisionWithTarget = () => this._onBulletHit();
            }
            this._currentBullet = node;
        }
    }

    /**
     * 子弹击中目标后的处理逻辑
     */
    private _onBulletHit() {
        if (!this._currentBullet) return;

        const rb = this._currentBullet.getComponent(cc.RigidBody);
        rb.linearVelocity = cc.Vec2.ZERO;

        const config = BubbleControl.instance.config;
        const worldPos = this.bubbleContainer.convertToNodeSpaceAR(
            this._currentBullet.parent.convertToWorldSpaceAR(this._currentBullet.position)
        );
        const grid = BubbleControl.instance.worldToGrid(worldPos);

        const r = grid.r;
        const c = grid.c;

        if (r >= 0 && r < config.rows && c >= 0 && c < config.cols) {
            const ctrl = this._currentBullet.getComponent(PrefabGameBubble);
            const color = ctrl.colorType;

            this._currentBullet.destroy();
            this._currentBullet = null;

            if (r >= config.rows - 1) {
                // [US3] 到达底部，游戏结束 (失败)
                this.settlement.show(false, BubbleControl.instance.getScore(), () => {
                    this.onRestart();
                });
                return;
            }

            BubbleControl.instance.setMatrixAt(r, c, color);
            this._spawnBubbleAt(r, c, color);

            // 检查消除
            const matches = BubbleControl.instance.findMatches(r, c);
            if (matches.length >= config.popMinCount) {
                BubbleControl.instance.popBubbles(matches);
                this._handlePopping(matches);
            } else {
                this._prepareNextBubble();
            }
        } else {
            // 越界处理
            this._currentBullet.destroy();
            this._currentBullet = null;
            this._prepareNextBubble();
        }
    }

    /**
     * 处理消除及悬空掉落
     * @param matches 匹配的坐标列表
     */
    private _handlePopping(matches: { r: number; c: number }[]) {
        matches.forEach((m) => {
            const node = this._bubbleNodes[m.r][m.c];
            if (node) {
                node.destroy();
                this._bubbleNodes[m.r][m.c] = null;
            }
        });

        // 检查悬空
        const islands = BubbleControl.instance.checkIslands();
        islands.forEach((m) => {
            const node = this._bubbleNodes[m.r][m.c];
            if (node) {
                // 播放掉落动画 (宪法 VII)
                cc.tween(node)
                    .to(0.5, { y: node.y - 1000, opacity: 0 })
                    .call(() => node.destroy())
                    .start();
                this._bubbleNodes[m.r][m.c] = null;
            }
        });

        // [US3] 结束检查 - 胜利
        if (BubbleControl.instance.getMatrix().every((row) => row.every((cell) => cell === 0))) {
            this.settlement.show(true, BubbleControl.instance.getScore(), () => {
                this.onRestart();
            });
        } else {
            this._prepareNextBubble();
        }
    }

    /**
     * 重新开始游戏
     */
    public onRestart() {
        BubbleControl.instance.startGame();
        this.bubbleContainer.removeAllChildren();
        this._initGridNodes();
        this._prepareNextBubble();
        this.settlement.node.active = false;
    }

    /**
     * 在网格指定位置生成泡泡
     * @param r 行
     * @param c 列
     * @param color 颜色
     */
    private _spawnBubbleAt(r: number, c: number, color: number) {
        if (!this.bubblePrefab) return;

        const node = Loader.instance.instantiate(this.bubblePrefab);
        node.parent = this.bubbleContainer;
        node.position = BubbleControl.instance.gridToWorld(r, c);

        const ctrl = node.getComponent(PrefabGameBubble);
        if (ctrl) {
            ctrl.init(color, false);
        }
        this._bubbleNodes[r][c] = node;
    }

    /**
     * 触摸移动事件回调
     */
    private onTouchMove(event: cc.Event.EventTouch) {
        if (this._isShooting) return;

        const touchPos = event.getLocation();
        const localPos = this.node.convertToNodeSpaceAR(touchPos);
        const dir = localPos.sub(this.shooter.position);

        // 计算旋转角度 (0度朝右, Cocos 角度是顺时针)
        let angle = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
        this.shooter.angle = angle - 90; // Cocos 控制 0 度朝上需要 -90
    }

    /**
     * 触摸结束事件回调
     */
    private onTouchEnd(event: cc.Event.EventTouch) {
        if (this._isShooting || !this._currentBullet) return;

        this._isShooting = true;
        const touchPos = event.getLocation();
        const localPos = this.node.convertToNodeSpaceAR(touchPos);
        const dir = localPos.sub(this.shooter.position).normalize();

        const speed = 1200;
        const rb = this._currentBullet.getComponent(cc.RigidBody);
        if (rb) {
            rb.linearVelocity = cc.v2(dir.x * speed, dir.y * speed);
        }
    }

    /**
     * 点击返回按钮
     */
    public onBtnBackClicked() {
        GameCenter.instance.returnToHome();
    }
}
