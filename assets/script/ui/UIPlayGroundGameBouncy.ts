import { IUITheme, RGBA, UIThemeManager } from "../config/UITheme";
import { BouncyControl } from "../logic/BouncyControl";
import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";
import { UIGraphicsHelper } from "../logic/UIGraphicsHelper";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

// ===================== 布局常量 =====================
/** 设计分辨率 */
const DESIGN_W = 960;
const DESIGN_H = 640;

/** 砖块颜色表 (按 maxHp 索引: 0=空, 1=弱, 2=中, 3=强) */
const BRICK_COLORS: { main: RGBA; light: RGBA }[] = [
    { main: [100, 100, 100], light: [160, 160, 160] }, // 0 - 空
    { main: [80, 200, 120], light: [140, 235, 170] }, // 1 - 绿 (1hp)
    { main: [60, 140, 240], light: [130, 190, 255] }, // 2 - 蓝 (2hp)
    { main: [230, 70, 70], light: [255, 150, 140] }, // 3 - 红 (3hp)
];

/**
 * 弹弹球(打砖块)主界面
 * 全代码构建 UI，不依赖物理引擎
 * 手动速度驱动球运动，AABB 碰撞检测
 *
 * [Prefab 结构说明]
 * - UIPlayGroundGameBouncy (挂载此脚本, size(960, 640))
 *   - BgGradient (cc.Graphics, size(960, 640), zIndex=-10)
 *   - GameArea (cc.Node, size(740, 620), zIndex=0)
 *     - AreaBorder (cc.Graphics)
 *     - BrickContainer (cc.Node)
 *     - Ball (cc.Node, zIndex=10)
 *       - BallGfx (cc.Graphics)
 *     - Paddle (cc.Node, zIndex=5)
 *       - PaddleGfx (cc.Graphics)
 *     - TrailContainer (cc.Node, zIndex=3)
 *   - HudPanel (cc.Node, pos(0, 295), zIndex=10)
 *   - LivesPanel (cc.Node, zIndex=10)
 *   - ComboLabel (cc.Label, zIndex=12)
 *   - BtnBack (cc.Node, zIndex=15)
 *   - BtnTheme (cc.Node, zIndex=15)
 */
@ccclass
export default class UIPlayGroundGameBouncy extends cc.Component {
    /**
     * @description 结算面板
     * 节点路径: Settlement
     */
    @property({ type: UISettlement, tooltip: "节点路径: Settlement" })
    settlement: UISettlement = null;

    // ===== 内部 UI 节点 =====
    /** 渐变背景 */
    private _bgGfx: cc.Graphics = null;
    /** 游戏区域容器 */
    private _gameArea: cc.Node = null;
    /** 游戏区域边框 */
    private _areaBorderGfx: cc.Graphics = null;
    /** 砖块容器 */
    private _brickContainer: cc.Node = null;
    /** 球节点 */
    private _ballNode: cc.Node = null;
    /** 球 Graphics */
    private _ballGfx: cc.Graphics = null;
    /** 挡板节点 */
    private _paddleNode: cc.Node = null;
    /** 挡板 Graphics */
    private _paddleGfx: cc.Graphics = null;
    /** 拖尾容器 */
    private _trailContainer: cc.Node = null;
    /** HUD 面板 */
    private _hudPanelNode: cc.Node = null;
    /** 分数标签 */
    private _scoreLabel: cc.Label = null;
    /** 标题标签 */
    private _titleLabel: cc.Label = null;
    /** 生命面板 */
    private _livesPanel: cc.Node = null;
    /** 连击标签 */
    private _comboLabel: cc.Label = null;
    /** 返回按钮 */
    private _btnBackNode: cc.Node = null;
    /** 换肤按钮 */
    private _btnThemeNode: cc.Node = null;
    /** 换肤文字 */
    private _themeLabel: cc.Label = null;

    // ===== 砖块节点 =====
    /** 砖块节点二维数组 */
    private _brickNodes: (cc.Node | null)[][] = [];

    // ===== 游戏状态 =====
    /** 球速度 X (像素/秒) */
    private _ballVx: number = 0;
    /** 球速度 Y (像素/秒) */
    private _ballVy: number = 0;
    /** 球是否粘在挡板上 (待发射) */
    private _ballStuck: boolean = true;
    /** 游戏是否结束 */
    private _isGameOver: boolean = false;
    /** 拖尾帧计时 */
    private _trailTimer: number = 0;

    // ===== 输入状态 =====
    /** 键盘状态 */
    private _keyLeft: boolean = false;
    private _keyRight: boolean = false;
    /** 触摸 X */
    private _touchTargetX: number = 0;
    /** 是否正在触摸 */
    private _isTouching: boolean = false;

    // ===================== 生命周期 =====================

    onLoad(): void {
        UIThemeManager.init();

        // 隐藏预制体遗留节点
        this._hideOldPrefabNodes();

        // 构建 UI
        this._buildBackground();
        this._buildGameArea();
        this._buildBall();
        this._buildPaddle();
        this._buildHUD();
        this._buildButtons();

        // 绑定输入
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
        this.node.on(cc.Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);

        // 初始化游戏
        this._startNewGame();

        Logger.getInstance().info("Bouncy", "弹弹球游戏加载完成");
    }

    onDestroy(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
        this.node.off(cc.Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);

        if (this._btnBackNode && this._btnBackNode.isValid) {
            this._btnBackNode.off(cc.Node.EventType.TOUCH_END, this._onBtnBack, this);
        }
        if (this._btnThemeNode && this._btnThemeNode.isValid) {
            this._btnThemeNode.off(cc.Node.EventType.TOUCH_END, this._onSwitchTheme, this);
        }
        this.unscheduleAllCallbacks();
    }

    // ===================== 主循环 =====================

    update(dt: number): void {
        if (this._isGameOver) return;
        if (dt > 0.05) dt = 0.05;

        var cfg = BouncyControl.instance.config;

        // ---- 1. 挡板移动 ----
        this._updatePaddle(dt, cfg);

        // ---- 2. 球粘附在挡板上时跟随 ----
        if (this._ballStuck) {
            this._ballNode.x = this._paddleNode.x;
            this._ballNode.y = cfg.paddleY + cfg.paddleHeight / 2 + cfg.ballRadius + 2;
            return;
        }

        // ---- 3. 移动球 ----
        var newBx = this._ballNode.x + this._ballVx * dt;
        var newBy = this._ballNode.y + this._ballVy * dt;
        var r = cfg.ballRadius;

        // ---- 4. 墙壁碰撞 ----
        // 左墙
        if (newBx - r <= -cfg.areaHalfWidth) {
            newBx = -cfg.areaHalfWidth + r;
            this._ballVx = Math.abs(this._ballVx);
        }
        // 右墙
        if (newBx + r >= cfg.areaHalfWidth) {
            newBx = cfg.areaHalfWidth - r;
            this._ballVx = -Math.abs(this._ballVx);
        }
        // 顶墙
        if (newBy + r >= cfg.areaHalfHeight) {
            newBy = cfg.areaHalfHeight - r;
            this._ballVy = -Math.abs(this._ballVy);
        }

        // ---- 5. 挡板碰撞 ----
        var paddleTop = cfg.paddleY + cfg.paddleHeight / 2;
        var paddleBottom = cfg.paddleY - cfg.paddleHeight / 2;
        var paddleLeft = this._paddleNode.x - cfg.paddleWidth / 2;
        var paddleRight = this._paddleNode.x + cfg.paddleWidth / 2;

        if (
            this._ballVy < 0 &&
            newBy - r <= paddleTop &&
            newBy - r >= paddleBottom - 20 &&
            newBx + r > paddleLeft - 5 &&
            newBx - r < paddleRight + 5
        ) {
            newBy = paddleTop + r;

            // 根据球落在挡板上的相对位置决定反弹角度
            var hitRatio = (newBx - this._paddleNode.x) / (cfg.paddleWidth / 2);
            hitRatio = Math.max(-1, Math.min(1, hitRatio));

            // 反弹角度: -60° ~ +60° (从垂直方向)
            var angle = hitRatio * (Math.PI / 3);
            var speed = Math.sqrt(this._ballVx * this._ballVx + this._ballVy * this._ballVy);
            this._ballVx = speed * Math.sin(angle);
            this._ballVy = speed * Math.cos(angle);

            // 重置连击
            BouncyControl.instance.resetCombo();

            // 挡板弹性动效
            cc.tween(this._paddleNode)
                .to(0.04, { scaleY: 0.7 })
                .to(0.12, { scaleY: 1.0 }, { easing: "backOut" })
                .start();
        }

        // ---- 6. 砖块碰撞 ----
        this._checkBrickCollision(newBx, newBy, r, cfg);

        // ---- 7. 底部出界 (丢命) ----
        if (newBy - r < -cfg.areaHalfHeight - 20) {
            this._onBallLost();
            return;
        }

        // ---- 8. 更新球位置 ----
        this._ballNode.x = newBx;
        this._ballNode.y = newBy;

        // ---- 9. 球拖尾 ----
        this._updateTrail(dt);

        // ---- 10. 连击显示 ----
        if (this._comboLabel) {
            var combo = BouncyControl.instance.combo;
            if (combo >= 3) {
                this._comboLabel.string = "连击 x" + combo + "!";
                this._comboLabel.node.active = true;
                this._comboLabel.node.opacity = 255;
            } else {
                this._comboLabel.node.active = false;
            }
        }
    }

    // ===================== 挡板控制 =====================

    /**
     * 更新挡板位置
     */
    private _updatePaddle(dt: number, cfg: { paddleSpeed: number; paddleWidth: number; areaHalfWidth: number }): void {
        var targetVx = 0;
        if (this._keyLeft) {
            targetVx = -cfg.paddleSpeed;
        } else if (this._keyRight) {
            targetVx = cfg.paddleSpeed;
        } else if (this._isTouching) {
            // 触摸模式: 挡板跟随触摸 X
            var diff = this._touchTargetX - this._paddleNode.x;
            if (Math.abs(diff) > 3) {
                targetVx = diff * 12; // 弹性跟随
                targetVx = Math.max(-cfg.paddleSpeed * 1.5, Math.min(cfg.paddleSpeed * 1.5, targetVx));
            }
        }

        this._paddleNode.x += targetVx * dt;

        // 限制在游戏区域内
        var halfPW = cfg.paddleWidth / 2;
        var limit = cfg.areaHalfWidth - halfPW;
        if (this._paddleNode.x > limit) this._paddleNode.x = limit;
        if (this._paddleNode.x < -limit) this._paddleNode.x = -limit;
    }

    // ===================== 砖块碰撞 =====================

    /**
     * 检测球与砖块碰撞
     * 使用 AABB 检测 + 法线反弹
     */
    private _checkBrickCollision(
        bx: number,
        by: number,
        ballR: number,
        cfg: { brickWidth: number; brickHeight: number; brickCols: number }
    ): void {
        var bricks = BouncyControl.instance.bricks;
        var halfBW = cfg.brickWidth / 2;
        var halfBH = cfg.brickHeight / 2;

        for (var r = 0; r < bricks.length; r++) {
            for (var c = 0; c < bricks[r].length; c++) {
                if (bricks[r][c].hp <= 0) continue;

                var center = BouncyControl.instance.getBrickCenter(r, c);
                var bLeft = center.x - halfBW;
                var bRight = center.x + halfBW;
                var bTop = center.y + halfBH;
                var bBottom = center.y - halfBH;

                // 找最近点
                var closestX = Math.max(bLeft, Math.min(bx, bRight));
                var closestY = Math.max(bBottom, Math.min(by, bTop));

                var dx = bx - closestX;
                var dy = by - closestY;
                var distSq = dx * dx + dy * dy;

                if (distSq < ballR * ballR) {
                    // 碰撞发生! 确定反弹方向
                    var overlapX = halfBW + ballR - Math.abs(bx - center.x);
                    var overlapY = halfBH + ballR - Math.abs(by - center.y);

                    if (overlapX < overlapY) {
                        // 从侧面碰撞
                        this._ballVx = bx < center.x ? -Math.abs(this._ballVx) : Math.abs(this._ballVx);
                    } else {
                        // 从上下碰撞
                        this._ballVy = by < center.y ? -Math.abs(this._ballVy) : Math.abs(this._ballVy);
                    }

                    // 击中砖块
                    var destroyed = BouncyControl.instance.hitBrick(r, c);
                    if (destroyed) {
                        this._destroyBrickNode(r, c);
                    } else {
                        this._hitBrickNode(r, c, bricks[r][c].hp);
                    }

                    // 每帧只处理一个砖块碰撞，避免穿透
                    return;
                }
            }
        }
    }

    /**
     * 砖块消除动效
     */
    private _destroyBrickNode(r: number, c: number): void {
        var node = this._brickNodes[r] ? this._brickNodes[r][c] : null;
        if (!node || !node.isValid) return;

        var center = BouncyControl.instance.getBrickCenter(r, c);
        var score =
            BouncyControl.instance.combo * BouncyControl.instance.config.comboBonus +
            BouncyControl.instance.config.baseScore;
        this._showScorePop(center.x, center.y, "+" + score);

        // 碎裂粒子效果
        this._spawnBrickParticles(node.x, node.y, node);

        // 消除动效
        cc.tween(node)
            .to(0.08, { scale: 1.3 })
            .to(0.12, { scale: 0, opacity: 0 })
            .call(function () {
                if (node.isValid) node.destroy();
            })
            .start();

        this._brickNodes[r][c] = null;

        // 震动游戏区域
        this._shakeNode(this._gameArea);
    }

    /**
     * 砖块被击中但未消除 (减 hp 动效)
     */
    private _hitBrickNode(r: number, c: number, remainHp: number): void {
        var node = this._brickNodes[r] ? this._brickNodes[r][c] : null;
        if (!node || !node.isValid) return;

        // 重绘砖块 (更新颜色深度表示剩余生命)
        var gfx = node.getComponent(cc.Graphics);
        if (gfx) {
            var cfg = BouncyControl.instance.config;
            this._drawBrick(gfx, cfg.brickWidth, cfg.brickHeight, remainHp, BouncyControl.instance.bricks[r][c].maxHp);
        }

        // 闪烁 + 抖动
        cc.tween(node).to(0.03, { scale: 0.85 }).to(0.1, { scale: 1.0 }, { easing: "backOut" }).start();
        node.opacity = 160;
        cc.tween(node).to(0.15, { opacity: 255 }).start();
    }

    /**
     * 生成砖块碎裂粒子
     */
    private _spawnBrickParticles(x: number, y: number, brickNode: cc.Node): void {
        if (!this._brickContainer) return;
        var theme = UIThemeManager.current;

        for (var i = 0; i < 6; i++) {
            var p = new cc.Node("Particle");
            p.setPosition(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 12);
            p.parent = this._brickContainer;
            p.zIndex = 100;

            var g = p.addComponent(cc.Graphics);
            var size = 3 + Math.random() * 5;
            g.fillColor = UIThemeManager.toColor(theme.fx.hitFlashColor);
            g.rect(-size / 2, -size / 2, size, size);
            g.fill();

            var targetX = p.x + (Math.random() - 0.5) * 80;
            var targetY = p.y - 40 - Math.random() * 60;
            cc.tween(p)
                .to(0.35, { x: targetX, y: targetY, opacity: 0, scale: 0.3 }, { easing: "sineIn" })
                .call(function () {
                    if (p.isValid) p.destroy();
                })
                .start();
        }
    }

    // ===================== 球丢失 =====================

    /**
     * 球掉出底部
     */
    private _onBallLost(): void {
        var isDead = BouncyControl.instance.loseLife();
        this._updateLivesDisplay();

        // 屏幕闪红
        this._flashScreen();

        if (isDead) {
            this._isGameOver = true;
            Logger.getInstance().info("Bouncy", "游戏结束, 分数: " + BouncyControl.instance.score);
            this.scheduleOnce(function () {
                if (this.settlement) {
                    this.settlement.show(false, BouncyControl.instance.score, function () {
                        GameCenter.instance.enterGame("BOUNCY");
                    });
                } else {
                    GameCenter.instance.returnToHome();
                }
            }, 0.6);
        } else {
            // 重置球位置
            this._ballStuck = true;
            this._ballVx = 0;
            this._ballVy = 0;
            this._ballNode.x = this._paddleNode.x;
            this._ballNode.y =
                BouncyControl.instance.config.paddleY +
                BouncyControl.instance.config.paddleHeight / 2 +
                BouncyControl.instance.config.ballRadius +
                2;
            this._ballNode.opacity = 255;
        }
    }

    /**
     * 发射球
     */
    private _launchBall(): void {
        if (!this._ballStuck) return;
        this._ballStuck = false;

        var cfg = BouncyControl.instance.config;
        // 随机 -30° ~ +30° 向上发射
        var angle = (Math.random() - 0.5) * (Math.PI / 3);
        this._ballVx = cfg.ballSpeed * Math.sin(angle);
        this._ballVy = cfg.ballSpeed * Math.cos(angle);
    }

    // ===================== 拖尾效果 =====================

    /**
     * 球运动时产生拖尾
     */
    private _updateTrail(dt: number): void {
        if (!this._trailContainer || this._ballStuck) return;
        this._trailTimer += dt;
        if (this._trailTimer < 0.025) return;
        this._trailTimer = 0;

        var theme = UIThemeManager.current;
        var trail = new cc.Node("BallTrail");
        trail.setPosition(this._ballNode.x, this._ballNode.y);
        trail.parent = this._trailContainer;
        trail.opacity = 120;

        var g = trail.addComponent(cc.Graphics);
        var r = BouncyControl.instance.config.ballRadius * 0.7;
        g.fillColor = UIThemeManager.toColor(theme.gameArea.highlight);
        g.fillColor.a = 80;
        g.circle(0, 0, r);
        g.fill();

        cc.tween(trail)
            .to(0.3, { opacity: 0, scale: 0.2 })
            .call(function () {
                if (trail.isValid) trail.destroy();
            })
            .start();
    }

    // ===================== 屏幕效果 =====================

    /**
     * 屏幕闪红 (丢命时)
     */
    private _flashScreen(): void {
        var flash = new cc.Node("Flash");
        flash.setContentSize(DESIGN_W, DESIGN_H);
        flash.parent = this.node;
        flash.zIndex = 50;
        flash.opacity = 0;

        var g = flash.addComponent(cc.Graphics);
        g.fillColor = cc.color(255, 40, 40, 80);
        g.rect(-DESIGN_W / 2, -DESIGN_H / 2, DESIGN_W, DESIGN_H);
        g.fill();

        cc.tween(flash)
            .to(0.08, { opacity: 200 })
            .to(0.25, { opacity: 0 })
            .call(function () {
                if (flash.isValid) flash.destroy();
            })
            .start();
    }

    /**
     * 节点微震
     */
    private _shakeNode(node: cc.Node): void {
        if (!node || !node.isValid) return;
        var ox = node.x;
        var oy = node.y;
        cc.tween(node)
            .to(0.03, { x: ox + 3, y: oy - 2 })
            .to(0.03, { x: ox - 3, y: oy + 2 })
            .to(0.03, { x: ox + 1, y: oy - 1 })
            .to(0.03, { x: ox, y: oy })
            .start();
    }

    // ===================== 输入处理 =====================

    private _onKeyDown(event: cc.Event.EventKeyboard): void {
        if (this._isGameOver) return;
        if (event.keyCode === cc.macro.KEY.a || event.keyCode === cc.macro.KEY.left) {
            this._keyLeft = true;
        } else if (event.keyCode === cc.macro.KEY.d || event.keyCode === cc.macro.KEY.right) {
            this._keyRight = true;
        } else if (
            event.keyCode === cc.macro.KEY.space ||
            event.keyCode === cc.macro.KEY.w ||
            event.keyCode === cc.macro.KEY.up
        ) {
            this._launchBall();
        } else if (event.keyCode === cc.macro.KEY.escape) {
            this._onBtnBack();
        }
    }

    private _onKeyUp(event: cc.Event.EventKeyboard): void {
        if (event.keyCode === cc.macro.KEY.a || event.keyCode === cc.macro.KEY.left) {
            this._keyLeft = false;
        } else if (event.keyCode === cc.macro.KEY.d || event.keyCode === cc.macro.KEY.right) {
            this._keyRight = false;
        }
    }

    private _onTouchStart(event: cc.Event.EventTouch): void {
        if (this._isGameOver) return;
        this._isTouching = true;
        var loc = event.getLocation();
        this._touchTargetX = this.node.convertToNodeSpaceAR(loc).x;

        // 触摸也可以发射球
        if (this._ballStuck) {
            this._launchBall();
        }
    }

    private _onTouchMove(event: cc.Event.EventTouch): void {
        if (this._isGameOver) return;
        var loc = event.getLocation();
        this._touchTargetX = this.node.convertToNodeSpaceAR(loc).x;
    }

    private _onTouchEnd(_event: cc.Event.EventTouch): void {
        this._isTouching = false;
    }

    // ===================== 游戏流程 =====================

    /**
     * 开始新游戏
     */
    private _startNewGame(): void {
        this._isGameOver = false;
        this._ballStuck = true;
        this._ballVx = 0;
        this._ballVy = 0;
        this._keyLeft = false;
        this._keyRight = false;

        BouncyControl.instance.startGame();

        // 回调绑定
        BouncyControl.instance.onScoreChanged = function (score: number) {
            if (this._scoreLabel) {
                this._scoreLabel.string = "分数: " + score;
            }
        }.bind(this);

        BouncyControl.instance.onGameEnd = function (isWin: boolean) {
            if (isWin) {
                this._isGameOver = true;
                Logger.getInstance().info("Bouncy", "胜利! 分数: " + BouncyControl.instance.score);
                this.scheduleOnce(function () {
                    if (this.settlement) {
                        this.settlement.show(true, BouncyControl.instance.score, function () {
                            GameCenter.instance.enterGame("BOUNCY");
                        });
                    }
                }, 0.5);
            }
        }.bind(this);

        // 初始化砖块
        this._initBricks();

        // 重置挡板和球
        var cfg = BouncyControl.instance.config;
        this._paddleNode.x = 0;
        this._ballNode.x = 0;
        this._ballNode.y = cfg.paddleY + cfg.paddleHeight / 2 + cfg.ballRadius + 2;

        // 更新 UI
        this._updateLivesDisplay();
        if (this._scoreLabel) this._scoreLabel.string = "分数: 0";

        // 应用主题
        this._applyTheme(UIThemeManager.current);
    }

    /**
     * 初始化砖块节点
     */
    private _initBricks(): void {
        // 清除旧砖块
        if (this._brickContainer) {
            this._brickContainer.removeAllChildren();
        }

        var bricks = BouncyControl.instance.bricks;
        var cfg = BouncyControl.instance.config;
        this._brickNodes = [];

        for (var r = 0; r < bricks.length; r++) {
            this._brickNodes[r] = [];
            for (var c = 0; c < bricks[r].length; c++) {
                if (bricks[r][c].hp <= 0) {
                    this._brickNodes[r][c] = null;
                    continue;
                }
                var center = BouncyControl.instance.getBrickCenter(r, c);
                var node = new cc.Node("Brick_" + r + "_" + c);
                node.setContentSize(cfg.brickWidth, cfg.brickHeight);
                node.setPosition(center.x, center.y);
                node.parent = this._brickContainer;

                var gfx = node.addComponent(cc.Graphics);
                this._drawBrick(gfx, cfg.brickWidth, cfg.brickHeight, bricks[r][c].hp, bricks[r][c].maxHp);

                this._brickNodes[r][c] = node;

                // 入场动效: 从上方掉入
                node.y = center.y + 80;
                node.opacity = 0;
                var delay = (r * bricks[r].length + c) * 0.015;
                cc.tween(node).delay(delay).to(0.25, { y: center.y, opacity: 255 }, { easing: "backOut" }).start();
            }
        }
    }

    /**
     * 更新生命显示
     */
    private _updateLivesDisplay(): void {
        if (!this._livesPanel) return;
        this._livesPanel.removeAllChildren();

        var lives = BouncyControl.instance.lives;
        var theme = UIThemeManager.current;

        for (var i = 0; i < lives; i++) {
            var heart = new cc.Node("Heart_" + i);
            heart.parent = this._livesPanel;
            heart.setPosition(-30 + i * 30, 0);
            var g = heart.addComponent(cc.Graphics);
            // 绘制心形
            g.fillColor = cc.color(255, 80, 100);
            g.circle(-5, 3, 6);
            g.fill();
            g.circle(5, 3, 6);
            g.fill();
            g.moveTo(-11, 1);
            g.lineTo(0, -10);
            g.lineTo(11, 1);
            g.close();
            g.fill();
        }
    }

    // ===================== 主题系统 =====================

    private _onSwitchTheme(): void {
        var theme = UIThemeManager.nextTheme();
        this._applyTheme(theme);
        if (this._themeLabel) {
            this._themeLabel.string = "🎨 " + theme.name;
        }
    }

    /**
     * 应用主题到所有 UI
     */
    private _applyTheme(theme: IUITheme): void {
        this._drawBg(theme);
        this._drawAreaBorder(theme);
        this._drawBallGraphics(theme);
        this._drawPaddleGraphics(theme);
        this._drawAllBricks();
        this._drawHUD(theme);
        this._drawButtons(theme);
    }

    private _onBtnBack(): void {
        if (this._isGameOver) return;
        this._isGameOver = true;
        this.scheduleOnce(function () {
            GameCenter.instance.returnToHome();
        }, 0.1);
    }

    // ===================== UI 构建 =====================

    /**
     * 隐藏预制体遗留节点
     */
    private _hideOldPrefabNodes(): void {
        var names = ["GameArea", "HUD", "Background", "Ball", "MapContainer"];
        for (var i = 0; i < names.length; i++) {
            var child = this.node.getChildByName(names[i]);
            if (child) child.active = false;
        }
    }

    /**
     * 构建渐变背景
     */
    private _buildBackground(): void {
        var bgNode = this._ensureChild("BgGradient", this.node, DESIGN_W, DESIGN_H);
        bgNode.zIndex = -10;
        this._bgGfx = UIGraphicsHelper.ensureGraphics(bgNode);
    }

    /**
     * 构建游戏区域
     */
    private _buildGameArea(): void {
        this._gameArea = this._ensureChild("GameAreaNew", this.node, 740, 620);
        this._gameArea.zIndex = 0;
        this._gameArea.setPosition(0, -10);

        // 边框
        var borderNode = this._ensureChild("AreaBorder", this._gameArea, 740, 620);
        borderNode.zIndex = -1;
        this._areaBorderGfx = UIGraphicsHelper.ensureGraphics(borderNode);

        // 砖块容器
        this._brickContainer = this._ensureChild("BrickContainer", this._gameArea, 0, 0);
        this._brickContainer.zIndex = 1;

        // 拖尾容器
        this._trailContainer = this._ensureChild("TrailContainer", this._gameArea, 0, 0);
        this._trailContainer.zIndex = 3;
    }

    /**
     * 构建球节点
     */
    private _buildBall(): void {
        var cfg = BouncyControl.instance.config;
        this._ballNode = this._ensureChild("BallNode", this._gameArea, cfg.ballRadius * 2, cfg.ballRadius * 2);
        this._ballNode.zIndex = 10;

        var gfxNode = this._ensureChild("BallGfx", this._ballNode, cfg.ballRadius * 2, cfg.ballRadius * 2);
        this._ballGfx = UIGraphicsHelper.ensureGraphics(gfxNode);
    }

    /**
     * 构建挡板节点
     */
    private _buildPaddle(): void {
        var cfg = BouncyControl.instance.config;
        this._paddleNode = this._ensureChild("PaddleNode", this._gameArea, cfg.paddleWidth, cfg.paddleHeight);
        this._paddleNode.y = cfg.paddleY;
        this._paddleNode.zIndex = 5;

        var gfxNode = this._ensureChild("PaddleGfx", this._paddleNode, cfg.paddleWidth, cfg.paddleHeight);
        this._paddleGfx = UIGraphicsHelper.ensureGraphics(gfxNode);
    }

    /**
     * 构建 HUD
     */
    private _buildHUD(): void {
        // HUD 面板
        this._hudPanelNode = this._ensureChild("HudPanel", this.node, 500, 50);
        this._hudPanelNode.setPosition(0, DESIGN_H / 2 - 32);
        this._hudPanelNode.zIndex = 10;
        UIGraphicsHelper.ensureGraphics(this._hudPanelNode);

        // 标题
        var titleNode = this._ensureChild("TitleLabel", this._hudPanelNode, 200, 40);
        titleNode.setPosition(0, 0);
        this._titleLabel = this._ensureLabel(titleNode, "弹弹球", 26);

        // 分数 (左侧)
        var scoreNode = this._ensureChild("ScoreLabel", this.node, 200, 40);
        scoreNode.setPosition(-DESIGN_W / 2 + 130, DESIGN_H / 2 - 32);
        scoreNode.zIndex = 11;
        this._scoreLabel = this._ensureLabel(scoreNode, "分数: 0", 24);

        // 生命 (右侧)
        this._livesPanel = this._ensureChild("LivesPanel", this.node, 120, 30);
        this._livesPanel.setPosition(DESIGN_W / 2 - 120, DESIGN_H / 2 - 32);
        this._livesPanel.zIndex = 11;

        // 连击标签
        var comboNode = this._ensureChild("ComboLabel", this.node, 200, 40);
        comboNode.setPosition(0, -20);
        comboNode.zIndex = 12;
        this._comboLabel = this._ensureLabel(comboNode, "", 36);
        this._comboLabel.node.active = false;
    }

    /**
     * 构建按钮
     */
    private _buildButtons(): void {
        // 返回按钮
        this._btnBackNode = this._ensureChild("BtnBack", this.node, 100, 36);
        this._btnBackNode.setPosition(-DESIGN_W / 2 + 70, DESIGN_H / 2 - 75);
        this._btnBackNode.zIndex = 15;
        UIGraphicsHelper.ensureGraphics(this._btnBackNode);
        this._ensureLabel(this._btnBackNode, "← 返回", 20);
        this._btnBackNode.on(cc.Node.EventType.TOUCH_END, this._onBtnBack, this);

        // 换肤按钮
        this._btnThemeNode = this._ensureChild("BtnTheme", this.node, 150, 36);
        this._btnThemeNode.setPosition(DESIGN_W / 2 - 100, DESIGN_H / 2 - 75);
        this._btnThemeNode.zIndex = 15;
        UIGraphicsHelper.ensureGraphics(this._btnThemeNode);
        this._themeLabel = this._ensureLabel(this._btnThemeNode, "🎨 " + UIThemeManager.current.name, 18);
        this._btnThemeNode.on(cc.Node.EventType.TOUCH_END, this._onSwitchTheme, this);
    }

    // ===================== 绘制方法 =====================

    /**
     * 绘制渐变背景
     */
    private _drawBg(theme: IUITheme): void {
        if (!this._bgGfx) return;
        UIGraphicsHelper.fillGradientRect(
            this._bgGfx,
            DESIGN_W,
            DESIGN_H,
            theme.background.topColor,
            theme.background.bottomColor,
            32
        );
    }

    /**
     * 绘制游戏区域边框
     */
    private _drawAreaBorder(theme: IUITheme): void {
        if (!this._areaBorderGfx) return;
        var g = this._areaBorderGfx;
        var cfg = BouncyControl.instance.config;
        var w = cfg.areaHalfWidth * 2;
        var h = cfg.areaHalfHeight * 2;

        g.clear();

        // 游戏区域暗底
        var bgColor = UIThemeManager.darken(theme.background.bottomColor, 20);
        g.fillColor = cc.color(bgColor[0], bgColor[1], bgColor[2], 80);
        UIGraphicsHelper.roundRect(g, -cfg.areaHalfWidth - 5, -cfg.areaHalfHeight - 5, w + 10, h + 10, 12);
        g.fill();

        // 边框线
        g.strokeColor = UIThemeManager.toColor(theme.gameArea.secondary);
        g.lineWidth = 3;
        UIGraphicsHelper.roundRect(g, -cfg.areaHalfWidth, -cfg.areaHalfHeight, w, h, 8);
        g.stroke();

        // 顶部高亮
        g.strokeColor = UIThemeManager.toColor(theme.gameArea.highlight);
        g.lineWidth = 2;
        g.moveTo(-cfg.areaHalfWidth + 8, cfg.areaHalfHeight);
        g.lineTo(cfg.areaHalfWidth - 8, cfg.areaHalfHeight);
        g.stroke();

        // 底部死亡线 (虚线)
        g.strokeColor = cc.color(220, 60, 60, 100);
        g.lineWidth = 2;
        for (var si = -cfg.areaHalfWidth; si < cfg.areaHalfWidth; si += 20) {
            g.moveTo(si, -cfg.areaHalfHeight);
            g.lineTo(si + 10, -cfg.areaHalfHeight);
        }
        g.stroke();
    }

    /**
     * 绘制球
     */
    private _drawBallGraphics(theme: IUITheme): void {
        if (!this._ballGfx) return;
        var g = this._ballGfx;
        var r = BouncyControl.instance.config.ballRadius;

        g.clear();

        // 主体
        g.fillColor = UIThemeManager.toColor(theme.gameArea.entityPrimary);
        g.circle(0, 0, r);
        g.fill();

        // 高光
        g.fillColor = cc.color(255, 255, 255, 120);
        g.circle(-r * 0.25, r * 0.25, r * 0.4);
        g.fill();

        // 描边
        g.strokeColor = UIThemeManager.toColor(UIThemeManager.darken(theme.gameArea.entityPrimary, 40));
        g.lineWidth = 1.5;
        g.circle(0, 0, r);
        g.stroke();
    }

    /**
     * 绘制挡板
     */
    private _drawPaddleGraphics(theme: IUITheme): void {
        if (!this._paddleGfx) return;
        var g = this._paddleGfx;
        var cfg = BouncyControl.instance.config;
        var w = cfg.paddleWidth;
        var h = cfg.paddleHeight;

        g.clear();

        // 阴影
        var shadow = UIThemeManager.darken(theme.gameArea.entitySecondary, 50);
        g.fillColor = cc.color(shadow[0], shadow[1], shadow[2], 100);
        UIGraphicsHelper.roundRect(g, -w / 2 + 2, -h / 2 - 4, w, h, 8);
        g.fill();

        // 主体
        g.fillColor = UIThemeManager.toColor(theme.gameArea.entitySecondary);
        UIGraphicsHelper.roundRect(g, -w / 2, -h / 2, w, h, 8);
        g.fill();

        // 描边
        g.strokeColor = UIThemeManager.toColor(UIThemeManager.darken(theme.gameArea.entitySecondary, 40));
        g.lineWidth = 2;
        UIGraphicsHelper.roundRect(g, -w / 2, -h / 2, w, h, 8);
        g.stroke();

        // 顶部高光线
        g.strokeColor = UIThemeManager.toColor(UIThemeManager.lighten(theme.gameArea.entitySecondary, 50));
        g.lineWidth = 2;
        g.moveTo(-w / 2 + 10, h / 2 - 2);
        g.lineTo(w / 2 - 10, h / 2 - 2);
        g.stroke();

        // 中心点装饰
        g.fillColor = UIThemeManager.toColor(theme.gameArea.highlight);
        g.circle(0, 0, 4);
        g.fill();
    }

    /**
     * 绘制单个砖块
     * @param gfx Graphics 组件
     * @param w 宽
     * @param h 高
     * @param hp 剩余生命
     * @param maxHp 最大生命
     */
    private _drawBrick(gfx: cc.Graphics, w: number, h: number, hp: number, maxHp: number): void {
        gfx.clear();
        var theme = UIThemeManager.current;
        var radius = 5;

        // 根据 maxHp 选择颜色系
        var colorIdx = Math.min(maxHp, 3);
        var pal = BRICK_COLORS[colorIdx];

        // hp 减少时颜色变暗
        var darkenAmount = (maxHp - hp) * 25;
        var mainColor = UIThemeManager.darken(pal.main, darkenAmount);
        var lightColor = UIThemeManager.darken(pal.light, darkenAmount);

        // 底部阴影
        var shadowColor = UIThemeManager.darken(mainColor, 40);
        gfx.fillColor = cc.color(shadowColor[0], shadowColor[1], shadowColor[2], 100);
        UIGraphicsHelper.roundRect(gfx, -w / 2 + 1, -h / 2 - 2, w, h, radius);
        gfx.fill();

        // 主体
        gfx.fillColor = UIThemeManager.toColor(mainColor);
        UIGraphicsHelper.roundRect(gfx, -w / 2, -h / 2, w, h, radius);
        gfx.fill();

        // 描边
        gfx.strokeColor = UIThemeManager.toColor(UIThemeManager.darken(mainColor, 30));
        gfx.lineWidth = 1.5;
        UIGraphicsHelper.roundRect(gfx, -w / 2, -h / 2, w, h, radius);
        gfx.stroke();

        // 顶部高光
        gfx.strokeColor = UIThemeManager.toColor(lightColor);
        gfx.lineWidth = 2;
        gfx.moveTo(-w / 2 + radius + 2, h / 2 - 2);
        gfx.lineTo(w / 2 - radius - 2, h / 2 - 2);
        gfx.stroke();

        // hp > 1 时绘制生命标记
        if (maxHp > 1) {
            gfx.fillColor = cc.color(255, 255, 255, 180);
            for (var i = 0; i < hp; i++) {
                var dotX = (i - (hp - 1) / 2) * 8;
                gfx.circle(dotX, 0, 2.5);
                gfx.fill();
            }
        }
    }

    /**
     * 重绘所有砖块 (换肤时)
     */
    private _drawAllBricks(): void {
        var bricks = BouncyControl.instance.bricks;
        var cfg = BouncyControl.instance.config;
        for (var r = 0; r < bricks.length; r++) {
            for (var c = 0; c < bricks[r].length; c++) {
                var node = this._brickNodes[r] ? this._brickNodes[r][c] : null;
                if (!node || !node.isValid) continue;
                var gfx = node.getComponent(cc.Graphics);
                if (gfx) {
                    this._drawBrick(gfx, cfg.brickWidth, cfg.brickHeight, bricks[r][c].hp, bricks[r][c].maxHp);
                }
            }
        }
    }

    /**
     * 绘制 HUD
     */
    private _drawHUD(theme: IUITheme): void {
        if (!this._hudPanelNode) return;
        var g = this._hudPanelNode.getComponent(cc.Graphics);
        if (g) {
            UIGraphicsHelper.drawHudPanel(
                g,
                500,
                50,
                theme.hud.panelBg,
                theme.hud.panelRadius,
                theme.gameArea.secondary
            );
        }
        if (this._titleLabel) this._titleLabel.node.color = UIThemeManager.toColor(theme.hud.primaryText);
        if (this._scoreLabel) this._scoreLabel.node.color = UIThemeManager.toColor(theme.hud.accentText);
        if (this._comboLabel) this._comboLabel.node.color = UIThemeManager.toColor(theme.fx.comboColor);
    }

    /**
     * 绘制按钮
     */
    private _drawButtons(theme: IUITheme): void {
        if (this._btnBackNode) {
            var g1 = this._btnBackNode.getComponent(cc.Graphics);
            if (g1) UIGraphicsHelper.drawButton(g1, 100, 36, theme.btn.bg, theme.btn.radius);
            var lbl1 = this._btnBackNode.getComponentInChildren(cc.Label);
            if (lbl1) lbl1.node.color = UIThemeManager.toColor(theme.btn.text);
        }
        if (this._btnThemeNode) {
            var g2 = this._btnThemeNode.getComponent(cc.Graphics);
            if (g2) UIGraphicsHelper.drawButton(g2, 150, 36, theme.btn.bg, theme.btn.radius);
            if (this._themeLabel) this._themeLabel.node.color = UIThemeManager.toColor(theme.btn.text);
        }
    }

    // ===================== 特效 =====================

    /**
     * 得分飘字
     */
    private _showScorePop(x: number, y: number, text: string): void {
        var theme = UIThemeManager.current;
        var popNode = new cc.Node("ScorePop");
        popNode.setPosition(x, y);
        popNode.parent = this._gameArea;
        popNode.zIndex = 100;

        var label = popNode.addComponent(cc.Label);
        label.string = text;
        label.fontSize = 22;
        label.lineHeight = 26;
        label.enableBold = true;
        popNode.color = UIThemeManager.toColor(theme.fx.scorePopColor);

        popNode.scale = 0.5;
        cc.tween(popNode)
            .to(0.1, { scale: 1.2 })
            .to(0.08, { scale: 1.0 })
            .to(0.5, { y: y + 50, opacity: 0 })
            .call(function () {
                if (popNode.isValid) popNode.destroy();
            })
            .start();
    }

    // ===================== 工具方法 =====================

    /**
     * 确保子节点存在
     */
    private _ensureChild(name: string, parent: cc.Node, w: number, h: number): cc.Node {
        var child = parent.getChildByName(name);
        if (!child) {
            child = new cc.Node(name);
            child.parent = parent;
        }
        child.active = true;
        child.setContentSize(w, h);
        return child;
    }

    /**
     * 确保 Label 组件存在
     */
    private _ensureLabel(node: cc.Node, defaultText: string, fontSize: number): cc.Label {
        var label = node.getComponent(cc.Label);
        if (!label) {
            label = node.addComponent(cc.Label);
        }
        label.string = defaultText;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        return label;
    }

    /**
     * 返回按钮 (公开方法)
     */
    public onBtnBackClicked(): void {
        GameCenter.instance.returnToHome();
    }
}
