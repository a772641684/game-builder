import { IUITheme, RGBA, UIThemeManager } from "../config/UITheme";
import { BubbleControl } from "../logic/BubbleControl";
import { GameCenter } from "../logic/GameCenter";
import { Loader } from "../logic/Loader";
import { Logger } from "../logic/Logger";
import { UIGraphicsHelper } from "../logic/UIGraphicsHelper";
import PrefabGameBubble from "../prefab/PrefabGameBubble";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

/** 泡泡颜色表 (索引 0 为空，1-6 为游戏颜色) */
const BUBBLE_PALETTE: { main: RGBA; light: RGBA }[] = [
    { main: [100, 100, 100], light: [160, 160, 160] }, // 0 - 空
    { main: [230, 60, 60], light: [255, 150, 150] }, // 1 - 红
    { main: [60, 200, 80], light: [150, 245, 160] }, // 2 - 绿
    { main: [60, 120, 240], light: [140, 185, 255] }, // 3 - 蓝
    { main: [245, 210, 40], light: [255, 240, 140] }, // 4 - 黄
    { main: [200, 60, 220], light: [245, 160, 255] }, // 5 - 紫
    { main: [40, 210, 225], light: [150, 245, 250] }, // 6 - 青
];

/** 泡泡容器 Y 偏移 (网格顶部位置) */
const CONTAINER_Y = 180;
/** 发射器 Y 坐标 */
const SHOOTER_Y = -430;

/**
 * 泡泡龙消消乐主界面
 * 全代码构建 UI，集成主题系统，支持主题切换
 *
 * [Prefab 结构说明]
 * - UIPlayGroundGameBubble (挂载此脚本, size(1920, 1080))
 *   - BgGradient (cc.Graphics, size(1920, 1080), zIndex=-10)
 *   - BubbleContainer (cc.Node, pos(0, 180))
 *   - WallLeft (cc.RigidBody Static, cc.PhysicsBoxCollider)
 *   - WallRight (cc.RigidBody Static, cc.PhysicsBoxCollider)
 *   - Ceiling (cc.RigidBody Static, cc.PhysicsBoxCollider)
 *   - BorderGfx (cc.Graphics, zIndex=1)
 *   - Shooter (cc.Node, pos(0, -430), zIndex=5)
 *     - CannonGfx (cc.Graphics)
 *   - NextPreview (cc.Node, pos(-140, -430), zIndex=5)
 *   - PredLine (cc.Graphics, zIndex=2)
 *   - HudPanel (cc.Node, pos(0, 480), zIndex=10)
 *     - ScoreLabel (cc.Label)
 *     - TitleLabel (cc.Label)
 *   - BtnBack (cc.Node, pos(760, 480), zIndex=15)
 *   - BtnTheme (cc.Node, pos(-760, 480), zIndex=15)
 */
@ccclass
export default class UIPlayGroundGameBubble extends cc.Component {
    /**
     * @description 泡泡容器
     * 节点路径: BubbleContainer
     */
    @property(cc.Node)
    bubbleContainer: cc.Node = null;

    /**
     * @description 分数文本
     * 节点路径: HudPanel/ScoreLabel
     */
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    /**
     * @description 泡泡预制体
     * 预制体: PrefabGameBubble
     */
    @property(cc.Prefab)
    bubblePrefab: cc.Prefab = null;

    /**
     * @description 结算面板
     * 节点路径: Settlement
     */
    @property(UISettlement)
    settlement: UISettlement = null;

    // ===== 内部 UI 节点 =====
    /** 渐变背景 (Graphics) */
    private _bgNode: cc.Node = null;
    /** 游戏区边框 (Graphics) */
    private _borderGfx: cc.Graphics = null;
    /** 预测射线 (Graphics) */
    private _predGfx: cc.Graphics = null;
    /** 发射器节点 */
    private _shooterNode: cc.Node = null;
    /** 炮管 (Graphics) */
    private _cannonGfx: cc.Graphics = null;
    /** 下一个泡泡预览节点 */
    private _nextPreviewNode: cc.Node = null;
    /** 下一个泡泡预览 (Graphics) */
    private _nextGfx: cc.Graphics = null;
    /** HUD 面板节点 */
    private _hudPanelNode: cc.Node = null;
    /** 标题标签 */
    private _titleLabel: cc.Label = null;
    /** 返回按钮 */
    private _btnBackNode: cc.Node = null;
    /** 换肤按钮 */
    private _btnThemeNode: cc.Node = null;
    /** 换肤按钮文字 */
    private _themeLabel: cc.Label = null;

    // ===== 游戏状态 =====
    /** 是否正在发射 */
    private _isShooting: boolean = false;
    /** 游戏是否结束 */
    private _isGameOver: boolean = false;
    /** 下一个泡泡颜色 */
    private _nextColor: number = 0;
    /** 当前子弹颜色 */
    private _bulletColor: number = 0;
    /** 当前子弹节点 */
    private _currentBullet: cc.Node = null;
    /** 射击冷却计时器 (ms) */
    private _cooldownTimer: number = 0;
    /** 子弹速度 (手动运动，不依赖物理引擎) */
    private _bulletVx: number = 0;
    private _bulletVy: number = 0;
    /** 网格泡泡节点二维数组 */
    private _bubbleNodes: (cc.Node | null)[][] = [];

    // ===== 几何参数缓存 =====
    /** 网格左边界 X (this.node 空间) */
    private _gridLeftX: number = 0;
    /** 网格右边界 X (this.node 空间) */
    private _gridRightX: number = 0;
    /** 天花板 Y (this.node 空间) */
    private _ceilingNodeY: number = 0;

    // ===================== 生命周期 =====================

    onLoad(): void {
        UIThemeManager.init();

        // 预计算网格边界 (基于 BubbleControl 配置)
        const config = BubbleControl.instance.config;
        const d = config.bubbleSize;
        const totalW = config.cols * d;
        this._gridLeftX = -totalW / 2;
        this._gridRightX = totalW / 2 + d / 2;
        this._ceilingNodeY = CONTAINER_Y + d / 2;

        // 隐藏预制体遗留的旧节点
        this._hideOldPrefabNodes();

        // 构建 UIentos 7
        this._buildBackground();
        this._buildGameArea();
        this._buildShooter();
        this._buildHUD();
        this._buildButtons();

        // 事件
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);

        // 得分变化回调
        BubbleControl.getInstance().onScoreChanged = (score: number) => {
            if (this.scoreLabel) {
                this.scoreLabel.string = "分数: " + score;
            }
        };

        // 启动游戏
        BubbleControl.instance.startGame();
        this._initGrid();
        this._prepareNextBubble();

        Logger.getInstance().info("Bubble", "泡泡龙游戏加载完成");
    }

    onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);

        if (this._btnBackNode && this._btnBackNode.isValid) {
            this._btnBackNode.off(cc.Node.EventType.TOUCH_END, this._onBtnBack, this);
        }
        if (this._btnThemeNode && this._btnThemeNode.isValid) {
            this._btnThemeNode.off(cc.Node.EventType.TOUCH_END, this._onSwitchTheme, this);
        }

        this.unscheduleAllCallbacks();
        this._bubbleNodes = [];
    }

    update(dt: number): void {
        if (this._cooldownTimer > 0) {
            this._cooldownTimer -= dt * 1000;
        }
        // 手动移动子弹 (不依赖物理引擎)
        if (this._isShooting && this._currentBullet && this._currentBullet.isValid) {
            var bx = this._currentBullet.x + this._bulletVx * dt;
            var by = this._currentBullet.y + this._bulletVy * dt;
            var halfD = BubbleControl.instance.config.bubbleSize / 2;

            // 左右墙壁反弹
            if (bx - halfD <= this._gridLeftX) {
                bx = this._gridLeftX + halfD;
                this._bulletVx = -this._bulletVx;
            } else if (bx + halfD >= this._gridRightX) {
                bx = this._gridRightX - halfD;
                this._bulletVx = -this._bulletVx;
            }

            this._currentBullet.setPosition(bx, by);

            // 碰撞检测: 天花板
            if (by >= this._ceilingNodeY - halfD) {
                this._onBulletHit();
                return;
            }

            // 碰撞检测: 与网格泡泡距离检测
            var hitDist = BubbleControl.instance.config.bubbleSize * 0.9;
            // 将子弹坐标转换到容器空间
            var bulletInContainerX = bx;
            var bulletInContainerY = by - CONTAINER_Y;
            var matrix = BubbleControl.instance.getMatrix();
            for (var r = 0; r < matrix.length; r++) {
                for (var c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c] === 0) continue;
                    var gpos = BubbleControl.instance.gridToWorld(r, c);
                    var dx = bulletInContainerX - gpos.x;
                    var dy = bulletInContainerY - gpos.y;
                    if (dx * dx + dy * dy < hitDist * hitDist) {
                        this._onBulletHit();
                        return;
                    }
                }
            }

            // 安全检测: 超出可视区域
            if (Math.abs(bx) > 960 || Math.abs(by) > 600) {
                Logger.getInstance().warn("Bubble", "子弹超出边界，强制回收");
                this._currentBullet.destroy();
                this._currentBullet = null;
                this._isShooting = false;
                this._prepareNextBubble();
            }
        }
    }

    private _onKeyDown(event: cc.Event.EventKeyboard): void {
        if (event.keyCode === cc.macro.KEY.escape) {
            GameCenter.instance.returnToHome();
        }
    }

    /**
     * 隐藏预制体中可能遗留的旧节点，防止重叠
     */
    private _hideOldPrefabNodes(): void {
        var oldNames = ["GameArea", "HUD", "Background", "Cannon", "WallLeft", "WallRight", "Ceiling"];
        for (var i = 0; i < oldNames.length; i++) {
            var old = this.node.getChildByName(oldNames[i]);
            if (old) {
                old.active = false;
            }
        }
    }

    // ===================== UI 构建 =====================

    /**
     * 构建渐变背景 (Graphics 绘制)
     */
    private _buildBackground(): void {
        var theme = UIThemeManager.current;
        this._bgNode = this._ensureChild("BgGradient", this.node, 1920, 1080);
        this._bgNode.zIndex = -10;
        this._drawBg(theme);
    }

    /**
     * 构建游戏区域: 泡泡容器 + 物理墙壁 + 边框
     */
    private _buildGameArea(): void {
        var theme = UIThemeManager.current;
        var config = BubbleControl.instance.config;
        var d = config.bubbleSize;

        // 泡泡容器 (始终代码创建，忽略预制体可能被隐藏的旧绑定)
        this.bubbleContainer = this._ensureChild("BubbleContainer", this.node, 600, 600);
        this.bubbleContainer.active = true;
        this.bubbleContainer.removeAllChildren();
        this.bubbleContainer.y = CONTAINER_Y;
        this.bubbleContainer.zIndex = 0;

        // 游戏区边框
        var borderNode = this._ensureChild("BorderGfx", this.node, 600, 700);
        borderNode.zIndex = 1;
        this._borderGfx = UIGraphicsHelper.ensureGraphics(borderNode);
        this._drawBorder(theme);

        // 预测射线容器
        var predNode = this._ensureChild("PredLine", this.node, 1920, 1080);
        predNode.zIndex = 2;
        this._predGfx = UIGraphicsHelper.ensureGraphics(predNode);
    }

    /**
     * 构建发射器 + 下一个泡泡预览
     */
    private _buildShooter(): void {
        var theme = UIThemeManager.current;

        // 发射器节点
        this._shooterNode = this._ensureChild("ShooterNode", this.node, 60, 80);
        this._shooterNode.y = SHOOTER_Y;
        this._shooterNode.zIndex = 5;

        // 炮管
        var cannonNode = this._ensureChild("CannonGfx", this._shooterNode, 60, 80);
        this._cannonGfx = UIGraphicsHelper.ensureGraphics(cannonNode);
        this._drawCannon(theme);

        // 操作提示
        var tipNode = this._ensureChild("ShooterTip", this.node, 150, 30);
        tipNode.setPosition(0, SHOOTER_Y - 55);
        tipNode.zIndex = 5;
        var tipLbl = tipNode.getComponent(cc.Label) || tipNode.addComponent(cc.Label);
        tipLbl.string = "\u25B2 拖动瞄准";
        tipLbl.fontSize = 20;
        tipLbl.lineHeight = 24;
        tipLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        tipNode.color = UIThemeManager.toColor(theme.hud.secondaryText);

        // 下一个泡泡预览
        this._nextPreviewNode = this._ensureChild("NextPreview", this.node, 60, 60);
        this._nextPreviewNode.setPosition(-140, SHOOTER_Y);
        this._nextPreviewNode.zIndex = 5;
        this._nextGfx = UIGraphicsHelper.ensureGraphics(this._nextPreviewNode);

        // 预览标签
        var nextLblNode = this._ensureChild("NextLabel", this.node, 80, 30);
        nextLblNode.setPosition(-140, SHOOTER_Y - 40);
        nextLblNode.zIndex = 5;
        var nextLbl = nextLblNode.getComponent(cc.Label) || nextLblNode.addComponent(cc.Label);
        nextLbl.string = "下一个";
        nextLbl.fontSize = 20;
        nextLbl.lineHeight = 24;
        nextLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        nextLblNode.color = UIThemeManager.toColor(theme.hud.secondaryText);
    }

    /**
     * 构建 HUD 面板 (分数 + 标题)
     */
    private _buildHUD(): void {
        var theme = UIThemeManager.current;

        // HUD 面板背景
        this._hudPanelNode = this._ensureChild("HudPanel", this.node, 600, 70);
        this._hudPanelNode.y = 480;
        this._hudPanelNode.zIndex = 10;
        var hudGfx = UIGraphicsHelper.ensureGraphics(this._hudPanelNode);
        UIGraphicsHelper.fillRoundRect(hudGfx, 600, 70, theme.hud.panelRadius, theme.hud.panelBg);

        // 分数标签
        if (!this.scoreLabel) {
            var scoreLblNode = this._ensureChild("ScoreLabel", this._hudPanelNode, 200, 50);
            scoreLblNode.x = -150;
            this.scoreLabel = scoreLblNode.getComponent(cc.Label) || scoreLblNode.addComponent(cc.Label);
        }
        this.scoreLabel.string = "分数: 0";
        this.scoreLabel.fontSize = theme.hud.primaryFontSize;
        this.scoreLabel.lineHeight = theme.hud.primaryFontSize + 4;
        this.scoreLabel.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        this.scoreLabel.node.color = UIThemeManager.toColor(theme.hud.primaryText);

        // 标题标签
        var titleNode = this._ensureChild("TitleLabel", this._hudPanelNode, 200, 50);
        titleNode.x = 150;
        this._titleLabel = titleNode.getComponent(cc.Label) || titleNode.addComponent(cc.Label);
        this._titleLabel.string = "泡泡龙";
        this._titleLabel.fontSize = 36;
        this._titleLabel.lineHeight = 40;
        this._titleLabel.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        this._titleLabel.node.color = UIThemeManager.toColor(theme.hud.accentText);
    }

    /**
     * 构建返回 / 换肤按钮
     */
    private _buildButtons(): void {
        var theme = UIThemeManager.current;

        // 返回按钮
        this._btnBackNode = this._ensureChild("BtnBack", this.node, 140, 50);
        this._btnBackNode.setPosition(760, 480);
        this._btnBackNode.zIndex = 15;
        var backGfx = UIGraphicsHelper.ensureGraphics(this._btnBackNode);
        UIGraphicsHelper.fillRoundRect(backGfx, 140, 50, theme.btn.radius, theme.btn.bg);
        this._addLabel(this._btnBackNode, "返回", theme.btn.fontSize, theme.btn.text);
        this._btnBackNode.on(cc.Node.EventType.TOUCH_END, this._onBtnBack, this);

        // 换肤按钮
        this._btnThemeNode = this._ensureChild("BtnTheme", this.node, 170, 50);
        this._btnThemeNode.setPosition(-760, 480);
        this._btnThemeNode.zIndex = 15;
        var themeGfx = UIGraphicsHelper.ensureGraphics(this._btnThemeNode);
        UIGraphicsHelper.fillRoundRect(themeGfx, 170, 50, theme.btn.radius, UIThemeManager.lighten(theme.btn.bg, 20));
        this._themeLabel = this._addLabel(this._btnThemeNode, "\u{1F3A8} " + theme.name, 24, theme.btn.text);
        this._btnThemeNode.on(cc.Node.EventType.TOUCH_END, this._onSwitchTheme, this);
    }

    // ===================== Graphics 绘制 =====================

    /**
     * 绘制渐变背景
     */
    private _drawBg(theme: IUITheme): void {
        var g = UIGraphicsHelper.ensureGraphics(this._bgNode);
        UIGraphicsHelper.fillGradientRect(g, 1920, 1080, theme.background.topColor, theme.background.bottomColor, 48);
    }

    /**
     * 绘制游戏区边框
     */
    private _drawBorder(theme: IUITheme): void {
        if (!this._borderGfx) return;
        var g = this._borderGfx;
        g.clear();

        var left = this._gridLeftX;
        var right = this._gridRightX;
        var top = this._ceilingNodeY;
        var bottom = SHOOTER_Y + 40;
        var bw = right - left + 10;
        var bh = top - bottom;

        // 半透明游戏区背景
        var dark = UIThemeManager.darken(theme.gameArea.primary, 40);
        g.fillColor = cc.color(dark[0], dark[1], dark[2], 50);
        g.rect(left - 5, bottom, bw, bh);
        g.fill();

        // 边框线
        g.strokeColor = UIThemeManager.toColor(theme.gameArea.secondary);
        g.lineWidth = 3;
        g.rect(left - 5, bottom, bw, bh);
        g.stroke();

        // 天花板高亮线
        g.strokeColor = UIThemeManager.toColor(theme.gameArea.highlight);
        g.lineWidth = 4;
        g.moveTo(left - 5, top);
        g.lineTo(right + 5, top);
        g.stroke();

        // 发射线标记 (底部中心)
        g.strokeColor = UIThemeManager.toColor(theme.gameArea.secondary);
        g.strokeColor.a = 80;
        g.lineWidth = 1;
        g.moveTo(0, bottom);
        g.lineTo(0, bottom + 40);
        g.stroke();
    }

    /**
     * 绘制发射器 (炮管 + 基座 + 高光)
     */
    private _drawCannon(theme: IUITheme): void {
        if (!this._cannonGfx) return;
        var g = this._cannonGfx;
        g.clear();

        // 炮管
        g.fillColor = UIThemeManager.toColor(theme.gameArea.entityPrimary);
        g.rect(-8, 0, 16, 50);
        g.fill();

        // 基座圆盘
        g.fillColor = UIThemeManager.toColor(theme.gameArea.entitySecondary);
        g.circle(0, 0, 22);
        g.fill();

        // 中心高光
        g.fillColor = UIThemeManager.toColor(theme.gameArea.highlight);
        g.circle(0, 0, 8);
        g.fill();
    }

    /**
     * 绘制下一个泡泡预览
     * @param color 颜色索引 (1-6)
     */
    private _drawNextPreview(color: number): void {
        if (!this._nextGfx) return;
        var g = this._nextGfx;
        g.clear();
        if (color <= 0 || color > 6) return;

        var pal = BUBBLE_PALETTE[color];

        // 主体
        g.fillColor = UIThemeManager.toColor(pal.main);
        g.circle(0, 0, 20);
        g.fill();

        // 高光
        g.fillColor = UIThemeManager.toColor(pal.light);
        g.fillColor.a = 150;
        g.circle(-5, 5, 8);
        g.fill();

        // 描边
        g.strokeColor = cc.color(255, 255, 255, 180);
        g.lineWidth = 2;
        g.circle(0, 0, 20);
        g.stroke();
    }

    // ===================== 主题切换 =====================

    /**
     * 切换到下一套主题
     */
    private _onSwitchTheme(): void {
        var theme = UIThemeManager.nextTheme();
        this._repaintAll(theme);
        Logger.getInstance().info("Bubble", "切换主题: " + theme.name);
    }

    /**
     * 用新主题重绘所有 UI 元素
     * @param theme 目标主题
     */
    private _repaintAll(theme: IUITheme): void {
        // 背景 & 边框 & 炮台
        this._drawBg(theme);
        this._drawBorder(theme);
        this._drawCannon(theme);

        // HUD 面板
        if (this._hudPanelNode) {
            var g = this._hudPanelNode.getComponent(cc.Graphics);
            if (g) UIGraphicsHelper.fillRoundRect(g, 600, 70, theme.hud.panelRadius, theme.hud.panelBg);
        }
        if (this.scoreLabel) this.scoreLabel.node.color = UIThemeManager.toColor(theme.hud.primaryText);
        if (this._titleLabel) this._titleLabel.node.color = UIThemeManager.toColor(theme.hud.accentText);

        // 返回按钮
        if (this._btnBackNode) {
            var bg = this._btnBackNode.getComponent(cc.Graphics);
            if (bg) UIGraphicsHelper.fillRoundRect(bg, 140, 50, theme.btn.radius, theme.btn.bg);
            var backLbl = this._btnBackNode.getChildByName("Label");
            if (backLbl) backLbl.color = UIThemeManager.toColor(theme.btn.text);
        }

        // 换肤按钮
        if (this._btnThemeNode) {
            var tg = this._btnThemeNode.getComponent(cc.Graphics);
            if (tg)
                UIGraphicsHelper.fillRoundRect(tg, 170, 50, theme.btn.radius, UIThemeManager.lighten(theme.btn.bg, 20));
            if (this._themeLabel) {
                this._themeLabel.string = "\u{1F3A8} " + theme.name;
                this._themeLabel.node.color = UIThemeManager.toColor(theme.btn.text);
            }
        }

        // 辅助标签
        var tipNode = this.node.getChildByName("ShooterTip");
        if (tipNode) tipNode.color = UIThemeManager.toColor(theme.hud.secondaryText);
        var nextLbl = this.node.getChildByName("NextLabel");
        if (nextLbl) nextLbl.color = UIThemeManager.toColor(theme.hud.secondaryText);

        // 下一个泡泡预览
        this._drawNextPreview(this._nextColor);
    }

    // ===================== 游戏逻辑 =====================

    /**
     * 初始化网格泡泡
     */
    private _initGrid(): void {
        var config = BubbleControl.instance.config;
        this._bubbleNodes = [];
        for (var r = 0; r < config.rows; r++) {
            this._bubbleNodes.push(new Array(config.cols).fill(null));
        }

        var matrix = BubbleControl.instance.getMatrix();
        for (var r2 = 0; r2 < matrix.length; r2++) {
            for (var c = 0; c < matrix[r2].length; c++) {
                if (matrix[r2][c] !== 0) {
                    this._spawnBubbleAt(r2, c, matrix[r2][c]);
                }
            }
        }
    }

    /**
     * 在网格指定位置生成泡泡 (带缩放弹入动效)
     * @param r 行
     * @param c 列
     * @param color 颜色索引
     */
    private _spawnBubbleAt(r: number, c: number, color: number): void {
        var node = this._createBubbleNode(color, false);
        // 必须先设置位置再添加到容器，否则物理引擎初始化时坐标会错误偏移
        var pos = BubbleControl.instance.gridToWorld(r, c);
        node.setPosition(pos.x, pos.y);
        node.parent = this.bubbleContainer;
        this._bubbleNodes[r][c] = node;

        // 弹入动效
        node.scale = 0;
        cc.tween(node).to(0.15, { scale: 1.0 }, { easing: "backOut" }).start();
    }

    /**
     * 创建泡泡节点 (优先使用预制体，否则代码构建)
     * @param color 颜色索引
     * @param isBullet 是否为子弹
     */
    private _createBubbleNode(color: number, isBullet: boolean): cc.Node {
        if (this.bubblePrefab) {
            var node = Loader.instance.instantiate(this.bubblePrefab);
            var ctrl = node.getComponent(PrefabGameBubble);
            if (ctrl) {
                ctrl.init(color, isBullet);
            }
            // 移除所有物理组件 (碰撞由 update 中距离检测处理)
            var rb = node.getComponent(cc.RigidBody);
            if (rb) rb.destroy();
            var col = node.getComponent(cc.PhysicsCircleCollider);
            if (col) col.destroy();
            return node;
        }
        return this._createBubbleByCode(color, isBullet);
    }

    /**
     * 纯代码构建泡泡 (无预制体时的后备方案)
     * 使用 Graphics 绘制外观 + Physics 物理碰撞
     * @param color 颜色索引
     * @param isBullet 是否为子弹
     */
    private _createBubbleByCode(color: number, isBullet: boolean): cc.Node {
        var d = BubbleControl.instance.config.bubbleSize;
        var node = new cc.Node("Bubble_" + color);
        node.setContentSize(d, d);

        // Graphics 绘制
        var gfx = node.addComponent(cc.Graphics);
        var pal = BUBBLE_PALETTE[color] || BUBBLE_PALETTE[0];
        // 主体
        gfx.fillColor = UIThemeManager.toColor(pal.main);
        gfx.circle(0, 0, d / 2 - 2);
        gfx.fill();
        // 高光
        gfx.fillColor = UIThemeManager.toColor(pal.light);
        gfx.fillColor.a = 130;
        gfx.circle(-d / 7, d / 7, d / 4);
        gfx.fill();
        // 描边
        gfx.strokeColor = cc.color(255, 255, 255, 100);
        gfx.lineWidth = 1.5;
        gfx.circle(0, 0, d / 2 - 2);
        gfx.stroke();

        // 泡泡逻辑组件 (不添加物理组件，碰撞由 update 中距离检测处理)
        var ctrl = node.addComponent(PrefabGameBubble);
        ctrl.init(color, isBullet);
        // Graphics 自带颜色，重置 node.color 避免被 _updateAppearance 的染色影响
        node.color = cc.Color.WHITE;

        return node;
    }

    /**
     * 准备下一个待发射泡泡
     */
    private _prepareNextBubble(): void {
        this._isShooting = false;

        // 初始化颜色序列
        if (this._nextColor === 0) {
            this._nextColor = this._randomColor();
        }

        this._bulletColor = this._nextColor;
        this._nextColor = this._randomColor();

        // 创建子弹 (先设位置再添加到场景，避免物理引擎坐标偏移)
        this._currentBullet = this._createBubbleNode(this._bulletColor, true);
        this._currentBullet.setPosition(0, SHOOTER_Y);
        this._currentBullet.parent = this.node;
        this._currentBullet.zIndex = 3;

        // 绘制下一个预览
        this._drawNextPreview(this._nextColor);

        // 清除预测线
        if (this._predGfx) this._predGfx.clear();
    }

    /**
     * 随机选取颜色 (只从当前矩阵中存在的颜色中选，保证可消除)
     */
    private _randomColor(): number {
        var matrix = BubbleControl.instance.getMatrix();
        var existing = new Set<number>();
        for (var r = 0; r < matrix.length; r++) {
            for (var c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) existing.add(matrix[r][c]);
            }
        }
        if (existing.size === 0) return Math.floor(Math.random() * 6) + 1;
        var arr = Array.from(existing);
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ===================== 触摸 & 射击 =====================

    /**
     * 触摸移动: 瞄准 + 绘制预测线
     */
    private _onTouchMove(event: cc.Event.EventTouch): void {
        if (this._isShooting || this._isGameOver) return;

        var touchPos = event.getLocation();
        var localPos = this.node.convertToNodeSpaceAR(touchPos);
        var shooterPos = cc.v2(0, SHOOTER_Y);
        var dir = localPos.sub(shooterPos).normalize();

        // 限制最小射击角度，防止水平/向下发射
        if (dir.y < 0.15) return;

        // 旋转炮管
        var angle = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
        if (this._shooterNode) {
            this._shooterNode.angle = angle - 90;
        }

        this._drawPredictionLine(shooterPos, dir);
    }

    /**
     * 触摸结束: 发射泡泡
     */
    private _onTouchEnd(event: cc.Event.EventTouch): void {
        if (this._isShooting || !this._currentBullet || this._isGameOver) return;
        if (this._cooldownTimer > 0) return;

        var touchPos = event.getLocation();
        var localPos = this.node.convertToNodeSpaceAR(touchPos);
        var shooterPos = cc.v2(0, SHOOTER_Y);
        var dir = localPos.sub(shooterPos).normalize();

        if (dir.y < 0.15) return;

        this._isShooting = true;
        this._cooldownTimer = BubbleControl.instance.config.cooldown;
        if (this._predGfx) this._predGfx.clear();

        // 发射器弹性动效
        if (this._shooterNode) {
            cc.tween(this._shooterNode)
                .to(0.05, { scaleY: 0.8 })
                .to(0.15, { scaleY: 1.0 }, { easing: "backOut" })
                .start();
        }

        // 设置子弹手动速度
        var speed = BubbleControl.instance.config.shootSpeed;
        this._bulletVx = dir.x * speed;
        this._bulletVy = dir.y * speed;
    }

    /**
     * 绘制预测射线 (虚线 + 反射)
     * @param start 起点
     * @param direction 方向单位向量
     */
    private _drawPredictionLine(start: cc.Vec2, direction: cc.Vec2): void {
        if (!this._predGfx) return;
        var g = this._predGfx;
        g.clear();

        var theme = UIThemeManager.current;
        g.strokeColor = UIThemeManager.toColor(theme.gameArea.highlight);
        g.strokeColor.a = 150;
        g.lineWidth = 3;

        // 墙壁位置 (this.node 空间)
        var leftWall = this._gridLeftX;
        var rightWall = this._gridRightX;
        var ceiling = this._ceilingNodeY;

        var currentPos = start.clone();
        var currentDir = direction.clone();

        // 最多绘制 3 段 (含反射)
        for (var seg = 0; seg < 3; seg++) {
            // 计算到墙壁距离
            var distToWall = 99999;
            if (currentDir.x > 0.001) {
                distToWall = (rightWall - currentPos.x) / currentDir.x;
            } else if (currentDir.x < -0.001) {
                distToWall = (leftWall - currentPos.x) / currentDir.x;
            }
            if (distToWall < 0) distToWall = 99999;

            var step = Math.min(distToWall, 2000);
            var endX = currentPos.x + currentDir.x * step;
            var endY = currentPos.y + currentDir.y * step;

            // 天花板截断
            if (endY > ceiling) {
                var ratio = (ceiling - currentPos.y) / (endY - currentPos.y);
                endX = currentPos.x + currentDir.x * step * ratio;
                endY = ceiling;
                this._drawDashedLine(g, currentPos.x, currentPos.y, endX, endY, 12, 8);
                break;
            }

            this._drawDashedLine(g, currentPos.x, currentPos.y, endX, endY, 12, 8);

            // 更新位置和方向 (墙壁 X 反射)
            currentPos.x = endX;
            currentPos.y = endY;
            currentDir.x = -currentDir.x;
        }

        g.stroke();
    }

    /**
     * 绘制虚线段
     * @param g Graphics 组件
     * @param x1 起点 X
     * @param y1 起点 Y
     * @param x2 终点 X
     * @param y2 终点 Y
     * @param dashLen 实线长度
     * @param gapLen 间隔长度
     */
    private _drawDashedLine(
        g: cc.Graphics,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        dashLen: number,
        gapLen: number
    ): void {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var totalLen = Math.sqrt(dx * dx + dy * dy);
        if (totalLen < 1) return;

        var nx = dx / totalLen;
        var ny = dy / totalLen;
        var drawn = 0;
        var isDash = true;

        while (drawn < totalLen) {
            var segLen = isDash ? Math.min(dashLen, totalLen - drawn) : Math.min(gapLen, totalLen - drawn);
            var sx = x1 + nx * drawn;
            var sy = y1 + ny * drawn;
            var ex = x1 + nx * (drawn + segLen);
            var ey = y1 + ny * (drawn + segLen);

            if (isDash) {
                g.moveTo(sx, sy);
                g.lineTo(ex, ey);
            }
            drawn += segLen;
            isDash = !isDash;
        }
    }

    // ===================== 碰撞处理 =====================

    /**
     * 子弹击中目标后的处理逻辑
     * 将子弹吸附到最近的网格位置，检查消除
     */
    private _onBulletHit(): void {
        if (!this._currentBullet || !this._currentBullet.isValid) return;

        // 停止子弹运动
        this._bulletVx = 0;
        this._bulletVy = 0;

        var config = BubbleControl.instance.config;

        // 子弹在 this.node 空间，容器在 (0, CONTAINER_Y)
        // 转换到容器空间 = (bulletX, bulletY - CONTAINER_Y)
        var bulletX = this._currentBullet.x;
        var bulletY = this._currentBullet.y - CONTAINER_Y;

        // 计算网格坐标
        var grid = BubbleControl.instance.worldToGrid(cc.v2(bulletX, bulletY));
        var r = grid.r;
        var c = grid.c;

        // 获取子弹颜色
        var ctrl = this._currentBullet.getComponent(PrefabGameBubble);
        var color = ctrl ? ctrl.colorType : this._bulletColor;

        // 销毁子弹节点
        this._currentBullet.destroy();
        this._currentBullet = null;

        // 越界处理
        if (r < 0 || r >= config.rows || c < 0 || c >= config.cols) {
            Logger.getInstance().warn("Bubble", "子弹落点越界: (" + r + "," + c + ")");
            this._prepareNextBubble();
            return;
        }

        // 如果目标格子已被占用，尝试找相邻空格
        if (this._bubbleNodes[r] && this._bubbleNodes[r][c]) {
            var placed = this._findNearestEmpty(r, c);
            if (!placed) {
                this._prepareNextBubble();
                return;
            }
            r = placed.r;
            c = placed.c;
        }

        // 放置泡泡
        BubbleControl.instance.setMatrixAt(r, c, color);
        this._spawnBubbleAt(r, c, color);

        // 检查消除
        var matches = BubbleControl.instance.findMatches(r, c);
        if (matches.length >= config.popMinCount) {
            BubbleControl.instance.popBubbles(matches);
            this._handlePopping(matches);
        } else {
            // 检查是否触底 (游戏失败)
            if (r >= config.rows - 2) {
                this._gameOver(false);
            } else {
                this._prepareNextBubble();
            }
        }
    }

    /**
     * 查找指定位置附近的空格
     * @param r 行
     * @param c 列
     * @returns 最近的空位，或 null
     */
    private _findNearestEmpty(r: number, c: number): { r: number; c: number } | null {
        var neighbors = BubbleControl.instance.getNeighbors(r, c);
        for (var i = 0; i < neighbors.length; i++) {
            var n = neighbors[i];
            if (this._bubbleNodes[n.r] && !this._bubbleNodes[n.r][n.c]) {
                return n;
            }
        }
        return null;
    }

    /**
     * 处理消除动画 + 悬空掉落检测
     * @param matches 匹配的坐标列表
     */
    private _handlePopping(matches: { r: number; c: number }[]): void {
        var theme = UIThemeManager.current;

        // 消除动效: 放大 → 缩小消失
        for (var i = 0; i < matches.length; i++) {
            var m = matches[i];
            var node = this._bubbleNodes[m.r][m.c];
            if (node && node.isValid) {
                this._popOneBubble(node, m.r, m.c);
                this._showScorePopup(node.x, node.y);
                this._bubbleNodes[m.r][m.c] = null;
            }
        }

        // 震屏
        this._shakeNode(this.bubbleContainer);

        // 延迟检查悬空
        this.scheduleOnce(() => {
            var islands = BubbleControl.instance.checkIslands();
            for (var j = 0; j < islands.length; j++) {
                var im = islands[j];
                var iNode = this._bubbleNodes[im.r][im.c];
                if (iNode && iNode.isValid) {
                    cc.tween(iNode)
                        .delay(0.1)
                        .to(0.5, { y: iNode.y - 1000, opacity: 0 }, { easing: "sineIn" })
                        .call(() => {
                            if (iNode.isValid) iNode.destroy();
                        })
                        .start();
                    this._bubbleNodes[im.r][im.c] = null;
                }
            }

            // 胜利检查
            var allClear = BubbleControl.instance
                .getMatrix()
                .every((row: number[]) => row.every((cell: number) => cell === 0));
            if (allClear) {
                this._gameOver(true);
            } else {
                this._prepareNextBubble();
            }
        }, 0.3);
    }

    /**
     * 单个泡泡消除动效
     */
    private _popOneBubble(node: cc.Node, r: number, c: number): void {
        cc.tween(node)
            .to(0.1, { scale: 1.3 })
            .to(0.15, { scale: 0, opacity: 0 })
            .call(() => {
                if (node.isValid) node.destroy();
            })
            .start();
    }

    /**
     * 得分飘字效果
     * @param x X 坐标 (BubbleContainer 空间)
     * @param y Y 坐标
     */
    private _showScorePopup(x: number, y: number): void {
        var theme = UIThemeManager.current;
        var popNode = new cc.Node("ScorePop");
        popNode.parent = this.bubbleContainer;
        popNode.setPosition(x, y + 20);
        popNode.zIndex = 100;

        var lbl = popNode.addComponent(cc.Label);
        lbl.string = "+10";
        lbl.fontSize = 28;
        lbl.lineHeight = 32;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        popNode.color = UIThemeManager.toColor(theme.fx.scorePopColor);

        cc.tween(popNode)
            .to(0.6, { y: y + 80, opacity: 0 }, { easing: "sineOut" })
            .call(() => {
                if (popNode.isValid) popNode.destroy();
            })
            .start();
    }

    /**
     * 节点震动效果
     */
    private _shakeNode(node: cc.Node): void {
        if (!node || !node.isValid) return;
        var startPos = node.position.clone();
        cc.tween(node)
            .by(0.04, { position: cc.v3(6, 6, 0) })
            .by(0.04, { position: cc.v3(-12, -12, 0) })
            .by(0.04, { position: cc.v3(6, 6, 0) })
            .set({ position: startPos })
            .start();
    }

    /**
     * 游戏结束
     * @param isWin 是否胜利
     */
    private _gameOver(isWin: boolean): void {
        this._isGameOver = true;
        var score = BubbleControl.instance.getScore();

        Logger.getInstance().info("Bubble", "游戏结束! " + (isWin ? "胜利" : "失败") + " 得分:" + score);

        if (this.settlement) {
            this.settlement.show(isWin, score, () => {
                GameCenter.instance.returnToHome();
            });
        } else {
            this.scheduleOnce(() => {
                GameCenter.instance.returnToHome();
            }, 2);
        }
    }

    /**
     * 重新开始游戏
     */
    private _restart(): void {
        this._isGameOver = false;
        this._isShooting = false;
        this._cooldownTimer = 0;
        this._nextColor = 0;

        BubbleControl.instance.startGame();
        if (this.bubbleContainer) {
            this.bubbleContainer.removeAllChildren();
        }
        this._initGrid();
        this._prepareNextBubble();

        if (this.scoreLabel) {
            this.scoreLabel.string = "分数: 0";
        }
    }

    /**
     * 重新开始 (公开方法，供预制体按钮绑定)
     */
    public onRestart(): void {
        this._restart();
    }

    // ===================== 工具方法 =====================

    /**
     * 创建或获取子节点
     */
    private _ensureChild(name: string, parent: cc.Node, w: number, h: number): cc.Node {
        var node = parent.getChildByName(name);
        if (!node) {
            node = new cc.Node(name);
            node.parent = parent;
        }
        node.setContentSize(w, h);
        return node;
    }

    /**
     * 为父节点添加文字标签
     * @returns Label 组件引用
     */
    private _addLabel(parent: cc.Node, text: string, fontSize: number, textColor: RGBA): cc.Label {
        var lblNode = parent.getChildByName("Label");
        if (!lblNode) {
            lblNode = new cc.Node("Label");
            lblNode.parent = parent;
        }
        var lbl = lblNode.getComponent(cc.Label) || lblNode.addComponent(cc.Label);
        lbl.string = text;
        lbl.fontSize = fontSize;
        lbl.lineHeight = fontSize + 4;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        lblNode.color = UIThemeManager.toColor(textColor);
        return lbl;
    }

    /**
     * 返回主页按钮 (公开方法，供预制体按钮绑定)
     */
    public onBtnBackClicked(): void {
        GameCenter.instance.returnToHome();
    }

    /**
     * 返回按钮事件处理 (内部)
     */
    private _onBtnBack(): void {
        GameCenter.instance.returnToHome();
    }
}
