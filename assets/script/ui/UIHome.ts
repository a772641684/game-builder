import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * [Prefab 结构说明]
 * - UIHome (Root 挂载此脚本)
 *   - Background (Sprite)
 *   - Title (Label)
 *   - GameList (Layout)
 *     - BtnHorse (Button)
 *     - BtnFruit (Button)
 *     - BtnPuzzle (Button)
 *     - BtnDifferences (Button)
 *     - BtnPipe (Button)
 */
@ccclass
export default class UIHome extends cc.Component {
    /** 节点路径: GameList/BtnHorse */
    @property(cc.Node)
    btnHorse: cc.Node = null;

    /** 节点路径: GameList/BtnFruit */
    @property(cc.Node)
    btnFruit: cc.Node = null;

    /** 节点路径: GameList/BtnPuzzle */
    @property(cc.Node)
    btnPuzzle: cc.Node = null;

    /** 节点路径: GameList/BtnDifferences */
    @property(cc.Node)
    btnDifferences: cc.Node = null;

    /** 节点路径: GameList/BtnPipe */
    @property(cc.Node)
    btnPipe: cc.Node = null;

    protected onLoad() {
        Logger.getInstance().info("UI", "主界面加载完成");

        // 手动绑定按钮，确保即使 Prefab 未序列化 Event 也能工作
        this.btnHorse && this.btnHorse.on("click", this.onBtnHorseClick, this);
        this.btnFruit && this.btnFruit.on("click", this.onBtnFruitClick, this);
        this.btnPuzzle && this.btnPuzzle.on("click", this.onBtnPuzzleClick, this);
        this.btnDifferences && this.btnDifferences.on("click", this.onBtnDifferencesClick, this);
        this.btnPipe && this.btnPipe.on("click", this.onBtnPipeClick, this);
    }

    /**
     * 进入一马当先
     */
    public onBtnHorseClick() {
        GameCenter.instance.enterGame("HORSE");
    }

    /**
     * 进入硕果累累
     */
    public onBtnFruitClick() {
        GameCenter.instance.enterGame("FRUIT");
    }

    /**
     * 进入庄园拼图
     */
    public onBtnPuzzleClick() {
        GameCenter.instance.enterGame("PUZZLE");
    }

    /**
     * 进入大开眼界
     */
    public onBtnDifferencesClick() {
        GameCenter.instance.enterGame("DIFFERENCES");
    }

    /**
     * 进入水管接通
     */
    public onBtnPipeClick() {
        GameCenter.instance.enterGame("PIPE");
    }
}
