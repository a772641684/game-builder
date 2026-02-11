import { IUITheme, UIThemeManager } from "../config/UITheme";
import { DoodleControl, IPlatformData, PlatformType } from "../logic/DoodleControl";
import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";
import { UIGraphicsHelper } from "../logic/UIGraphicsHelper";
import PrefabGameDoodlePlayer from "../prefab/PrefabGameDoodlePlayer";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

// ===================== 布局常量 =====================
/** 设计分辨率宽/高 */
const DESIGN_W = 960;
const DESIGN_H = 640;

/** 平台数据项 (含渲染信息) */
interface IActivePlatform {
    data: IPlatformData;
    node: cc.Node;
    gfx: cc.Graphics;
    /** 金币节点 (如果有) */
    coinNode: cc.Node;
    /** 金币已被收集 */
    coinCollected: boolean;
}

/**
 * 涂鸦跳跃主界面
 * 全代码构建 UI，不依赖物理引擎
 * 手动重力 + 速度驱动角色运动，距离检测平台碰撞
 *
 * [Prefab 结构说明]
 * - UIPlayGroundGameDoodle (挂载此脚本, size(960, 640))
 *   - BgGradient (cc.Graphics, size(960, 640), zIndex=-10)
 *   - GameClip (cc.Mask, size(960, 640), zIndex=0)
 *     - GameLayer (cc.Node) — 平台+角色容器, 整体滚动
 *       - CloudLayer (cc.Node, zIndex=-5)
 *       - PlatformContainer (cc.Node)
 *       - Player (cc.Node, 挂载 PrefabGameDoodlePlayer, zIndex=10)
 *       - TrailContainer (cc.Node, zIndex=5) — 角色拖尾粒子
 *       - PushLine (cc.Graphics, zIndex=8) — 推进线
 *   - HudPanel (cc.Node, pos(0, 290), zIndex=10)
 *   - BtnBack (cc.Node, zIndex=15)
 *   - BtnTheme (cc.Node, zIndex=15)
 */
@ccclass
export default class UIPlayGroundGameDoodle extends cc.Component {
    /**
     * @description 结算面板
     * 节点路径: Settlement
     */
    @property({ type: UISettlement, tooltip: "节点路径: Settlement" })
    settlement: UISettlement = null;

    // ===== 内部 UI 节点 =====
    /** 渐变背景 Graphics */
    private _bgGfx: cc.Graphics = null;
    /** 云朵层 */
    private _cloudLayer: cc.Node = null;
    /** 游戏层 (滚动容器) */
    private _gameLayer: cc.Node = null;
    /** 平台容器 */
    private _platformContainer: cc.Node = null;
    /** 角色节点 */
    private _playerNode: cc.Node = null;
    /** 角色组件 */
    private _playerComp: PrefabGameDoodlePlayer = null;
    /** 拖尾容器 */
    private _trailContainer: cc.Node = null;
    /** 推进线节点 */
    private _pushLineNode: cc.Node = null;
    /** 推进线 Graphics */
    private _pushLineGfx: cc.Graphics = null;
    /** HUD 面板 */
    private _hudPanelNode: cc.Node = null;
    /** 分数标签 */
    private _scoreLabel: cc.Label = null;
    /** 高度标签 */
    private _heightLabel: cc.Label = null;
    /** 标题标签 */
    private _titleLabel: cc.Label = null;
    /** 返回按钮节点 */
    private _btnBackNode: cc.Node = null;
    /** 换肤按钮节点 */
    private _btnThemeNode: cc.Node = null;
    /** 换肤按钮文字 */
    private _themeLabel: cc.Label = null;

    // ===== 游戏状态 =====
    /** 角色水平速度 (像素/秒) */
    private _playerVx: number = 0;
    /** 角色垂直速度 (像素/秒, 正=上) */
    private _playerVy: number = 0;
    /** 角色"世界"Y 坐标 (持续向上累加) */
    private _playerWorldY: number = 0;
    /** 摄像机 Y (世界空间, 平滑跟随) */
    private _cameraY: number = 0;
    /** 摄像机目标 Y (不会往回退) */
    private _cameraTargetY: number = 0;
    /** 游戏是否结束 */
    private _isGameOver: boolean = false;
    /** 是否已初始化跳跃 (第一次落地前不判定死亡) */
    private _hasFirstJump: boolean = false;
    /** 推进线当前世界 Y */
    private _pushLineY: number = -DESIGN_H;
    /** 拖尾帧计时 */
    private _trailTimer: number = 0;

    // ===== 输入状态 =====
    /** 键盘按键状态 */
    private _keyLeft: boolean = false;
    private _keyRight: boolean = false;
    /** 触摸 X (用于左右半屏控制) */
    private _touchX: number = 0;
    /** 是否正在触摸 */
    private _isTouching: boolean = false;

    // ===== 平台管理 =====
    /** 活跃平台列表 */
    private _activePlatforms: IActivePlatform[] = [];
    /** 云朵节点列表 */
    private _clouds: { node: cc.Node; worldY: number }[] = [];

    // ===================== 生命周期 =====================

    onLoad(): void {
        UIThemeManager.init();

        // 隐藏预制体遗留节点
        this._hideOldPrefabNodes();

        // 构建 UI
        this._buildBackground();
        this._buildGameLayer();
        this._buildPlayer();
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
        DoodleControl.instance.startGame();
        DoodleControl.instance.onScoreChanged = (score: number) => {
            if (this._scoreLabel) {
                this._scoreLabel.string = "分数: " + score;
            }
        };

        // 初始状态
        this._playerWorldY = 0;
        this._playerVy = 0;
        this._cameraY = 0;
        this._cameraTargetY = 0;
        this._hasFirstJump = false;
        this._pushLineY = -DESIGN_H;

        // 生成初始平台
        this._spawnStartPlatform();
        this._generatePlatforms();
        // 生成装饰云朵
        this._generateClouds(-DESIGN_H, DESIGN_H * 2);

        // 应用主题
        this._applyTheme(UIThemeManager.current);

        // 给角色一个初始跳跃
        var cfg = DoodleControl.instance.config;
        this._playerVy = cfg.jumpSpeed;
        this._hasFirstJump = true;

        Logger.getInstance().info("Doodle", "涂鸦跳跃初始化完成");
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
        // 防止大 dt 跳帧导致角色穿过平台
        if (dt > 0.05) dt = 0.05;

        var cfg = DoodleControl.instance.config;

        // ---- 1. 水平输入 (平滑加速/减速) ----
        var targetVx = 0;
        if (this._keyLeft) {
            targetVx = -cfg.moveSpeed;
        } else if (this._keyRight) {
            targetVx = cfg.moveSpeed;
        } else if (this._isTouching) {
            targetVx = this._touchX < 0 ? -cfg.moveSpeed : cfg.moveSpeed;
        }
        // 平滑插值 (加速快, 减速慢)
        var accelFactor = targetVx !== 0 ? 0.2 : 0.12;
        this._playerVx += (targetVx - this._playerVx) * accelFactor;
        if (Math.abs(this._playerVx) < 5) this._playerVx = 0;

        // ---- 2. 应用重力 ----
        this._playerVy -= cfg.gravity * dt;

        // ---- 3. 移动角色 ----
        var newX = this._playerNode.x + this._playerVx * dt;
        this._playerWorldY += this._playerVy * dt;

        // 屏幕穿越 (无缝)
        if (newX > cfg.halfWidth) {
            newX = -cfg.halfWidth;
        } else if (newX < -cfg.halfWidth) {
            newX = cfg.halfWidth;
        }
        this._playerNode.x = newX;

        // 更新角色朝向
        if (this._playerComp && this._playerVx !== 0) {
            this._playerComp.setFacing(this._playerVx > 0 ? 1 : -1);
        }

        // ---- 4. 移动平台更新 ----
        this._updateMovingPlatforms(dt, cfg);

        // ---- 5. 平台碰撞检测 (仅下落时) ----
        if (this._playerVy < 0) {
            this._checkPlatformCollision(cfg);
        }

        // ---- 6. 金币收集检测 ----
        this._checkCoinCollection(cfg);

        // ---- 7. 更新高度和分数 ----
        DoodleControl.instance.updateHeight(this._playerWorldY);

        // ---- 8. 摄像机平滑跟随 ----
        var targetCamY = this._playerWorldY - cfg.cameraOffset;
        if (targetCamY > this._cameraTargetY) {
            this._cameraTargetY = targetCamY;
        }
        this._cameraY += (this._cameraTargetY - this._cameraY) * cfg.cameraSmooth;

        // ---- 9. 渲染: 将世界坐标映射到屏幕 ----
        this._updateGameLayerPosition();

        // ---- 10. 动态生成平台 ----
        var topEdge = this._cameraY + DESIGN_H;
        if (DoodleControl.instance.lastSpawnY < topEdge + cfg.spawnAhead) {
            this._generatePlatforms();
        }

        // ---- 11. 回收屏幕下方平台 ----
        this._recyclePlatforms();

        // ---- 12. 更新云朵位置 ----
        this._updateClouds();

        // ---- 13. 更新 HUD ----
        if (this._heightLabel) {
            var meters = Math.floor(Math.max(0, DoodleControl.instance.maxHeight) / 10);
            this._heightLabel.string = "高度: " + meters + "m";
        }

        // ---- 14. 角色拖尾 ----
        this._updateTrail(dt);

        // ---- 15. 推进线 ----
        this._updatePushLine(dt, cfg);

        // ---- 16. 死亡判定 ----
        if (this._hasFirstJump && this._playerWorldY < this._cameraY - cfg.deathThreshold) {
            this._gameOver();
        }
        // 推进线追上角色也死亡
        if (cfg.pushLineSpeed > 0 && this._playerWorldY < this._pushLineY + 10) {
            this._gameOver();
        }
    }

    // ===================== 移动平台 =====================

    /**
     * 更新移动平台的位置
     */
    private _updateMovingPlatforms(
        dt: number,
        cfg: { movingSpeed: number; halfWidth: number; platformWidth: number }
    ): void {
        for (var i = 0; i < this._activePlatforms.length; i++) {
            var plat = this._activePlatforms[i];
            if (plat.data.type !== PlatformType.Moving) continue;

            plat.data.x += plat.data.moveDir * cfg.movingSpeed * dt;
            // 边界反弹
            var halfPW = cfg.platformWidth / 2;
            if (plat.data.x + halfPW > cfg.halfWidth - 20) {
                plat.data.x = cfg.halfWidth - 20 - halfPW;
                plat.data.moveDir = -1;
            } else if (plat.data.x - halfPW < -cfg.halfWidth + 20) {
                plat.data.x = -cfg.halfWidth + 20 + halfPW;
                plat.data.moveDir = 1;
            }
            plat.node.x = plat.data.x;
        }
    }

    // ===================== 平台碰撞 =====================

    /**
     * 检测角色是否踩到平台
     */
    private _checkPlatformCollision(cfg: {
        platformWidth: number;
        platformHeight: number;
        playerWidth: number;
        playerHeight: number;
        jumpSpeed: number;
        springMultiplier: number;
    }): void {
        var playerHalfH = cfg.playerHeight / 2;
        var playerBottom = this._playerWorldY - playerHalfH;
        var playerLeft = this._playerNode.x - cfg.playerWidth / 2;
        var playerRight = this._playerNode.x + cfg.playerWidth / 2;

        for (var i = 0; i < this._activePlatforms.length; i++) {
            var plat = this._activePlatforms[i];
            var platTop = plat.data.y + cfg.platformHeight / 2;
            var platBottom = plat.data.y - cfg.platformHeight / 2;
            var platLeft = plat.data.x - cfg.platformWidth / 2;
            var platRight = plat.data.x + cfg.platformWidth / 2;

            // 检测: 角色底部在平台顶部附近 & 水平重叠
            // 容差 60px 防止低帧率(dt=0.05)时高速下落穿过平台
            if (
                playerBottom <= platTop &&
                playerBottom >= platBottom - 60 &&
                playerRight > platLeft + 5 &&
                playerLeft < platRight - 5
            ) {
                // 处理破碎平台
                if (plat.data.type === PlatformType.Breakable) {
                    this._breakPlatform(plat, i);
                    return;
                }

                // 弹起
                var jumpV = cfg.jumpSpeed;
                if (plat.data.type === PlatformType.Spring) {
                    jumpV = cfg.jumpSpeed * cfg.springMultiplier;
                    this._playSpringAnim(plat.node);
                }

                this._playerVy = jumpV;
                this._playerWorldY = platTop + playerHalfH;
                if (this._playerComp) {
                    this._playerComp.playJumpAnim();
                }
                this._hasFirstJump = true;

                // 踩踏加分: 仅踩到更高的平台才加分，原地踏步不得分
                if (plat.data.y > DoodleControl.instance.maxHeight - 50) {
                    DoodleControl.instance.addScore(5);
                    this._showScorePop(plat.data.x, plat.data.y + 30, "+5");
                }
                return;
            }
        }
    }

    // ===================== 金币收集 =====================

    /**
     * 检测角色是否碰到金币
     */
    private _checkCoinCollection(cfg: { playerWidth: number; playerHeight: number; coinScore: number }): void {
        var playerHalfW = cfg.playerWidth / 2;
        var playerHalfH = cfg.playerHeight / 2;

        for (var i = 0; i < this._activePlatforms.length; i++) {
            var plat = this._activePlatforms[i];
            if (!plat.data.hasCoin || plat.coinCollected) continue;
            if (!plat.coinNode || !plat.coinNode.isValid) continue;

            // 金币在平台上方 35px
            var coinX = plat.data.x;
            var coinY = plat.data.y + 35;
            var dx = Math.abs(this._playerNode.x - coinX);
            var dy = Math.abs(this._playerWorldY - coinY);

            if (dx < playerHalfW + 15 && dy < playerHalfH + 15) {
                plat.coinCollected = true;
                DoodleControl.instance.addScore(cfg.coinScore);
                this._showScorePop(coinX, coinY + 15, "+" + cfg.coinScore);
                // 金币收集动效
                var cn = plat.coinNode;
                cc.tween(cn)
                    .to(0.2, { scale: 1.6, opacity: 0, y: cn.y + 30 })
                    .call(function () {
                        if (cn.isValid) cn.active = false;
                    })
                    .start();
            }
        }
    }

    /**
     * 破碎平台动效
     */
    private _breakPlatform(plat: IActivePlatform, index: number): void {
        var node = plat.node;
        // 碎裂: 压扁后坠落
        cc.tween(node)
            .to(0.1, { scaleY: 0.3, opacity: 180 })
            .to(0.25, { y: node.y - 100, opacity: 0 })
            .call(function () {
                if (node.isValid) node.destroy();
            })
            .start();
        this._activePlatforms.splice(index, 1);
    }

    /**
     * 弹簧平台弹跳动效
     */
    private _playSpringAnim(node: cc.Node): void {
        cc.tween(node).to(0.06, { scaleY: 0.5 }).to(0.25, { scaleY: 1.0 }, { easing: "backOut" }).start();
    }

    // ===================== 角色拖尾 =====================

    /**
     * 上升时产生拖尾粒子
     */
    private _updateTrail(dt: number): void {
        if (!this._trailContainer) return;
        this._trailTimer += dt;
        if (this._trailTimer < 0.03) return;
        this._trailTimer = 0;

        // 仅上升时产生拖尾
        if (this._playerVy <= 100) return;

        var theme = UIThemeManager.current;
        var trail = new cc.Node("Trail");
        trail.setPosition(
            this._playerNode.x + (Math.random() - 0.5) * 16,
            this._playerWorldY - DoodleControl.instance.config.playerHeight / 2
        );
        trail.parent = this._trailContainer;
        trail.zIndex = 5;
        trail.opacity = 160;

        var g = trail.addComponent(cc.Graphics);
        var color = theme.fx.scorePopColor;
        g.fillColor = cc.color(color[0], color[1], color[2], 120);
        var r = 3 + Math.random() * 4;
        g.circle(0, 0, r);
        g.fill();

        cc.tween(trail)
            .to(0.4, { opacity: 0, scale: 0.2, y: trail.y - 20 })
            .call(function () {
                if (trail.isValid) trail.destroy();
            })
            .start();
    }

    // ===================== 推进线 =====================

    /**
     * 更新推进线 (随时间缓慢上升，制造紧迫感)
     */
    private _updatePushLine(dt: number, cfg: { pushLineSpeed: number }): void {
        if (cfg.pushLineSpeed <= 0) return;
        this._pushLineY += cfg.pushLineSpeed * dt;

        if (this._pushLineGfx) {
            this._pushLineNode.y = this._pushLineY;
            // 重绘推进线
            var g = this._pushLineGfx;
            g.clear();
            // 半透明红色警戒区
            g.fillColor = cc.color(220, 40, 40, 60);
            g.rect(-DESIGN_W / 2, -DESIGN_H, DESIGN_W, DESIGN_H);
            g.fill();
            // 红色警戒线
            g.strokeColor = cc.color(220, 40, 40, 200);
            g.lineWidth = 3;
            g.moveTo(-DESIGN_W / 2, 0);
            g.lineTo(DESIGN_W / 2, 0);
            g.stroke();
            // 虚线效果
            g.strokeColor = cc.color(255, 80, 80, 180);
            g.lineWidth = 2;
            for (var si = -DESIGN_W / 2; si < DESIGN_W / 2; si += 30) {
                g.moveTo(si, 0);
                g.lineTo(si + 15, 0);
                g.stroke();
            }
        }
    }

    // ===================== 平台管理 =====================

    /**
     * 生成起始脚下平台及过渡阶梯
     * 在起始位置到第一批生成平台之间铺设踏脚石，确保开局顺畅
     */
    private _spawnStartPlatform(): void {
        // 脚下起始平台 (加宽)
        var startData: IPlatformData = {
            id: -1,
            x: 0,
            y: -20,
            type: PlatformType.Normal,
            hasCoin: false,
            moveDir: 0,
        };
        this._createPlatformNode(startData);

        // 过渡踏脚石: 让玩家轻松到达第一批生成平台
        var steps: { x: number; y: number }[] = [
            { x: -80, y: 80 },
            { x: 70, y: 180 },
            { x: -50, y: 290 },
        ];
        for (var i = 0; i < steps.length; i++) {
            var step = steps[i];
            this._createPlatformNode({
                id: -(i + 2),
                x: step.x,
                y: step.y,
                type: PlatformType.Normal,
                hasCoin: false,
                moveDir: 0,
            });
        }
    }

    /**
     * 请求生成更多平台
     */
    private _generatePlatforms(): void {
        var cfg = DoodleControl.instance.config;
        var startY = DoodleControl.instance.lastSpawnY;
        if (startY === 0 && this._activePlatforms.length <= 5) {
            // 接续过渡踏脚石最高位(290), 留一个合理间距
            startY = 320;
        }
        var platforms = DoodleControl.instance.requestMorePlatforms(startY, cfg.batchCount);
        for (var i = 0; i < platforms.length; i++) {
            this._createPlatformNode(platforms[i]);
        }
    }

    /**
     * 创建平台节点
     */
    private _createPlatformNode(data: IPlatformData): void {
        var cfg = DoodleControl.instance.config;
        var node = new cc.Node("Platform_" + data.id);
        node.setContentSize(cfg.platformWidth, cfg.platformHeight);
        node.setPosition(data.x, data.y);
        node.parent = this._platformContainer;

        var gfx = node.addComponent(cc.Graphics);
        this._drawPlatform(gfx, data.type, cfg.platformWidth, cfg.platformHeight);

        // 金币
        var coinNode: cc.Node = null;
        if (data.hasCoin) {
            coinNode = this._createCoinNode(node);
        }

        this._activePlatforms.push({
            data: data,
            node: node,
            gfx: gfx,
            coinNode: coinNode,
            coinCollected: false,
        });

        // 入场动效: 缩放弹入
        node.scale = 0;
        cc.tween(node).to(0.15, { scale: 1.0 }, { easing: "backOut" }).start();
    }

    /**
     * 创建金币节点 (放在平台上方)
     */
    private _createCoinNode(parentPlatform: cc.Node): cc.Node {
        var coinNode = new cc.Node("Coin");
        coinNode.setContentSize(20, 20);
        coinNode.setPosition(0, 35);
        coinNode.parent = parentPlatform;
        coinNode.zIndex = 2;

        var g = coinNode.addComponent(cc.Graphics);
        this._drawCoin(g);

        // 浮动动效
        cc.tween(coinNode)
            .repeatForever(
                cc
                    .tween(coinNode)
                    .to(0.6, { y: 40 }, { easing: "sineInOut" })
                    .to(0.6, { y: 30 }, { easing: "sineInOut" })
            )
            .start();

        return coinNode;
    }

    /**
     * 绘制金币
     */
    private _drawCoin(g: cc.Graphics): void {
        // 外圈 (金色)
        g.fillColor = cc.color(255, 210, 60);
        g.circle(0, 0, 10);
        g.fill();
        // 描边
        g.strokeColor = cc.color(200, 160, 30);
        g.lineWidth = 2;
        g.circle(0, 0, 10);
        g.stroke();
        // 内圈高光
        g.fillColor = cc.color(255, 235, 120);
        g.circle(-2, 2, 5);
        g.fill();
        // 星形标记
        g.strokeColor = cc.color(200, 160, 30);
        g.lineWidth = 1.5;
        g.moveTo(0, -5);
        g.lineTo(0, 5);
        g.stroke();
        g.moveTo(-4, 0);
        g.lineTo(4, 0);
        g.stroke();
    }

    /**
     * 回收屏幕下方平台
     */
    private _recyclePlatforms(): void {
        var cfg = DoodleControl.instance.config;
        var bottomEdge = this._cameraY - cfg.recycleBelow;
        var i = this._activePlatforms.length;
        while (--i >= 0) {
            if (this._activePlatforms[i].data.y < bottomEdge) {
                var plat = this._activePlatforms[i];
                if (plat.node.isValid) plat.node.destroy();
                this._activePlatforms.splice(i, 1);
            }
        }
    }

    // ===================== 渲染更新 =====================

    /**
     * 更新 GameLayer 位置 (摄像机滚动)
     */
    private _updateGameLayerPosition(): void {
        if (this._gameLayer) {
            this._gameLayer.y = -this._cameraY;
        }
        if (this._playerNode) {
            this._playerNode.y = this._playerWorldY;
        }
    }

    // ===================== 输入处理 =====================

    private _onKeyDown(event: cc.Event.EventKeyboard): void {
        if (this._isGameOver) return;
        if (event.keyCode === cc.macro.KEY.a || event.keyCode === cc.macro.KEY.left) {
            this._keyLeft = true;
        } else if (event.keyCode === cc.macro.KEY.d || event.keyCode === cc.macro.KEY.right) {
            this._keyRight = true;
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
        this._touchX = this.node.convertToNodeSpaceAR(loc).x;
    }

    private _onTouchMove(event: cc.Event.EventTouch): void {
        if (this._isGameOver) return;
        var loc = event.getLocation();
        this._touchX = this.node.convertToNodeSpaceAR(loc).x;
    }

    private _onTouchEnd(_event: cc.Event.EventTouch): void {
        this._isTouching = false;
    }

    // ===================== 游戏流程 =====================

    /**
     * 游戏结束
     */
    private _gameOver(): void {
        if (this._isGameOver) return;
        this._isGameOver = true;
        Logger.getInstance().info("Doodle", "游戏结束, 分数: " + DoodleControl.instance.score);

        // 屏幕震动
        this._shakeScreen();

        // 角色下落消失
        if (this._playerNode && this._playerNode.isValid) {
            cc.tween(this._playerNode)
                .to(0.4, { y: this._playerNode.y - 300, opacity: 0 }, { easing: "sineIn" })
                .start();
        }

        // 延迟弹出结算
        this.scheduleOnce(function () {
            if (this.settlement) {
                this.settlement.show(false, DoodleControl.instance.score, function () {
                    GameCenter.instance.enterGame("DOODLE");
                });
            } else {
                GameCenter.instance.returnToHome();
            }
        }, 0.8);
    }

    /**
     * 屏幕震动效果
     */
    private _shakeScreen(): void {
        var ox = this.node.x;
        var oy = this.node.y;
        cc.tween(this.node)
            .to(0.04, { x: ox - 8, y: oy + 5 })
            .to(0.04, { x: ox + 8, y: oy - 5 })
            .to(0.04, { x: ox - 5, y: oy + 3 })
            .to(0.04, { x: ox + 5, y: oy - 3 })
            .to(0.04, { x: ox - 2, y: oy + 1 })
            .to(0.04, { x: ox, y: oy })
            .start();
    }

    private _onBtnBack(): void {
        if (this._isGameOver) return;
        this._isGameOver = true;
        Logger.getInstance().info("Doodle", "用户返回");
        this.scheduleOnce(function () {
            GameCenter.instance.returnToHome();
        }, 0.1);
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
        this._drawAllPlatforms(theme);
        this._drawHUD(theme);
        this._drawButtons(theme);
        this._drawClouds(theme);

        // 角色重绘
        if (this._playerComp) {
            this._playerComp.redraw(
                [theme.gameArea.entityPrimary[0], theme.gameArea.entityPrimary[1], theme.gameArea.entityPrimary[2]],
                [
                    theme.gameArea.entitySecondary[0],
                    theme.gameArea.entitySecondary[1],
                    theme.gameArea.entitySecondary[2],
                ]
            );
        }
    }

    // ===================== UI 构建 =====================

    /**
     * 隐藏预制体遗留的旧节点
     */
    private _hideOldPrefabNodes(): void {
        var names = ["GameArea", "HUD", "Background", "Player", "PlatformContainer"];
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
     * 构建游戏层 (平台+角色, 带裁剪遮罩)
     */
    private _buildGameLayer(): void {
        // 裁剪容器
        var clipNode = this._ensureChild("GameClip", this.node, DESIGN_W, DESIGN_H);
        clipNode.zIndex = 0;
        clipNode.setPosition(0, 0);
        var mask = clipNode.getComponent(cc.Mask);
        if (!mask) {
            mask = clipNode.addComponent(cc.Mask);
            mask.type = cc.Mask.Type.RECT;
        }

        this._gameLayer = this._ensureChild("GameLayer", clipNode, DESIGN_W, DESIGN_H * 3);
        this._gameLayer.zIndex = 0;
        this._gameLayer.setPosition(0, 0);

        // 云朵层
        this._cloudLayer = this._ensureChild("CloudLayer", this._gameLayer, 0, 0);
        this._cloudLayer.zIndex = -5;

        this._platformContainer = this._ensureChild("PlatformContainer", this._gameLayer, 0, 0);
        this._platformContainer.setPosition(0, 0);

        // 拖尾容器
        this._trailContainer = this._ensureChild("TrailContainer", this._gameLayer, 0, 0);
        this._trailContainer.zIndex = 5;

        // 推进线
        this._pushLineNode = this._ensureChild("PushLine", this._gameLayer, DESIGN_W, DESIGN_H);
        this._pushLineNode.zIndex = 8;
        this._pushLineNode.y = this._pushLineY;
        this._pushLineGfx = UIGraphicsHelper.ensureGraphics(this._pushLineNode);
    }

    /**
     * 构建角色
     */
    private _buildPlayer(): void {
        var cfg = DoodleControl.instance.config;
        this._playerNode = this._ensureChild("Player", this._gameLayer, cfg.playerWidth, cfg.playerHeight);
        this._playerNode.setPosition(0, 0);
        this._playerNode.zIndex = 10;

        // 挂载角色组件
        this._playerComp = this._playerNode.getComponent(PrefabGameDoodlePlayer);
        if (!this._playerComp) {
            this._playerComp = this._playerNode.addComponent(PrefabGameDoodlePlayer);
        }
    }

    /**
     * 构建 HUD
     */
    private _buildHUD(): void {
        this._hudPanelNode = this._ensureChild("HudPanel", this.node, 500, 60);
        this._hudPanelNode.setPosition(0, DESIGN_H / 2 - 40);
        this._hudPanelNode.zIndex = 10;
        UIGraphicsHelper.ensureGraphics(this._hudPanelNode);

        // 标题
        var titleNode = this._ensureChild("TitleLabel", this._hudPanelNode, 200, 40);
        titleNode.setPosition(0, 0);
        this._titleLabel = this._ensureLabel(titleNode, "涂鸦跳跃", 28);

        // 分数 (左侧)
        var scoreNode = this._ensureChild("ScoreLabel", this.node, 200, 40);
        scoreNode.setPosition(-DESIGN_W / 2 + 130, DESIGN_H / 2 - 40);
        scoreNode.zIndex = 11;
        this._scoreLabel = this._ensureLabel(scoreNode, "分数: 0", 24);

        // 高度 (右侧)
        var heightNode = this._ensureChild("HeightLabel", this.node, 200, 40);
        heightNode.setPosition(DESIGN_W / 2 - 130, DESIGN_H / 2 - 40);
        heightNode.zIndex = 11;
        this._heightLabel = this._ensureLabel(heightNode, "高度: 0m", 24);
    }

    /**
     * 构建按钮 (返回 + 换肤)
     */
    private _buildButtons(): void {
        // 返回按钮
        this._btnBackNode = this._ensureChild("BtnBack", this.node, 100, 40);
        this._btnBackNode.setPosition(-DESIGN_W / 2 + 70, DESIGN_H / 2 - 85);
        this._btnBackNode.zIndex = 15;
        UIGraphicsHelper.ensureGraphics(this._btnBackNode);
        this._ensureLabel(this._btnBackNode, "← 返回", 22);
        this._btnBackNode.on(cc.Node.EventType.TOUCH_END, this._onBtnBack, this);

        // 换肤按钮
        this._btnThemeNode = this._ensureChild("BtnTheme", this.node, 150, 40);
        this._btnThemeNode.setPosition(DESIGN_W / 2 - 100, DESIGN_H / 2 - 85);
        this._btnThemeNode.zIndex = 15;
        UIGraphicsHelper.ensureGraphics(this._btnThemeNode);
        this._themeLabel = this._ensureLabel(this._btnThemeNode, "🎨 " + UIThemeManager.current.name, 20);
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
     * 绘制单个平台
     */
    private _drawPlatform(gfx: cc.Graphics, type: PlatformType, w: number, h: number): void {
        gfx.clear();
        var theme = UIThemeManager.current;

        var halfW = w / 2;
        var halfH = h / 2;
        var radius = 8;

        switch (type) {
            case PlatformType.Normal:
            case PlatformType.Moving:
                this._drawNormalPlatform(gfx, halfW, halfH, w, h, radius, theme, type === PlatformType.Moving);
                break;
            case PlatformType.Breakable:
                this._drawBreakablePlatform(gfx, halfW, halfH, w, h, radius, theme);
                break;
            case PlatformType.Spring:
                this._drawSpringPlatform(gfx, halfW, halfH, w, h, radius, theme);
                break;
        }
    }

    /**
     * 绘制普通/移动平台
     */
    private _drawNormalPlatform(
        gfx: cc.Graphics,
        halfW: number,
        halfH: number,
        w: number,
        h: number,
        radius: number,
        theme: IUITheme,
        isMoving: boolean
    ): void {
        // 底部阴影
        var shadowColor = UIThemeManager.darken(theme.gameArea.primary, 60);
        gfx.fillColor = cc.color(shadowColor[0], shadowColor[1], shadowColor[2], 80);
        UIGraphicsHelper.roundRect(gfx, -halfW + 2, -halfH - 3, w, h, radius);
        gfx.fill();

        // 实心平台
        gfx.fillColor = UIThemeManager.toColor(theme.gameArea.primary);
        UIGraphicsHelper.roundRect(gfx, -halfW, -halfH, w, h, radius);
        gfx.fill();

        // 描边
        gfx.strokeColor = UIThemeManager.toColor(UIThemeManager.darken(theme.gameArea.primary, 40));
        gfx.lineWidth = 2.5;
        UIGraphicsHelper.roundRect(gfx, -halfW, -halfH, w, h, radius);
        gfx.stroke();

        // 顶部高光线
        gfx.strokeColor = UIThemeManager.toColor(UIThemeManager.lighten(theme.gameArea.primary, 60));
        gfx.lineWidth = 2;
        gfx.moveTo(-halfW + radius + 2, halfH - 2);
        gfx.lineTo(halfW - radius - 2, halfH - 2);
        gfx.stroke();

        // 小草装饰 (顶部)
        var grassColor = UIThemeManager.lighten(theme.gameArea.primary, 25);
        gfx.strokeColor = cc.color(grassColor[0], grassColor[1], grassColor[2]);
        gfx.lineWidth = 2;
        for (var gi = 0; gi < 4; gi++) {
            var gx = -halfW + 15 + (gi * (w - 30)) / 3;
            gfx.moveTo(gx, halfH);
            gfx.lineTo(gx + (Math.random() - 0.5) * 6, halfH + 5 + Math.random() * 4);
            gfx.stroke();
        }

        // 移动平台箭头标记
        if (isMoving) {
            gfx.strokeColor = UIThemeManager.toColor(theme.gameArea.highlight);
            gfx.lineWidth = 2;
            // 左箭头
            gfx.moveTo(-halfW + 8, 0);
            gfx.lineTo(-halfW + 14, 4);
            gfx.moveTo(-halfW + 8, 0);
            gfx.lineTo(-halfW + 14, -4);
            gfx.stroke();
            // 右箭头
            gfx.moveTo(halfW - 8, 0);
            gfx.lineTo(halfW - 14, 4);
            gfx.moveTo(halfW - 8, 0);
            gfx.lineTo(halfW - 14, -4);
            gfx.stroke();
        }
    }

    /**
     * 绘制破碎平台
     */
    private _drawBreakablePlatform(
        gfx: cc.Graphics,
        halfW: number,
        halfH: number,
        w: number,
        h: number,
        radius: number,
        theme: IUITheme
    ): void {
        var brkColor = UIThemeManager.darken(theme.gameArea.secondary, 10);
        gfx.fillColor = cc.color(brkColor[0], brkColor[1], brkColor[2], 140);
        UIGraphicsHelper.roundRect(gfx, -halfW, -halfH, w, h, radius);
        gfx.fill();

        // 虚线描边
        gfx.strokeColor = UIThemeManager.toColor(UIThemeManager.darken(brkColor, 50));
        gfx.lineWidth = 2;
        UIGraphicsHelper.roundRect(gfx, -halfW, -halfH, w, h, radius);
        gfx.stroke();

        // 裂纹线条
        gfx.strokeColor = UIThemeManager.toColor(UIThemeManager.darken(brkColor, 40));
        gfx.lineWidth = 1.5;
        gfx.moveTo(-halfW * 0.4, halfH);
        gfx.lineTo(-halfW * 0.05, 0);
        gfx.lineTo(halfW * 0.15, halfH);
        gfx.stroke();
        gfx.moveTo(halfW * 0.05, halfH * 0.5);
        gfx.lineTo(halfW * 0.4, -halfH);
        gfx.stroke();
        gfx.moveTo(halfW * 0.2, 0);
        gfx.lineTo(halfW * 0.35, halfH * 0.3);
        gfx.stroke();
    }

    /**
     * 绘制弹簧平台
     */
    private _drawSpringPlatform(
        gfx: cc.Graphics,
        halfW: number,
        halfH: number,
        w: number,
        h: number,
        radius: number,
        theme: IUITheme
    ): void {
        // 底部阴影
        var shadowColor = UIThemeManager.darken(theme.gameArea.primary, 60);
        gfx.fillColor = cc.color(shadowColor[0], shadowColor[1], shadowColor[2], 80);
        UIGraphicsHelper.roundRect(gfx, -halfW + 2, -halfH - 3, w, h, radius);
        gfx.fill();

        // 平台本体
        gfx.fillColor = UIThemeManager.toColor(theme.gameArea.primary);
        UIGraphicsHelper.roundRect(gfx, -halfW, -halfH, w, h, radius);
        gfx.fill();

        // 描边
        gfx.strokeColor = UIThemeManager.toColor(UIThemeManager.darken(theme.gameArea.primary, 40));
        gfx.lineWidth = 2.5;
        UIGraphicsHelper.roundRect(gfx, -halfW, -halfH, w, h, radius);
        gfx.stroke();

        // 弹簧底座 (高亮色)
        var hlColor = theme.gameArea.highlight;
        gfx.fillColor = UIThemeManager.toColor(hlColor);
        UIGraphicsHelper.roundRect(gfx, -14, halfH - 1, 28, 8, 3);
        gfx.fill();

        // 弹簧螺旋
        gfx.strokeColor = UIThemeManager.toColor(hlColor);
        gfx.lineWidth = 3;
        gfx.moveTo(-10, halfH + 7);
        gfx.lineTo(10, halfH + 12);
        gfx.lineTo(-10, halfH + 17);
        gfx.lineTo(10, halfH + 22);
        gfx.lineTo(-10, halfH + 27);
        gfx.stroke();

        // 弹簧箭头尖端
        gfx.fillColor = UIThemeManager.toColor(hlColor);
        gfx.moveTo(-12, halfH + 27);
        gfx.lineTo(12, halfH + 27);
        gfx.lineTo(0, halfH + 38);
        gfx.close();
        gfx.fill();
    }

    /**
     * 重绘所有平台 (换肤时)
     */
    private _drawAllPlatforms(_theme: IUITheme): void {
        var cfg = DoodleControl.instance.config;
        for (var i = 0; i < this._activePlatforms.length; i++) {
            var plat = this._activePlatforms[i];
            this._drawPlatform(plat.gfx, plat.data.type, cfg.platformWidth, cfg.platformHeight);
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
                60,
                theme.hud.panelBg,
                theme.hud.panelRadius,
                theme.gameArea.secondary
            );
        }
        if (this._titleLabel) {
            this._titleLabel.node.color = UIThemeManager.toColor(theme.hud.primaryText);
        }
        if (this._scoreLabel) {
            this._scoreLabel.node.color = UIThemeManager.toColor(theme.hud.accentText);
        }
        if (this._heightLabel) {
            this._heightLabel.node.color = UIThemeManager.toColor(theme.hud.secondaryText);
        }
    }

    /**
     * 绘制按钮
     */
    private _drawButtons(theme: IUITheme): void {
        if (this._btnBackNode) {
            var g1 = this._btnBackNode.getComponent(cc.Graphics);
            if (g1) UIGraphicsHelper.drawButton(g1, 100, 40, theme.btn.bg, theme.btn.radius);
            var label1 = this._btnBackNode.getComponentInChildren(cc.Label);
            if (label1) label1.node.color = UIThemeManager.toColor(theme.btn.text);
        }
        if (this._btnThemeNode) {
            var g2 = this._btnThemeNode.getComponent(cc.Graphics);
            if (g2) UIGraphicsHelper.drawButton(g2, 150, 40, theme.btn.bg, theme.btn.radius);
            if (this._themeLabel) this._themeLabel.node.color = UIThemeManager.toColor(theme.btn.text);
        }
    }

    // ===================== 云朵装饰 =====================

    /**
     * 在指定范围内生成装饰云朵
     */
    private _generateClouds(fromY: number, toY: number): void {
        if (!this._cloudLayer) return;
        var theme = UIThemeManager.current;
        var y = fromY;
        while (y < toY) {
            y += 200 + Math.random() * 300;
            var cloudNode = new cc.Node("Cloud");
            cloudNode.setPosition(-DESIGN_W / 2 + Math.random() * DESIGN_W, y);
            cloudNode.parent = this._cloudLayer;
            cloudNode.opacity = 60 + Math.floor(Math.random() * 60);

            var g = cloudNode.addComponent(cc.Graphics);
            var cw = 40 + Math.random() * 60;
            var ch = 15 + Math.random() * 15;
            this._drawCloud(g, cw, ch, theme);

            this._clouds.push({ node: cloudNode, worldY: y });
        }
    }

    /**
     * 绘制单个云朵
     */
    private _drawCloud(g: cc.Graphics, w: number, h: number, theme: IUITheme): void {
        var color = UIThemeManager.lighten(theme.background.topColor, 60);
        g.fillColor = cc.color(color[0], color[1], color[2], 120);
        g.ellipse(0, 0, w, h);
        g.fill();
        g.ellipse(-w * 0.5, h * 0.1, w * 0.6, h * 0.7);
        g.fill();
        g.ellipse(w * 0.4, h * 0.05, w * 0.5, h * 0.6);
        g.fill();
    }

    /**
     * 绘制所有云朵 (换肤时)
     */
    private _drawClouds(theme: IUITheme): void {
        for (var i = 0; i < this._clouds.length; i++) {
            var cloud = this._clouds[i];
            if (cloud.node.isValid) {
                var g = cloud.node.getComponent(cc.Graphics);
                if (g) {
                    g.clear();
                    this._drawCloud(g, 40 + Math.random() * 60, 15 + Math.random() * 15, theme);
                }
            }
        }
    }

    /**
     * 更新云朵: 回收远低于屏幕的，生成新的到上方
     */
    private _updateClouds(): void {
        var bottomEdge = this._cameraY - DESIGN_H;
        var topEdge = this._cameraY + DESIGN_H * 2;

        // 回收
        var i = this._clouds.length;
        while (--i >= 0) {
            if (this._clouds[i].worldY < bottomEdge) {
                if (this._clouds[i].node.isValid) this._clouds[i].node.destroy();
                this._clouds.splice(i, 1);
            }
        }

        // 检查是否需要在上方生成新云朵
        var maxCloudY = 0;
        for (var j = 0; j < this._clouds.length; j++) {
            if (this._clouds[j].worldY > maxCloudY) maxCloudY = this._clouds[j].worldY;
        }
        if (maxCloudY < topEdge) {
            this._generateClouds(maxCloudY, topEdge);
        }
    }

    // ===================== 特效 =====================

    /**
     * 得分飘字 (固定在 HUD 层，不随摄像机移动)
     */
    private _showScorePop(worldX: number, worldY: number, text: string): void {
        var theme = UIThemeManager.current;
        // 将世界坐标转为屏幕坐标 (在 this.node 空间下)
        var screenY = worldY - this._cameraY;

        var popNode = new cc.Node("ScorePop");
        popNode.setPosition(worldX, screenY);
        popNode.parent = this.node;
        popNode.zIndex = 20;

        var label = popNode.addComponent(cc.Label);
        label.string = text;
        label.fontSize = 28;
        label.lineHeight = 32;
        label.enableBold = true;
        popNode.color = UIThemeManager.toColor(theme.fx.scorePopColor);

        // 放大弹入 + 上飘消失
        popNode.scale = 0.5;
        cc.tween(popNode)
            .to(0.1, { scale: 1.2 })
            .to(0.1, { scale: 1.0 })
            .to(0.4, { y: screenY + 50, opacity: 0 })
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
}
