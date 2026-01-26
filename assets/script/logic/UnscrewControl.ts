import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";
import { StorageControl } from "./StorageControl";
import { IUnscrewCommand, IUnscrewLevel, IScrewData } from "./UnscrewDataTransfer";

/**
 * 拆螺丝益智游戏逻辑控制器
 * [架构说明]:
 * 1. 继承自 Singleton 实现逻辑单例。
 * 2. 负责物理引擎初始化、关卡数据解析、螺丝槽位管理及核心游戏状态判定。
 * 3. 严格遵循项目宪法原则，使用中文日志与 JSDoc。
 */
export class UnscrewControl extends Singleton<UnscrewControl> {
    /** 当前关卡数据 */
    private currentLevel: IUnscrewLevel | null = null;

    /** 剩余目标金属板数量 (T020) */
    private remainingPlateCount: number = 0;

    /** 槽位列表 */
    private slots: (IScrewData | null)[] = [];

    /** 持有对 UI 的引用，用于获取槽位坐标等 */
    private uiNode: any = null;

    /** 螺丝关联的物理关节映射表 (screwId -> joints) */
    private screwJointMap: Map<string, cc.WeldJoint[]> = new Map();

    /** 操作历史栈 (用于 Undo, T018) */
    private commandHistory: IUnscrewCommand[] = [];

    /**
     * 设置当前活跃的 UI 控制器
     * @param ui UIPlayGroundGameUnscrew 实例
     */
    public setUI(ui: any): void {
        this.uiNode = ui;
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): UnscrewControl {
        return this.instance as UnscrewControl;
    }

    /**
     * 销毁实例
     * 遵循宪法原则 X，在 UI 销毁时显式调用
     */
    public static destroyInstance(): void {
        if (this._instance) {
            this._instance.dispose();
            this._instance = null;
        }
    }

    /**
     * 初始化逻辑
     */
    protected init(): void {
        super.init();
        this.initPhysics();
        Logger.getInstance().info("Unscrew", "UnscrewControl 单例初始化完成并启用物理引擎");
    }

    /**
     * 初始化物理引擎配置
     * 遵循 FR-001：模拟重力环境
     */
    private initPhysics(): void {
        const manager = cc.director.getPhysicsManager();
        manager.enabled = true;
        // 设置重力 (向下)
        manager.gravity = cc.v2(0, -960);

        // 启用碰撞矩阵和调试绘图（开发阶段可选，正式提交前应关闭）
        // manager.debugDrawFlags = cc.PhysicsManager.DrawBits.e_aabbBit | cc.PhysicsManager.DrawBits.e_jointBit | cc.PhysicsManager.DrawBits.e_shapeBit;
    }

    /**
     * 释放资源逻辑
     */
    protected dispose(): void {
        Logger.getInstance().info("Unscrew", "UnscrewControl 单例已销毁并释放资源");
    }

    /**
     * 加载并解析关卡数据
     * @param data 关卡 JSON 数据
     */
    public loadLevel(data: IUnscrewLevel): void {
        this.currentLevel = data;
        this.slots = new Array(data.slotCount).fill(null);
        this.remainingPlateCount = data.plates.length; // 初始化目标总数 (T020)
        this.commandHistory = [];
        this.screwJointMap.clear();
        Logger.getInstance().info("Unscrew", `正在加载关卡ID: ${data.id}, 槽位数: ${data.slotCount}, 金属板数: ${this.remainingPlateCount}`);
    }

    /**
     * 响应金属板销毁 (被从关卡中移除)
     * 用于胜利判定 (T020)
     */
    public onPlateDestroyed(): void {
        this.remainingPlateCount--;
        if (this.remainingPlateCount <= 0) {
            this.remainingPlateCount = 0;
            this.handleVictory();
        }
    }

    /**
     * 处理胜利逻辑 (T021)
     */
    private handleVictory(): void {
        Logger.getInstance().info("Unscrew", "恭喜！关卡胜利");
        
        // 1. 保存关卡进度 (T023)
        if (this.currentLevel) {
            StorageControl.getInstance().saveData({
                unscrewLevel: this.currentLevel.id + 1
            });
        }
        
        // 2. TODO: 弹出结算界面
    }

    /**
     * 实现 FR-004: 实现 cc.WeldJoint 动态生成逻辑
     * 用于将金属板固定到背景节点
     * @param screwId 关联的螺丝 ID
     * @param target 金属板的刚体
     * @param anchor 锚点坐标
     */
    public createWeldJoint(screwId: string, target: cc.RigidBody, anchor: cc.Vec2): cc.WeldJoint {
        const joint = target.node.addComponent(cc.WeldJoint);
        joint.connectedBody = null; // 连接到静止背景
        joint.anchor = target.node.convertToNodeSpaceAR(anchor);
        joint.referenceAngle = target.node.angle;

        // 记录映射关系，以便拆卸时断开
        if (!this.screwJointMap.has(screwId)) {
            this.screwJointMap.set(screwId, []);
        }
        this.screwJointMap.get(screwId)!.push(joint);

        return joint;
    }

    /**
     * 尝试拆卸螺丝
     * @param screw 螺丝组件实例
     * @returns 是否成功触发拆卸
     */
    public tryUnscrew(screw: any): boolean {
        const screwId = screw.screwId;
        Logger.getInstance().info("Unscrew", `正在尝试拆卸螺丝: ${screwId}`);

        // 1. 查找空槽位 (T015/T012)
        const slotIndex = this.slots.indexOf(null);
        if (slotIndex === -1) {
            Logger.getInstance().warn("Unscrew", "无可用的槽位，操作取消");
            // TODO: 播放抖动动画提示失败 (T018)
            return false;
        }

        // 2. 状态快照 (T018)
        const command: IUnscrewCommand = {
            screw: screw,
            fromPos: screw.node.position.clone(),
            slotIndex: slotIndex,
            recoveredPlates: [],
            timestamp: Date.now()
        };

        // 3. 查找对应的物理关节并断开 (FR-004/T011)
        const joints = this.screwJointMap.get(screwId);
        if (joints) {
            joints.forEach(joint => {
                if (cc.isValid(joint)) {
                    const plate = joint.node.getComponent("PrefabGamePlate");
                    if (plate) {
                        command.recoveredPlates.push({
                            plate: plate,
                            anchor: joint.anchor.clone() // 记录锚点位置
                        });
                        (plate as any).onScrewRemoved();
                    }
                    joint.destroy();
                }
            });
            this.screwJointMap.delete(screwId);
        }
        
        // 占位
        this.slots[slotIndex] = { id: screwId } as any;
        this.commandHistory.push(command);
        if (this.commandHistory.length > 20) this.commandHistory.shift(); // 限制快照上限 (宪法 IX)

        // 4. 执行移动动画 (T012)
        let targetWorldPos = cc.v2(0, 400); 
        if (this.uiNode && typeof this.uiNode.getSlotWorldPos === "function") {
            targetWorldPos = this.uiNode.getSlotWorldPos(slotIndex);
        }
        
        const targetLocalPos = screw.node.parent.convertToNodeSpaceAR(targetWorldPos);

        cc.tween(screw.node)
            .to(0.5, { position: targetLocalPos }, { easing: "sineOut" })
            .call(() => {
                Logger.getInstance().info("Unscrew", `螺丝 ${screwId} 已进入槽位 ${slotIndex}`);
                this.checkState();
            })
            .start();

        return true;
    }

    /**
     * 实现关卡重置功能 (T029)
     */
    public resetLevel(): void {
        if (!this.currentLevel) return;
        Logger.getInstance().info("Unscrew", `重置当前关卡: ${this.currentLevel.id}`);
        // 重新加载当前数据
        this.loadLevel(this.currentLevel);
        // TODO: UI 层需要清理节点并重新生成 (US1 物理环境)
    }
     * 1. 扩充 1 个临时槽位
     * 2. 清理 2 个已占用的螺丝
     */
    public revive(): void {
        Logger.getInstance().info("Unscrew", "执行复活逻辑：扩充位置并清理螺丝");
        
        // 1. 扩充槽位
        this.slots.push(null);

        // 2. 清理前两个占用的螺丝 (如果有)
        let clearedCount = 0;
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i] !== null) {
                this.slots[i] = null;
                clearedCount++;
                if (clearedCount >= 2) break;
            }
        }
        
        // TODO: UI 层需要刷新显示 (T016)
    }
        const cmd = this.commandHistory.pop();
        if (!cmd) {
            Logger.getInstance().info("Unscrew", "无可撤销的历史记录");
            return;
        }

        Logger.getInstance().info("Unscrew", `执行撤销: ${cmd.screw.screwId}`);

        // 1. 移回原位
        cc.tween(cmd.screw.node)
            .to(0.3, { position: cmd.fromPos }, { easing: "sineIn" })
            .start();

        // 2. 释放槽位
        this.slots[cmd.slotIndex] = null;

        // 3. 恢复物理约束
        cmd.recoveredPlates.forEach(item => {
            if (cc.isValid(item.plate)) {
                const rb = item.plate.getComponent(cc.RigidBody);
                this.createWeldJoint(cmd.screw.screwId, rb, item.plate.node.convertToWorldSpaceAR(item.anchor));
                item.plate.onScrewRestored();
            }
        });
    }
}
