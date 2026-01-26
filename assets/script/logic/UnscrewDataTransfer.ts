/**
 * 拆螺丝游戏数据定义
 * 对应 data-model.md
 */

export interface IUnscrewLevel {
    id: number;
    slotCount: number;
    plates: IPlateData[];
    screws: IScrewData[];
}

export interface IPlateData {
    id: string;
    shape: "rect" | "circle" | "poly";
    position: { x: number; y: number };
    angle: number;
    density: number;
    asset: string;
}

export interface IScrewData {
    id: string;
    position: { x: number; y: number };
    boundPlateIds: string[];
    color?: string;
}

export interface IUnscrewCommand {
    screw: any; // 引用螺丝组件
    fromPos: cc.Vec2;
    slotIndex: number;
    // 存储被解开的关节关联的信息，用于恢复 (T019)
    recoveredPlates: { plate: any; anchor: cc.Vec2 }[];
    timestamp: number;
}
