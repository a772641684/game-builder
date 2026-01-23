import { Singleton } from "../../ace/logic/Singleton";
import { DifficultyManager } from "./DifficultyManager";
import { LevelGenerator } from "./LevelGenerator";
import { Logger } from "./Logger";

/**
 * 抓娃娃核心逻辑控制器
 */
export class ClawControl extends Singleton<ClawControl> {
    private _items: { x: number; weight: number }[] = [];

    public static get instance(): ClawControl {
        if (!this._instance) {
            this._instance = new ClawControl();
            this._instance.init();
        }
        return this._instance;
    }

    public static getInstance(): ClawControl {
        return this.instance;
    }

    protected init(): void {
        Logger.getInstance().info("Claw", "ClawControl 初始化完成");
    }

    public startGame(): void {
        const lv = DifficultyManager.instance.getCurrentLevel("CLAW");
        const diff = DifficultyManager.instance.getParams("CLAW");

        // [US2] 注入物品随机分布
        this._items = LevelGenerator.instance.generateClawItems(lv, diff.speed);

        Logger.getInstance().info("Claw", `开启抓娃娃游戏,等级: ${lv}, 物品数: ${this._items.length}`);
    }

    public getItems(): { x: number; weight: number }[] {
        return this._items;
    }
}
