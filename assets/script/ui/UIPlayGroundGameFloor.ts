import { IUITheme, RGBA, UIThemeManager } from "../config/UITheme";
import { FloorControl, FloorPlatformType, IFloorPlatformData } from "../logic/FloorControl";
import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";
import { UIGraphicsHelper } from "../logic/UIGraphicsHelper";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

// ===================== 布局常量 =====================
/** 设计分辨率 */
const DESIGN_W = 960;
const DESIGN_H = 640;

/** 平台颜色表 (按类型索引) */
const PLATFORM_STYLE: { main: RGBA; light: RGBA; dark: RGBA }[] = [
    // 0 NORMAL - 绿系
    { main: [100, 200, 130], light: [160, 235, 180], dark: [60, 150, 90] },
    // 1 SPIKE - 红系
    { main: [220, 70, 70], light: [255, 140, 130], dark: [160, 40, 40] },
    // 2 BREAKABLE - 黄系
    { main: [230, 200, 80], light: [255, 235, 150], dark: [180, 150, 40] },
    // 3 CONVEYOR - 蓝系
    { main: [80, 160, 240], light: [140, 200, 255], dark: [40, 110, 190] },
];

/**
 * 下一百层主界面
 * 全代码构建 UI，不依赖物理引擎
 * 手动重力 + 平台碰撞检测 + 平台上升
 *
 * [Prefab 结构说明]
 * - UIPlayGroundGameFloor (挂载此脚本, size(960, 640))
 *   - BgGradient (cc.Graphics, size(960, 640), zIndex=-10)
 *   - GameArea (cc.Node, size(740, 620), zIndex=0)
 *     - AreaBorder (cc.Graphics)
 *     - PlatformContainer (cc.Node)
 *     - PlayerNode (cc.Node, zIndex=10)
 *       - PlayerGfx (cc.Graphics)
 *   - HudPanel (cc.Node, pos(0, 295), zIndex=10)
 *   - LivesPanel (cc.Node, zIndex=10)
 *   - ComboLabel (cc.Label, zIndex=12)
 *   - BtnBack (cc.Node, zIndex=15)
 *   - BtnTheme (cc.Node, zIndex=15)
 *   - WarningLine (cc.Graphics, zIndex=5)
 */
@ccclass
export default class UIPlayGroundGameFloor extends cc.Component {
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
    /** 平台容器 */
    private _platformContainer: cc.Node = null;
    /** 角色节点 */
    private _playerNode: cc.Node = null;
    /** 角色 Graphics */
    private _playerGfx: cc.Graphics = null;
    /** HUD 面板节点 */
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
    /** 天花板警告线 */
    private _warningGfx: cc.Graphics = null;

    // ===== 平台节点映射 =====
    /** 平台 id → 节点 */
    private _platformNodeMap: { [id: number]: cc.Node } = {};

    // ===== 游戏状态 =====
    /** 游戏是否结束 */
    private _isGameOver: boolean = false;

    // ===== 输入状态 =====
    /** 键盘左键按下 */
    private _keyLeft: boolean = false;
    /** 键盘右键按下 */
    private _keyRight: boolean = false;
    /** 触摸目标 X */
    private _touchTargetX: number = 0;
    /** 是否正在触摸 */
    private _isTouching: boolean = false;

    // ===== 特效状态 =====
    /** 屏幕震动偏移 */
    private _shakeOffset: number = 0;
    /** 屏幕震动计时 */
    private _shakeTimer: number = 0;
    /** 角色无敌闪烁计时 */
    private _blinkTimer: number = 0;
    /** 角色朝向 (1=右, -1=左) */
    private _playerFacing: number = 1;
    /** 角色是否在空中 (控制腿部动画) */
    private _playerInAir: boolean = false;

    // ===================== 生命周期 =====================

    onLoad(): void {
        UIThemeManager.init();

        // 隐藏预制体遗留节点
        this.node.children.forEach((c) => {
            if (c.name !== "Settlement") c.active = false;
        });

        // 构建 UI
        this._buildUI();

        // 初始化控制器并开始游戏
        FloorControl.instance.startGame();
        this._syncInitialPlatforms();

        // 绑定输入
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);

        // 触摸输入 (游戏区域)
        this._gameArea.on(cc.Node.EventType.TOUCH_START, this._onTouchStart, this);
        this._gameArea.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this._gameArea.on(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this._gameArea.on(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);

        Logger.getInstance().info("Floor", "下一百层 UI 构建完成");
    }

    onDestroy(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
        if (this._gameArea) {
            this._gameArea.off(cc.Node.EventType.TOUCH_START, this._onTouchStart, this);
            this._gameArea.off(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
            this._gameArea.off(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
            this._gameArea.off(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
        }
    }

    update(dt: number): void {
        if (this._isGameOver) return;

        const ctrl = FloorControl.instance;
        if (ctrl.isGameOver) {
            this._doGameOver();
            return;
        }

        // 计算移动方向
        let moveDir = 0;
        if (this._keyLeft) moveDir = -1;
        if (this._keyRight) moveDir = 1;
        if (this._isTouching) {
            const worldPos = this._gameArea.convertToWorldSpaceAR(cc.v2(0, 0));
            const localTouchX = this._touchTargetX - worldPos.x;
            const playerX = ctrl.playerX;
            if (Math.abs(localTouchX - playerX) > 15) {
                moveDir = localTouchX > playerX ? 1 : -1;
            }
        }

        // 更新朝向
        if (moveDir !== 0) {
            this._playerFacing = moveDir;
        }

        // 逻辑 tick
        const result = ctrl.tick(dt, moveDir);

        // 处理新增平台
        for (const p of result.added) {
            this._createPlatformNode(p);
        }

        // 处理移除平台
        for (const id of result.removed) {
            this._removePlatformNode(id);
        }

        // 同步所有平台位置
        this._syncPlatformPositions();

        // 同步角色位置
        this._playerNode.x = ctrl.playerX;
        this._playerNode.y = ctrl.playerY;
        this._playerInAir = !ctrl.onPlatform;

        // 角色朝向
        this._playerNode.scaleX = this._playerFacing;

        // 无敌闪烁
        if (ctrl.isInvincible) {
            this._blinkTimer += dt;
            this._playerNode.opacity = Math.sin(this._blinkTimer * 15) > 0 ? 255 : 80;
        } else {
            this._blinkTimer = 0;
            this._playerNode.opacity = 255;
        }

        // 踩到尖刺特效
        if (result.hitSpike) {
            this._triggerShake(0.3, 6);
            this._showFloatText("💀 尖刺!", [255, 80, 80], ctrl.playerX, ctrl.playerY + 40);
            this._updateLives();
        }

        // 踩碎平台特效
        if (result.brokeFloor) {
            this._showFloatText("碎裂!", [230, 200, 80], ctrl.playerX, ctrl.playerY - 30);
        }

        // 更新 HUD
        this._scoreLabel.string = ctrl.score.toString();
        this._updateCombo(ctrl.combo);

        // 震动效果
        if (this._shakeTimer > 0) {
            this._shakeTimer -= dt;
            this._shakeOffset = (Math.random() - 0.5) * 2 * 6 * (this._shakeTimer / 0.3);
            this._gameArea.x = this._shakeOffset;
        } else {
            this._gameArea.x = 0;
        }

        // 重绘角色 (简单帧动画)
        this._drawPlayer();

        // 检测游戏结束
        if (ctrl.isGameOver) {
            this._doGameOver();
        }
    }

    // ===================== UI 构建 =====================

    /**
     * 构建完整 UI
     */
    private _buildUI(): void {
        const theme = UIThemeManager.current;
        this.node.setContentSize(DESIGN_W, DESIGN_H);

        // 1. 渐变背景
        this._buildBackground(theme);
        // 2. 游戏区域
        this._buildGameArea(theme);
        // 3. 天花板警告线
        this._buildWarningLine(theme);
        // 4. HUD
        this._buildHUD(theme);
        // 5. 生命心形
        this._buildLivesPanel(theme);
        // 6. 连击标签
        this._buildComboLabel(theme);
        // 7. 返回按钮
        this._buildBtnBack(theme);
        // 8. 换肤按钮
        this._buildBtnTheme(theme);
        // 9. 角色
        this._buildPlayer(theme);
    }

    /**
     * 构建渐变背景
     */
    private _buildBackground(theme: IUITheme): void {
        const bgNode = new cc.Node("BgGradient");
        bgNode.setContentSize(DESIGN_W, DESIGN_H);
        bgNode.zIndex = -10;
        bgNode.parent = this.node;
        const g = bgNode.addComponent(cc.Graphics);
        this._bgGfx = g;
        UIGraphicsHelper.fillGradientRect(
            g,
            DESIGN_W,
            DESIGN_H,
            theme.background.topColor,
            theme.background.bottomColor
        );
    }

    /**
     * 构建游戏区域
     */
    private _buildGameArea(theme: IUITheme): void {
        const cfg = FloorControl.instance.config;
        const areaW = cfg.areaHalfWidth * 2;
        const areaH = cfg.areaHalfHeight * 2;

        const area = new cc.Node("GameArea");
        area.setContentSize(areaW, areaH);
        area.zIndex = 0;
        area.parent = this.node;
        this._gameArea = area;

        // 边框
        const borderNode = new cc.Node("AreaBorder");
        borderNode.parent = area;
        const borderGfx = borderNode.addComponent(cc.Graphics);
        this._areaBorderGfx = borderGfx;
        this._drawAreaBorder(borderGfx, areaW, areaH, theme);

        // 平台容器
        const platContainer = new cc.Node("PlatformContainer");
        platContainer.parent = area;
        this._platformContainer = platContainer;
    }

    /**
     * 绘制游戏区域边框
     */
    private _drawAreaBorder(g: cc.Graphics, w: number, h: number, theme: IUITheme): void {
        g.clear();
        // 半透明底色
        const bgColor = UIThemeManager.darken(theme.gameArea.primary, 40);
        g.fillColor = UIThemeManager.toColor([bgColor[0], bgColor[1], bgColor[2], 60]);
        UIGraphicsHelper.roundRect(g, -w / 2, -h / 2, w, h, 12);
        g.fill();
        // 描边
        g.strokeColor = UIThemeManager.toColor(theme.gameArea.secondary);
        g.lineWidth = 3;
        UIGraphicsHelper.roundRect(g, -w / 2, -h / 2, w, h, 12);
        g.stroke();
    }

    /**
     * 构建天花板警告线 (顶部闪烁红线)
     */
    private _buildWarningLine(theme: IUITheme): void {
        const cfg = FloorControl.instance.config;
        const warnNode = new cc.Node("WarningLine");
        warnNode.y = cfg.areaHalfHeight - 10;
        warnNode.zIndex = 5;
        warnNode.parent = this._gameArea;
        const g = warnNode.addComponent(cc.Graphics);
        this._warningGfx = g;
        g.strokeColor = cc.color(255, 50, 50, 120);
        g.lineWidth = 2;
        const halfW = cfg.areaHalfWidth;
        // 虚线效果
        for (let x = -halfW; x < halfW; x += 20) {
            g.moveTo(x, 0);
            g.lineTo(x + 10, 0);
        }
        g.stroke();
    }

    /**
     * 构建 HUD
     */
    private _buildHUD(theme: IUITheme): void {
        const hudNode = new cc.Node("HudPanel");
        hudNode.y = 295;
        hudNode.zIndex = 10;
        hudNode.parent = this.node;
        this._hudPanelNode = hudNode;

        // HUD 背景
        const hudGfx = hudNode.addComponent(cc.Graphics);
        UIGraphicsHelper.drawHudPanel(hudGfx, 360, 50, theme.hud.panelBg, theme.hud.panelRadius);

        // 标题
        const titleNode = new cc.Node("Title");
        titleNode.x = -110;
        titleNode.parent = hudNode;
        const titleLabel = titleNode.addComponent(cc.Label);
        titleLabel.string = "🏢 下一百层";
        titleLabel.fontSize = 22;
        titleLabel.lineHeight = 30;
        titleLabel.enableBold = true;
        titleNode.color = UIThemeManager.toColor(theme.hud.primaryText);
        this._titleLabel = titleLabel;

        // 分数
        const scoreNode = new cc.Node("Score");
        scoreNode.x = 60;
        scoreNode.parent = hudNode;
        const scoreLabel = scoreNode.addComponent(cc.Label);
        scoreLabel.string = "0";
        scoreLabel.fontSize = theme.hud.primaryFontSize;
        scoreLabel.lineHeight = 50;
        scoreLabel.enableBold = true;
        scoreNode.color = UIThemeManager.toColor(theme.hud.accentText);
        this._scoreLabel = scoreLabel;
    }

    /**
     * 构建生命面板
     */
    private _buildLivesPanel(theme: IUITheme): void {
        const livesNode = new cc.Node("LivesPanel");
        livesNode.y = 260;
        livesNode.x = -400;
        livesNode.zIndex = 10;
        livesNode.parent = this.node;
        this._livesPanel = livesNode;
        this._updateLives();
    }

    /**
     * 更新生命显示
     */
    private _updateLives(): void {
        const ctrl = FloorControl.instance;
        // 清除旧的心形
        this._livesPanel.removeAllChildren();
        for (let i = 0; i < ctrl.lives; i++) {
            const heartNode = new cc.Node("Heart" + i);
            heartNode.x = i * 32;
            heartNode.parent = this._livesPanel;
            const label = heartNode.addComponent(cc.Label);
            label.string = "❤️";
            label.fontSize = 24;
            label.lineHeight = 30;
        }
    }

    /**
     * 构建连击标签
     */
    private _buildComboLabel(theme: IUITheme): void {
        const comboNode = new cc.Node("ComboLabel");
        comboNode.y = 220;
        comboNode.zIndex = 12;
        comboNode.parent = this.node;
        const label = comboNode.addComponent(cc.Label);
        label.string = "";
        label.fontSize = theme.hud.accentFontSize;
        label.lineHeight = 44;
        label.enableBold = true;
        comboNode.color = UIThemeManager.toColor(theme.fx.comboColor);
        comboNode.opacity = 0;
        this._comboLabel = label;
    }

    /**
     * 更新连击显示
     */
    private _updateCombo(combo: number): void {
        if (combo >= 3) {
            this._comboLabel.string = `🔥 ${combo} 连击!`;
            this._comboLabel.node.opacity = 255;
            this._comboLabel.node.scale = 1.0;
            // 弹性动画
            cc.tween(this._comboLabel.node).to(0.1, { scale: 1.3 }).to(0.1, { scale: 1.0 }).start();
        } else {
            this._comboLabel.node.opacity = 0;
        }
    }

    /**
     * 构建返回按钮
     */
    private _buildBtnBack(theme: IUITheme): void {
        const btnNode = new cc.Node("BtnBack");
        btnNode.setContentSize(100, 44);
        btnNode.x = -400;
        btnNode.y = 295;
        btnNode.zIndex = 15;
        btnNode.parent = this.node;
        this._btnBackNode = btnNode;

        // 绘制按钮背景
        const g = btnNode.addComponent(cc.Graphics);
        UIGraphicsHelper.drawButton(g, 100, 44, theme.btn.bg, theme.btn.radius);

        // 文字
        const labelNode = new cc.Node("BtnLabel");
        labelNode.parent = btnNode;
        const label = labelNode.addComponent(cc.Label);
        label.string = "返回";
        label.fontSize = theme.btn.fontSize;
        label.lineHeight = 44;
        label.enableBold = true;
        labelNode.color = UIThemeManager.toColor(theme.btn.text);

        // 点击
        btnNode.on(cc.Node.EventType.TOUCH_END, this._onBtnBack, this);
    }

    /**
     * 构建换肤按钮
     */
    private _buildBtnTheme(theme: IUITheme): void {
        const btnNode = new cc.Node("BtnTheme");
        btnNode.setContentSize(120, 44);
        btnNode.x = 400;
        btnNode.y = 295;
        btnNode.zIndex = 15;
        btnNode.parent = this.node;
        this._btnThemeNode = btnNode;

        const g = btnNode.addComponent(cc.Graphics);
        UIGraphicsHelper.drawButton(g, 120, 44, theme.btn.bg, theme.btn.radius);

        const labelNode = new cc.Node("ThemeLabel");
        labelNode.parent = btnNode;
        const label = labelNode.addComponent(cc.Label);
        label.string = "🎨 " + theme.name;
        label.fontSize = 20;
        label.lineHeight = 44;
        label.enableBold = true;
        labelNode.color = UIThemeManager.toColor(theme.btn.text);
        this._themeLabel = label;

        btnNode.on(cc.Node.EventType.TOUCH_END, this._onBtnTheme, this);
    }

    /**
     * 构建角色
     */
    private _buildPlayer(theme: IUITheme): void {
        const cfg = FloorControl.instance.config;
        const playerNode = new cc.Node("PlayerNode");
        playerNode.setContentSize(cfg.playerWidth, cfg.playerHeight);
        playerNode.x = 0;
        playerNode.y = cfg.areaHalfHeight - 80;
        playerNode.zIndex = 10;
        playerNode.parent = this._gameArea;
        this._playerNode = playerNode;

        const gfxNode = new cc.Node("PlayerGfx");
        gfxNode.parent = playerNode;
        const g = gfxNode.addComponent(cc.Graphics);
        this._playerGfx = g;
        this._drawPlayer();
    }

    /**
     * 绘制角色 (小人形状)
     */
    private _drawPlayer(): void {
        const g = this._playerGfx;
        const theme = UIThemeManager.current;
        const cfg = FloorControl.instance.config;
        const w = cfg.playerWidth;
        const h = cfg.playerHeight;
        g.clear();

        const bodyColor = theme.gameArea.entityPrimary;
        const accentColor = theme.gameArea.entitySecondary;

        // 身体 (圆角矩形)
        g.fillColor = UIThemeManager.toColor(bodyColor);
        UIGraphicsHelper.roundRect(g, -w * 0.35, -h * 0.1, w * 0.7, h * 0.55, 6);
        g.fill();

        // 头 (圆)
        g.fillColor = UIThemeManager.toColor(bodyColor);
        g.circle(0, h * 0.35, w * 0.25);
        g.fill();

        // 眼睛
        g.fillColor = cc.Color.WHITE;
        g.circle(w * 0.08, h * 0.38, w * 0.08);
        g.fill();
        g.fillColor = cc.color(30, 30, 30);
        g.circle(w * 0.1, h * 0.38, w * 0.04);
        g.fill();

        // 帽子 (小三角)
        g.fillColor = UIThemeManager.toColor(accentColor);
        g.moveTo(-w * 0.15, h * 0.52);
        g.lineTo(w * 0.15, h * 0.52);
        g.lineTo(0, h * 0.7);
        g.close();
        g.fill();

        // 腿 (两个小矩形)
        g.fillColor = UIThemeManager.toColor(accentColor);
        const legOffset = this._playerInAir ? 5 : 0;
        g.rect(-w * 0.25, -h * 0.45 - legOffset, w * 0.2, h * 0.25);
        g.fill();
        g.rect(w * 0.05, -h * 0.45 + legOffset, w * 0.2, h * 0.25);
        g.fill();
    }

    // ===================== 平台节点管理 =====================

    /**
     * 同步初始平台到节点
     */
    private _syncInitialPlatforms(): void {
        const ctrl = FloorControl.instance;
        for (const p of ctrl.platforms) {
            this._createPlatformNode(p);
        }
    }

    /**
     * 创建平台节点
     */
    private _createPlatformNode(p: IFloorPlatformData): void {
        const node = new cc.Node("Platform_" + p.id);
        node.setContentSize(p.width, p.height);
        node.x = p.x;
        node.y = p.y;
        node.parent = this._platformContainer;

        const g = node.addComponent(cc.Graphics);
        this._drawPlatform(g, p);

        // 尖刺平台: 添加小三角标记
        if (p.type === FloorPlatformType.SPIKE) {
            this._addSpikeDecor(node, p);
        }

        // 传送带平台: 添加箭头标记
        if (p.type === FloorPlatformType.CONVEYOR) {
            this._addConveyorDecor(node, p);
        }

        // 入场动效
        node.opacity = 0;
        node.scaleY = 0.3;
        cc.tween(node).to(0.2, { opacity: 255, scaleY: 1.0 }, { easing: "backOut" }).start();

        this._platformNodeMap[p.id] = node;
    }

    /**
     * 绘制平台
     */
    private _drawPlatform(g: cc.Graphics, p: IFloorPlatformData): void {
        const style = PLATFORM_STYLE[p.type] || PLATFORM_STYLE[0];
        const theme = UIThemeManager.current;
        const w = p.width;
        const h = p.height;

        g.clear();

        // 阴影
        g.fillColor = UIThemeManager.toColor(style.dark);
        UIGraphicsHelper.roundRect(g, -w / 2, -h / 2 - 3, w, h, 4);
        g.fill();

        // 主体
        g.fillColor = UIThemeManager.toColor(style.main);
        UIGraphicsHelper.roundRect(g, -w / 2, -h / 2, w, h, 4);
        g.fill();

        // 顶部高光线
        g.strokeColor = UIThemeManager.toColor(style.light);
        g.lineWidth = 2;
        g.moveTo(-w / 2 + 4, h / 2 - 1);
        g.lineTo(w / 2 - 4, h / 2 - 1);
        g.stroke();

        // 易碎平台: 裂纹效果
        if (p.type === FloorPlatformType.BREAKABLE) {
            g.strokeColor = UIThemeManager.toColor(style.dark);
            g.lineWidth = 1;
            // 裂纹线1
            g.moveTo(-w * 0.2, h * 0.3);
            g.lineTo(0, -h * 0.1);
            g.lineTo(w * 0.15, h * 0.2);
            g.stroke();
            // 裂纹线2
            g.moveTo(w * 0.1, h * 0.4);
            g.lineTo(w * 0.25, -h * 0.2);
            g.stroke();
        }
    }

    /**
     * 添加尖刺装饰
     */
    private _addSpikeDecor(parentNode: cc.Node, p: IFloorPlatformData): void {
        const spikeNode = new cc.Node("Spikes");
        spikeNode.parent = parentNode;
        const g = spikeNode.addComponent(cc.Graphics);
        g.fillColor = cc.color(200, 50, 50);
        const count = Math.floor(p.width / 18);
        const startX = -p.width / 2 + 9;
        for (let i = 0; i < count; i++) {
            const x = startX + i * 18;
            g.moveTo(x - 6, p.height / 2);
            g.lineTo(x, p.height / 2 + 10);
            g.lineTo(x + 6, p.height / 2);
            g.close();
            g.fill();
        }
    }

    /**
     * 添加传送带箭头装饰
     */
    private _addConveyorDecor(parentNode: cc.Node, p: IFloorPlatformData): void {
        const arrowNode = new cc.Node("Arrows");
        arrowNode.parent = parentNode;
        const g = arrowNode.addComponent(cc.Graphics);
        g.strokeColor = cc.color(200, 230, 255, 200);
        g.lineWidth = 2;
        const dir = p.conveyorDir;
        const count = 3;
        const spacing = p.width / (count + 1);
        for (let i = 0; i < count; i++) {
            const x = -p.width / 2 + spacing * (i + 1);
            g.moveTo(x - 6 * dir, 4);
            g.lineTo(x + 6 * dir, 0);
            g.lineTo(x - 6 * dir, -4);
            g.stroke();
        }
    }

    /**
     * 移除平台节点
     */
    private _removePlatformNode(id: number): void {
        const node = this._platformNodeMap[id];
        if (node && node.isValid) {
            // 淡出动画
            cc.tween(node)
                .to(0.15, { opacity: 0, scaleY: 0.2 })
                .call(() => {
                    if (node.isValid) node.destroy();
                })
                .start();
        }
        delete this._platformNodeMap[id];
    }

    /**
     * 同步所有平台位置
     */
    private _syncPlatformPositions(): void {
        const ctrl = FloorControl.instance;
        for (const p of ctrl.platforms) {
            const node = this._platformNodeMap[p.id];
            if (node && node.isValid) {
                node.x = p.x;
                node.y = p.y;

                // 易碎平台碎裂闪烁
                if (p.broken) {
                    node.opacity = Math.sin(p.breakTimer * 30) > 0 ? 200 : 50;
                }
            }
        }
    }

    // ===================== 输入处理 =====================

    /**
     * 键盘按下
     */
    private _onKeyDown(event: cc.Event.EventKeyboard): void {
        if (this._isGameOver) return;
        if (event.keyCode === cc.macro.KEY.a || event.keyCode === cc.macro.KEY.left) {
            this._keyLeft = true;
        } else if (event.keyCode === cc.macro.KEY.d || event.keyCode === cc.macro.KEY.right) {
            this._keyRight = true;
        }
    }

    /**
     * 键盘抬起
     */
    private _onKeyUp(event: cc.Event.EventKeyboard): void {
        if (event.keyCode === cc.macro.KEY.a || event.keyCode === cc.macro.KEY.left) {
            this._keyLeft = false;
        } else if (event.keyCode === cc.macro.KEY.d || event.keyCode === cc.macro.KEY.right) {
            this._keyRight = false;
        }
    }

    /**
     * 触摸开始
     */
    private _onTouchStart(event: cc.Event.EventTouch): void {
        if (this._isGameOver) return;
        this._isTouching = true;
        this._touchTargetX = event.getLocationX();
    }

    /**
     * 触摸移动
     */
    private _onTouchMove(event: cc.Event.EventTouch): void {
        if (this._isGameOver) return;
        this._touchTargetX = event.getLocationX();
    }

    /**
     * 触摸结束
     */
    private _onTouchEnd(): void {
        this._isTouching = false;
    }

    // ===================== 按钮事件 =====================

    /**
     * 返回按钮
     */
    private _onBtnBack(): void {
        this._doGameOver();
    }

    /**
     * 换肤按钮
     */
    private _onBtnTheme(): void {
        const newTheme = UIThemeManager.nextTheme();
        this._applyTheme(newTheme);
    }

    // ===================== 主题切换 =====================

    /**
     * 应用主题
     */
    private _applyTheme(theme: IUITheme): void {
        const cfg = FloorControl.instance.config;
        const areaW = cfg.areaHalfWidth * 2;
        const areaH = cfg.areaHalfHeight * 2;

        // 背景
        if (this._bgGfx) {
            UIGraphicsHelper.fillGradientRect(
                this._bgGfx,
                DESIGN_W,
                DESIGN_H,
                theme.background.topColor,
                theme.background.bottomColor
            );
        }

        // 区域边框
        if (this._areaBorderGfx) {
            this._drawAreaBorder(this._areaBorderGfx, areaW, areaH, theme);
        }

        // HUD
        if (this._hudPanelNode) {
            const g = this._hudPanelNode.getComponent(cc.Graphics);
            if (g) UIGraphicsHelper.drawHudPanel(g, 360, 50, theme.hud.panelBg, theme.hud.panelRadius);
        }
        if (this._titleLabel) {
            this._titleLabel.node.color = UIThemeManager.toColor(theme.hud.primaryText);
        }
        if (this._scoreLabel) {
            this._scoreLabel.node.color = UIThemeManager.toColor(theme.hud.accentText);
        }

        // 按钮
        if (this._btnBackNode) {
            const g = this._btnBackNode.getComponent(cc.Graphics);
            if (g) UIGraphicsHelper.drawButton(g, 100, 44, theme.btn.bg, theme.btn.radius);
        }
        if (this._btnThemeNode) {
            const g = this._btnThemeNode.getComponent(cc.Graphics);
            if (g) UIGraphicsHelper.drawButton(g, 120, 44, theme.btn.bg, theme.btn.radius);
        }
        if (this._themeLabel) {
            this._themeLabel.string = "🎨 " + theme.name;
        }

        // 连击标签颜色
        if (this._comboLabel) {
            this._comboLabel.node.color = UIThemeManager.toColor(theme.fx.comboColor);
        }

        // 重绘所有平台
        const ctrl = FloorControl.instance;
        for (const p of ctrl.platforms) {
            const node = this._platformNodeMap[p.id];
            if (node && node.isValid) {
                const g = node.getComponent(cc.Graphics);
                if (g) this._drawPlatform(g, p);
            }
        }

        // 重绘角色
        this._drawPlayer();

        Logger.getInstance().info("Floor", `主题切换: ${theme.name}`);
    }

    // ===================== 特效 =====================

    /**
     * 触发屏幕震动
     */
    private _triggerShake(duration: number, intensity: number): void {
        this._shakeTimer = duration;
    }

    /**
     * 飘字特效
     */
    private _showFloatText(text: string, color: RGBA, x: number, y: number): void {
        const node = new cc.Node("FloatText");
        node.x = x;
        node.y = y;
        node.zIndex = 20;
        node.parent = this._gameArea;
        const label = node.addComponent(cc.Label);
        label.string = text;
        label.fontSize = 24;
        label.lineHeight = 30;
        label.enableBold = true;
        node.color = UIThemeManager.toColor(color);
        node.opacity = 255;

        cc.tween(node)
            .to(0.8, { y: y + 80, opacity: 0 })
            .call(() => {
                if (node.isValid) node.destroy();
            })
            .start();
    }

    /**
     * 平台碎裂粒子效果
     */
    private _spawnBreakParticles(x: number, y: number): void {
        const theme = UIThemeManager.current;
        for (let i = 0; i < 6; i++) {
            const particle = new cc.Node("Particle");
            particle.x = x + (Math.random() - 0.5) * 40;
            particle.y = y;
            particle.zIndex = 15;
            particle.parent = this._gameArea;

            const g = particle.addComponent(cc.Graphics);
            g.fillColor = UIThemeManager.toColor(PLATFORM_STYLE[2].main);
            g.rect(-3, -3, 6, 6);
            g.fill();

            const targetX = particle.x + (Math.random() - 0.5) * 80;
            const targetY = particle.y - 30 - Math.random() * 60;
            cc.tween(particle)
                .to(0.4, { x: targetX, y: targetY, opacity: 0, angle: Math.random() * 360 })
                .call(() => {
                    if (particle.isValid) particle.destroy();
                })
                .start();
        }
    }

    // ===================== 游戏结束 =====================

    /**
     * 游戏结束处理
     */
    private _doGameOver(): void {
        if (this._isGameOver) return;
        this._isGameOver = true;
        const ctrl = FloorControl.instance;
        Logger.getInstance().info("Floor", `游戏结束, 得分: ${ctrl.score}`);

        // 角色掉落动画
        if (this._playerNode) {
            cc.tween(this._playerNode).to(0.5, { y: -400, opacity: 0, angle: 360 }).start();
        }

        // 延迟显示结算
        this.scheduleOnce(() => {
            if (this.settlement) {
                this.settlement.show(false, ctrl.score, () => {
                    GameCenter.instance.returnToHome();
                });
            } else {
                GameCenter.instance.returnToHome();
            }
        }, 0.6);
    }

    /**
     * 返回按钮回调 (兼容旧的按钮绑定)
     */
    public onBtnBackClicked(): void {
        this._doGameOver();
    }
}
