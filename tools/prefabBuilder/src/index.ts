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

    private parseProperties(content: string): Map<string, { path: string; type: string }> {
        const props = new Map<string, { path: string; type: string }>();

        // 策略 1: 解析 JSDoc 中的 节点路径 + @property(Type)
        const regex =
            /\/\*\*[\s\S]*?节点路径[:：]\s*([^\n\*]*)\s*[\s\S]*?\*\/[\s\S]*?@property\(([^)]+)\)\s*(?:public|private|protected)?\s*(\w+)\s*[:=]/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
            const nodePath = m[1].trim();
            const propType = m[2].trim();
            const propName = m[3].trim();
            console.log(`[PrefabBuilder] 发现属性定义: ${propName} -> 路径:${nodePath}, 类型:${propType}`);
            props.set(propName, { path: nodePath, type: propType });
        }

        // 策略 2: 解析 [Prefab 结构说明] 中的 -> propName 箭头语法 (如: ScoreLabel (cc.Label) -> scoreLabel)
        const structMatch = content.match(/\[Prefab \u7ed3\u6784\u8bf4\u660e\][:：]?([\s\S]*?)\*\//);
        if (structMatch) {
            const arrowRegex = /^\s*-\s*(\S+)\s*\([^)]*\)\s*->\s*(\w+)/gm;
            let am;
            while ((am = arrowRegex.exec(structMatch[1])) !== null) {
                const nodeName = am[1].trim();
                const propName = am[2].trim();
                if (!props.has(propName)) {
                    // 尝试从 @property 提取类型
                    const typeRegex = new RegExp(
                        `@property\\(([^)]+)\\)\\s*(?:public|private|protected)?\\s*${propName}\\s*[:=]`
                    );
                    const typeMatch = content.match(typeRegex);
                    const propType = typeMatch ? typeMatch[1].trim() : "cc.Node";
                    console.log(`[PrefabBuilder] 箭头绑定: ${propName} -> 路径:${nodeName}, 类型:${propType}`);
                    props.set(propName, { path: nodeName, type: propType });
                }
            }
        }

        // 策略 3: 解析 @property(cc.Prefab) 或 @property({ type: cc.Prefab }) 的 预制体: 标注
        const prefabRegex =
            /\/\*\*[\s\S]*?预制体[:：]\s*([^\n\*]*)\s*[\s\S]*?\*\/[\s\S]*?@property\((?:cc\.Prefab|\{[^}]*type:\s*cc\.Prefab[^}]*\})\)\s*(?:public|private|protected)?\s*(\w+)\s*[:=]/g;
        let pm;
        while ((pm = prefabRegex.exec(content)) !== null) {
            const prefabRef = pm[1].trim();
            const propName = pm[2].trim();
            if (!props.has(propName)) {
                console.log(`[PrefabBuilder] 发现预制体属性: ${propName} -> 预制体:${prefabRef}`);
                props.set(propName, { path: prefabRef, type: "cc.Prefab" });
            }
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
        properties: Map<string, { path: string; type: string }>,
        scriptUuid: string,
        prefabUuid: string
    ) {
        // 1. 清理现有节点和组件（保留索引 0 的 cc.Prefab）
        const prefabRoot = json[0];
        json.length = 1;

        // 路径映射：用于属性绑定 (完整路径 -> nodeId)
        const pathMap = new Map<string, number>();
        // 短名映射：用于简化查找 (节点名 -> nodeId)
        const nameMap = new Map<string, number>();

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
            // 同时记录短名映射 (如果重名则后者覆盖，但通常同一层不会重名)
            nameMap.set(nodeName, nodeId);

            // ===== 解析布局提示 (Layout Hints) =====
            const rawDesc = nodeStruct.name;

            // pos(x, y) -> 设置 _trs 前两个值
            const posMatch = rawDesc.match(/pos\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
            if (posMatch) {
                node._trs.array[0] = parseFloat(posMatch[1]);
                node._trs.array[1] = parseFloat(posMatch[2]);
            }

            // size(w, h) -> 设置 _contentSize
            const sizeMatch = rawDesc.match(/size\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
            if (sizeMatch) {
                node._contentSize.width = parseFloat(sizeMatch[1]);
                node._contentSize.height = parseFloat(sizeMatch[2]);
            }

            // color(r, g, b) -> 设置 _color
            const colorMatch = rawDesc.match(/color\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
            if (colorMatch) {
                node._color.r = parseInt(colorMatch[1]);
                node._color.g = parseInt(colorMatch[2]);
                node._color.b = parseInt(colorMatch[3]);
            }

            // opacity(n) -> 设置 _opacity
            const opacityMatch = rawDesc.match(/opacity\(\s*(\d+)\s*\)/);
            if (opacityMatch) {
                node._opacity = parseInt(opacityMatch[1]);
            }

            // active=false -> 设置 _active
            if (rawDesc.includes("active=false")) {
                node._active = false;
            }

            // anchor(x, y) -> 设置 _anchorPoint
            const anchorMatch = rawDesc.match(/anchor\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
            if (anchorMatch) {
                node._anchorPoint.x = parseFloat(anchorMatch[1]);
                node._anchorPoint.y = parseFloat(anchorMatch[2]);
            }

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
                    _sizeMode: 0, // CUSTOM - 使用节点的 contentSize
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

            // 检查 Widget 拉伸提示: widget(stretch) -> 四方贴合父节点
            if (nodeStruct.name.includes("widget(stretch)")) {
                const widgetId = json.length;
                json.push({
                    __type__: "cc.Widget",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    alignMode: 1,
                    _target: null,
                    _alignFlags: 45,
                    _left: 0,
                    _right: 0,
                    _top: 0,
                    _bottom: 0,
                    _verticalCenter: 0,
                    _horizontalCenter: 0,
                    _isAbsLeft: true,
                    _isAbsRight: true,
                    _isAbsTop: true,
                    _isAbsBottom: true,
                    _isAbsHorizontalCenter: true,
                    _isAbsVerticalCenter: true,
                    _originalWidth: node._contentSize.width,
                    _originalHeight: node._contentSize.height,
                    _id: "",
                });
                node._components.push({ __id__: widgetId });
            }

            // 检查常用组件：Label
            if (nodeStruct.name.includes("cc.Label")) {
                const labelId = json.length;
                let textValue = "Label";
                // 解析文本提示: text("...") 或旧版 文本/text 语法
                const textHintMatch = nodeStruct.name.match(/text\(\s*["']([^"']*)["']\s*\)/);
                const textMatch = nodeStruct.name.match(/[文本|text][:：]\s*["'＂]([^"'＂]*)/);
                if (textHintMatch) {
                    textValue = textHintMatch[1];
                } else if (textMatch) {
                    textValue = textMatch[1];
                }

                // 解析字号: fontSize(n)
                let fontSize = 40;
                const fontSizeMatch = nodeStruct.name.match(/fontSize\(\s*(\d+)\s*\)/);
                if (fontSizeMatch) {
                    fontSize = parseInt(fontSizeMatch[1]);
                }

                // 解析字体颜色: fontColor(r,g,b) — 仅当无 color() 时修改节点颜色
                // 如果同时有 color() 和 fontColor()，color() 保留给 Sprite 着色，fontColor 不覆盖
                const fontColorMatch = nodeStruct.name.match(/fontColor\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
                if (fontColorMatch && !colorMatch) {
                    node._color.r = parseInt(fontColorMatch[1]);
                    node._color.g = parseInt(fontColorMatch[2]);
                    node._color.b = parseInt(fontColorMatch[3]);
                }

                json.push({
                    __type__: "cc.Label",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    _useOriginalSize: false,
                    _string: textValue,
                    _N$string: textValue,
                    _fontSize: fontSize,
                    _lineHeight: fontSize,
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
            if (
                nodeStruct.name.includes("cc.Button") ||
                (nodeName.startsWith("Btn") && !nodeStruct.name.includes("cc.Label"))
            ) {
                // Button 节点需要一个 Sprite 背景 (如果还没有 Sprite)
                if (!nodeStruct.name.includes("cc.Sprite")) {
                    const bgSpriteId = json.length;
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
                    node._components.push({ __id__: bgSpriteId });
                }

                // 生成点击事件: BtnBack -> onBtnBackClicked
                const clickEvents: any[] = [];
                if (nodeName.startsWith("Btn")) {
                    const suffix = nodeName.substring(3); // "Back", "Restart" 等
                    const handler = `on${nodeName}Clicked`;
                    // 在 Cocos 2.3.x 中， clickEvents 绑定根节点上挂载的脚本组件
                    clickEvents.push({
                        __type__: "cc.ClickEvent",
                        target: { __id__: 1 }, // 根节点
                        component: "", // 组件名由 Cocos 自动解析
                        _componentId: scriptUuid, // 直接指向脚本组件 UUID
                        handler: handler,
                        customEventData: "",
                    });
                    console.log(`[PrefabBuilder] 按钮事件: ${nodeName} -> ${handler}()`);
                }

                const buttonId = json.length;
                json.push({
                    __type__: "cc.Button",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    duration: 0.1,
                    zoomScale: 1.1,
                    clickEvents: clickEvents,
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

            // 检查常用组件：HingeJoint
            if (nodeStruct.name.includes("cc.HingeJoint") || nodeStruct.name.includes("HingeJoint")) {
                const jointId = json.length;
                json.push({
                    __type__: "cc.HingeJoint",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    anchor: { __type__: "cc.Vec2", x: 0, y: 0 },
                    connectedAnchor: { __type__: "cc.Vec2", x: 0, y: 0 },
                    connectedBody: null,
                    collideConnected: false,
                    enableLimit: false,
                    lowerAngle: 0,
                    upperAngle: 0,
                    enableMotor: false,
                    maxMotorTorque: 1000,
                    motorSpeed: 0,
                    _id: "",
                });
                node._components.push({ __id__: jointId });
            }

            // 检查常用组件：DistanceJoint
            if (nodeStruct.name.includes("cc.DistanceJoint") || nodeStruct.name.includes("DistanceJoint")) {
                const jointId = json.length;
                json.push({
                    __type__: "cc.DistanceJoint",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    anchor: { __type__: "cc.Vec2", x: 0, y: 0 },
                    connectedAnchor: { __type__: "cc.Vec2", x: 0, y: 0 },
                    connectedBody: null,
                    collideConnected: false,
                    distance: 100,
                    frequency: 0,
                    dampingRatio: 0,
                    _id: "",
                });
                node._components.push({ __id__: jointId });
            }

            // 检查常用组件：RigidBody
            if (nodeStruct.name.includes("cc.RigidBody") || nodeStruct.name.includes("RigidBody")) {
                const rbId = json.length;
                json.push({
                    __type__: "cc.RigidBody",
                    _name: "",
                    _objFlags: 0,
                    node: { __id__: nodeId },
                    _enabled: true,
                    _type: nodeStruct.name.includes("Static") ? 0 : 2, // 0: Static, 2: Dynamic
                    _allowSleep: true,
                    _gravityScale: 1,
                    _linearDamping: 0,
                    _angularDamping: 0,
                    _fixedRotation: false,
                    _bullet: false,
                    _id: "",
                });
                node._components.push({ __id__: rbId });
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

        // 4. 智能属性绑定 (支持跨层级路径 + 组件类型匹配)
        const scriptComp = json.find((obj) => obj.__type__ === scriptUuid);
        if (scriptComp) {
            properties.forEach(({ path: pathOrAsset, type: propType }, propName) => {
                // cc.Prefab 类型: 通过 __uuid__ 绑定预制体资源文件
                if (propType === "cc.Prefab") {
                    const assetUuid = this.findPrefabAssetUuid(pathOrAsset);
                    if (assetUuid) {
                        scriptComp[propName] = { __uuid__: assetUuid };
                        console.log(
                            `[PrefabBuilder] 绑定预制体: ${propName} -> ${pathOrAsset} (${assetUuid.substring(0, 8)}...)`
                        );
                    } else {
                        console.warn(`[PrefabBuilder] 未找到预制体资源: ${pathOrAsset}, 属性 ${propName} 未绑定`);
                    }
                    return;
                }

                if (pathOrAsset.includes(".prefab")) {
                    // 绑定预制体资源 (兼容旧的路径格式)
                    const cleanPath = pathOrAsset.replace(/^Assets\//, "assets/");
                    const assetUuid = this.getAssetUuid(cleanPath);
                    if (assetUuid) {
                        scriptComp[propName] = { __uuid__: assetUuid };
                        console.log(`[PrefabBuilder] 绑定资源: ${propName} -> ${cleanPath}`);
                    }
                    return;
                }

                // 查找目标节点: 优先完整路径 -> 然后短名 -> 然后遍历全路径尾部匹配
                let targetId = this.resolveNodeId(pathOrAsset, pathMap, nameMap);

                if (targetId === undefined) {
                    console.warn(`[PrefabBuilder] 未找到节点: ${pathOrAsset}, 属性 ${propName} 未绑定`);
                    return;
                }

                // 根据 @property 类型决定绑定到 Node 还是具体组件
                const bindValue = this.getTypedBindingValue(json, targetId, propType);
                scriptComp[propName] = bindValue;
                console.log(
                    `[PrefabBuilder] 绑定属性: ${propName} -> 节点[${targetId}] 类型:${propType} => __id__:${
                        bindValue.__id__
                    }`
                );
            });
        }
    }

    /**
     * 解析节点 ID: 支持完整路径/短名/尾部匹配
     */
    private resolveNodeId(
        target: string,
        pathMap: Map<string, number>,
        nameMap: Map<string, number>
    ): number | undefined {
        // 1. 完整路径匹配
        for (const [fullPath, id] of pathMap) {
            if (fullPath === target) return id;
        }
        // 2. 短名匹配
        if (nameMap.has(target)) return nameMap.get(target);
        // 3. 路径尾部匹配 (如 "HUD/ScoreLabel" 匹配 "Root/HUD/ScoreLabel")
        for (const [fullPath, id] of pathMap) {
            if (fullPath.endsWith("/" + target) || fullPath.endsWith(target)) return id;
        }
        return undefined;
    }

    /**
     * 根据 @property 类型智能返回绑定值
     * - cc.Node -> 绑定到节点本身
     * - cc.Label/cc.Sprite/cc.Button/cc.RigidBody 等 -> 绑定到该节点上的对应组件
     * - 自定义组件 (UISettlement 等) -> 绑定到挂载的自定义组件
     */
    private getTypedBindingValue(json: any[], nodeId: number, propType: string): any {
        // cc.Node 直接绑定节点
        if (propType === "cc.Node") {
            return { __id__: nodeId };
        }

        const node = json[nodeId];
        if (!node || !node._components) {
            return { __id__: nodeId };
        }

        // 内置组件类型映射
        const builtinTypeMap: { [key: string]: string } = {
            "cc.Label": "cc.Label",
            "cc.Sprite": "cc.Sprite",
            "cc.Button": "cc.Button",
            "cc.Layout": "cc.Layout",
            "cc.RigidBody": "cc.RigidBody",
            "cc.Graphics": "cc.Graphics",
            "cc.ScrollView": "cc.ScrollView",
            "cc.EditBox": "cc.EditBox",
            "cc.Toggle": "cc.Toggle",
            "cc.ProgressBar": "cc.ProgressBar",
            "cc.Slider": "cc.Slider",
            "cc.Animation": "cc.Animation",
            "cc.Widget": "cc.Widget",
            "cc.PhysicsBoxCollider": "cc.PhysicsBoxCollider",
            "cc.PhysicsCircleCollider": "cc.PhysicsCircleCollider",
        };

        const targetType = builtinTypeMap[propType];

        // 遍历节点的组件列表查找匹配的组件
        for (const compRef of node._components) {
            const compId = compRef.__id__;
            const comp = json[compId];
            if (!comp) continue;

            if (targetType) {
                // 内置组件: 精确匹配 __type__
                if (comp.__type__ === targetType) {
                    return { __id__: compId };
                }
            } else {
                // 自定义组件 (UISettlement 等): __type__ 是压缩 UUID
                // 尝试通过组件名查找 UUID 并匹配
                const scriptUuid = this.findScriptUuid(propType);
                if (scriptUuid) {
                    const compressedUuid = UuidUtils.compressUuid(scriptUuid);
                    if (comp.__type__ === compressedUuid) {
                        return { __id__: compId };
                    }
                }
            }
        }

        // 未找到匹配组件，回退到绑定节点
        console.warn(`[PrefabBuilder] 节点[${nodeId}] 上未找到类型 ${propType} 的组件，回退绑定节点`);
        return { __id__: nodeId };
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

    // getBindingValue 已重构为 getTypedBindingValue + resolveNodeId

    /**
     * 查找预制体资源的 UUID
     * @param prefabRef 可以是：
     *   - 完整相对路径: "assets/resources/prefabs/PrefabGameMoleHole.prefab"
     *   - 预制体名称: "PrefabGameMoleHole"
     *   - 简短路径: "prefabs/PrefabGameMoleHole"
     */
    private findPrefabAssetUuid(prefabRef: string): string | null {
        // 如果是完整路径（包含 .prefab 后缀），直接查找
        if (prefabRef.endsWith(".prefab")) {
            return this.getAssetUuid(prefabRef);
        }

        // 按名称在常用预制体目录递归搜索
        const fileName = prefabRef.includes("/") ? prefabRef.split("/").pop()! : prefabRef;
        const searchDirs = [
            path.resolve(this.workspaceRoot, "assets/resources/prefabs"),
            path.resolve(this.workspaceRoot, "assets/resources/ui"),
            path.resolve(this.workspaceRoot, "assets/resources"),
            // 工具在 tools/prefabBuilder 下执行时的外部路径
            path.resolve(this.workspaceRoot, "../../assets/resources/prefabs"),
            path.resolve(this.workspaceRoot, "../../assets/resources/ui"),
            path.resolve(this.workspaceRoot, "../../assets/resources"),
        ];

        const searchInDir = (dir: string): string | null => {
            if (!fs.existsSync(dir)) return null;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const result = searchInDir(fullPath);
                    if (result) return result;
                } else if (entry.name === `${fileName}.prefab.meta`) {
                    const meta = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
                    return meta.uuid;
                }
            }
            return null;
        };

        for (const dir of searchDirs) {
            const uuid = searchInDir(dir);
            if (uuid) return uuid;
        }
        return null;
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
