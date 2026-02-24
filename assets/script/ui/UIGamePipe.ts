import { IUITheme, RGBA, UIThemeManager } from "../config/UITheme";
import { DifficultyManager } from "../logic/DifficultyManager";
import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";
import {
    DIR_DOWN,
    DIR_LEFT,
    DIR_RIGHT,
    DIR_UP,
    getDefaultMask,
    IPipeCellData,
    PipeControl,
    PipeType,
    rotateMask,
} from "../logic/PipeControl";
import { UIGraphicsHelper } from "../logic/UIGraphicsHelper";
import UISettlement from "./UISettlement";

const { ccclass, property } = cc._decorator;

// ===================== 布局常量 =====================
/** 设计分辨率 */
const DESIGN_W = 960;
const DESIGN_H = 640;

/**
 * 根据主题获取管道颜色
 */
function getPipeColors(theme: IUITheme): { main: RGBA; filled: RGBA; accent: RGBA } {
    return {
        main: theme.gameArea.secondary,
        filled: theme.gameArea.highlight,
        accent: theme.gameArea.entityPrimary,
    };
}

/**
 * 水管接通主界面
 * 全代码构建 UI，不依赖预制体节点树
 * 网格管道旋转 + BFS 连通检测 + 水流动画
 *
 * [Prefab 结构说明]
 * - UIGamePipe (挂载此脚本, size(960, 640))
 *   - BgGradient (cc.Graphics, size(960, 640), zIndex=-10)
 *   - GameArea (cc.Node, zIndex=0)
 *     - AreaBorder (cc.Graphics)
 *     - GridContainer (cc.Node)
 *       - Cell_r_c (cc.Node, 每个管道格子)
 *         - CellBg (cc.Graphics)
 *         - PipeGfx (cc.Graphics)
 *   - HudPanel (cc.Node, pos(0, 295), zIndex=10)
 *   - BtnBack (cc.Node, zIndex=15)
 *   - BtnTheme (cc.Node, zIndex=15)
 *   - ClearOverlay (cc.Node, zIndex=20, 通关特效层)
 */
@ccclass
export default class UIGamePipe extends cc.Component {
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
    /** 网格容器 */
    private _gridContainer: cc.Node = null;
    /** HUD 面板节点 */
    private _hudPanelNode: cc.Node = null;
    /** 关卡标签 */
    private _levelLabel: cc.Label = null;
    /** 步数标签 */
    private _movesLabel: cc.Label = null;
    /** 分数标签 */
    private _scoreLabel: cc.Label = null;
    /** 返回按钮 */
    private _btnBackNode: cc.Node = null;
    /** 换肤按钮 */
    private _btnThemeNode: cc.Node = null;
    /** 换肤文字 */
    private _themeLabel: cc.Label = null;
    /** 通关遮罩层 */
    private _clearOverlay: cc.Node = null;

    // ===== 网格节点映射 =====
    /** [row][col] → 格子节点 */
    private _cellNodes: cc.Node[][] = [];
    /** [row][col] → 管道 Graphics */
    private _pipeGfxMap: cc.Graphics[][] = [];
    /** [row][col] → 格子背景 Graphics */
    private _cellBgMap: cc.Graphics[][] = [];

    // ===== 游戏状态 =====
    /** 是否已通关 */
    private _isCleared: boolean = false;
    /** 是否正在旋转动画中 (防止连点) */
    private _isRotating: boolean = false;

    // ===================== 生命周期 =====================

    onLoad(): void {
        UIThemeManager.init();

        // 隐藏预制体遗留节点
        this.node.children.forEach((c) => {
            if (c.name !== "Settlement") c.active = false;
        });

        // 获取当前关卡
        const level = DifficultyManager.instance.getCurrentLevel("PIPE");

        // 初始化控制器并开始游戏
        PipeControl.instance.startGame(level);

        // 构建 UI
        this._buildUI();

        Logger.getInstance().info("Pipe", "水管接通 UI 构建完成");
    }

    onDestroy(): void {
        // 清理触摸事件在 _cellNodes 上绑定
        if (this._cellNodes) {
            const ctrl = PipeControl.instance;
            for (let r = 0; r < ctrl.rows; r++) {
                for (let c = 0; c < ctrl.cols; c++) {
                    if (this._cellNodes[r] && this._cellNodes[r][c]) {
                        this._cellNodes[r][c].off(cc.Node.EventType.TOUCH_END);
                    }
                }
            }
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
        // 3. 构建网格
        this._buildGrid(theme);
        // 4. HUD
        this._buildHUD(theme);
        // 5. 返回按钮
        this._buildBtnBack(theme);
        // 6. 换肤按钮
        this._buildBtnTheme(theme);
        // 7. 通关遮罩
        this._buildClearOverlay();
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
        const ctrl = PipeControl.instance;
        const cfg = ctrl.config;
        const areaW = cfg.cols * (cfg.cellSize + cfg.cellSpacing) + cfg.cellSpacing + 20;
        const areaH = cfg.rows * (cfg.cellSize + cfg.cellSpacing) + cfg.cellSpacing + 20;

        const area = new cc.Node("GameArea");
        area.setContentSize(areaW, areaH);
        area.y = -20;
        area.zIndex = 0;
        area.parent = this.node;
        this._gameArea = area;

        // 边框
        const borderNode = new cc.Node("AreaBorder");
        borderNode.parent = area;
        const borderGfx = borderNode.addComponent(cc.Graphics);
        this._areaBorderGfx = borderGfx;
        this._drawAreaBorder(borderGfx, areaW, areaH, theme);

        // 网格容器
        const gridContainer = new cc.Node("GridContainer");
        gridContainer.parent = area;
        this._gridContainer = gridContainer;
    }

    /**
     * 绘制游戏区域边框
     */
    private _drawAreaBorder(g: cc.Graphics, w: number, h: number, theme: IUITheme): void {
        g.clear();
        const bgColor = UIThemeManager.darken(theme.gameArea.primary, 30);
        g.fillColor = UIThemeManager.toColor([bgColor[0], bgColor[1], bgColor[2], 80]);
        UIGraphicsHelper.roundRect(g, -w / 2, -h / 2, w, h, 14);
        g.fill();
        g.strokeColor = UIThemeManager.toColor(theme.gameArea.secondary);
        g.lineWidth = 3;
        UIGraphicsHelper.roundRect(g, -w / 2, -h / 2, w, h, 14);
        g.stroke();
    }

    /**
     * 构建网格中所有管道格子
     */
    private _buildGrid(theme: IUITheme): void {
        const ctrl = PipeControl.instance;
        const cfg = ctrl.config;
        const rows = ctrl.rows;
        const cols = ctrl.cols;

        this._cellNodes = [];
        this._pipeGfxMap = [];
        this._cellBgMap = [];

        // 网格总宽高
        const totalW = cols * (cfg.cellSize + cfg.cellSpacing) - cfg.cellSpacing;
        const totalH = rows * (cfg.cellSize + cfg.cellSpacing) - cfg.cellSpacing;
        // 起始偏移 (让网格居中)
        const startX = -totalW / 2 + cfg.cellSize / 2;
        const startY = totalH / 2 - cfg.cellSize / 2;

        for (let r = 0; r < rows; r++) {
            this._cellNodes[r] = [];
            this._pipeGfxMap[r] = [];
            this._cellBgMap[r] = [];

            for (let c = 0; c < cols; c++) {
                const cell = ctrl.grid[r][c];
                const x = startX + c * (cfg.cellSize + cfg.cellSpacing);
                const y = startY - r * (cfg.cellSize + cfg.cellSpacing);

                const cellNode = new cc.Node("Cell_" + r + "_" + c);
                cellNode.setContentSize(cfg.cellSize, cfg.cellSize);
                cellNode.x = x;
                cellNode.y = y;
                cellNode.parent = this._gridContainer;
                this._cellNodes[r][c] = cellNode;

                // 格子背景
                const bgNode = new cc.Node("CellBg");
                bgNode.parent = cellNode;
                const bgGfx = bgNode.addComponent(cc.Graphics);
                this._cellBgMap[r][c] = bgGfx;
                this._drawCellBg(bgGfx, cfg.cellSize, cell, theme);

                // 管道图形
                const pipeNode = new cc.Node("PipeGfx");
                pipeNode.parent = cellNode;
                const pipeGfx = pipeNode.addComponent(cc.Graphics);
                this._pipeGfxMap[r][c] = pipeGfx;
                this._drawPipe(pipeGfx, cfg.cellSize, cell, theme, false);

                // 触摸旋转事件
                cellNode.on(
                    cc.Node.EventType.TOUCH_END,
                    () => {
                        this._onCellTap(r, c);
                    },
                    this
                );

                // 入场动画
                cellNode.opacity = 0;
                cellNode.scale = 0.3;
                const delay = (r * cols + c) * 0.03;
                cc.tween(cellNode).delay(delay).to(0.25, { opacity: 255, scale: 1.0 }, { easing: "backOut" }).start();
            }
        }
    }

    /**
     * 绘制格子背景
     */
    private _drawCellBg(g: cc.Graphics, size: number, cell: IPipeCellData, theme: IUITheme): void {
        g.clear();
        const half = size / 2;
        const r = 8;

        if (cell.type === PipeType.EMPTY) {
            // 空白格: 极淡底色
            const emptyColor = UIThemeManager.darken(theme.gameArea.primary, 10);
            g.fillColor = UIThemeManager.toColor([emptyColor[0], emptyColor[1], emptyColor[2], 30]);
            UIGraphicsHelper.roundRect(g, -half, -half, size, size, r);
            g.fill();
            return;
        }

        // 普通底色
        const bgBase = UIThemeManager.darken(theme.gameArea.primary, 15);
        g.fillColor = UIThemeManager.toColor([bgBase[0], bgBase[1], bgBase[2], 100]);
        UIGraphicsHelper.roundRect(g, -half, -half, size, size, r);
        g.fill();

        // 描边
        const borderColor = theme.gameArea.secondary;
        g.strokeColor = UIThemeManager.toColor([borderColor[0], borderColor[1], borderColor[2], 80]);
        g.lineWidth = 1.5;
        UIGraphicsHelper.roundRect(g, -half, -half, size, size, r);
        g.stroke();

        // 起点标记
        if (cell.type === PipeType.SOURCE) {
            g.fillColor = UIThemeManager.toColor([80, 200, 120, 60]);
            UIGraphicsHelper.roundRect(g, -half, -half, size, size, r);
            g.fill();
        }
        // 终点标记
        if (cell.type === PipeType.TARGET) {
            g.fillColor = UIThemeManager.toColor([200, 80, 80, 60]);
            UIGraphicsHelper.roundRect(g, -half, -half, size, size, r);
            g.fill();
        }
    }

    /**
     * 绘制管道
     * @param g Graphics 组件
     * @param size 格子大小
     * @param cell 格子数据
     * @param theme 当前主题
     * @param filled 是否被水流经过
     */
    private _drawPipe(g: cc.Graphics, size: number, cell: IPipeCellData, theme: IUITheme, filled: boolean): void {
        g.clear();
        if (cell.type === PipeType.EMPTY) return;

        const half = size / 2;
        const cfg = PipeControl.instance.config;
        const lineW = cfg.pipeLineWidth;
        const innerW = cfg.pipeInnerWidth;
        const mask = rotateMask(getDefaultMask(cell.type), cell.rotation);
        const colors = getPipeColors(theme);

        // 管道颜色
        const pipeColor = filled ? colors.filled : colors.main;
        const innerColor = filled
            ? UIThemeManager.lighten(colors.filled as [number, number, number], 30)
            : UIThemeManager.darken(colors.main as [number, number, number], 20);

        // 起点/终点特殊绘制
        if (cell.type === PipeType.SOURCE) {
            this._drawSourceTarget(g, half, mask, true, filled, theme);
            return;
        }
        if (cell.type === PipeType.TARGET) {
            this._drawSourceTarget(g, half, mask, false, filled, theme);
            return;
        }

        // 外管壁
        g.lineWidth = lineW;
        g.lineCap = cc.Graphics.LineCap.ROUND;
        g.lineJoin = cc.Graphics.LineJoin.ROUND;
        g.strokeColor = UIThemeManager.toColor(pipeColor);

        // 从中心向各开口方向画线段
        this._drawPipeSegments(g, half, mask);

        // 内管 (更细更亮)
        g.lineWidth = innerW;
        g.strokeColor = UIThemeManager.toColor(innerColor);
        this._drawPipeSegments(g, half, mask);

        // 中心圆点 (连接处)
        const connectCount = this._countBits(mask);
        if (connectCount >= 2) {
            g.fillColor = UIThemeManager.toColor(pipeColor);
            g.circle(0, 0, lineW / 2);
            g.fill();
            g.fillColor = UIThemeManager.toColor(innerColor);
            g.circle(0, 0, innerW / 2);
            g.fill();
        }
    }

    /**
     * 绘制管道线段 (从中心到各开口方向)
     */
    private _drawPipeSegments(g: cc.Graphics, half: number, mask: number): void {
        if (mask & DIR_UP) {
            g.moveTo(0, 0);
            g.lineTo(0, half);
            g.stroke();
        }
        if (mask & DIR_DOWN) {
            g.moveTo(0, 0);
            g.lineTo(0, -half);
            g.stroke();
        }
        if (mask & DIR_LEFT) {
            g.moveTo(0, 0);
            g.lineTo(-half, 0);
            g.stroke();
        }
        if (mask & DIR_RIGHT) {
            g.moveTo(0, 0);
            g.lineTo(half, 0);
            g.stroke();
        }
    }

    /**
     * 绘制起点/终点特殊形状
     */
    private _drawSourceTarget(
        g: cc.Graphics,
        half: number,
        mask: number,
        isSource: boolean,
        filled: boolean,
        theme: IUITheme
    ): void {
        const cfg = PipeControl.instance.config;
        const lineW = cfg.pipeLineWidth;
        const innerW = cfg.pipeInnerWidth;
        const colors = getPipeColors(theme);
        const pipeColor = filled ? colors.filled : colors.main;
        const innerColor = filled
            ? UIThemeManager.lighten(colors.filled as [number, number, number], 30)
            : UIThemeManager.darken(colors.main as [number, number, number], 20);

        // 圆形标记
        const markerColor: RGBA = isSource ? [80, 200, 120] : [200, 80, 80];
        const markerFilled: RGBA = isSource ? [100, 255, 150] : [255, 100, 100];
        g.fillColor = UIThemeManager.toColor(filled ? markerFilled : markerColor);
        g.circle(0, 0, half * 0.45);
        g.fill();

        // 内圈
        g.fillColor = UIThemeManager.toColor(filled ? [255, 255, 255, 200] : [255, 255, 255, 120]);
        g.circle(0, 0, half * 0.25);
        g.fill();

        // 管道接口线段
        g.lineWidth = lineW;
        g.lineCap = cc.Graphics.LineCap.ROUND;
        g.strokeColor = UIThemeManager.toColor(pipeColor);
        this._drawPipeSegments(g, half, mask);

        g.lineWidth = innerW;
        g.strokeColor = UIThemeManager.toColor(innerColor);
        this._drawPipeSegments(g, half, mask);
    }

    /**
     * 计算掩码中1的个数
     */
    private _countBits(n: number): number {
        let count = 0;
        let v = n;
        while (v) {
            count += v & 1;
            v >>= 1;
        }
        return count;
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
        UIGraphicsHelper.drawHudPanel(hudGfx, 500, 50, theme.hud.panelBg, theme.hud.panelRadius);

        // 标题
        const titleNode = new cc.Node("Title");
        titleNode.x = -180;
        titleNode.parent = hudNode;
        const titleLabel = titleNode.addComponent(cc.Label);
        titleLabel.string = "🔧 水管接通";
        titleLabel.fontSize = 22;
        titleLabel.lineHeight = 30;
        titleLabel.enableBold = true;
        titleNode.color = UIThemeManager.toColor(theme.hud.primaryText);

        // 关卡
        const levelNode = new cc.Node("Level");
        levelNode.x = -60;
        levelNode.parent = hudNode;
        const levelLabel = levelNode.addComponent(cc.Label);
        levelLabel.string = "关卡 " + PipeControl.instance.level;
        levelLabel.fontSize = 20;
        levelLabel.lineHeight = 30;
        levelNode.color = UIThemeManager.toColor(theme.hud.secondaryText);
        this._levelLabel = levelLabel;

        // 步数
        const movesNode = new cc.Node("Moves");
        movesNode.x = 60;
        movesNode.parent = hudNode;
        const movesLabel = movesNode.addComponent(cc.Label);
        movesLabel.string = "步数: 0";
        movesLabel.fontSize = 20;
        movesLabel.lineHeight = 30;
        movesNode.color = UIThemeManager.toColor(theme.hud.primaryText);
        this._movesLabel = movesLabel;

        // 分数
        const scoreNode = new cc.Node("Score");
        scoreNode.x = 180;
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

        const g = btnNode.addComponent(cc.Graphics);
        UIGraphicsHelper.drawButton(g, 100, 44, theme.btn.bg, theme.btn.radius);

        const labelNode = new cc.Node("BtnLabel");
        labelNode.parent = btnNode;
        const label = labelNode.addComponent(cc.Label);
        label.string = "返回";
        label.fontSize = theme.btn.fontSize;
        label.lineHeight = 44;
        label.enableBold = true;
        labelNode.color = UIThemeManager.toColor(theme.btn.text);

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
     * 构建通关遮罩层 (初始隐藏)
     */
    private _buildClearOverlay(): void {
        const overlay = new cc.Node("ClearOverlay");
        overlay.setContentSize(DESIGN_W, DESIGN_H);
        overlay.zIndex = 20;
        overlay.opacity = 0;
        overlay.active = false;
        overlay.parent = this.node;
        this._clearOverlay = overlay;
    }

    // ===================== 交互处理 =====================

    /**
     * 格子点击回调 — 旋转管道
     */
    private _onCellTap(row: number, col: number): void {
        if (this._isCleared || this._isRotating) return;

        const ctrl = PipeControl.instance;
        const success = ctrl.rotateCell(row, col);
        if (!success) return;

        this._isRotating = true;

        // 旋转动画
        const cellNode = this._cellNodes[row][col];
        const pipeNode = cellNode.getChildByName("PipeGfx");
        if (pipeNode) {
            const targetAngle = pipeNode.angle - 90;
            cc.tween(pipeNode)
                .to(ctrl.config.rotateDuration, { angle: targetAngle }, { easing: "backOut" })
                .call(() => {
                    // 动画结束后用实际数据重绘 (修正累计误差)
                    pipeNode.angle = 0;
                    const cell = ctrl.grid[row][col];
                    const theme = UIThemeManager.current;
                    this._drawPipe(this._pipeGfxMap[row][col], ctrl.config.cellSize, cell, theme, cell.filled);
                    this._isRotating = false;

                    // 检查连通性
                    this._afterRotation();
                })
                .start();
        } else {
            this._isRotating = false;
            this._afterRotation();
        }

        // 更新 HUD
        this._updateHUD();
    }

    /**
     * 旋转后的检查逻辑
     */
    private _afterRotation(): void {
        const ctrl = PipeControl.instance;
        const connected = ctrl.checkAndUpdateConnectivity();

        // 更新所有格子的水流状态
        this._refreshAllPipes();

        if (connected && !this._isCleared) {
            // 通关!
            ctrl.clearLevel();
            this._isCleared = true;
            this._onLevelCleared();
        }

        // 检查游戏结束 (步数耗尽)
        if (ctrl.isGameOver && !this._isCleared) {
            this._onGameOver();
        }
    }

    /**
     * 刷新所有管道的绘制 (根据 filled 状态)
     */
    private _refreshAllPipes(): void {
        const ctrl = PipeControl.instance;
        const theme = UIThemeManager.current;
        const cfg = ctrl.config;

        for (let r = 0; r < ctrl.rows; r++) {
            for (let c = 0; c < ctrl.cols; c++) {
                const cell = ctrl.grid[r][c];
                const g = this._pipeGfxMap[r][c];
                if (g) {
                    this._drawPipe(g, cfg.cellSize, cell, theme, cell.filled);
                }
                // 水流填充时格子背景也微调
                const bgG = this._cellBgMap[r][c];
                if (bgG && cell.filled && cell.type !== PipeType.EMPTY) {
                    this._drawCellBg(bgG, cfg.cellSize, cell, theme);
                    // 叠加水流高光
                    const half = cfg.cellSize / 2;
                    bgG.fillColor = UIThemeManager.toColor([
                        theme.gameArea.highlight[0],
                        theme.gameArea.highlight[1],
                        theme.gameArea.highlight[2],
                        30,
                    ]);
                    UIGraphicsHelper.roundRect(bgG, -half, -half, cfg.cellSize, cfg.cellSize, 8);
                    bgG.fill();
                }
            }
        }
    }

    /**
     * 更新 HUD 显示
     */
    private _updateHUD(): void {
        const ctrl = PipeControl.instance;
        this._movesLabel.string = "步数: " + ctrl.moves;
        this._scoreLabel.string = ctrl.score.toString();
    }

    // ===================== 通关处理 =====================

    /**
     * 通关
     */
    private _onLevelCleared(): void {
        Logger.getInstance().info("Pipe", "通关! 播放水流动画");

        // 更新分数
        this._updateHUD();
        this._scoreLabel.string = PipeControl.instance.score.toString();

        // 通关特效: 所有连通格子闪烁 + 飘字
        this._playClearEffect();

        // 延迟显示结算
        this.scheduleOnce(() => {
            if (this.settlement) {
                this.settlement.show(true, PipeControl.instance.score, () => {
                    GameCenter.instance.enterGame("PIPE");
                });
            } else {
                GameCenter.instance.returnToHome();
            }
        }, 1.5);
    }

    /**
     * 通关特效
     */
    private _playClearEffect(): void {
        const ctrl = PipeControl.instance;
        const theme = UIThemeManager.current;

        // 连通路径格子闪烁
        for (let r = 0; r < ctrl.rows; r++) {
            for (let c = 0; c < ctrl.cols; c++) {
                const cell = ctrl.grid[r][c];
                if (cell.filled) {
                    const node = this._cellNodes[r][c];
                    const delay = (r * ctrl.cols + c) * 0.05;
                    cc.tween(node).delay(delay).to(0.15, { scale: 1.15 }).to(0.15, { scale: 1.0 }).start();
                }
            }
        }

        // 飘字
        this._showFloatText("🎉 通关!", theme.fx.scorePopColor, 0, 50);
        this._showFloatText("+" + PipeControl.instance.score, theme.hud.accentText, 0, 0);
    }

    /**
     * 游戏结束 (步数耗尽)
     */
    private _onGameOver(): void {
        Logger.getInstance().info("Pipe", "步数耗尽, 游戏结束");

        this.scheduleOnce(() => {
            if (this.settlement) {
                this.settlement.show(false, PipeControl.instance.score, () => {
                    GameCenter.instance.enterGame("PIPE");
                });
            } else {
                GameCenter.instance.returnToHome();
            }
        }, 0.5);
    }

    // ===================== 按钮事件 =====================

    /**
     * 返回按钮
     */
    private _onBtnBack(): void {
        GameCenter.instance.returnToHome();
        Logger.getInstance().info("Pipe", "返回主界面");
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
        const ctrl = PipeControl.instance;
        const cfg = ctrl.config;

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
            const areaW = cfg.cols * (cfg.cellSize + cfg.cellSpacing) + cfg.cellSpacing + 20;
            const areaH = cfg.rows * (cfg.cellSize + cfg.cellSpacing) + cfg.cellSpacing + 20;
            this._drawAreaBorder(this._areaBorderGfx, areaW, areaH, theme);
        }

        // HUD
        if (this._hudPanelNode) {
            const g = this._hudPanelNode.getComponent(cc.Graphics);
            if (g) UIGraphicsHelper.drawHudPanel(g, 500, 50, theme.hud.panelBg, theme.hud.panelRadius);
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

        // 重绘所有格子
        for (let r = 0; r < ctrl.rows; r++) {
            for (let c = 0; c < ctrl.cols; c++) {
                const cell = ctrl.grid[r][c];
                // 重绘背景
                const bgG = this._cellBgMap[r][c];
                if (bgG) this._drawCellBg(bgG, cfg.cellSize, cell, theme);
                // 重绘管道
                const pipeG = this._pipeGfxMap[r][c];
                if (pipeG) this._drawPipe(pipeG, cfg.cellSize, cell, theme, cell.filled);
            }
        }

        Logger.getInstance().info("Pipe", `主题切换: ${theme.name}`);
    }

    // ===================== 特效 =====================

    /**
     * 飘字特效
     */
    private _showFloatText(text: string, color: RGBA, x: number, y: number): void {
        const node = new cc.Node("FloatText");
        node.x = x;
        node.y = y;
        node.zIndex = 25;
        node.parent = this.node;
        const label = node.addComponent(cc.Label);
        label.string = text;
        label.fontSize = 32;
        label.lineHeight = 40;
        label.enableBold = true;
        node.color = UIThemeManager.toColor(color);
        node.opacity = 255;

        cc.tween(node)
            .to(1.0, { y: y + 100, opacity: 0 })
            .call(() => {
                if (node.isValid) node.destroy();
            })
            .start();
    }

    /**
     * 返回按钮回调 (兼容旧的按钮绑定)
     */
    public onBtnBackClicked(): void {
        this._onBtnBack();
    }
}
