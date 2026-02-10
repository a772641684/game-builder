const { ccclass, property } = cc._decorator;

import { DEFAULT_MERGE_GAME_CONFIG, MergeGameState } from "../enums/MergeGameEnum";
import MergeGameLogic from "../game/MergeGameLogic";
import { GameCenter } from "../logic/GameCenter";
import { Loader } from "../logic/Loader";
import { Logger } from "../logic/Logger";
import PrefabMergeSquare from "../prefab/PrefabMergeSquare";

/**
 * 合成游戏主界面
 * [Prefab 结构说明]
 * - UIPlayGroundGameMerge
 *   - Background (cc.Sprite, opacity: 200)
 *   - GameArea (cc.Node)
 *   - ScoreLabel (cc.Label)
 *   - AutoButton (cc.Button)
 */
@ccclass
export default class UIPlayGroundGameMerge extends cc.Component {
    /**
     * @description 游戏容器挂载点
     * 节点路径: GameArea
     */
    @property(cc.Node)
    protected gameArea: cc.Node = null;

    /**
     * @description 分数文本
     * 节点路径: ScoreLabel
     */
    @property(cc.Label)
    protected scoreLabel: cc.Label = null;

    /**
     * @description 自动合成按钮
     * 节点路径: AutoButton
     */
    @property(cc.Button)
    protected autoButton: cc.Button = null;

    /**
     * @description 方格预制体
     */
    @property(cc.Prefab)
    protected squarePrefab: cc.Prefab = null;

    private _logic: MergeGameLogic = null;
    private _state: MergeGameState = MergeGameState.IDLE;
    private _squares: PrefabMergeSquare[][] = [];
    private _isAutoPlaying: boolean = false;

    protected onLoad(): void {
        this._logic = new MergeGameLogic(DEFAULT_MERGE_GAME_CONFIG);
        this.initView();

        if (this.autoButton) {
            this.autoButton.node.on("click", this.onAutoBtnClick, this);
        }

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    protected async onAutoBtnClick(): Promise<void> {
        this._isAutoPlaying = !this._isAutoPlaying;
        this.updateAutoButtonUI();

        if (this._isAutoPlaying && this._state === MergeGameState.IDLE) {
            this.runAutoStep();
        }
    }

    private async runAutoStep(): Promise<void> {
        if (!this._isAutoPlaying || this._state !== MergeGameState.IDLE) return;

        const move = this._logic.getOneValidMove();
        if (move) {
            await this.onSquareClick(move.x, move.y);
            // 增加一帧延迟，确保状态切换完成
            await new Promise((resolve) => setTimeout(resolve, 100));
            this.runAutoStep();
        } else {
            this._isAutoPlaying = false;
            this.updateAutoButtonUI();
        }
    }

    private updateAutoButtonUI(): void {
        if (this.autoButton) {
            const label = this.autoButton.node.getComponentInChildren(cc.Label);
            if (label) {
                label.string = this._isAutoPlaying ? "停止" : "自动";
            }
        }
    }

    protected onDestroy(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onKeyDown(event: cc.Event.EventKeyboard): void {
        if (event.keyCode === cc.macro.KEY.escape) {
            GameCenter.instance.returnToHome();
        }
    }

    /**
     * 初始化视图网格
     */
    protected initView(): void {
        const grid = this._logic.grid;
        const { cols, rows } = DEFAULT_MERGE_GAME_CONFIG;

        for (let x = 0; x < cols; x++) {
            this._squares[x] = [];
            for (let y = 0; y < rows; y++) {
                this.createSquareAt(x, y, grid[x][y]);
            }
        }

        Logger.getInstance().info("MergeGame", `游戏初始化完成: ${cols}x${rows}`);
    }

    /**
     * 在指定位置创建方格
     */
    protected createSquareAt(x: number, y: number, type: number, addToGrid: boolean = true): PrefabMergeSquare {
        const node = Loader.instance.instantiate(this.squarePrefab);
        node.parent = this.gameArea;

        const square = node.getComponent(PrefabMergeSquare);
        square.init(type, x, y);

        // 设置位置
        node.setPosition(this.gridToPosition(x, y));
        node.setContentSize(DEFAULT_MERGE_GAME_CONFIG.squareWidth, DEFAULT_MERGE_GAME_CONFIG.squareHeight);

        // 绑定点击事件
        node.on(cc.Node.EventType.TOUCH_START, () => {
            cc.tween(node).to(0.05, { scale: 0.9 }).start();
        });
        node.on(cc.Node.EventType.TOUCH_CANCEL, () => {
            cc.tween(node).to(0.05, { scale: 1.0 }).start();
        });
        node.on(cc.Node.EventType.TOUCH_END, () => {
            cc.tween(node).to(0.05, { scale: 1.0 }).start();
            // 使用组件当前记录的坐标，防止因下落导致的坐标不一致
            this.onSquareClick(square.gridX, square.gridY);
        });

        if (addToGrid) {
            this._squares[x][y] = square;
        }
        return square;
    }

    /**
     * 网格坐标转本地坐标
     */
    protected gridToPosition(x: number, y: number): cc.Vec2 {
        const { squareWidth, squareHeight, spacing, cols, rows } = DEFAULT_MERGE_GAME_CONFIG;
        const totalWidth = cols * squareWidth + (cols - 1) * spacing;
        const totalHeight = rows * squareHeight + (rows - 1) * spacing;

        const startX = -totalWidth / 2 + squareWidth / 2;
        const startY = -totalHeight / 2 + squareHeight / 2;

        return cc.v2(startX + x * (squareWidth + spacing), startY + y * (squareHeight + spacing));
    }

    /**
     * 点击处理
     */
    protected async onSquareClick(x: number, y: number): Promise<void> {
        if (this._state !== MergeGameState.IDLE) return;

        const connected = this._logic.getConnectedSquares(x, y);
        if (connected.length <= 1) return;

        this._state = MergeGameState.MERGING;

        // 1. 执行逻辑合并
        const removedWithPaths = this._logic.merge(x, y);

        // 2. 更新分数
        if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${this._logic.score}`;
        }

        // 3. 动画：表现合并
        await this.playMergeAnimation(x, y, removedWithPaths);

        // 4. 执行重力
        await this.handleGravity();

        // 5. 检查游戏结束
        if (!this._logic.hasPossibleMoves()) {
            this._state = MergeGameState.GAME_OVER;
            Logger.getInstance().info("MergeGame", "游戏结束: 无可合成方块");
            // 可根据需要弹出结束 UI
        } else {
            this._state = MergeGameState.IDLE;
        }
    }

    /**
     * 合成动画
     */
    protected async playMergeAnimation(
        targetX: number,
        targetY: number,
        removed: { x: number; y: number; path: { x: number; y: number }[] }[]
    ): Promise<void> {
        const promises = removed.map((item) => {
            return new Promise<void>((resolve) => {
                const square = this._squares[item.x][item.y];
                if (!square) {
                    resolve();
                    return;
                }

                // 轨迹动画：反转路径 (path[0] 是 root，path[n] 是 node 的直接父节点)
                // path: [root, p1, p2, p3] -> trajectory: [p3, p2, p1, root]
                const movePath = [...item.path].reverse();

                let t = cc.tween(square.node);
                // 总时间分配给每一个步长
                const stepDuration = DEFAULT_MERGE_GAME_CONFIG.mergeDuration / (movePath.length || 1);

                movePath.forEach((pos) => {
                    t = t.to(stepDuration, { position: this.gridToPosition(pos.x, pos.y) });
                });

                t.to(0.05, { scale: 0.5, opacity: 0 })
                    .call(() => {
                        square.node.destroy();
                        this._squares[item.x][item.y] = null;
                        resolve();
                    })
                    .start();
            });
        });

        // 目标点升级
        this._squares[targetX][targetY].init(this._logic.getType(targetX, targetY), targetX, targetY);
        cc.tween(this._squares[targetX][targetY].node)
            .to(DEFAULT_MERGE_GAME_CONFIG.mergeDuration * 0.5, { scale: 1.2 })
            .to(DEFAULT_MERGE_GAME_CONFIG.mergeDuration * 0.5, { scale: 1.0 })
            .start();

        await Promise.all(promises);
    }

    /**
     * 重力下落处理
     */
    protected async handleGravity(): Promise<void> {
        const movements = this._logic.applyGravity();
        const promises = movements.map((move) => {
            return new Promise<void>((resolve) => {
                let square = this._squares[move.fromX] && this._squares[move.fromX][move.fromY];

                if (move.fromY >= DEFAULT_MERGE_GAME_CONFIG.rows) {
                    // 新生成的，坐标 addToGrid 传 false，由外层统一管理 _squares
                    square = this.createSquareAt(move.fromX, move.fromY, move.type, false);
                    square.node.setPosition(this.gridToPosition(move.fromX, move.fromY));
                }

                this._squares[move.toX][move.toY] = square;
                square.gridX = move.toX;
                square.gridY = move.toY;

                cc.tween(square.node)
                    .to(0.2, { position: this.gridToPosition(move.toX, move.toY) }, { easing: "sineOut" })
                    .call(() => resolve())
                    .start();
            });
        });

        await Promise.all(promises);
    }
}
