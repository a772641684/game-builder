import { DEFAULT_WHACK_MOLE_CONFIG } from "../config/GameConfig";
import { IUITheme, RGBA, UIThemeManager } from "../config/UITheme";
import WhackMoleGameLogic from "../game/whack/WhackMoleGameLogic";
import { GameCenter } from "../logic/GameCenter";
import { Loader } from "../logic/Loader";
import { Logger } from "../logic/Logger";
import { UIGraphicsHelper } from "../logic/UIGraphicsHelper";
import PrefabGameMoleHole from "../prefab/PrefabGameMoleHole";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

/**
 * Kenney 资源路径常量 (resources 目录下)
 */
const RES = {
    BTN_GREEN: "ui/kenney/btn_green",
    BTN_RED: "ui/kenney/btn_red",
    PANEL_GREY: "ui/kenney/panel_grey",
    PANEL_GREEN: "ui/kenney/panel_green",
    STAR_YELLOW: "ui/kenney/star_yellow",
    DIVIDER: "ui/kenney/divider",
};

/** 需要预加载的资源路径列表 */
const PRELOAD_LIST: string[] = [
    RES.BTN_GREEN,
    RES.BTN_RED,
    RES.PANEL_GREY,
    RES.PANEL_GREEN,
    RES.STAR_YELLOW,
    RES.DIVIDER,
];

/**
 * 打地鼠游戏主界面
 * 使用 Kenney UI Pack 图片资源，通过 node.color 实现主题染色
 *
 * [Prefab 结构说明]
 * - UIPlayGroundGameWhackMole (挂载此脚本, size(1920, 1080))
 *   - Background (cc.Sprite, size(1920, 1080), color(76, 140, 60))
 *   - GameArea (cc.Node, size(540, 540), pos(0, -60))
 *   - HUD (cc.Node, size(1920, 120), pos(0, 460))
 *     - ScoreLabel (cc.Label, pos(-350, 0), text("分数: 0"), fontSize(44), fontColor(255, 255, 255)) -> scoreLabel
 *     - TimeLabel (cc.Label, pos(0, 0), text("时间: 30s"), fontSize(48), fontColor(255, 230, 80)) -> timeLabel
 *     - ComboLabel (cc.Label, pos(350, 0), text("连击 x0"), fontSize(40), fontColor(255, 100, 100), active=false) -> comboLabel
 *     - BtnBack (cc.Button, pos(800, 0), size(160, 60), color(180, 60, 60))
 *       - BtnLabel (cc.Label, text("返回"), fontSize(32), fontColor(255, 255, 255))
 *   - Settlement (挂载 UISettlement, size(1920, 1080), active=false)
 */
@ccclass
export default class UIPlayGroundGameWhackMole extends cc.Component {
    /**
     * @description 游戏区域容器
     * 节点路径: GameArea
     */
    @property(cc.Node)
    gameArea: cc.Node = null;

    /**
     * @description 分数文本
     * 节点路径: ScoreLabel
     */
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    /**
     * @description 时间文本
     * 节点路径: TimeLabel
     */
    @property(cc.Label)
    timeLabel: cc.Label = null;

    /**
     * @description 连击文本
     * 节点路径: ComboLabel
     */
    @property(cc.Label)
    comboLabel: cc.Label = null;

    /**
     * @description 地鼠洞预制体
     * 预制体: PrefabGameMoleHole
     */
    @property(cc.Prefab)
    molePrefab: cc.Prefab = null;

    /**
     * @description 结算面板
     * 节点路径: Settlement
     */
    @property(UISettlement)
    settlement: UISettlement = null;

    private _logic: WhackMoleGameLogic = null;
    private _holeComponents: PrefabGameMoleHole[] = [];
    private _spawnTimer: number = 0;
    private _spawnInterval: number = 0;
    private _isGameOver: boolean = false;

    // ===== UI 节点引用 =====
    /** 渐变背景 (Graphics) */
    private _bgNode: cc.Node = null;
    /** 草地装饰 (Graphics) */
    private _grassNode: cc.Node = null;
    /** 标题面板 (Sprite) */
    private _titlePanelNode: cc.Node = null;
    /** HUD 面板 (Sprite) */
    private _hudPanelNode: cc.Node = null;
    /** 返回按钮 (Sprite) */
    private _btnBackNode: cc.Node = null;
    /** 换肤按钮 (Sprite) */
    private _btnThemeNode: cc.Node = null;
    /** 换肤文字 */
    private _themeLabel: cc.Label = null;
    /** 分割线 */
    private _dividerNodes: cc.Node[] = [];
    /** 预加载的 SpriteFrame 缓存 */
    private _spriteFrames: Map<string, cc.SpriteFrame> = new Map();
    /** 资源是否就绪 */
    private _assetsReady: boolean = false;

    protected onLoad(): void {
        UIThemeManager.init();

        const config = DEFAULT_WHACK_MOLE_CONFIG;
        this._logic = new WhackMoleGameLogic(config);
        this._spawnInterval = config.spawnInterval;

        // 先构建 Graphics 背景，再异步加载图片资源
        this._buildBackground();
        this._initGrid();

        this._preloadAssets(() => {
            this._assetsReady = true;
            this._buildUI();
            this._startGame();
        });

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        Logger.getInstance().info("WhackMole", "打地鼠游戏加载完成");
    }

    protected onDestroy(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);

        // 清理按钮事件监听，避免内存泄漏
        if (this._btnBackNode && this._btnBackNode.isValid) {
            this._btnBackNode.off(cc.Node.EventType.TOUCH_END, this.onBtnBackClicked, this);
        }
        if (this._btnThemeNode && this._btnThemeNode.isValid) {
            this._btnThemeNode.off(cc.Node.EventType.TOUCH_END, this._onSwitchTheme, this);
        }

        // 停止所有 schedule 回调
        this.unscheduleAllCallbacks();

        // 清理逻辑层引用
        this._logic = null;
        this._holeComponents = [];
    }

    private _onKeyDown(event: cc.Event.EventKeyboard): void {
        if (event.keyCode === cc.macro.KEY.escape) {
            GameCenter.instance.returnToHome();
        }
    }

    // ===================== 资源预加载 =====================

    /**
     * 批量预加载 Kenney UI 图片资源
     * @param onDone 全部加载完成后的回调
     */
    private _preloadAssets(onDone: () => void): void {
        let loaded = 0;
        const total = PRELOAD_LIST.length;
        if (total === 0) {
            onDone();
            return;
        }

        for (let i = 0; i < total; i++) {
            const resPath = PRELOAD_LIST[i];
            Loader.instance.load(resPath, cc.SpriteFrame, (err: Error, sf: cc.SpriteFrame) => {
                if (!err && sf) {
                    this._spriteFrames.set(resPath, sf);
                } else {
                    Logger.getInstance().warn("WhackMole", "资源加载失败: " + resPath);
                }
                loaded++;
                if (loaded >= total) {
                    Logger.getInstance().info(
                        "WhackMole",
                        "UI资源加载完成 (" + this._spriteFrames.size + "/" + total + ")"
                    );
                    onDone();
                }
            });
        }
    }

    /** 获取已加载的 SpriteFrame */
    private _getSF(key: string): cc.SpriteFrame {
        return this._spriteFrames.get(key) || null;
    }

    // ===================== UI 构建 =====================

    /** 构建 Graphics 渐变背景与草地（不依赖图片资源） */
    private _buildBackground(): void {
        const theme = UIThemeManager.current;

        this._bgNode = this._ensureChild("BgGradient", this.node, 1920, 1080);
        this._bgNode.zIndex = -10;
        this._drawBackground(theme);

        this._grassNode = this._ensureChild("GrassDecor", this.node, 1920, 200);
        this._grassNode.y = -440;
        this._grassNode.zIndex = -5;
        this._drawGrass(theme);
    }

    /**
     * 用 Kenney 图片资源构建所有 UI 元素
     * 按钮/面板用 Sprite + node.color 染色，保留主题切换
     */
    private _buildUI(): void {
        const theme = UIThemeManager.current;

        // —— 标题面板 ——
        this._titlePanelNode = this._createSpriteNode("TitlePanel", this.node, this._getSF(RES.PANEL_GREEN), 320, 60);
        this._titlePanelNode.y = 500;
        this._titlePanelNode.zIndex = 5;
        this._applyPanelColor(this._titlePanelNode, theme.hud.panelBg);

        let titleText = this._titlePanelNode.getChildByName("TitleText");
        if (!titleText) {
            titleText = new cc.Node("TitleText");
            titleText.parent = this._titlePanelNode;
            const lbl = titleText.addComponent(cc.Label);
            lbl.string = "\u{1F528} 打地鼠";
            lbl.fontSize = 36;
            lbl.lineHeight = 40;
            lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        }
        titleText.color = UIThemeManager.toColor(theme.hud.primaryText);

        // —— HUD 面板 ——
        this._hudPanelNode = this._createSpriteNode("HudPanel", this.node, this._getSF(RES.PANEL_GREY), 1200, 80);
        this._hudPanelNode.y = 420;
        this._hudPanelNode.zIndex = 5;
        this._applyPanelColor(this._hudPanelNode, theme.hud.panelBg);

        // —— HUD 分割线 ——
        this._buildDividers(theme);

        // —— 返回按钮 (红色底) ——
        this._btnBackNode = this._createSpriteNode("BtnBack", this.node, this._getSF(RES.BTN_RED), 160, 54);
        this._btnBackNode.setPosition(800, 420);
        this._btnBackNode.zIndex = 10;
        this._applyBtnColor(this._btnBackNode, theme.btn.bg);
        this._addBtnLabel(this._btnBackNode, "返回", theme.btn.fontSize, theme.btn.text);
        this._btnBackNode.on(cc.Node.EventType.TOUCH_END, this.onBtnBackClicked, this);

        // —— 换肤按钮 (绿色底) ——
        this._btnThemeNode = this._createSpriteNode("BtnTheme", this.node, this._getSF(RES.BTN_GREEN), 180, 54);
        this._btnThemeNode.setPosition(-800, 420);
        this._btnThemeNode.zIndex = 10;
        this._applyBtnColor(this._btnThemeNode, UIThemeManager.lighten(theme.btn.bg, 20));
        this._themeLabel = this._addBtnLabel(this._btnThemeNode, "\u{1F3A8} " + theme.name, 26, theme.btn.text);
        this._btnThemeNode.on(cc.Node.EventType.TOUCH_END, this._onSwitchTheme, this);

        // —— 标签主题 ——
        this._applyLabelTheme(theme);

        // —— 给地鼠洞传星星图 ——
        const starSF = this._getSF(RES.STAR_YELLOW);
        if (starSF) {
            this._holeComponents.forEach((h) => {
                if (h && h.node.isValid) h.setStarSpriteFrame(starSF);
            });
        }
    }

    /** 构建 HUD 分割线 */
    private _buildDividers(theme: IUITheme): void {
        const dividerSF = this._getSF(RES.DIVIDER);
        if (!dividerSF) return;
        const positions = [-200, 200];
        for (let i = 0; i < positions.length; i++) {
            const d = this._createSpriteNode("Divider" + i, this._hudPanelNode, dividerSF, 4, 60);
            d.x = positions[i];
            d.opacity = 120;
            d.color = UIThemeManager.toColor(theme.hud.secondaryText);
            this._dividerNodes.push(d);
        }
    }

    // ===================== Sprite 工具 =====================

    /**
     * 创建/获取一个带 Sprite 的子节点（九宫格拉伸）
     */
    private _createSpriteNode(name: string, parent: cc.Node, sf: cc.SpriteFrame, w: number, h: number): cc.Node {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new cc.Node(name);
            node.parent = parent;
        }
        node.setContentSize(w, h);

        let sprite = node.getComponent(cc.Sprite);
        if (!sprite) {
            sprite = node.addComponent(cc.Sprite);
        }
        sprite.type = cc.Sprite.Type.SLICED;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (sf) sprite.spriteFrame = sf;

        return node;
    }

    /** 面板染色（白色基底图片 + node.color + opacity） */
    private _applyPanelColor(node: cc.Node, rgba: RGBA): void {
        if (!node) return;
        node.color = cc.color(Math.min(255, rgba[0] + 60), Math.min(255, rgba[1] + 60), Math.min(255, rgba[2] + 60));
        node.opacity = rgba[3] != null ? rgba[3] : 220;
    }

    /** 按钮染色 */
    private _applyBtnColor(node: cc.Node, rgba: RGBA): void {
        if (!node) return;
        node.color = UIThemeManager.toColor(rgba);
        node.opacity = 255;
    }

    /** 按钮添加文字标签，返回 Label 引用 */
    private _addBtnLabel(btnNode: cc.Node, text: string, fontSize: number, textColor: RGBA): cc.Label {
        let lblNode = btnNode.getChildByName("Label");
        if (!lblNode) {
            lblNode = new cc.Node("Label");
            lblNode.parent = btnNode;
        }
        let lbl = lblNode.getComponent(cc.Label);
        if (!lbl) {
            lbl = lblNode.addComponent(cc.Label);
        }
        lbl.string = text;
        lbl.fontSize = fontSize;
        lbl.lineHeight = fontSize + 4;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        lblNode.color = UIThemeManager.toColor(textColor);
        return lbl;
    }

    // ===================== Graphics 背景/草地 =====================

    private _drawBackground(theme: IUITheme): void {
        const g = UIGraphicsHelper.ensureGraphics(this._bgNode);
        UIGraphicsHelper.fillGradientRect(g, 1920, 1080, theme.background.topColor, theme.background.bottomColor, 48);
    }

    private _drawGrass(theme: IUITheme): void {
        const g = UIGraphicsHelper.ensureGraphics(this._grassNode);
        g.clear();
        const base = theme.gameArea.primary;
        UIGraphicsHelper.drawGrassRow(g, 1800, 60, UIThemeManager.lighten(base, 30), 30);
        UIGraphicsHelper.drawGrassRow(g, 1800, 30, base, 25);
        UIGraphicsHelper.drawGrassRow(g, 1800, 0, UIThemeManager.darken(base, 15), 20);
    }

    // ===================== 标签主题 =====================

    private _applyLabelTheme(theme: IUITheme): void {
        if (this.scoreLabel) {
            this.scoreLabel.fontSize = theme.hud.primaryFontSize;
            this.scoreLabel.node.color = UIThemeManager.toColor(theme.hud.primaryText);
        }
        if (this.timeLabel) {
            this.timeLabel.fontSize = theme.hud.primaryFontSize;
            this.timeLabel.node.color = UIThemeManager.toColor(theme.hud.accentText);
        }
        if (this.comboLabel) {
            this.comboLabel.fontSize = theme.hud.accentFontSize;
            this.comboLabel.node.color = UIThemeManager.toColor(theme.fx.comboColor);
        }
    }

    // ===================== 主题切换 =====================

    private _onSwitchTheme(): void {
        const theme = UIThemeManager.nextTheme();
        this._repaintAll(theme);
        Logger.getInstance().info("WhackMole", "切换主题: " + theme.name);
    }

    /**
     * 重新着色所有 UI 元素
     * Graphics 重绘背景/草地；Sprite 通过 node.color 换色
     */
    private _repaintAll(theme: IUITheme): void {
        // Graphics 部分
        this._drawBackground(theme);
        this._drawGrass(theme);

        // Sprite 面板
        this._applyPanelColor(this._titlePanelNode, theme.hud.panelBg);
        this._applyPanelColor(this._hudPanelNode, theme.hud.panelBg);

        // 标题文字
        if (this._titlePanelNode) {
            const t = this._titlePanelNode.getChildByName("TitleText");
            if (t) t.color = UIThemeManager.toColor(theme.hud.primaryText);
        }

        // 按钮
        this._applyBtnColor(this._btnBackNode, theme.btn.bg);
        this._applyBtnColor(this._btnThemeNode, UIThemeManager.lighten(theme.btn.bg, 20));

        if (this._btnBackNode) {
            const l = this._btnBackNode.getChildByName("Label");
            if (l) l.color = UIThemeManager.toColor(theme.btn.text);
        }
        if (this._themeLabel) {
            this._themeLabel.string = "\u{1F3A8} " + theme.name;
            this._themeLabel.node.color = UIThemeManager.toColor(theme.btn.text);
        }

        // 分割线
        this._dividerNodes.forEach((d) => {
            if (d && d.isValid) d.color = UIThemeManager.toColor(theme.hud.secondaryText);
        });

        // 标签
        this._applyLabelTheme(theme);

        // 地鼠洞
        this._holeComponents.forEach((h) => {
            if (h && h.node.isValid) h.repaint();
        });
    }

    /** 创建/获取子节点工具 */
    private _ensureChild(name: string, parent: cc.Node, w: number, h: number): cc.Node {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new cc.Node(name);
            node.parent = parent;
        }
        node.setContentSize(w, h);
        return node;
    }

    // ===================== 游戏逻辑 =====================

    /**
     * 初始化 3x3 洞口网格
     * 如果有预制体就用预制体实例化, 否则用代码创建简易版本
     */
    private _initGrid(): void {
        const config = this._logic.config;
        const total = config.rows * config.cols;

        // 计算布局
        const holeSize = 150;
        const spacing = 20;
        const totalWidth = config.cols * holeSize + (config.cols - 1) * spacing;
        const totalHeight = config.rows * holeSize + (config.rows - 1) * spacing;
        const startX = -totalWidth / 2 + holeSize / 2;
        const startY = totalHeight / 2 - holeSize / 2;

        for (let i = 0; i < total; i++) {
            const row = Math.floor(i / config.cols);
            const col = i % config.cols;

            let holeNode: cc.Node;
            let holeComp: PrefabGameMoleHole;

            if (this.molePrefab) {
                // 使用编辑器配置的预制体
                holeNode = Loader.instance.instantiate(this.molePrefab);
                holeComp = holeNode.getComponent(PrefabGameMoleHole);
            } else {
                // 代码生成简易版 (无需预制体即可运行)
                holeNode = this._createMoleHoleByCode();
                holeComp = holeNode.getComponent(PrefabGameMoleHole);
            }

            holeNode.parent = this.gameArea;
            holeNode.setPosition(startX + col * (holeSize + spacing), startY - row * (holeSize + spacing));
            holeNode.setContentSize(holeSize, holeSize);

            holeComp.init(i);
            holeComp.onWhack = this._onWhack.bind(this);
            holeComp.onTimeout = this._onMoleTimeout.bind(this);

            this._holeComponents.push(holeComp);
        }

        Logger.getInstance().info("WhackMole", "创建 " + total + " 个洞口 (" + config.rows + "x" + config.cols + ")");
    }

    /**
     * 用代码创建一个地鼠洞节点 (Graphics 绘制版)
     */
    private _createMoleHoleByCode(): cc.Node {
        const root = new cc.Node("MoleHole");
        root.setContentSize(150, 150);

        // 地鼠容器
        const moleNode = new cc.Node("MoleNode");
        moleNode.parent = root;
        moleNode.setContentSize(100, 100);
        moleNode.y = -80;
        moleNode.opacity = 0;

        // 击中特效
        const hitEffect = new cc.Node("HitEffect");
        hitEffect.parent = root;
        hitEffect.active = false;
        hitEffect.y = 30;

        const hitLabel = new cc.Node("StarLabel");
        hitLabel.parent = hitEffect;
        const label = hitLabel.addComponent(cc.Label);
        label.string = "+10";
        label.fontSize = 32;
        label.lineHeight = 36;
        hitLabel.color = cc.color(255, 220, 50);

        // 添加组件
        const comp = root.addComponent(PrefabGameMoleHole);
        comp.moleNode = moleNode;
        comp.hitEffect = hitEffect;
        comp.hitLabel = label;

        return root;
    }

    /**
     * 开始游戏
     */
    private _startGame(): void {
        this._logic.start();
        this._isGameOver = false;
        this._spawnTimer = 0;
        this._updateHUD();
    }

    protected update(dt: number): void {
        if (this._isGameOver || !this._assetsReady) return;

        // 更新游戏逻辑
        const isOver = this._logic.tick(dt);
        if (isOver) {
            this._gameOver();
            return;
        }

        // 定时生成地鼠
        this._spawnTimer += dt;
        if (this._spawnTimer >= this._spawnInterval) {
            this._spawnTimer = 0;
            this._trySpawnMole();

            // 随着时间推移加快生成速度
            const elapsed = DEFAULT_WHACK_MOLE_CONFIG.timeLimit - this._logic.timeLeft;
            const speedUp = Math.min(elapsed / DEFAULT_WHACK_MOLE_CONFIG.timeLimit, 0.6);
            this._spawnInterval = DEFAULT_WHACK_MOLE_CONFIG.spawnInterval * (1 - speedUp);
            this._spawnInterval = Math.max(this._spawnInterval, 0.3);
        }

        // 更新 HUD
        this._updateHUD();
    }

    /**
     * 尝试生成地鼠
     */
    private _trySpawnMole(): void {
        const index = this._logic.trySpawnMole();
        if (index >= 0 && this._holeComponents[index]) {
            // 停留时间随游戏进度缩短
            const elapsed = DEFAULT_WHACK_MOLE_CONFIG.timeLimit - this._logic.timeLeft;
            const ratio = elapsed / DEFAULT_WHACK_MOLE_CONFIG.timeLimit;
            const stayTime = DEFAULT_WHACK_MOLE_CONFIG.moleStayTime * (1 - ratio * 0.5);
            this._holeComponents[index].showMole(Math.max(stayTime, 0.5));
        }
    }

    /**
     * 点击洞口回调
     */
    private _onWhack(index: number): void {
        if (this._isGameOver) return;

        const points = this._logic.whack(index);
        if (points > 0) {
            // 命中！播放特效
            this._holeComponents[index].playHitEffect(points);

            // 延迟清理洞口状态
            this.scheduleOnce(() => {
                this._logic.clearHole(index);
            }, 0.2);

            this._updateHUD();
        }
    }

    /**
     * 地鼠超时缩回回调
     */
    private _onMoleTimeout(index: number): void {
        this._logic.hideMole(index);
    }

    /**
     * 更新 HUD 显示
     */
    private _updateHUD(): void {
        if (this.scoreLabel) {
            this.scoreLabel.string = "分数: " + this._logic.score;
        }
        if (this.timeLabel) {
            this.timeLabel.string = "时间: " + Math.ceil(this._logic.timeLeft) + "s";
        }
        if (this.comboLabel) {
            if (this._logic.combo > 1) {
                this.comboLabel.node.active = true;
                this.comboLabel.string = "连击 x" + this._logic.combo;
            } else {
                this.comboLabel.node.active = false;
            }
        }
    }

    /**
     * 游戏结束
     */
    private _gameOver(): void {
        this._isGameOver = true;
        const summary = this._logic.getSummary();

        Logger.getInstance().info(
            "WhackMole",
            "游戏结束! 得分:" + summary.score + " 最大连击:" + summary.maxCombo + " 命中率:" + summary.hitRate + "%"
        );

        if (this.settlement) {
            this.settlement.show(summary.score > 0, summary.score, () => {
                // 重新开始
                this._holeComponents.forEach((h) => {
                    if (h && h.node.isValid) h.hideMole(false);
                });
                this._startGame();
            });
        } else {
            // 没有结算面板则直接返回
            this.scheduleOnce(() => {
                GameCenter.instance.returnToHome();
            }, 2);
        }
    }

    /**
     * 返回主页按钮
     */
    public onBtnBackClicked(): void {
        GameCenter.instance.returnToHome();
    }
}
