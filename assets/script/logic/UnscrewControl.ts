import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";
import { IUnscrewLevel, IScrewData } from "./UnscrewDataTransfer";

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

    /** 槽位列表 */
    private slots: (IScrewData | null)[] = [];
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
        Logger.getInstance().info("Unscrew", `正在加载关卡ID: ${data.id}, 槽位数: ${data.slotCount}`);
    }

    /**
     * 实现 FR-004: 实现 cc.WeldJoint 动态生成逻辑
     * 用于将金属板固定到背景节点
     */
    public createWeldJoint(target: cc.RigidBody, anchor: cc.Vec2): cc.WeldJoint {
        const joint = target.node.addComponent(cc.WeldJoint);
        joint.connectedBody = null; // 连接到静止背景
        joint.anchor = target.node.convertToNodeSpaceAR(anchor);
        joint.referenceAngle = target.node.angle;
        return joint;
    }
}
