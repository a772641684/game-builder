import { Singleton } from "../../ace/logic/Singleton";
import { DifficultyManager } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/**
 * 点线交织核心逻辑控制器
 */
export class PolyControl extends Singleton<PolyControl> {
    private _anchors: cc.Vec2[] = [];

    public static get instance(): PolyControl {
        if (!this._instance) {
            this._instance = new PolyControl();
            this._instance.init();
        }
        return this._instance;
    }

    public static getInstance(): PolyControl {
        return this.instance;
    }

    protected init(): void {
        Logger.getInstance().info("Poly", "PolyControl 初始化完成");
    }

    public startGame(): void {
        const lv = DifficultyManager.instance.getCurrentLevel("POLY");
        const difficulty = DifficultyManager.instance.getParams("POLY");

        // [US2] 注入 PCG 关卡生成
        this._anchors = LevelGenerator.instance.generatePolyAnchors(lv, difficulty.speed);

        Logger.getInstance().info("Poly", `开启点线交织游戏, 关卡: ${lv}, 锚点数: ${this._anchors.length}`);
    }

    /**
     * 获取生成的锚点布局
     */
    public getAnchors(): cc.Vec2[] {
        return this._anchors;
    }
}
