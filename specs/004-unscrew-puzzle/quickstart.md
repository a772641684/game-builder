# Quickstart Guide: 拆螺丝益智游戏开发

## 1. 快速启动 (Run Environment)

1. 确保物理引擎已开启 (由 `UnscrewControl.init()` 自动处理)。
2. 打开场景 `mainScene.fire`。
3. 在 `UIHome` 中点击“拆螺丝”图标进入测试关卡。

## 2. 核心架构说明

- **UnscrewControl.ts**: 单例逻辑中枢。负责物理关节的 `create/destroy`，以及槽位计数逻辑。
- **PrefabGameScrew.ts**: 螺丝交互组件。负责处理点击事件并上报给控制器。
- **PrefabGamePlate.ts**: 金属板组件。包含 `cc.RigidBody` 和 `cc.PhysicsCollider`，接收重力驱动。
- **UIPlayGroundGameUnscrew.ts**: UI 表现层。展示顶部槽位状态、分数和失败/胜利弹窗。

## 3. 开发规范提醒

- **日志**: 使用 `Logger` 记录关键步。
- **动画**: 螺丝移动必须使用 `cc.tween`。
- **资源**: 关卡预制体放置在 `assets/resources/prefabs/game/levels/`。

## 4. 调试技巧

- 开启物理调试绘制：`cc.director.getPhysicsManager().debugDrawFlags = ...`。
- 控制台调用 `UnscrewControl.instance.undo()` 测试回退逻辑。
