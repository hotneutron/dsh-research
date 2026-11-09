# 头脑风暴：Accorde 是否应该从我们的 autoresearch 分支切换到 DSH superagent？

创建时间：2026-11-03 12:01 -0800。原始英文评估：2026-11-03 17:03 -0800（r5）；原中文同步：2026-11-03 17:03 -0800（r6）。本地更新时间：2026-11-05 15:56:32 -0800（r7）。状态：已补入当前源码评审及六里程碑细化计划；尚未实施或部署。

本地命名/导航更新：2026-11-05 16:26:56 -0800（r8）。来源与既有同步元数据保留；本次仅重命名及修复引用。

本地评审说明：dsh-research 目录已于 2026-11-05 创建，目前只有策略及规划文件。原始基线和测试数字描述的是 11 月 3 日评估；当前源码差异、能力缺口和每个里程碑的具体工作见[1201/1230 评审及执行索引](261105-1555-review-1201-1230-and-milestones.md)与[执行跟踪](tracker/261105-1555-milestone-execution.md)。1230 原计划及审计证据仍保留在 Accorde，以下链接已修正。新的实施计划保留最小复用范围；全新确认仍禁用。

本修订**取代此前“仅替换宿主、永久保留 Python 科学基础层”及“原生重建完整控制平面/UI”的提案**。历史修订条目和测试证据仅保留来源沿革，不是当前实现要求。可执行方案以[最小 dsh-research 计划，英文 r7](../../accorde/.plan/20261103-1230-plan-dsh-research-plugin-rebuild.md)为准；[中文计划](../../accorde/.plan/20261103-1230-plan-dsh-research-plugin-rebuild-zh.md)提供对应译本；[dist-exec 舍弃矩阵](../../accorde/.plan/20261103-1637-dist-exec-drop-matrix.md)给出完整处置。[英文原文](261103-1201-brainstorm-autoresearch-versus-dsh-superagent.md)。

## 1. 答案：采用 superagent 的现有机制，而不是复制 dist-exec

**将 dsh-superagent 作为目标运行/团队协作平台，配合小型同级 dsh-research 技能/策略/辅助模块包。不要整体切换活跃研究活动，也不要在新插件中重建 dist-exec。** 先验证有界集成；原版 superagent 本身不构成科学资格认证。

此前比较正确识别了值得保留的科学性质，但为它们划定了过大的实现边界。这些性质**不要求**另一套 coordinator、store、scheduler、worker 协议、supervisor、reviewer manager 或 dashboard。Superagent 已有运行路径；配置并复用它，只补充缺失的研究核心要义。

| 职责 | 归属 |
|---|---|
| Watchdog/运行心跳、Tickets/workers、通信、并发、恢复、评审和持久化 | 现有已配置的 superagent/DSH 能力 |
| 提示/目标与候选/评估器/数据身份；真实证据有效性；有界下一步决策及限定范围准入 | 最小 dsh-research 策略/辅助模块，由现有工作者执行 |
| 正确性、测量、统计及科学验收 | 现有 Accorde/领域工具与验证器 |
| 活跃旧研究活动、不可变证据、已扣账及确认数据揭示历史 | 在完成核对和交接前，保留原运行时/权威记录 |

**当前规划省略评审看板改版。** 不新增 Research 页面、fleet UI、评审服务器、评审数据库或收件箱迁移。现有评审对话和普通证据包即可；自动独立评审仍属于需配置的工作流。

这是修订后的建议和文档更新，不是安装 DSH、修改运行时锁定、部署服务、提交代码或启动实验的许可。

## 2. 基线：当前分支与历史证据分开

| 仓库/证据 | 修订 | 含义 |
|---|---|---|
| 当前 `~/wk/autoresearch` | `ead1ae507934a6da5e914a2559d6fcac99c505c4`，干净的 `dist-exec`，运行时 0.6.0 | 当前参考实现；不能假设所有研究活动均部署 HEAD |
| dist-exec 基线 | `33ef750face59b42f9663c8e355a77600d1765e7` | 两个提交的增量：65 个变更路径，60 个新增、5 个修改 |
| `~/wk/dsh-superagent-prototype` | `8c32a9dc5d72c033816c6a8110b37f40cf94fba4`，工作树干净 | 复用的运行/团队平台；实际 profile 能力仍需验证 |
| `~/wk/accorde` | `7c85e7541a3d8dfbb25fec46d96ff644c1ae72b5`，`cross-isa` | 领域工具和原有科学产物；此次未改变科学状态 |
| 原 12:01 分支比较 | `d47eabdb1aeb433492563a5abcfbeaae43c75209`，`feature/workflow-review-overview` | 历史 0.5.8 评估，不是当前 dist-exec 基线 |
| `~/wk/dsh-research` | 2026-11-05 已创建；尚无包实现 | 独立同级规划目录；默认零 superagent 源码改动 |

本次更新采用已完成的源码审计及当前计划/矩阵。不重跑之前的运行时测试，不从源码推断服务已安装，也不将历史机器前置条件当成新环境检查。

## 3. Superagent 已覆盖哪些部分，以及还需保留什么

| dist-exec 关注点 | 替代为复用 | 研究专属的少量剩余工作 |
|---|---|---|
| 心跳、进程存活及服务恢复 | 现有[服务脚本](../../dsh-superagent-prototype/scripts/dsh-superagent)和[外部每小时 watchdog](../../dsh-superagent-prototype/docs/006-deployment.md)，133–141 | 在服务 profile 之外配置检查。服务健康不等于基准进展/完成；读取普通任务状态。不新增研究 heartbeat 守护进程。 |
| 分布式 claim/start 和工作者通信 | 现有[orchestrator 路由](../../dsh-superagent-prototype/src/app/tools/main.ts)，88–150，以及 Tickets、workers 和 sources | 有界工作附带 manifest/action/evidence 引用。Assignment 被接受不等于基准启动。不新增 enrollment/grant/claim API。 |
| 并发和工作区 | 现有[WorkerSlots/executor](../../dsh-superagent-prototype/src/executor/dsh.ts)，165–198、227–235，以及配置后的 checkout/job 能力 | 验证真实上限。`maxWorkers` 限制工作者，不覆盖所有后台任务、GPU 资源或远程机器。不另建调度器或资源租约引擎。 |
| 恢复、取消及完成唤醒 | 现有[jobs/subagents](../../dsh-superagent-prototype/src/executor/background.ts)，9–20、61–119；持久化 effects 和 delivery | 小型真实状态/证据映射及科学动作去重。即使输出看似通过，超时/取消/来源失败仍无效。 |
| 评审及评审器参与 | 现有[工作者负责评审](../../dsh-superagent-prototype/prompts/work.md)，21–49，以及团队提示和已配置的 subagent/review 启动 | 在声明边界自动启动独立评审器；绑定精确 subject/evidence/action，拒绝过期评审。不新增评审器服务或看板。 |
| 持久化及通信历史 | 现有[Store](../../dsh-superagent-prototype/src/app/store.ts)，58–87、140–161；[SourceContext](../../dsh-superagent-prototype/src/sources/host.ts)，31–65，scoped KV/atomic 操作及渠道 | 紧凑科学关联和不可变普通产物，而非新研究 SQL 引擎、outbox、消息总线或 CAS。 |

现有 SourceContext 集成点**并非已验证发布的 SDK**。优先采用配置/工作者工具/已记录路由；若必要的程序接口确实缺失，则单独提出复用现有操作的窄版本化 export/facade。不要私有导入，也不要因为缺少导出而重建引擎。

本次文档更新未证明 watchdog 已安装、jobs/subagents 可用、source 凭证已配置或远程执行目标可用。只启用在目标 profile 中实际验证过的路径。首次试点无需两台宿主；不要为了满足参考实现的架构而另建远程 fleet。

## 4. 保留核心要义，而不是模块结构

少量辅助模块加研究指令即可。计划中的四个示例模块是 **manifest**、**evaluate**、**loop** 和 **admission**；它们不是四项新服务。

| 小型契约 | 必须保留的性质 |
|---|---|
| 身份和证据 | 原始提示/目标修订；候选、评估器/验证器、输入/划分/用途及相关环境身份；精确调用；不可变、类型明确、有限数值输出；对同一次捕获的字节计算哈希并解析 |
| 执行与科学分开 | 实际终态；受中断/取消/崩溃或来源无效的工作，不能凭零退出码或 stdout 变有效。有效负面结果仍是有用证据。现有领域验证器决定资格，不靠调用者标志或新统计 DSL。 |
| 限定范围评审及有界准入 | 精确 project/stage/candidate/evidence/plan/action；建议/过期反馈不是授权。评审不能豁免有效性、预算或数据揭示规则。启动前检查权威限额；重试不恢复已花预算。 |
| 目标外层循环/重新定向 | 证据支持的假设 → 结果 → 检查点 → 继续/诊断/转向/暂缓/停止。重新尝试被拒路径前必须改变假设/证据/上下文。**策略归 dsh-research；激活归现有 superagent workers/jobs。** |
| 确认数据揭示及连续性 | 项目级单一“访问前先消耗”权威；失败/中断开启仍消耗；不能通过重命名/profile/重试复用；保留既有记录及单写入方交接 |

Accorde 保留 `~/.local/state/autoresearch/confirmation/accorde-ppp.sqlite3` 及历史。通过薄适配器复用该权威，或窄范围暴露现有原子持久化操作；不要复制 runner/ledger，也不要初始化空替代账本。**在原子性、连续性及写入方协调得到验证前，禁用全新确认验证。** 接受程序性隔离，但新 checkout 不被宣称具备访问控制隔离。

最小核心不要求 GoalLedger 克隆、通用资格引擎、有限 RoundPlan/DAG 编译器、top-k/frontier 系统、计划补丁框架或通用迁移子系统。保留 Karpathy 的实验循环方法及适当归属，不保留其 GPT trainer、根目录 Torch 依赖或无限“never stop”实现。

## 5. 可以舍弃 dist-exec 的新增内容吗？

**可以：每个完整文件的移植义务都可以舍弃。** [完整矩阵](../../accorde/.plan/20261103-1637-dist-exec-drop-matrix.md)覆盖 **65/65 个变更路径**：

| 处置 | 数量 | 含义 |
|---|---|---|
| YES | 36 | 舍弃重复实现/仅归档材料；复用现有能力 |
| YES/BUT | 24 | 舍弃实现，保留该行说明的小型科学性质 |
| DEFER | 5 | 初始核心省略可选高级功能 |

矩阵另行覆盖五个未变更科学核心模块及两个未变更评审辅助模块，避免它们在旧计划中的存在变成隐藏移植义务。“舍弃”指新实现不采用它们，不是删除证据、抹去扣账/开启历史或退役活跃运行时锁定。

此前迁移/重建选项因此调整为：

| 早期选项 | 当前处置 |
|---|---|
| DSH 下永久保留 autoresearch 科学基础层 | 不再是必需目标。为活跃研究活动及连续性保留旧运行时/权威，不为所有新工作保留重复编排。 |
| 永久共同打包整个 Python 运行时 | 不要求。复用现有领域评估器及有理由保留的旧适配器/权威，而不是整套 controller/store/worker。 |
| 在 superagent 内原生重建科学服务和 UI | 已取代。采用隔离的最小同级包；默认零 superagent 源码改动。省略看板/UI 工作。 |
| 仅使用原版 superagent | 不是科学认证。增加少量 manifest/evidence/review/budget/exposure/re-steering 规则，验证集成工作流。 |

## 6. 建议路径和采用门槛

```text
有界科学请求 + 紧凑 manifest
  → 现有 superagent Ticket / worker / 普通 DSH job
  → 现有 watchdog / 通信 / 并发 / 恢复 / 持久化
  → 实际终态 + 不可变输出 + 现有领域验证器
  → 策略要求时自动启动独立评审器
  → 限定范围准入 + 证据支持的目标检查点
  → 下一项普通任务、暂缓或停止
```

采用可执行计划的六个精简里程碑：**M1** 契约/复用检查清单；**M2** 技能及薄辅助模块；**M3** 配置自动规划/评审；**M4** 在复用边界测试八项科学性质；**M5** 一次有界、公开输入的 CPU 试点；**M6** 连续性成立后的新工作切换及保守归档。不恢复旧 C01–C28/fleet/全栈列表作为发布门槛。

试点最多准入 **4 次基准启动尝试 × 60 秒 = 240 秒**超时预算，基准并发 **1**，无 fan-out、GPU 采集或密封/全新确认验证。重试计入四次上限。模型花费和运行时开销另计；worker slots 不构成硬实验资源预算。展示独立评审器、精确证据/动作绑定、拒绝过期/无效输出、重放/重启连续性，以及达到上限后停止。

Accorde 试点前，覆盖[共同作者/历史改写默认设置](../../dsh-superagent-prototype/prompts/team/delivery.md)，17–25，以符合 [AGENTS.md](../AGENTS.md)；配置实验产物交付，而不是照搬“PR 即 ready”。验证实际 DSH/provider/source 配置；旧 Node/pnpm 发现属于历史，不是新检查出的阻塞条件。

**只有集成路径保留小型防护并证明运行收益后，才切换新工作。** 现有冻结研究活动继续使用记录的运行时，直到终止/完成核对。不允许两个准入权威同时运行；归档/回滚保留旧证据字节、扣账和数据揭示。更少人工继续、自动评审器参与及更低重复维护成本是待验证假设，不是已测收益。

## 7. H3 上下文及证据边界

原只读比较观察到 **193 个留存研究活动条目**、执行锁定 0.5.4/展示 0.5.8，以及目标账本中的 **385 次已关闭准入和 35 条目标记录**。它们是历史工作流数量，不是当前清单、独立科学成功或可靠性证明。

当时检查的 `context-availability-exhaustion-rebrainstorm-r1` 要求推理服务时可见、独立变化的数值/值/访问上下文，或经资格验证的完整非剖析标签/上下文桥接，或独立授权硬件/编译器目标。切换宿主不提供其中任何一项。留存的未见完整内核目标（MdAPE <=5%、支持/覆盖、无目标校准）不变。无效语料/已揭示确认数据不能因迁移变为全新证据。

| 证据时期 | 已记录结果 | 当前解释 |
|---|---|---|
| 原 12:01 审计，`d47eabdb…` | 66 项聚焦分支测试/15.964 秒；三项实际模板 UI 检查；2 项 Accorde 兼容测试/0.015 秒 | 历史有界验证；未执行 DSH 测试套件/部署 |
| 原合成超时复现 | 中断任务优雅零退出后被标记有效 | [历史复现](../../accorde/local_artifacts/autoresearch/switch-audit/20261103-1201/graceful-timeout-reproduction.json)；**当前 dist-exec HEAD 已修复**，不是该版本仍待修复的 bug |
| 后续 dist-exec 审计，`ead1ae5…` | 26 项聚焦分布式测试、2 项临时 loopback 测试/fleet UI；124 项 Python 测试/23.192 秒 | [聚焦回执](../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/tests.json)、[完整回归](../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/full-python-regression.json)；历史结果，不是新插件资格验证 |
| 最小计划/矩阵审计 | 65 路径覆盖、双语一致性和独立语义评审通过 | [文档回执](../../accorde/local_artifacts/autoresearch/dist-exec-drop-audit/20261103-1637/validation.json)；不保证运行时、评审器或远程服务已安装 |

矩阵仍记录其他源码审计发现的完整性/评审/发布缺口；不宣称它们已修复。避免复制对应实现，并在复用路径上测试保留性质。

本次仅修改规划文档。未调用模型提供商、重跑运行时测试、部署真实 DSH、采集 GPU、迁移数据或开展科学实验。建议是**采用最小 superagent 依赖路径；不整体切换活跃研究活动，也不新建第二套科学平台**。

## 用户提示，逐字记录

```text
brainstorm my autoresearch fork and the ~/wk/dsh
```

```text
brainstorm my autoresearch fork and the ~/wk/dsh-superagent-prototype, answer one question: should I switch to dsh-superagent?
```

关于迁移的后续问题：

```text
how about migrate the changes to autoresearch to dsh-superagent?
```

```text
how about migrate the autoresearch changes to dsh-superagent?
```

```text
or rebuild the autoresearch added features into dsh-superagent?
```

本次翻译请求：

```text
`/home/cliu/wk/accorde/.plan/20261103-1201-brainstorm-autoresearch-versus-dsh-superagent.md`also translate to chinese in *-zh.md
```

当前建议的范围约束指令（逐字保留）：

```text
superagent has the watchdog, which acts for heartbeats. 
superagent alos has the worker agent, and communicaton, so the "distributed claim/start" can use that route, not re-invent. 
So are the "Concurrency/Recovery/Review/Persistence", as those can be set up to run on superagent. 
Let's revise the plan to reuse superagent as much as possible. don't have to re-impl what autoresearch dist-exec's carbon copy. The key here is minimal/core dsh-research, only the gist. Answer this question, "can I drop this" for every autoresearch's dist-exec branch?
Also the review board needs revamp, omit that in the current planning.
```

本次同步请求（逐字保留）：

```text
update 1201 docs as well
```


Current review requests, verbatim:

~~~text
~/wk/dsh-superagent-prototype and ~/wk/deepseek-harness are checked out.
~/wk/accorde and ~/wk/autoresearch are also checked out.
reivew the 1201 plan and write actionable plans for each milestone.
~~~

~~~text
~/wk/dsh-superagent-prototype and ~/wk/deepseek-harness are checked out.
~/wk/accorde and ~/wk/autoresearch are also checked out.
reivew the 1201 brainstorms and 1230 plans and write actionable plans for each milestone.
~~~


## Filename Convention Request, Verbatim

~~~text
please use {YYMMDD}-{HHMM}-* as the format of the plan/tracker file name.
~~~

## Revision History

| 修订 | 时间戳 | 变更 |
|---|---|---|
| r1 | 2026-11-03 12:01 -0800 | 在独立源码审计前，记录精确决策问题、来源基线及策略，以及只读 Accorde 账本上下文。逐字保留两条用户提示；建议及验证尚待完成。 |
| r2 | 2026-11-03 12:09 -0800 | 完成两项源码审计及针对性验证；建议保留科学基础层，只将 DSH 作为宿主层补充进行测试。区分智能体托管与科学/评审门槛，记录已复现的超时 bug 和 DSH 策略及环境成本，并定义足以改变决策的证据，未授权迁移。 |
| r3 | 2026-11-03 12:23 -0800 | 评估将分支科学能力迁入 DSH 研究扩展：先复用 Python 核心，再添加持久化智能体/评审器激活，保留不同的准入及生命周期语义，仅在等价性及收益资格验证后切换。记录拟议收件箱职责变化，并逐字保留两条后续提示。 |
| r4 | 2026-11-03 12:24 -0800 | 如果选择 DSH，将原生重建评估为首选长期架构：复用其宿主基础设施，重建显式研究服务及 UI，暂时保留旧版执行器，保留旧记录身份，仅在契约一致性及收益验证后切换。保留重建问题；未授权任何实施。 |
| r5 | 2026-11-03 14:12:49 -0800 | 创建完整中文译本，保留原文结构、技术标识符、链接、版本、数值、三种方案的区别及授权边界；逐字记录本次翻译请求；英文原文未修改。 |

| r6 | 2026-11-03 17:03 -0800 | 将中文比较同步至英文 r5，并与最小 dsh-research 计划 r7 及完整 dist-exec 舍弃矩阵对齐。取代永久 Python 基础层/原生完整控制平面/UI 建议，复用 superagent watchdog、worker 路由、通信、并发、恢复、评审及持久化，仅保留小型科学辅助模块。区分当前与历史分支证据，明确当前 HEAD 已修复优雅超时缺陷，省略看板改版；保留原提示、翻译请求、r1–r5 历史及扣账/数据揭示连续性。仅文档更新，未授权或执行实施。 |
| r7 | 2026-11-05 15:56:32 -0800 | 补入当前 1201/1230 源码评审与六里程碑执行计划索引，更新已创建目录状态，并修复复制后指向 Accorde 原计划/审计证据的链接。保留原提示及历史；逐字记录最新两条请求。仅规划文档，未实施、部署或启动试验。 |
| r8 | 2026-11-05 16:26:56 -0800 | Renamed 20261103-1201-brainstorm-autoresearch-versus-dsh-superagent-zh.md to 261103-1201-brainstorm-autoresearch-versus-dsh-superagent-zh.md using YYMMDD-HHMM; updated 3 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
