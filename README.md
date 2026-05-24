# learning-spec

`learning-spec` 是一个驱动 AI 为人类规划长期学习骨架的指导系统。

它围绕更符合人类学习奖励机制与执行现实的结构建立：

- `project-contract`：长期现实约束
- `level`：阶段跃迁单元
- `zone`：领域专家单元
- `capability`：最小可验证能力单元
- `task`：围绕当前 capability 生成的近程执行单元
- `execution-state`：连续性状态账本

这套系统的核心前提是：

- 人类可以提前规划长期目标与阶段结构
- 人类不适合提前规划未来很远的即时动作
- 正式规划应止步于 `capability`
- 每次学习时再围绕当前 `capability` 即时生成本次动作

## 文件

- `concept-model.md`：定义整套学习系统的概念边界
- `decomposition-rules.md`：如何把长期学习目标拆成 `level / zone / capability`
- `feedback-loop-rules.md`：如何把学习实践中的问题反向修正这套系统
- `project-contract-template.md`：长期现实契约模板
- `level-template.md`：阶段跃迁模板
- `zone-template.md`：奖励化领域模板
- `capability-template.md`：最小能力单元模板
- `task-template.md`：近程执行单元模板(不在规划阶段生成)
- `execution-state-template.md`：位于当前 `level` 目录中的连续性状态模板
- `tools/validate-learning-spec.mjs`：学习版结构校验器

## 使用顺序

1. 先写 `project-contract`
2. 再拆 `level`
3. 再在每个 `level` 下拆 `zone`
4. 再在每个 `zone` 下拆 `capability`
5. 当前 capability 被激活时，再在 capability 目录下生成近程 `task`
6. 在当前 `level` 目录中用 `execution-state` 维护当前进度与即时 session plan

## 核心原则

- `capability` 仅专注一个能力
- `zone` 囊括该领域的各项能力, 成为此领域的专家
- `level` 能力交叉, 开始觉醒, 融会贯通, 段位上升
- `task` 只在当前 capability 被执行时即时生成
- 能力成立的判断必须依赖可感知证据，而不是主观感觉

## 校验

建立真实实例后，可运行：

```sh
node tools/validate-learning-spec.mjs <path-to-learning-spec-root>
```

例如：

```sh
node tools/validate-learning-spec.mjs /Users/chen/coding/win-en
```
