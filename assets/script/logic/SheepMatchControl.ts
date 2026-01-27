import { Singleton } from "../../ace/logic/Singleton";
import { UI_ENUM } from "../enums/UIEnum";
import { Logger } from "./Logger";
import { IMatchCommand, ISheepMatchLevel, ISlotItem } from "./MatchDataTransfer";
import { StorageControl } from "./StorageControl";
import { UILayer, UIManager } from "./UIManager";

/**
 * 羊了个羊类三消游戏逻辑控制器
 * [架构说明]:
 * 1. 负责方块堆叠状态维护、遮挡检测、槽位自动排序及消除。
 * 2. 严格遵循项目宪法原则：使用 Logger、中文注释。
 */
export class SheepMatchControl extends Singleton<SheepMatchControl> {
    /** 当前关卡数据 */
    private currentLevel: ISheepMatchLevel | null = null;

    /** 槽位列表 (ISlotItem | null)[] */
    private slots: (ISlotItem | null)[] = [];

    /** 历史操作栈 (快照模式实现撤销) */
    private commandHistory: IMatchCommand[] = [];

    /** 已消除的总数 (用于胜利判定 T017) */
    private totalEliminated: number = 0;

    /** 关联的 UI 实例引用 */
    private uiController: any = null;

    /**
     * 获取单例实例
     */
    public static getInstance(): SheepMatchControl {
        return this.instance as SheepMatchControl;
    }

    /**
     * 销毁单例 (宪法原则 X)
     */
    public static destroyInstance(): void {
        if (this._instance) {
            this._instance.dispose();
            this._instance = null;
        }
    }

    protected init(): void {
        super.init();
        Logger.getInstance().info("Match", "SheepMatchControl 逻辑单例已就绪");
    }

    protected dispose(): void {
        Logger.getInstance().info("Match", "SheepMatchControl 逻辑单例已销毁");
    }

    /**
     * 绑定 UI 控制器
     */
    public setUI(ui: any): void {
        this.uiController = ui;
    }

    /**
     * 加载关卡
     */
    public loadLevel(level: ISheepMatchLevel): void {
        this.currentLevel = level;
        this.slots = new Array(level.slotCount || 7).fill(null);
        this.commandHistory = [];
        this.totalEliminated = 0;

        Logger.getInstance().info("Match", `正在加载关卡: ${level.id}, 目标方块数: ${level.tiles.length}`);
    }

    /**
     * 批量生成方块实例 (针对 T006)
     */
    private spawnTiles(tilesData: any[]): void {
        if (!this.uiController || !this.uiController.tilePrefab || !this.uiController.gameArea) {
            Logger.getInstance().error("Match", "生成方块失败：缺少 UI 引用或预制体");
            return;
        }

        tilesData.forEach((data) => {
            const node = cc.instantiate(this.uiController.tilePrefab);
            node.parent = this.uiController.gameArea;
            node.setPosition(data.pos.x, data.pos.y);

            const tileScript = node.getComponent("PrefabGameTile");
            if (tileScript) {
                tileScript.init(data.id, data.type, data.layer);
            }
        });
    }

    /**
     * 刷新全场遮挡状态 (US2 / T014)
     * 利用 cc.Rect 的交集判断
     */
    public refreshAllBlockStates(): void {
        if (!this.uiController || !this.uiController.gameArea) return;

        const tiles = this.uiController.gameArea.getComponentsInChildren("PrefabGameTile");

        for (let i = 0; i < tiles.length; i++) {
            let self = tiles[i];
            let selfRect = self.node.getBoundingBox();
            let isBlocked = false;

            for (let j = 0; j < tiles.length; j++) {
                let other = tiles[j];
                // 仅检测层级高于自己的方块
                if (other.layer > self.layer) {
                    if (selfRect.intersects(other.node.getBoundingBox())) {
                        isBlocked = true;
                        break;
                    }
                }
            }
            self.setBlockedState(isBlocked);
        }
    }

    /**
     * 处理方块点击请求 (T010 / US1)
     * @param tileScript 方块组件脚本
     */
    public handleTileClick(tileScript: any): void {
        if (tileScript.isBlocked) {
            Logger.getInstance().warn("Match", `方块 ${tileScript.uid} 目前被遮挡，不可点击`);
            return;
        }

        // 1. 查找空闲索引
        const firstEmptyIndex = this.slots.indexOf(null);
        if (firstEmptyIndex === -1) {
            Logger.getInstance().error("Match", "槽位已满，游戏失败");
            return;
        }

        // 2. 存入操作历史 (用于撤销)
        this.saveSnapShot(tileScript);

        // 3. 执行进槽逻辑
        this.moveTileToSlot(tileScript);
    }

    /**
     * 将方块移动到槽位并处理排序消除 (T011)
     */
    private moveTileToSlot(tileScript: any): void {
        // 查找槽位中相同类型的方块位置，以便插入
        let insertIndex = -1;
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i] && this.slots[i]!.type === tileScript.type) {
                insertIndex = i;
            }
        }

        // 插入逻辑：如果找到同类，插入在其后；否则插入末尾
        const targetIndex = insertIndex !== -1 ? insertIndex + 1 : this.slots.indexOf(null);

        // 槽位向后平移 (T011)
        for (let j = this.slots.length - 1; j > targetIndex; j--) {
            this.slots[j] = this.slots[j - 1];
        }

        // 置入新方块
        this.slots[targetIndex] = {
            id: tileScript.uid,
            type: tileScript.type,
            node: tileScript.node,
        };

        // UI 表现：移动动画与遮挡更新
        this.uiController.playMoveToSlot(tileScript.node, targetIndex, () => {
            this.checkElimination(tileScript.type);
            this.refreshAllBlockStates();
            this.updateSlotPositions();
        });
    }

    /**
     * 检查并执行消除 (T013)
     */
    private checkElimination(type: number): void {
        const matches = this.slots.filter((s) => s && s.type === type);
        if (matches.length >= 3) {
            Logger.getInstance().info("Match", `发现三连消除: 类型 ${type}`);

            // 计数增加 (T017)
            this.totalEliminated += 3;

            // 从槽位数据中移除
            this.slots = this.slots.map((s) => (s && s.type === type ? null : s));

            // 数据整理：将 null 向后移动
            this.slots.sort((a, b) => (a === null ? 1 : b === null ? -1 : 0));

            // UI 表现：销毁节点并重新排列
            matches.forEach((m) => {
                if (m && m.node) {
                    this.uiController.playEliminationEffect(m.node);
                }
            });

            // 检查胜利
            this.checkGameResult();
        } else {
            // 没有消除时检查是否失败
            this.checkGameResult();
        }
    }

    /**
     * 检测游戏胜负 (T017-T018)
     */
    private checkGameResult(): void {
        if (!this.currentLevel) return;

        // 1. 胜利判定：所有方块已消除
        if (this.totalEliminated >= this.currentLevel.tiles.length) {
            Logger.getInstance().info("Match", "恭喜！关卡已全部清除，游戏胜利");

            // 保存进度 (T026)
            StorageControl.getInstance().setLevelProgress(
                UI_ENUM.SHEEP_MATCH.toString(),
                Number(this.currentLevel.id) + 1
            );

            this.showSettlement(true);
            this.showSettlement(false);
        }
    }

    /**
     * 显示结算界面 (T019)
     */
    private showSettlement(isWin: boolean): void {
        UIManager.instance.openUI(UI_ENUM.SETTLEMENT, UILayer.Popup, false, (node) => {
            const settlement = node.getComponent("UISettlement");
            if (settlement) {
                // 分数计算：消除数 * 10 (基础分)
                settlement.show(isWin, this.totalEliminated * 10, () => {
                    // 重新开始：重新加载当前关卡
                    if (this.currentLevel) {
                        this.loadLevel(this.currentLevel);
                    }
                });
            }
        });
    }

    /**
     * 更新槽位节点物理位置 (T012)
     */
    private updateSlotPositions(): void {
        this.slots.forEach((item, index) => {
            if (item && item.node) {
                this.uiController.repositionSlotItem(item.node, index);
            }
        });
    }

    /**
     * 执行撤销操作 (T025 / US3)
     * [逻辑说明]:
     * 1. 弹出历史记录。
     * 2. 将方块从槽位移回游戏区原始位置。
     * 3. 刷新全场遮挡状态。
     */
    public undoMove(): void {
        const cmd = this.commandHistory.pop();
        if (!cmd || cmd.action !== "move") {
            Logger.getInstance().warn("Match", "无可撤销的操作");
            return;
        }

        const tileId = cmd.tileId;
        const indexInSlots = this.slots.findIndex((s) => s && s.id === tileId);

        if (indexInSlots !== -1) {
            const item = this.slots[indexInSlots]!;
            // 1. 从逻辑槽位移除
            this.slots[indexInSlots] = null;
            // 2. 数据整理 (向左压缩，保持 null 在右)
            this.slots.sort((a, b) => (a === null ? 1 : b === null ? -1 : 0));

            // 3. UI 表现：移回游戏区
            this.uiController.playUndoMove(item.node, cmd.data.originalPos, () => {
                // 4. 重置方块状态 (层级、遮挡)
                const tileScript = item.node.getComponent("PrefabGameTile");
                if (tileScript) {
                    tileScript.node.setParent(this.uiController.gameArea);
                    this.refreshAllBlockStates();
                }
                this.updateSlotPositions();
            });

            Logger.getInstance().info("Match", `已撤销方块移动: ${tileId}`);
        }
    }

    /**
     * 记录当前状态截图 (T025 Undo 支持)
     */
    private saveSnapShot(tileScript: any): void {
        // 简易撤销：记录被点击方块的原始位置和层级
        this.commandHistory.push({
            action: "move",
            tileId: tileScript.uid,
            timestamp: Date.now(),
            data: {
                originalPos: tileScript.node.getPosition(),
                originalLayer: tileScript.layer,
            },
        });
    }
}
