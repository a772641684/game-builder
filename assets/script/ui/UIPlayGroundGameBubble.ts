import { UI_ENUM } from "../enums/UIEnum";
import { BubbleControl } from "../logic/BubbleControl";
import { GameCenter } from "../logic/GameCenter";
import { Loader } from "../logic/Loader";
import { UILayer, UIManager } from "../logic/UIManager";
import PrefabGameBubble from "../prefab/PrefabGameBubble";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

/**
 * 泡泡龙消消乐主界面
 * [Prefab 结构说明]
 * - UIPlayGroundGameBubble (挂载此脚本)
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

    @property(cc.Prefab)
    bubblePrefab: cc.Prefab = null;

    @property(cc.Graphics)
    predictionLine: cc.Graphics = null;

    @property(cc.Graphics)
    borderGraphics: cc.Graphics = null;

    private _isShooting: boolean = false;
    private _nextColor: number = 0;
    private _bulletColor: number = 0;
    private _bubbleNodes: (cc.Node | null)[][] = [];
    private _currentBullet: cc.Node = null;

    /**
     * 生命周期初始化
     */
    onLoad() {
        const manager = cc.director.getPhysicsManager();
        manager.enabled = true;
        manager.gravity = cc.v2(0, 0);

        if (!this.predictionLine) {
            let node = new cc.Node("PredictionLine");
            node.parent = this.node;
            node.zIndex = -1;
            this.predictionLine = node.addComponent(cc.Graphics);
        }

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
        this._drawGameBorder();

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
     * 绘制游戏区域边框
     */
    private _drawGameBorder() {
        if (!this.borderGraphics) {
            let node = new cc.Node("BorderGraphics");
            node.parent = this.bubbleContainer;
            node.zIndex = -1;
            this.borderGraphics = node.addComponent(cc.Graphics);
        }

        const config = BubbleControl.instance.config;
        const d = config.bubbleSize;
        const width = config.cols * d;
        const height = config.rows * d * 0.866 + d;

        this.borderGraphics.clear();
        this.borderGraphics.strokeColor = cc.Color.WHITE;
        this.borderGraphics.lineWidth = 8;

        // 计算边界: 基于网格水平居中逻辑 (见 BubbleControl.gridToWorld)
        const leftEdge = -width / 2;
        const rightEdge = width / 2 + d / 2;
        const startY = d / 2;

        // 矩形框住整个潜在区域
        this.borderGraphics.rect(leftEdge, startY - height, rightEdge - leftEdge, height);
        this.borderGraphics.stroke();

        // 也可以画出顶部封顶线
        this.borderGraphics.moveTo(leftEdge, startY);
        this.borderGraphics.lineTo(rightEdge, startY);
        this.borderGraphics.stroke();
    }

    /**
     * 准备下一个待发射的气泡
     */
    private _prepareNextBubble() {
        this._isShooting = false;

        // 如果没有下个颜色，先初始化
        if (this._nextColor === 0) {
            this._nextColor = Math.floor(Math.random() * 6) + 1;
        }

        this._bulletColor = this._nextColor;
        this._nextColor = Math.floor(Math.random() * 6) + 1; // 预准备下一个颜色

        if (this.bubblePrefab) {
            const node = Loader.instance.instantiate(this.bubblePrefab);
            node.parent = this.node;
            node.position = this.shooter.position;
            const ctrl = node.getComponent(PrefabGameBubble);
            if (ctrl) {
                ctrl.init(this._bulletColor, true);
                // 设置子弹击中逻辑
                ctrl.onCollisionWithTarget = () => this._onBulletHit();
            }
            this._currentBullet = node;

            // 准星归零并显示预测线
            this.predictionLine.clear();
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
        const bulletPos = cc.v2(this._currentBullet.x, this._currentBullet.y);
        const worldPos = this.bubbleContainer.convertToNodeSpaceAR(
            this._currentBullet.parent.convertToWorldSpaceAR(bulletPos)
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
                UIManager.instance.openUI(UI_ENUM.SETTLEMENT, UILayer.Popup, false, (node) => {
                    const comp = node.getComponent(UISettlement);
                    if (comp) {
                        comp.show(false, BubbleControl.instance.getScore(), () => {
                            this.onRestart();
                        });
                    }
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
                // 消除动效
                cc.tween(node)
                    .to(0.1, { scale: 1.2 })
                    .to(0.1, { scale: 0, opacity: 0 })
                    .call(() => node.destroy())
                    .start();
                this._bubbleNodes[m.r][m.c] = null;
            }
        });

        // 震屏效果
        this.shakeNode(this.bubbleContainer);

        // 检查悬空
        const islands = BubbleControl.instance.checkIslands();
        islands.forEach((m) => {
            const node = this._bubbleNodes[m.r][m.c];
            if (node) {
                // 播放掉落动画 (宪法 VII)
                cc.tween(node)
                    .delay(0.1)
                    .to(0.5, { y: node.y - 1000, opacity: 0 }, { easing: "sineIn" })
                    .call(() => node.destroy())
                    .start();
                this._bubbleNodes[m.r][m.c] = null;
            }
        });

        // [US3] 结束检查 - 胜利
        if (BubbleControl.instance.getMatrix().every((row) => row.every((cell) => cell === 0))) {
            UIManager.instance.openUI(UI_ENUM.SETTLEMENT, UILayer.Popup, false, (node) => {
                const comp = node.getComponent(UISettlement);
                if (comp) {
                    comp.show(true, BubbleControl.instance.getScore(), () => {
                        this.onRestart();
                    });
                }
            });
        } else {
            this._prepareNextBubble();
        }
    }

    /**
     * 节点震动效果
     */
    private shakeNode(node: cc.Node) {
        const startPos = node.position;
        cc.tween(node)
            .by(0.05, { position: cc.v3(5, 5, 0) })
            .by(0.05, { position: cc.v3(-10, -10, 0) })
            .by(0.05, { position: cc.v3(5, 5, 0) })
            .set({ position: startPos })
            .start();
    }

    /**
     * 重新开始游戏
     */
    public onRestart() {
        BubbleControl.instance.startGame();
        this.bubbleContainer.removeAllChildren();
        this._initGridNodes();
        this._prepareNextBubble();
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
        const targetPos = BubbleControl.instance.gridToWorld(r, c);
        node.position = targetPos;

        const ctrl = node.getComponent(PrefabGameBubble);
        if (ctrl) {
            ctrl.init(color, false);
        }
        this._bubbleNodes[r][c] = node;

        // 生成动效
        node.scale = 0;
        cc.tween(node).to(0.15, { scale: 1.0 }, { easing: "backOut" }).start();
    }

    /**
     * 触摸移动事件回调
     */
    private onTouchMove(event: cc.Event.EventTouch) {
        if (this._isShooting) return;

        const touchPos = event.getLocation();
        const localPos = this.node.convertToNodeSpaceAR(touchPos);
        const shooterPos = cc.v2(this.shooter.x, this.shooter.y);
        const dir = localPos.sub(shooterPos).normalize();

        // 限制射击角度，防止往后射
        if (dir.y < 0.2) return;

        // 计算旋转角度 (0度朝右, Cocos 角度是顺时针)
        let angle = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
        this.shooter.angle = angle - 90;

        this._drawPredictionLine(shooterPos, dir);
    }

    /**
     * 绘制预测射线
     */
    private _drawPredictionLine(start: cc.Vec2, direction: cc.Vec2) {
        if (!this.predictionLine) return;

        this.predictionLine.clear();
        this.predictionLine.strokeColor = cc.Color.WHITE.clone();
        this.predictionLine.strokeColor.a = 150;
        this.predictionLine.lineWidth = 4;

        let currentPos = start.clone();
        let currentDir = direction.clone();

        const config = BubbleControl.instance.config;
        const d = config.bubbleSize;
        const width = config.cols * d;

        // 基于 BubbleContainer 的坐标空间转换
        const containerWorldPos = this.bubbleContainer.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const containerLocalPos = this.node.convertToNodeSpaceAR(containerWorldPos);

        const leftWall = containerLocalPos.x - width / 2;
        const rightWall = containerLocalPos.x + width / 2 + d / 2;
        const ceilingY = containerLocalPos.y + d / 2;

        this.predictionLine.moveTo(currentPos.x, currentPos.y);

        for (let i = 0; i < 3; i++) {
            // 计算与左右墙壁的碰撞
            let nextX = currentDir.x > 0 ? rightWall : leftWall;
            let distToWall = (nextX - currentPos.x) / currentDir.x;

            if (distToWall < 0) distToWall = 10000;

            let step = Math.min(distToWall, 10000);
            let targetPos = currentPos.add(currentDir.mul(step));

            if (targetPos.y > ceilingY) {
                let ratio = (ceilingY - currentPos.y) / (targetPos.y - currentPos.y);
                targetPos = currentPos.add(currentDir.mul(step * ratio));
                this.predictionLine.lineTo(targetPos.x, targetPos.y);
                break;
            }

            this.predictionLine.lineTo(targetPos.x, targetPos.y);
            currentPos = targetPos;
            currentDir.x *= -1;
        }

        this.predictionLine.stroke();
    }

    /**
     * 触摸结束事件回调
     */
    private onTouchEnd(event: cc.Event.EventTouch) {
        if (this._isShooting || !this._currentBullet) return;

        const touchPos = event.getLocation();
        const localPos = this.node.convertToNodeSpaceAR(touchPos);
        const shooterPos = cc.v2(this.shooter.x, this.shooter.y);
        const dir = localPos.sub(shooterPos).normalize();

        if (dir.y < 0.2) return;

        this._isShooting = true;
        this.predictionLine.clear();

        // 射击动效：发射器弹一下
        cc.tween(this.shooter).to(0.05, { scale: 0.8 }).to(0.15, { scale: 1.0 }, { easing: "backOut" }).start();

        const speed = BubbleControl.instance.config.shootSpeed || 1500;
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
