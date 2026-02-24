import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";

/**
 * 线性同余生成器 (LCG)
 * 用于生成基于种子的伪随机数，确保关卡复现性
 */
export class RandomSource {
    private _seed: number;
    private readonly m = 0x80000000; // 2^31
    private readonly a = 1103515245;
    private readonly c = 12345;

    constructor(seed: string | number) {
        if (typeof seed === "string") {
            this._seed = this.hashString(seed);
        } else {
            this._seed = seed;
        }
    }

    /**
     * 将字符串映射为数字种子
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    /**
     * 获取下一个 0-1 之间的随机数
     */
    public next(): number {
        this._seed = (this.a * this._seed + this.c) % this.m;
        return this._seed / (this.m - 1);
    }

    /**
     * 获取指定范围内的随机整数 [min, max]
     */
    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
}

/**
 * 层层叠平台数据
 */
export interface ILayerPlatform {
    width: number;
    posX: number;
    moveSpeed: number;
}

/**
 * 关卡生成器工具类
 */
export class LevelGenerator extends Singleton<LevelGenerator> {
    /**
     * 获取基于种子的随机源
     */
    public getRandomSource(gameId: string, level: number): RandomSource {
        const seedStr = `${gameId}_${level}`;
        return new RandomSource(seedStr);
    }

    /**
     * [US2] 为“层层叠”生成平台参数 (T012)
     */
    public generateLayerPlatform(level: number, difficulty: number): ILayerPlatform {
        const rng = this.getRandomSource("LAYER", level);

        // 基础宽度 300, 随等级缩小, 并在 [0.8, 1.2] 范围内波动
        const baseWidth = 300 * Math.max(0.3, 1.0 - (level - 1) * 0.02);
        const width = baseWidth * (0.8 + rng.next() * 0.4);

        // 初始位置随机偏移 [-200, 200]
        const posX = rng.nextInt(-200, 200);

        // 移动速度随难度增加, 并在 [0.9, 1.1] 波动
        const moveSpeed = 150 * difficulty * (0.9 + rng.next() * 0.2);

        return { width, posX, moveSpeed };
    }

    /**
     * [US2] 为“点线交织”生成锚点布局 (T013)
     * 返回一组节点坐标
     */
    public generatePolyAnchors(level: number, difficulty: number): cc.Vec2[] {
        const rng = this.getRandomSource("POLY", level);
        const count = 5 + Math.floor((level - 1) * 0.5); // 随关卡增加点数
        const anchors: cc.Vec2[] = [];

        // 在指定区域内随机分布点，且保持最小间距
        const minDistance = 80;
        const width = 600;
        const height = 800;

        for (let i = 0; i < count; i++) {
            let retry = 10;
            while (retry > 0) {
                const x = rng.nextInt(-width / 2, width / 2);
                const y = rng.nextInt(-height / 2, height / 2);
                const pos = cc.v2(x, y);

                const tooClose = anchors.some((a) => a.sub(pos).mag() < minDistance);
                if (!tooClose) {
                    anchors.push(pos);
                    break;
                }
                retry--;
            }
        }
        return anchors;
    }

    /**
     * [US2] 为“泡泡龙”生成矩阵 (T014)
     * 返回色值矩阵 (0-5 代表不同颜色)
     */
    public generateBubbleMatrix(level: number, rows: number, cols: number): number[][] {
        const rng = this.getRandomSource("BUBBLE", level);
        const matrix: number[][] = [];
        const colorCount = Math.min(6, 3 + Math.floor(level / 5)); // 随关卡增加颜色种类

        for (let r = 0; r < rows; r++) {
            matrix[r] = [];
            for (let c = 0; c < cols; c++) {
                // 仅在前部生成泡泡，且保证不会出现大片完全不可解的块 (简单随机)
                if (r < 5 + Math.floor(level / 10)) {
                    matrix[r][c] = rng.nextInt(1, colorCount);
                } else {
                    matrix[r][c] = 0; // 空白
                }
            }
        }
        return matrix;
    }

    /**
     * [US2] 为“抓娃娃”生成物品偏移 (T014.1)
     */
    public generateClawItems(level: number, difficulty: number): { x: number; weight: number }[] {
        const rng = this.getRandomSource("CLAW", level);
        const count = 8 + Math.floor(level / 2);
        const result = [];
        for (let i = 0; i < count; i++) {
            // 随核心难度增加，物品间距更随机
            result.push({
                x: rng.nextInt(-300, 300),
                weight: 1.0 + rng.next() * difficulty * 0.5,
            });
        }
        return result;
    }

    /**
     * [US2] 为“合成大西瓜”生成投放参数 (T014.2)
     */
    public getWatermelonConfig(level: number): { maxType: number; spawnXRange: number } {
        const rng = this.getRandomSource("FRUIT", level);
        // 随等级提升，初始可生成的最大水果类型增加
        const maxType = Math.min(5, 2 + Math.floor(level / 10));
        return {
            maxType: maxType,
            spawnXRange: 50 + rng.nextInt(0, 100),
        };
    }

    /**
     * [US2] 为“弹弹球”生成砖块矩阵 (T014.3)
     */
    public generateBouncyBricks(level: number, difficulty: number): number[][] {
        const rng = this.getRandomSource("BOUNCY", level);
        const rows = 5 + Math.min(5, Math.floor(level / 5));
        const cols = 8;
        const matrix: number[][] = [];
        const fillProbability = Math.min(0.9, 0.4 + level / 20);

        for (let r = 0; r < rows; r++) {
            matrix[r] = [];
            for (let c = 0; c < cols; c++) {
                matrix[r][c] = rng.next() < fillProbability ? rng.nextInt(1, 3) : 0;
            }
        }
        return matrix;
    }

    /**
     * [US2] 为“涂鸦跳跃”生成平台区间 (T015)
     */
    public generateDoodlePlatforms(
        level: number,
        startY: number,
        count: number
    ): { x: number; y: number; type: number }[] {
        const rng = this.getRandomSource("DOODLE", level);
        const platforms = [];
        let currentY = startY;

        for (let i = 0; i < count; i++) {
            // 跳跃垂直间距随等级增加
            const gap = 80 + rng.nextInt(20, 100 + Math.min(100, level * 5));
            currentY += gap;
            platforms.push({
                x: rng.nextInt(-280, 280),
                y: currentY,
                type: rng.next() < 0.1 ? 2 : 1, // 10% 概率生成破碎平台
            });
        }
        return platforms;
    }

    /**
     * 生成大开眼界(DIFFERENCES)关卡配置
     */
    public generateDiffConfig(level: number, difficulty: number) {
        const rng = this.getRandomSource("DIFFERENCES", level);
        // 难度增加时，容错半径缩小，数量可能增加(此处Demo演示只改半径)
        const radius = Math.max(20, 50 / difficulty);
        return { radius, count: 3 };
    }

    /**
     * 生成庄园拼图(PUZZLE)关卡配置
     */
    public generatePuzzleConfig(level: number, difficulty: number) {
        // 难度增加时，吸附距离缩小
        const snapDist = Math.max(15, 40 / difficulty);
        return { snapDist };
    }

    /**
     * 生成接通水管(PIPE)关卡
     * 返回管道网格初始旋转次数
     *
     * 新版管道游戏的关卡生成已由 PipeControl 内部 DFS 算法负责。
     * 此方法保留向后兼容，返回 rows×cols 个随机旋转次数 (0-3)。
     *
     * @param level 关卡号
     * @param difficulty 难度参数（未使用）
     * @param rows 行数，默认 3
     * @param cols 列数，默认 3
     * @returns 长度为 rows*cols 的旋转次数数组（值 0-3）
     */
    public generatePipeLayout(level: number, difficulty: number, rows: number = 3, cols: number = 3): number[] {
        const rng = this.getRandomSource("PIPE", level);
        const total = rows * cols;
        const layout: number[] = [];
        for (let i = 0; i < total; i++) {
            layout.push(rng.nextInt(0, 3));
        }
        return layout;
    }

    protected init(): void {
        super.init();
        Logger.getInstance().info("LevelGenerator", "关卡算法库已就绪");
    }

    public destroy(): void {
        LevelGenerator._instance = null;
    }
}
