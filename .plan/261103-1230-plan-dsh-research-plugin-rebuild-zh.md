# 计划：基于 dsh-superagent 的最小 dsh-research

本次契约引用更新：2026-11-11 21:13:38 -0800（r8）。[规范研究循环契约 2.3.2](../docs/contracts.md) 已定义记录、阶段、不变量与实际轨迹要求；本次仅更新引用，M1–M6 实施、提供方兼容性及实机验证仍待完成。既有翻译/同步元数据保留为历史。

创建时间：2026-11-03 12:30 -0800。英文源计划更新时间：2026-11-03 16:49 -0800（r7）。中文同步时间：2026-11-03 16:55:15 -0800（r6）。状态：仅作规划；尚未执行实施或切换。

本地命名/导航更新：2026-11-05 16:26:56 -0800（r7）。来源与既有同步元数据保留；本次仅重命名及修复引用。

本修订**取代英文 r1–r6 的全栈重建范围**。历史修订条目仅保留来源沿革，不是当前要求。参见[完整 dist-exec 舍弃矩阵](261103-1637-dist-exec-drop-matrix.md)及[此前的比较](261103-1201-brainstorm-autoresearch-versus-dsh-superagent.md)。英文来源：[规范英文计划](261103-1230-plan-dsh-research-plugin-rebuild.md)。

原译本元数据（保留历史记录，不代表当前英文版本）：

创建时间：2026-11-03 12:30 -0800。更新时间：2026-11-03 12:37 -0800（原文）。状态：可执行的实施计划；尚未执行。

此前同步元数据（仅作沿革，不是当前范围）：英文源计划更新时间为 2026-11-03 15:09 -0800（r6），中文同步时间为 2026-11-03 15:10:22 -0800（r5）。历史 0.5.8 对比基线为 `d47eabdb1aeb433492563a5abcfbeaae43c75209`，不是当前 dist-exec 的能力或缺陷判据。

下文原八项设计说明保留为背景，不作为规范验收编号。契约 2.3.2 定义按类别分组的可测试性质及反例；验收使用其性质 ID，不提供旧编号别名。

## 1. 决策：复用运行时，只保留研究核心要义

构建一个小型的**同级技能/策略/辅助模块插件**，建议仓库为 `/home/cliu/wk/dsh-research`。它依赖**已配置的 dsh-superagent 及其 DSH 服务**来执行任务和开展团队协作。不再以独立运行的功能对等为目标。

**可以：舍弃 dist-exec 作为实现/功能对等目标。** 矩阵为全部 **65 个变更路径**（60 个新增、5 个修改）逐项给出处置。舍弃是指*不移植该实现*，而不是删除分支、丢失历史证据、重置扣账/数据揭示历史，或改变活跃研究活动的运行时。

复用 superagent 的 watchdog、worker/Ticket 路由、通信、并发、恢复、评审及持久化。插件只贡献：

1. 紧凑的研究清单：原始提示、目标、候选/评估器/数据身份、方法、限额和验收策略。
2. 小型结果/证据检查器，读取普通任务输出和**现有领域验证器**。
3. 目标/检查点/重新定向策略：在证据及明确范围约束下，继续、诊断/转向、暂缓或停止。
4. 范围狭窄的准入条件：限定范围的评审、有界已授权工作，以及不可逆的确认数据揭示规则。

这些是少量辅助模块/过程，**不是四项服务**。团队讨论、工作者启动、恢复与存储不迁入新的研究控制平面。

**省略评审看板改版。** M1–M6 不包含新仪表盘、React 页面、fleet UI、评审 API 或评审数据库迁移。现有评审对话加普通证据包已足以支持本计划。这并不取消自动独立评审步骤。

### 从此前计划中明确移除的内容

- 原生 coordinator/globalStore、研究 SQL 引擎/outbox、grants、注册、claim/start 及 heartbeat 协议。
- 另一套调度器、工作者管理器、工作区池、资源租约层、监管器或 Session 引擎。
- 另一条通信总线、source 连接器、HTTP/TLS/auth 服务、artifact CAS 或通用评审器管理器。
- 强制 RoundPlan/UnitSpec DAG、双宿主 fleet、top-k/多样性搜索、统计 DSL、对照/消融引擎、plan-delta 补丁框架及自动提交机制。
- 独立 Research UI、fleet/评审看板功能对等、无 superagent 的独立运行模式，以及作为发布门槛的 C01–C28 全栈契约一致性。

可选的未来能力必须另行说明合理需求，不能继承 dist-exec 功能对等要求。

## 2. 基线、隔离与权威归属

| 仓库 | 已审计版本 | 当前职责 |
|---|---|---|
| `~/wk/autoresearch` | `ead1ae507934a6da5e914a2559d6fcac99c505c4`，干净的 `dist-exec`，runtime 0.6.0 | 行为/证据参考；活跃旧版研究活动保持版本锁定 |
| dist-exec 基线 | `33ef750face59b42f9663c8e355a77600d1765e7` | 两次提交的差异：65 个变更路径；`清单` (historical project evidence unavailable here; source reference `../../accorde/local_artifacts/autoresearch/dist-exec-drop-audit/20261103-1637/branch-inventory.json`) |
| `~/wk/dsh-superagent-prototype` | `8c32a9dc5d72c033816c6a8110b37f40cf94fba4`，干净 | 必须配置并复用的编排/团队运行时 |
| `~/wk/accorde` | `7c85e7541a3d8dfbb25fec46d96ff644c1ae72b5` | 现有科学工具/验证器及已公开输入试点 |
| `~/wk/dsh-research` | 尚未创建 | 建议的隔离技能、策略及薄辅助模块 |

**superagent 源码的默认变更预算：零。** 优先使用现有工作者工具、团队提示配置及有文档说明的路由。不要导入私有 Store/Effects/Engine/Session 类。

source 集成上下文已经提供 `atomic`、作用域 KV、ticket/thread 引用、intake 及通知（[SourceContext](../../dsh-superagent-prototype/src/sources/host.ts)，第 23–67 行）。它是**现有实现扩展点**，不是已验证、已发布的 SDK。如果程序化访问确属必要，只能提议在这些现有操作上增加版本化导出/facade，并单独获批。不要因缺少导出就重建协调器或存储。可先用纯配置技能建立试点路由。

| 权威范围 | 负责人 |
|---|---|
| Tickets、工作者 Sessions、任务、通知、并发、恢复、通用评审及持久化 | 现有 superagent/DSH 设施 |
| 科学清单、解释及检查点/下一步决策规则 | 最小 dsh-research 策略/辅助模块，由现有工作者执行 |
| 正确性、测量、统计资格验证及最终验收 | 绑定实际证据的现有 Accorde/领域验证器 |
| 已花费预算及确认数据开启历史 | 经核对的交接完成前，仍由现有权威记录负责；绝不用空白替代品取代 |

### 建议的最小目录布局

名称仅作示例，不构成公开 API 声明：

```text
dsh-research/
  package.json                     # 小型包/CLI/技能集合；不分叉运行时
  skills/research/                  # 过程及有界作者/评审器指令
  config/                          # superagent 提示/策略/执行配置
  src/manifest.ts                  # 身份、目标、声明的限额/结果形状
  src/evaluate.ts                  # 任务输出/领域验证器检查，不是执行器
  src/loop.ts                      # 纯检查点/重新定向决策，不是调度器
  src/admission.ts                 # 小型评审/预算/数据揭示检查
  src/index.ts                     # 可选公开插件适配器；仅在必要时添加
  tests/                           # 针对复用边界的八项科学性质
  docs/                            # 集成、操作者、试点及连续性说明
```

使用现有 Accorde 工具，不在 TypeScript 中重建基准。避免再建一套 Accorde 侧编排包：只有现有验证器无法输出所需证据时，才添加薄结果格式适配器。不在运行时依赖 Karpathy 的 Torch 训练器/数据准备代码。

## 3. 已验证的复用途径及待完成的配置工作

| ID | 需求 | 要复用的现有路径 | 小型研究补充/待验证事项 |
|---|---|---|---|
| S1 | Claim/start、工作者、团队 intake | [orchestrator_route](../../dsh-superagent-prototype/src/app/tools/main.ts)，88–150；[Tickets](../../dsh-superagent-prototype/src/core/tickets.ts)，37–55；[executor](../../dsh-superagent-prototype/src/executor/dsh.ts)，263–284、424–510 | 在有界 assignment 中携带清单/证据引用。不新增研究 claim/start API。通过实际任务验证基准是否启动，而不是以 assignment 被接受为依据。 |
| S2 | 通信、thread 上下文、delivery | [SourceContext](../../dsh-superagent-prototype/src/sources/host.ts)，31–65；[delivery](../../dsh-superagent-prototype/src/app/delivery.ts)，40–84；现有 GitHub/Feishu 渠道 | 在普通消息中加入科学 subject/reply/action 引用。配置现有 source 允许列表；不重复建设聊天/auth 服务。 |
| S3 | Watchdog、存活性、恢复 | [服务脚本](../../dsh-superagent-prototype/scripts/dsh-superagent)；[外部每小时检查](../../dsh-superagent-prototype/docs/006-deployment.md)，133–141；[effects](../../dsh-superagent-prototype/src/app/effects.ts)，130–159 | 在独立操作者 profile 中配置 watchdog。现有任务/工作者状态提供执行证据。不新增研究 heartbeat 守护进程。未验证服务已安装。 |
| S4 | 任务监管、输出、停止及完成唤醒 | [后台 jobs/subagents](../../dsh-superagent-prototype/src/executor/background.ts)，9–20、61–119；[工作者过程](../../dsh-superagent-prototype/prompts/work.md)，39–49 | 现有工作者使用普通任务工具及完成事件。小型检查器映射实际终态及不可变输出。验证 jobs/subagents 服务已启用；某个 profile 可能缺少其中一项或两项。 |
| S5 | 并发、checkout/工作区所有权 | [WorkerSlots](../../dsh-superagent-prototype/src/executor/dsh.ts)，165–198、227–235；[执行设置](../../dsh-superagent-prototype/docs/006-deployment.md)，149–156、200–205 | 配置 `executor.maxWorkers` 及有界工作者过程。这是工作者数量限制，**不是**所有后台任务、GPU 资源或远程宿主的硬上限。试点串行运行基准任务，不 fan-out。 |
| S6 | 持久化、事务状态及重试 | [Store](../../dsh-superagent-prototype/src/app/store.ts)，58–87、140–161；[SourceContext.atomic/state](../../dsh-superagent-prototype/src/sources/host.ts)，43–45；现有 effects/delivery | 仅通过复用边界存储紧凑的研究关联/检查点/准入状态。保留不可变科学文件；[latest assignment report](../../dsh-superagent-prototype/src/core/assignments.ts)，122，是可替换的。不新增 SQL store/CAS/outbox。 |
| S7 | 评审、作者/评审器协调 | [工作者评审职责](../../dsh-superagent-prototype/prompts/work.md)，21–49；现有团队评审提示及 subagents | 使用现有启动/通信、精确 subject packet 及准入检查，配置独立评审 agent。不新增评审器服务或看板。通用评审不是自动的科学认证。 |
| S8 | 操作者配置/健康状况 | [有文档说明的管理 API](../../dsh-superagent-prototype/docs/006-deployment.md)，159–205 | 复用有文档说明的 settings/prompts/pause/stop 路由。它们不提供新的科学任务提交 SDK，也不保证全局远程执行。 |

**Watchdog 是运行层的 heartbeat 路径。** 服务健康不能证明基准已推进、已停止或产出了有效科学证据。同样，`assignmentStarted` 表示 assignment/消息被接受，`inputsRead` 表示 Session 历史已交付。用极小的结果映射保留这些区别，不另建协议。

现有重试/后台限制包含常量，并非全部都是可配置参数（[executor](../../dsh-superagent-prototype/src/executor/dsh.ts)，27–36、247–258、629–655）。使用有界工作者任务；不要假定提示配置可以将每个运行时限制变为研究预算硬上限。远程机器是可选项：只有验证了实际能力后，才使用已配置的执行路径。不新增 HostAgent、fleet 守护进程或强制双宿主试点。

仓库策略仍适用：保留原始提示及带时间戳的修订历史；为 Accorde 禁用默认的[共同作者署名/历史改写指令](../../dsh-superagent-prototype/prompts/team/delivery.md)，第 17–25 行；未经当前任务授权，不 commit/push/PR/merge。配置研究工作者的产物交付要求，不原样继承编码工单的 PR 完成标准。

## 4. 科学核心：八项性质，而非分布式平台

### P01 — 绑定身份

绑定 project/stage、原始提示及 goal/context 修订；候选 commit/tree/config；evaluator/verifier/version；inputs/split/purpose；与比较有关的环境；限额及验收策略。声明精确调用及输出 schema。身份变化使依赖它的结果验收和评审失效。迭代开发不能静默开启最终确认数据。

### P02 — 真实且不可洗白的执行有效性

读取**实际普通任务**的终态。超时、取消、崩溃、未解决的所有权，或身份/来源沿革检查失败，不能因为 stdout 写着 pass 或 SIGTERM handler 以零退出就变为有效。被中断任务的输出即便看似通过，也始终无效。保留原始输出字节；隔离相互矛盾的引用，不改写证据。正常执行与科学改进仍分别判断：有效的负面结果也是有用的研究证据。

### P03 — 不可变、类型明确的证据及现有领域验证

通过现有工作区/产物设施归档不可变结果快照。对同一份捕获字节做哈希及解析；核验请求与取回内容的身份。拒绝缺失/类型错误的字段、将 bool 作为数值、NaN 和 Infinity。调用/读取绑定这些输入的现有领域验证器；不要相信调用方提供的 `guards_passed`，也不要将 bootstrap、Bonferroni、效应量或对照方法重建为通用研究引擎。

### P04 — 在现有路径上进行限定范围的评审

评审包绑定 project、stage、candidate、evidence、goal/plan 修订及拟执行的**精确 action**。建议、历史/实时评论和过期批准不能授权工作。批准不能豁免身份、有效性、预算或确认数据规则。一项批准只授权其声明的转换，不授权无限的后续检查点。复用现有评审工作者/渠道及持久化。

### P05 — 使用权威限额进行有界准入

启动前检查已声明命令、授权用途、启动次数及剩余预算。复用可用核算及任务控制；保留已花费扣账。不另设财务/资源账本。如果缺少权威实验核算，试点使用一条串行、已准入序列，并在复用状态边界持久记录尝试次数；若缺少原子操作，必须狭窄地论证其必要性。不要从 `maxWorkers` 推断提供商 token/GPU 硬上限。未解决执行在核对完成前保留其预留；重试不恢复预算。

### P06 — 不可逆的确认数据揭示

使用**唯一的项目全局开启权威**，而不是每个 checkout/profile 各有一个账本。对于 Accorde，保留 `~/.local/state/autoresearch/confirmation/accorde-ppp.sqlite3` 及其已有历史。在访问**之前**消耗一次开启；失败/中断的开启仍计为已消耗；重命名、重试、新 profile 或新候选不能重新开启重叠 subject。将确认绑定到冻结候选/验证器/数据及所需评审/资格验证，只发布声明的有限聚合结果。为开启操作禁用通用重试。

通过狭窄适配器复用现有权威，或从现有持久化中暴露原子操作；不要复制 Python 确认运行器/账本或新建存储。**在证明原子性、连续性及单写入方协调之前，保持全新确认禁用。** 目前接受流程上的分离；不宣称另一个 checkout 提供访问控制隔离。

### P07 — 证据支持的外层循环/重新定向

**策略归 dsh-research 所有；激活归现有 superagent 工作者/任务所有。** 保留简短检查点要义：问题/假设、尝试过的替代方案、有效/无效结果、理由、不确定性、证据引用、剩余限额及下一步决策。任务完成通过现有机制触发工作者下一轮；辅助模块决定继续、诊断/转向、暂缓或停止。重访已拒绝路径前，须有变化的假设/证据/上下文。人工停止及限额耗尽终止自动化。不要求 GoalLedger 克隆、候选清单引擎或科学 watchdog。

### P08 — 连续性及不重复建立科学权威

在复用持久化边界，重复的完成/评审交付无害：同一科学 action 不能重复花费或开启数据。恢复应续接同一次尝试，而不是静默创建新实验。旧证据保持不可变；subject 变化创建新修订，并使依赖它的批准失效。交接时保留原始提示/历史及已有扣账/数据揭示。不要为同一研究活动同时运行旧、新两个准入循环。

## 5. 可执行顺序：六个缩减里程碑

顺序保留；**交付物及发布门槛缩减**。未来的实施跟踪文档应记录 M1–M6、the canonical property set、复用途径检查、实际用量及偏离；旧 C01–C28/fleet 清单不是实施 backlog。不宣称实施跟踪文档已存在。

### M1 — 冻结最小契约及复用检查清单

- 锁定上述基线，并将 65 路径矩阵作为禁止移植清单。
- 定义一套小型 manifest/result/checkpoint/review packet 及 the canonical property set；尽可能使用现有基准/验证器输出。
- 在目标 profile 中验证 S1–S8：工作者任务工具、subagents/评审器启动、完成交付、提示覆盖、状态访问、source 权限及 watchdog 配置。
- 明确已发布接口是否可用。先尝试配置/技能路径；记录任何*单一、狭窄的缺失导出/原子操作*，而不是引入服务。

**完成标准：** 已评审的最小契约、精确普通工作者调用路径及能力检查清单；明确禁用未知能力。不设计原生 coordinator/store/UI。

### M2 — 打包技能及薄科学辅助模块

- 创建同级仓库/包，包含研究技能、配置方案及四个示例辅助模块；默认保持 superagent 源码不变。
- 实现清单/证据检查及纯检查点/准入决策。现有工作者将 Accorde evaluator/verifier 作为普通有界任务运行。
- 通过复用设施绑定普通不可变产物及最小 IDs/state；不另设研究数据库、执行器或 outbox。
- 包含极小的已公开输入 CPU 示例。每份修订产物记录原始提示及带时间戳的修订历史。

**完成标准：** 一个普通 superagent 工作者运行有界示例，产出 manifest、实际任务回执、验证器结果及紧凑检查点，无任何 dist-exec 运行时依赖。

### M3 — 配置自动规划及独立评审

- 添加研究专用工作者过程，不新增规划器/评审器生命周期机制。
- 在已声明的检查点，现有完成交付唤醒工作者；其验证 provenance/execution predicates、计算有界下一步 action，并写出不可变数据包。
- 策略要求评审时，**通过现有已配置 subagent/review 路径自动启动一个独立评审 agent**。评审器获得精确清单、输出/验证器证据及拟议 action；它不编写该候选，也不控制预算/数据揭示。使用目标 profile 支持的只读/流程分离访问；不虚构沙箱保证。
- 现有工作者接收评审、检查 review/admission, protected-data and continuity predicates，随后提交下一项普通任务或停止。缺少评审器能力/subject 不匹配意味着暂缓，而非自行批准。
- 在复用状态中使用由 subject/checkpoint/action 派生的 action 身份，使重放不重新启动或复用批准。须测试配置，不仅文字宣称自动化。
- 人工后续沟通留在现有渠道。不改版人工看板，不新建评审器服务或 webhook 总线。

**完成标准：** 通过现有基础设施实际演示一次“完成 → 有界提案 → 独立评审器 → 接受转换或明确暂缓”；过期/重放的评审不能授权其他 action。

### M4 — 仅在复用边界测试科学性质

- 为 **the canonical property set** 添加聚焦的正/反例测试；保留分支回归背后的性质，而不是 Python 类或测试数量。
- 覆盖身份变化、SIGTERM-zero/超时无效性、损坏及非有限输出、有效负面结果、过期/action 不匹配评审、限额耗尽/重放准入、上下文变化后的重访及停止。
- 确认测试使用可丢弃状态：访问前消耗、失败仍已消耗、拒绝重命名/profile 重叠及连续性。在真实权威完成核对前，生产确认保持禁用。
- 通过 superagent 支持的设施检查普通完成/评审的重放/重启。不要将通用 claim/grant/HTTP/TLS/fleet 机制作为插件功能重测或重建。
- 验证实际设置，并区分工作者限制与任务/资源限制。记录缺失的可复用操作，保持受影响能力禁用。

**完成标准：** 八项科学性质带记录证据通过；如实说明能力/保障限制。不强制双宿主部署、UI 套件或旧测试数量对等。

### M5 — 运行一次有界、已公开输入的 Accorde 试点

- 使用现有**已公开/合成 CPU 输入**及当前领域验证器；不用 GPU，不提出新科学主张，不使用封存/全新确认。
- 一名作者工作者加自动启动的评审器演示团队协作。如果具备条件，第二位人类参与者通过现有 source/渠道提交一次后续请求；凭证缺失如实报告，不以新连接器替代。
- 最多 **4 次基准启动尝试**，每次 **60 秒**，总已准入基准超时预算 **240 秒**，基准并发 **1**，不进行基准 fan-out。重试/失败启动计入四次。工作者槽位单独配置；`maxWorkers=2` 不是全局基准/subagent 上限。
- 通过复用所有权/状态强制执行尝试计数及串行化；如果所选边界不能落实这些上限，就停止，而不是运行无上限试点。模型花费及运行时开销单独报告，不谎称计入 240 秒。
- 记录候选、实际任务状态、验证器证据、精确评审及继续/转向/停止检查点。达到上限即停止；不继承“never stop”。

**完成标准：** 端到端证据包及自动评审回执、实际用量、已演示停止，以及复用缺口清单。试点不要求两台机器，也不证明模型改进或生产级分布式保证。

### M6 — 保守切换新工作；连续性成立后才归档

- **仅将新研究活动**迁往已通过资格验证的路径。活跃旧版 H3 研究活动/运行时锁定保持不变，直到其工作终止或已明确核对。
- 盘点运行时锁定、活跃任务/控制器、证据、已花费成本及已开启确认 subject。保留现有项目全局开启权威；禁用相冲突的旧/新写入方。
- 只有不再有活跃工作流需要分支依赖，且预算/数据揭示连续性已获证明时，才退役该依赖。可选的一次性离线导出/导入是另行论证的任务，不是通用迁移子系统。
- 归档分支及其规划/跟踪文档/证据，不删除有用历史。按版本锁定回滚传输/执行，绝不通过抹去扣账或数据揭示来回滚。

**完成标准：** 有文档记录的新研究活动切换及保守归档/回滚门槛满足。连续性未解决时，保留旧版权威，不宣称退役完成。

## 6. autoresearch 中保留与不保留的部分

Karpathy 的 baseline → propose → run → evaluate → keep/discard/iterate 方法及可由人编辑的指令仍提供启发。原始 GPT 训练器、五分钟 `val_bpb` 示例、根目录 Torch/data/cache 依赖、`results.tsv` 机制及无限的“never stop” Git 循环，**都不是必需实现依赖**。对实际复制的任何材料保留署名/许可证来源沿革。

从分支仅保留目标、实际结果有效性、限定范围评审及禁止确认复用背后的性质。[矩阵](261103-1637-dist-exec-drop-matrix.md)还单独覆盖五个未修改的旧版核心模块及两个未修改的评审辅助模块，避免它们过去存在就变成隐含移植义务。

高级搜索/frontier 排名、通用统计方法、容器/远程 fleet、自动计划补丁、自动 Git 晋级及实时/历史看板 UX，都是可选的未来提案。**任何一项都不是此最小核心的前提。**

## 7. 证据边界及验证状态

本修订是**源码/文档审计**，不是成功的 dsh-research 部署。框架工作区保持干净；本次英文修订未改变代码、依赖、服务、模型、GPU、暂存、提交或推送。

此前 dist-exec 审计证据仍仅是历史记录：`26 项聚焦分布式测试、2 项临时 loopback 测试及 fleet UI 检查` (historical project evidence unavailable here; source reference `../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/tests.json`)、`124 项 Python 回归` (historical project evidence unavailable here; source reference `../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/full-python-regression.json`)及`源码清单` (historical project evidence unavailable here; source reference `../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/source-manifest.json`)。它们不认证新插件、真实远程部署、服务安装或全新确认。

该 dist-exec HEAD 已修复优雅超时缺陷；保留中断即无效的性质。其他已记录的完整性/评审/发布缺口**不宣称已修复**。舍弃重复运行时避免复制其实现；the canonical property set 仍须在复用途径上测试。精确边界参见`此前可丢弃发布复现` (historical project evidence unavailable here; source reference `../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/reserved-state-publication-reproduction.json`)及矩阵。

## 用户提示，逐字记录

```text
write an separate actionable plan for the 6 items in "I would proceed in this order"
```

```text
please keep the changes contained (plugin or separate repo), so that minimal changes to dsh-superagent.
```

此前关于重建决策的问题：

```text
or rebuild the autoresearch added features into dsh-superagent?
```

原始 autoresearch 后续问题：

```text
if we go with the dsh-research plugin plan, what's part of original/karpathy autoresearch still left?
```

外层循环职责后续问题：

```text
Should the outer loop (resteering)  introduced in my fork be ported to dsh-superagent or dsh-research?
```

团队协作刷新请求：

```text
yes. dsh-research needs to support team collab. actually I just pulled and switched my autoresearch fork's dist-exec branch, which is made specifically for teamwork. Check the planning doc and impl, refresh the dsh-research plugin plan if needed.
```

复用要求：

```text
if some features are already covered by dsh-superagent, don't reinvent the wheel.
```

最新最小核心/复用指令（逐字保留英文，包括前三行的行尾空格）：

```text
superagent has the watchdog, which acts for heartbeats. 
superagent alos has the worker agent, and communicaton, so the "distributed claim/start" can use that route, not re-invent. 
So are the "Concurrency/Recovery/Review/Persistence", as those can be set up to run on superagent. 
Let's revise the plan to reuse superagent as much as possible. don't have to re-impl what autoresearch dist-exec's carbon copy. The key here is minimal/core dsh-research, only the gist. Answer this question, "can I drop this" for every autoresearch's dist-exec branch?
Also the review board needs revamp, omit that in the current planning.
```

原始中文翻译请求（保留原文）：

```text
`/home/cliu/wk/accorde/.plan/20261103-1230-plan-dsh-research-plugin-rebuild.md`translate to chinese in *-zh.md
```

本次中文同步请求（保留原文）：

```text
Documentation-only write task. Read /home/cliu/wk/accorde/AGENTS.md (all rules need rationale, prompts verbatim, artifact amendments need timestamped ## Revision History, no Co-Authored-By). Update ONLY /home/cliu/wk/accorde/.plan/20261103-1230-plan-dsh-research-plugin-rebuild-zh.md to faithfully track canonical UPDATED English /home/cliu/wk/accorde/.plan/20261103-1230-plan-dsh-research-plugin-rebuild.md (r5,2026-11-03 14:58 -0800). Read both files first. Keep all original Chinese translation request text and original revision-history rows; add timestamped r4 (actual local time) noting synchronization to English r5. It is okay to fully replace body with updated complete Chinese translation, but original metadata/history/prompts must be preserved. New scope: dist-exec clean ead1ae507934a6da5e914a2559d6fcac99c505c4, runtime0.6.0; TWO dimensions research team vs evaluation hosts; mandatory reuse-first of DSH/Superagent Session/Ticket/codingworker/GitHub/Feishu/attention/delivery no duplication; zero DEFAULT superagent changes except separatelyapprovedminimal publicfacade; scientific-only native coordinator/grants/rounds/qualification/exposure/publication remains in plugin. Preserve anonymous_poc current branch READ AND WRITE unauthenticated+self-reportedidentity and CORS; TLSnotidentity; futureteam_authenticated distinct requiredchecks and sourcefirstgaps; graceful timeout nowFIXED, otherpostinvalid/samples/lineage/protectedfilepublication gaps notclaimedfixed. Six milestones M1-M6, C01-C28, realtwohuman/twohostboundedCPU4unit240sec pilot,no24candidatesspeedupclaim,noGPUs/newscience, malformedpublish fixture overwrote disposableDB, 26+2Python tests +FleetUI only, legacyaccounting/exposureimportNOTdone. Nativeplan NOTexecuted. All hashes/code/API paths/commands/budgets exact. Include new user prompts verbatim from English (do NOT translate exact quote blocks) plus the original zh translation prompt already existing. Do not modify English, other docs, source, dependencies, git staging/commit/push. Verify local markdown links/fences and no missing M1-M6/C01-C28 after writing via bounded validator (not repeated full reads simply verification). Report file path, source matching status and any limitations; no test/framework capability claims beyond source. Only Chinese doc may change.
```

同步过程中的补充指示（保留原文）：

```text
Message Type: NEW_TASK
Task name: /root/galileo
Sender: /root
Payload:
Canonical English validated: six milestones, C01-C28 (28 cases),35 local source links, source version0.6.0 ead1ae5. Please ensure original zh translation prompt and r1-r3 rows preserved, newpromptsverbatim present, 'anonymous_poc' READ AND WRITE/unverified correctly translated. No need duplicate source research; prioritize doc sync and report checks. Other frameworks stay clean.
```

最终英文证据更新指示（保留原文）：

```text
Message Type: NEW_TASK
Task name: /root/galileo
Sender: /root
Payload:
Small final English update r6@2026-11-03 15:09 -0800: full local Python suite additionally passed124tests in23.192seconds; added paragraph in 'Dist-exec audit evidence' + links full-python-regression.json and source-manifest.json, no semantic milestone changes. Please include this final additional evidence and new Updated timestamp in zh (source now r6) and add timestamped history. Still6milestones/C01-C28,reuse/anon limitsunchanged. Can incorporate as small post-translation patch, no need retranslate entire body.
```

### 历史英文源计划修订说明（来源沿革，不是当前范围）

以下保留源计划在原中文译本之后增加的修订说明，仅作历史来源沿革；旧范围不再是当前要求。英文与中文修订编号分别维护，下方原中文历史不改写。

| 英文修订 | 时间戳 | 变更 |
|---|---|---|
| r3 | 2026-11-03 14:27 -0800 | 澄清 Karpathy 原始来源：保留实验循环方法，但不要求 GPT 示例、五分钟/bpb 契约或根目录依赖。区分过渡期新增 Python 运行时与原始训练器代码，并逐字保留用户问题。 |
| r4 | 2026-11-03 14:32 -0800 | 明确将外层循环/重新定向状态、科学转换规则及后继准入归入独立研究插件；区分 DSH Session/任务传输与可选 superagent 路由。逐字保留职责问题。 |
| r5 | 2026-11-03 14:58 -0800 | 根据干净的 dist-exec ead1ae5/runtime0.6.0 规划及实现刷新。明确团队协作与分布式评估，新增复用优先职责、原生 grant/round/qualification/publication/access 契约、C16–C28、多人/双宿主试点及分布式退役。记录 26+2 离线测试/fleet UI、已修复超时回归及可丢弃发布状态损坏复现；保留匿名与已认证/物理资格区别及默认零 superagent 变更。逐字保留两条新用户提示。 |
| r6 | 2026-11-03 15:09 -0800 | 新增完整本地 Python 回归的 124 项测试证据及已审计源码清单引用。未覆盖的 POC 缺口及真实团队/后端资格验证仍明确待完成；未改变实现或已部署状态。 |

| r7 | 2026-11-03 16:49 -0800 | 以依赖 superagent 的技能/策略/辅助模块核心取代全栈/独立运行/fleet 重建。复用 watchdog、工作者路由、通信、并发、恢复、评审及持久化；以 P01–P08 科学性质替代 C01–C28 功能对等；移除评审看板/UI 工作及强制双宿主试点。链接完整 65 路径 dist-exec 处置及未修改旧版核心覆盖；保留提示/历史、连续性及默认零 superagent 源码变更。未改变实现或部署状态。 |


## Filename Convention Request, Verbatim

~~~text
please use {YYMMDD}-{HHMM}-* as the format of the plan/tracker file name.
~~~

## Revision History

| 修订 | 时间戳 | 变更 |
|---|---|---|
| r1 | 2026-11-03 12:30 -0800 | 创建独立的六里程碑可执行重建计划，明确同级插件的隔离职责、默认零 superagent 变更、显式契约及服务、自动规划器/评审器激活、故障契约一致性、有界 Accorde 试点、新研究活动切换，以及归档和回滚门槛。逐字保留计划及隔离指令；尚未开始实施。 |
| r2 | 2026-11-03 12:37 -0800 | 根据公开 DSH 用法细化计划：独立侧边栏页面、新建 Session/模型/工具/进程适配器、可选但尚未发布的 source-SDK 桥接层、评审器角色限制、单一确认验证账本写入方，以及可强制执行的试点上限，不虚构提供商预算保证。 |
| r3 | 2026-11-03 14:09:37 -0800 | 创建完整中文译本，保留原文结构、路径、API 标识符、命令、哈希、预算及门槛语义，并逐字记录本次翻译请求；原始英文计划未修改，计划未执行。 |
| r4 | 2026-11-03 15:05:37 -0800 | 将完整中文正文同步至英文 r5（2026-11-03 14:58 -0800）：纳入 dist-exec ead1ae507934a6da5e914a2559d6fcac99c505c4/runtime 0.6.0、团队与评估宿主双维度、强制复用及默认零 superagent 变更、插件专属科学协调/授权/轮次/资格/数据揭示/发布、匿名与认证访问区别、已修复超时与其他未修复缺口、C01–C28、四单元/240 秒真实双人双宿主试点，以及未完成的核算/数据揭示迁移。保留原译本元数据、r1–r3 行和原翻译提示；逐字补入英文新增提示及本次同步请求。审计仅为源计划记录的 26+2 离线测试及 fleet UI、可丢弃数据库发布复现，不代表原生计划已经执行；仅修改中文文档。 |
| r5 | 2026-11-03 15:10:22 -0800 | 小幅同步英文 r6（2026-11-03 15:09 -0800）：更新来源及中文同步时间，补入完整本地 Python 回归 124 项测试/23.192 秒、full-python-regression.json 与 source-manifest.json 引用，并逐字保留补充指示。六里程碑、C01–C28、复用优先、匿名读写/身份限制及尚未执行原生计划的状态不变；保留原中文 r1–r4，不把新增回归证据当作 POC 缺口已修复或真实团队/后端资格验证已通过。仅修改中文文档。 |
| r6 | 2026-11-03 16:55:15 -0800 | 将中文当前正文同步至规范英文 r7（2026-11-03 16:49 -0800）：缩减为依赖已配置 superagent 的技能/策略及四个薄辅助模块，复用 S1–S8，不再重建协调器/存储/outbox/调度器/grants/HostAgent/CAS/HTTP/UI/评审器管理器，省略评审看板改版但保留通过现有配置路径自动启动独立评审器；以 P01–P08 和缩减 M1–M6 取代 C01–C28/独立运行功能对等。试点仅限串行 CPU 4 次尝试×60 秒、240 秒已准入基准超时预算，maxWorkers 不是任务/资源硬上限；保留已有项目全局扣账/数据揭示，原子性及连续性证明前禁用全新确认。SourceContext 现有 atomic/KV 不是已发布 SDK；默认零 superagent 源码变更，确需 facade 时单独批准。补入 65 路径矩阵链接及最新用户原文（含前三行行尾空格），保留原翻译提示、既有全部引用块、r1–r5 历史行和源修订沿革；仅修改中文文档，未执行测试、服务、模型、安装或部署。 |
| r7 | 2026-11-05 16:26:56 -0800 | Renamed 20261103-1230-plan-dsh-research-plugin-rebuild-zh.md to 261103-1230-plan-dsh-research-plugin-rebuild-zh.md using YYMMDD-HHMM; updated 4 local links and repaired 5 copied Accorde audit references. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r8 | 2026-11-11 17:10 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority; marked unavailable external project references honestly. |
| r9 | 2026-11-11 17:44 -0800 | Adopted contract 2.0.0 category-scoped predicates/counterexamples in current conformance and audit references; preserved historical source numbering and evidence without canonical aliases. |
| r10 | 2026-11-11 18:12 -0800 | Adopted human-review contract 2.1.0 clarifications in current references/qualification plans; retained pending runtime guarantees and historical bindings. |
| r11 | 2026-11-11 19:01:22 -0800 | Adopted contract 2.2.0 applicability/coverage clarification and review-r5 residual closure; retained prospective provider qualification and historical evidence. |
| r12 | 2026-11-11 20:22:19 -0800 | Adopted 2.3.0 obligation/compatibility and qualification-budget/T4 accounting references without executing runtime changes. |
| r13 | 2026-11-11 20:31:48 -0800 | Adopted 2.3.1 accepted-envelope amortization, owned qualification holds and explicit T4 C_run/C_qual evidence without runtime activation. |
| r14 | 2026-11-11 21:13:38 -0800 | Adopted cumulative 2.3.2 compatibility assessment and explicit qualification-budget/envelope arbitration without runtime execution. |
