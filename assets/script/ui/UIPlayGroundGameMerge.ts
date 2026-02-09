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
     * @description 方格预制体
     */
    @property(cc.Prefab)
    protected squarePrefab: cc.Prefab = null;

    private _logic: MergeGameLogic = null;
    private _state: MergeGameState = MergeGameState.IDLE;
    private _squares: PrefabMergeSquare[][] = [];

    protected onLoad(): void {
        this._logic = new MergeGameLogic(DEFAULT_MERGE_GAME_CONFIG);
        this.initView();

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
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
            cc.tween(node).to(0.1, { scale: 0.9 }).start();
        });
        node.on(cc.Node.EventType.TOUCH_CANCEL, () => {
            cc.tween(node).to(0.1, { scale: 1.0 }).start();
        });
        node.on(cc.Node.EventType.TOUCH_END, () => {
            cc.tween(node).to(0.1, { scale: 1.0 }).start();
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
        const removedPos = this._logic.merge(x, y);

        // 2. 更新分数
        if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${this._logic.score}`;
        }

        // 3. 动画：表现合并
        await this.playMergeAnimation(x, y, removedPos);

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
        removed: { x: number; y: number }[]
    ): Promise<void> {
        const targetPos = this.gridToPosition(targetX, targetY);
        const promises = removed.map((pos) => {
            return new Promise<void>((resolve) => {
                const square = this._squares[pos.x][pos.y];
                cc.tween(square.node)
                    .to(DEFAULT_MERGE_GAME_CONFIG.mergeDuration * 0.6, { position: targetPos, scale: 0.5, opacity: 0 })
                    .call(() => {
                        square.node.destroy();
                        this._squares[pos.x][pos.y] = null;
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
                    .to(0.3, { position: this.gridToPosition(move.toX, move.toY) }, { easing: "bounceOut" })
                    .call(() => resolve())
                    .start();
            });
        });

        await Promise.all(promises);
    }
}
