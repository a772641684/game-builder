import * as fs from "fs";
import * as path from "path";
import { UuidUtils } from "./UuidUtils";

/**
 * PrefabBuilder - Cocos Creator 2.3.x 预制体自动化构建工具
 *
 * 功能：
 * 1. 解析 TS 脚本中的 JSDoc [Prefab 结构说明] 以构建节点树。
 * 2. 解析 @property 注释以自动绑定节点和组件。
 * 3. 自动计算 23 位压缩 UUID 以绑定脚本组件。
 */

interface INodeStructure {
    name: string;
    children: INodeStructure[];
    component?: string;
}

class PrefabBuilder {
    private workspaceRoot: string;

    constructor() {
        this.workspaceRoot = process.cwd();
    }

    /**
     * 执行修复/构建任务
     * @param scriptPath 脚本绝对路径
     * @param prefabPath 预制体绝对路径
     */
    public async process(scriptPath: string, prefabPath: string) {
        console.log(`[PrefabBuilder] 正在处理: ${path.basename(scriptPath)} -> ${path.basename(prefabPath)}`);

        if (!fs.existsSync(scriptPath)) {
            console.error(`脚本不存在: ${scriptPath}`);
            return;
        }

        const scriptContent = fs.readFileSync(scriptPath, "utf-8");
        const metaPath = scriptPath + ".meta";
        if (!fs.existsSync(metaPath)) {
            console.error(`脚本 meta 不存在: ${metaPath}`);
            return;
        }

        const scriptUuid = JSON.parse(fs.readFileSync(metaPath, "utf-8")).uuid;
        const compressedUuid = UuidUtils.compressUuid(scriptUuid);

        // 获取 Prefab 自身的 UUID (用于 cc.PrefabInfo)
        let prefabUuid = "";
        const prefabMetaPath = prefabPath + ".meta";
        if (fs.existsSync(prefabMetaPath)) {
            prefabUuid = JSON.parse(fs.readFileSync(prefabMetaPath, "utf-8")).uuid;
        }

        // 1. 解析节点结构
        const structure = this.parseStructure(scriptContent);
        const properties = this.parseProperties(scriptContent);

        // 2. 加载或初始化 Prefab
        let prefabJson: any[];
        if (fs.existsSync(prefabPath)) {
            prefabJson = JSON.parse(fs.readFileSync(prefabPath, "utf-8"));
        } else {
            prefabJson = this.createEmptyPrefab();
        }

        // 3. 应用结构
        this.syncPrefab(prefabJson, structure, properties, compressedUuid, prefabUuid);

        // 4. 保存
        fs.writeFileSync(prefabPath, JSON.stringify(prefabJson, null, 2));
        console.log(`[PrefabBuilder] 成功更新: ${prefabPath}`);
    }

    private parseStructure(content: string): INodeStructure {
        const match = content.match(/\[Prefab 结构说明\][:：]?([\s\S]*?)\*\//);
        if (!match) {
            console.warn("[PrefabBuilder] 未发现 [Prefab 结构说明] 标记");
            return { name: "New Node", children: [] };
        }

        const lines = match[1]
            .split("\n")
            .map((l) => l.replace(/^\s*\*/, "")) // 移除星号，保留后续空格
            .filter((l) => l.trim().startsWith("-"));

        console.log(`[PrefabBuilder] 解析到 ${lines.length} 条节点定义`);

        const root: INodeStructure = { name: "", children: [] };
        const stack: { node: INodeStructure; indent: number }[] = [{ node: root, indent: -1 }];

        lines.forEach((line) => {
            const indentMatch = line.match(/^(\s*)-/);
            const indent = indentMatch ? indentMatch[1].length : 0;
            const name = line.replace(/^\s*-\s*/, "").trim();
            console.log(`[PrefabBuilder] 节点: "${name}", 缩进: ${indent}`);

            const newNode: INodeStructure = { name, children: [] };
            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }
            stack[stack.length - 1].node.children.push(newNode);
            stack.push({ node: newNode, indent });
        });

        const finalRoot = root.children[0] || { name: "Root", children: [] };
        console.log(`[PrefabBuilder] 节点树构建完成, 根节点子节点数: ${finalRoot.children.length}`);
        return finalRoot;
    }

    private parseProperties(content: string): Map<string, string> {
        const props = new Map<string, string>();
        // 进一步优化正则：支持可选的 @property(...) 参数括号，并提取真正的变量名
        const regex =
            /\/\*\*[\s\S]*?节点路径[:：]\s*([^\n\*]*)\s*[\s\S]*?\*\/[\s\S]*?@property(?:\([\s\S]*?\))?\s*(?:public|private|protected)?\s*(\w+)\s*[:=]/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
            console.log(`[PrefabBuilder] 发现属性定义: ${m[2]} -> ${m[1].trim()}`);
            props.set(m[2], m[1].trim());
        }
        return props;
    }

    private createEmptyPrefab(): any[] {
        return [
            { __type__: "cc.Prefab", _name: "", data: { __id__: 1 } },
            { __type__: "cc.Node", _name: "Root", _children: [], _components: [], _prefab: { __id__: 2 } },
            { __type__: "cc.PrefabInfo", root: { __id__: 1 }, asset: { __id__: 0 }, fileId: "", sync: false },
        ];
    }

    private syncPrefab(
        json: any[],
        structure: INodeStructure,
        properties: Map<string, string>,
        scriptUuid: string,
        prefabUuid: string
    ) {
        // 1. 清理现有节点和组件（保留索引 0 的 cc.Prefab）
        const prefabRoot = json[0];
        json.length = 1;

        // 路径映射：用于属性绑定
        const pathMap = new Map<string, number>();

        // 2. 递归构建节点树
        const build = (nodeStruct: INodeStructure, parentId: number, currentPath: string): number => {
            const nodeName = nodeStruct.name.split(" ")[0];
            const nodeId = json.length;

            // 修正路径逻辑：根节点路径为其名称，子节点叠加
            const nodePath = currentPath ? `${currentPath}/${nodeName}` : nodeName;

            const node = {
                __type__: "cc.Node",
                _name: nodeName,
                _objFlags: 0,
                _parent: parentId === -1 ? null : { __id__: parentId },
                _children: [] as any[],
                _active: true,
                _components: [] as any[],
                _prefab: null as any,
                _opacity: 255,
                _color: { __type__: "cc.Color", r: 255, g: 255, b: 255, a: 255 },
                _contentSize: { __type__: "cc.Size", width: 80, height: 80 },
                _anchorPoint: { __type__: "cc.Vec2", x: 0.5, y: 0.5 },
                _trs: { __type__: "TypedArray", ctor: "Float64Array", array: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1] },
                _eulerAngles: { __type__: "cc.Vec3", x: 0, y: 0, z: 0 },
                _skewX: 0,
                _skewY: 0,
                _is3DNode: false,
                groupIndex: 0,
                _id: "",
            };
            json.push(node);
            pathMap.set(nodePath, nodeId);

            // 检查是否挂载脚本
            if (nodeStruct.name.includes("挂载此脚本")) {
                const compId = json.length;
                json.push({
                    __type__: scriptUuid,
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    _id: "",
                });
                node._components.push({ __id__: compId });
            }

            // 检查常用组件（如 Sprite, Label）
            if (nodeStruct.name.includes("cc.Sprite")) {
                const spriteId = json.length;
                json.push({
                    __type__: "cc.Sprite",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    _materials: [{ __uuid__: "eca5d2f2-8ef6-41c2-bbe6-f9c79d09c432" }],
                    _srcBlendFactor: 770,
                    _dstBlendFactor: 771,
                    _spriteFrame: { __uuid__: "a23235d1-15db-4b95-8439-a2e005bfff91" },
                    _type: 0,
                    _sizeMode: 0,
                    _fillType: 0,
                    _fillCenter: { __type__: "cc.Vec2", x: 0, y: 0 },
                    _fillStart: 0,
                    _fillRange: 0,
                    _isTrimmedMode: true,
                    _atlas: null,
                    _id: "",
                });
                node._components.push({ __id__: spriteId });
            }

            // 检查常用组件：Label
            if (nodeStruct.name.includes("cc.Label")) {
                const labelId = json.length;
                let textValue = "Label";
                const textMatch = nodeStruct.name.match(/[文本|text][:：]\s*["'＂]([^"'＂]*)/);
                if (textMatch) {
                    textValue = textMatch[1];
                }

                json.push({
                    __type__: "cc.Label",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    _useOriginalSize: true,
                    _string: textValue,
                    _N$string: textValue,
                    _fontSize: 40,
                    _lineHeight: 40,
                    _enableWrapText: true,
                    _N$file: null,
                    _isSystemFontUsed: true,
                    _spacingX: 0,
                    _batchAsBitmap: false,
                    _styleFlags: 0,
                    _underlineHeight: 0,
                    _N$horizontalAlign: 1,
                    _N$verticalAlign: 1,
                    _N$fontFamily: "Arial",
                    _N$overflow: 0,
                    _N$cacheMode: 0,
                    _id: "",
                });
                node._components.push({ __id__: labelId });
            }

            // 检查常用组件：Graphics
            if (nodeStruct.name.includes("cc.Graphics") || nodeStruct.name.includes("Graphics")) {
                const graphicsId = json.length;
                json.push({
                    __type__: "cc.Graphics",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    _srcBlendFactor: 770,
                    _dstBlendFactor: 771,
                    _lineWidth: 5,
                    _strokeColor: { __type__: "cc.Color", r: 255, g: 255, b: 255, a: 255 },
                    _fillColor: { __type__: "cc.Color", r: 255, g: 255, b: 255, a: 255 },
                    _lineCap: 0,
                    _lineJoin: 0,
                    _miterLimit: 10,
                    _id: "",
                });
                node._components.push({ __id__: graphicsId });
            }

            // 检查常用组件：Button
            if (nodeStruct.name.includes("cc.Button") || nodeStruct.name.includes("Button")) {
                const buttonId = json.length;
                json.push({
                    __type__: "cc.Button",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    duration: 0.1,
                    zoomScale: 1.1,
                    clickEvents: [],
                    _N$transition: 3,
                    transition: 3,
                    _id: "",
                });
                node._components.push({ __id__: buttonId });
            }

            // 检查常用组件：Layout
            if (nodeStruct.name.includes("cc.Layout") || nodeStruct.name.includes("Layout")) {
                const layoutId = json.length;
                json.push({
                    __type__: "cc.Layout",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    _layoutSize: { __type__: "cc.Size", width: 300, height: 200 },
                    _resize: 0,
                    _N$layoutType: 1,
                    _N$paddingLeft: 0,
                    _N$paddingRight: 0,
                    _N$paddingTop: 0,
                    _N$paddingBottom: 0,
                    _N$spacingX: 0,
                    _N$spacingY: 0,
                    _N$verticalDirection: 1,
                    _N$horizontalDirection: 0,
                    _id: "",
                });
                node._components.push({ __id__: layoutId });
            }

            // 检查常用组件：PhysicsBoxCollider
            if (nodeStruct.name.includes("cc.PhysicsBoxCollider") || nodeStruct.name.includes("PhysicsBoxCollider")) {
                const colliderId = json.length;
                json.push({
                    __type__: "cc.PhysicsBoxCollider",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    tag: 0,
                    _friction: 0.2,
                    _restitution: 0,
                    _isSensor: nodeStruct.name.includes("Sensor"), // 标记为传感器
                    _size: { __type__: "cc.Size", width: 100, height: 100 },
                    _offset: { __type__: "cc.Vec2", x: 0, y: 0 },
                    _id: "",
                });
                node._components.push({ __id__: colliderId });
            }

            // 检查组件名挂载（如 PrefabGameCarWaitingSlot）
            if (nodeStruct.name.includes("挂载")) {
                const match = nodeStruct.name.match(/挂载\s+(\w+)/);
                if (match && match[1] !== "此脚本") {
                    this.mountComponent(json, nodeId, match[1], node);
                }
            }

            nodeStruct.children.forEach((child) => {
                const childId = build(child, nodeId, nodePath);
                node._children.push({ __id__: childId });
            });

            return nodeId;
        };

        const rootId = build(structure, -1, "");
        prefabRoot.data = { __id__: rootId };

        // 3. 生成所有节点的 cc.PrefabInfo 并统一关联
        const prefabInfoId = json.length;
        json.push({
            __type__: "cc.PrefabInfo",
            root: { __id__: rootId },
            asset: { __uuid__: prefabUuid },
            fileId: "",
            sync: false,
        });

        for (let i = 1; i < prefabInfoId; i++) {
            if (json[i].__type__ === "cc.Node") {
                const nodeName = json[i]._name;
                json[i]._prefab = {
                    __type__: "cc.PrefabInfo",
                    root: { __id__: rootId },
                    asset: { __uuid__: prefabUuid },
                    fileId: `Node_${nodeName}_${i}`,
                    sync: false,
                };
            }
        }

        // 4. 绑定属性
        const scriptComp = json.find((obj) => obj.__type__ === scriptUuid);
        if (scriptComp) {
            properties.forEach((pathOrAsset, propName) => {
                if (pathOrAsset.includes(".prefab")) {
                    const cleanPath = pathOrAsset.replace(/^Assets\//, "assets/");
                    const assetUuid = this.getAssetUuid(cleanPath);
                    if (assetUuid) {
                        scriptComp[propName] = { __uuid__: assetUuid };
                    }
                } else if (pathOrAsset.includes(",")) {
                    const paths = pathOrAsset.split(",").map((p) => p.trim());
                    scriptComp[propName] = paths
                        .map((p) => {
                            const targetId = pathMap.get(p);
                            // 如果是绑定组件而非 Node，需要查找对应组件 ID
                            return targetId ? this.getBindingValue(json, targetId, propName) : null;
                        })
                        .filter((v) => v);
                } else {
                    const targetId = pathMap.get(pathOrAsset);
                    if (targetId) {
                        scriptComp[propName] = this.getBindingValue(json, targetId, propName);
                    }
                }
            });
        }
    }

    private mountComponent(json: any[], nodeId: number, compName: string, node: any) {
        // 动态查找组件 UUID，优先在特定目录查找
        const scriptUuid = this.findScriptUuid(compName);
        if (scriptUuid) {
            const compId = json.length;
            json.push({
                __type__: UuidUtils.compressUuid(scriptUuid),
                _name: "",
                _objFlags: 0,
                node: { __id__: nodeId },
                _enabled: true,
                _id: "",
            });
            node._components.push({ __id__: compId });
        } else {
            console.warn(`[PrefabBuilder] 未能找到组件 ${compName} 的 UUID`);
        }
    }

    private findScriptUuid(className: string): string | null {
        // 在常见脚本目录下递归搜索 .meta 文件
        const searchDirs = [
            path.resolve(this.workspaceRoot, "assets/script/prefab"),
            path.resolve(this.workspaceRoot, "assets/script/ui"),
            path.resolve(this.workspaceRoot, "assets/script/game"),
            // 处理外部路径
            path.resolve(this.workspaceRoot, "../../assets/script/prefab"),
            path.resolve(this.workspaceRoot, "../../assets/script/ui"),
            path.resolve(this.workspaceRoot, "../../assets/script/game"),
        ];

        const findInDir = (dir: string): string | null => {
            if (!fs.existsSync(dir)) return null;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    const res = findInDir(fullPath);
                    if (res) return res;
                } else if (file === `${className}.ts.meta`) {
                    const content = fs.readFileSync(fullPath, "utf-8");
                    return JSON.parse(content).uuid;
                }
            }
            return null;
        };

        for (const dir of searchDirs) {
            const uuid = findInDir(dir);
            if (uuid) return uuid;
        }
        return null;
    }

    private getBindingValue(json: any[], nodeId: number, propName: string): any {
        // 这里只是简单示意：如果脚本需要的是 Node 就返回 Node，如果是组件就返回对应的组件 ID
        // 在 Cocos 2.3.x Prefab 中，属性绑定直接指向相应的 __id__
        // 如果是组件数组，则指向组件的 __id__
        const node = json[nodeId];
        // 假设通过类型检查或命名规则判断绑定类型
        return { __id__: nodeId };
    }

    private getAssetUuid(resPath: string): string | null {
        // 尝试从项目根目录定位资源
        const searchPaths = [
            path.resolve(this.workspaceRoot, resPath),
            path.resolve(this.workspaceRoot, "../../", resPath),
        ];
        for (const p of searchPaths) {
            const meta = p + ".meta";
            if (fs.existsSync(meta)) {
                return JSON.parse(fs.readFileSync(meta, "utf-8")).uuid;
            }
        }
        return null;
    }
}

// 命令行入口
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: node compiled/index.js <scriptPath> <prefabPath>");
    } else {
        new PrefabBuilder().process(args[0], args[1]);
    }
}
