# 契约人类评审处理记录

创建：2026-11-11 18:15 -0800。状态：文档修订完成；运行时实现、provider 映射、实机资格和触发准入均未执行。

## 评审输入与版本

原始评审：[contracts-human-review-zh.md](../../local_artifacts/dsh-research/architecture-revision/contracts-human-review-zh.md)。原文件保留不改，SHA-256：`4bb1c6bdc0cd92cd8a00b4d6da9dea228d4b54c04a39717a307ba5618cf9e6fd`。
评审基线为契约 2.0.0，SHA-256：`3815ee13ebed220bfa31b7b7f719c90d91de6fa4e2f405ed8ad56aa7c53b5502`；[精确快照](../../local_artifacts/dsh-research/contract-history/261111-1808-reviewed-contract-2.0.0-3815ee13ebed.md)保留。
当前规范为 [docs/contracts.md](../../docs/contracts.md) 2.1.0；23 个属性 ID、L0–L8 和 F1–F3 均未改号。修改是规范/资格要求，不是声称代码已实现。

## F-1–F-8 的处理

| 项目 | 处置 | 核验/变更及未完成部分 |
|---|---|---|
| F-1 断链 | 当前已满足，原发现已过时 | `.plan/review/261111-1742-property-validation.json` 已存在、JSON 可解析，且其 2.0.0 哈希与被评审规范完全一致；它仍是旧版文档证据。2.1.0 使用本轮的新校验记录，不伪改旧回执 |
| F-2 旧译本 | 保持撤销 | 当前没有 `docs/contracts-zh.md`。不恢复过时全文；本记录提供中文处置入口。若明确目标受众需要中文规范全文，再做绑定新版本/哈希的翻译与访问验证，当前不声称已完成 |
| F-3 准入排序 | 规范已修订 | Admission order proof 指定已提交 authority/action/attempt/manifest 元组、原生版本/序列或经资格验证的 commit 回执，以及 launcher 等待 acknowledgement 后才 dispatch 的因果父引用。只比较时间戳/自造 token 不通过；M1/M2 实现与验证仍待完成 |
| F-4 评审不可用 | 规范已修订 | L2/L7 将其归为有 owner、条件及复核期限的运维挂起。只允许已有资格且范围/预算内的重试或等价评审者；未知派发先对账，不自批、不以人工签字降级。此时 LOOP-1 的“可准入后续”前提不成立 |
| F-5 发布 schema | 规范已修订 | 项目/领域 evaluator owner 在项目里定义并版本化 schema，项目策略与独立评审绑定 opening/evaluator/input 范围；profile 只固定引用，不能扩白名单。释放边界验证实际字节；缺 schema 阻止启用打开/释放。初始 confirmation-off 不变 |
| F-6 not_applicable | 规范已修订 | 每项保留属性 ID、冻结 contract/profile/scope、前提不成立的事实/理由，以及 qualified rule 或完成评审引用。缺证据/事后缩范围是 unresolved；DATA-1 不能因为 confirmation-off 就被排除 |
| F-7 历史 ID 查询 | 查询规则已明确，实际映射延后 | 用原 contract ID/version/hash/property ID 查询精确快照；未知绑定返回 unresolved。仅在实际跨版本审计需要时生成有评审的 query-only concordance，不作为别名、验收证明或迁移。当前没有提供旧 runtime trace 查询案例，故不编造映射 |
| F-8 维护成本 | M4 计划已细化 | 先自动化核心安全/准入/终态机制，再验证启用的反馈/释放机制；语义判断仍有每次适用的独立 agent/domain review。人工抽样只补充审计，不免除任何必需属性。实现、fixture 和线上保证仍待完成 |

## S1–S8 的处理

| 项目 | 处置 | 规则与限定 |
|---|---|---|
| S1 要求可能有误 | 采纳独立契约修订路径 | 局部修复、要求/适用范围复评、架构评审三条路径分开。新契约 delta 要有精确评审、兼容性与资格检查。不能事后洗白失败、退款或让已暴露数据变新；受保护字节的 hash 仍是访问 |
| S2 先止血 | 采纳 | 在 T1–T4 表前明确通过既有授权控制立即挂起/禁用受影响路线、留证并对账；不等待 trigger。文档不授予对外部无授权进程的控制权，也不清空 reservation |
| S3 不可能性/修复清单 | 采纳有限清单，限定推论 | 记录 config/adapter/public facade-or-equivalent/compatible version/authority-preserving correction 的候选、尝试/排除/不适用证据。失败次数不是无限空间不可能性证明；相关项未决或仅缺预算/权限时不能自动满足 T1。需要 adopted scope 内的独立结构性理由 |
| S4 反事后口径 | 采纳 | T4 的 limit、units/rates、cohort/denominator、统计方法、观察窗口必须在相关测量前冻结，并有排序证据 |
| S5 结构评审回执 | 采纳 | 复用 review receipt，显式区分 scientific action、architecture entry、contract revision 主题；绑定包/契约/profile/证据/修复矩阵/范围/成本/packet hash，保留独立 Session/provider/preset、实际完成与 qualified 角色来源。不同模型不是必需，也不等于强制独立 |
| S6 失效/见证消失 | 采纳并限定证明范围 | 变更被应用的 bound subject 或证据被新事实推翻要重新评估，不改旧历史。采纳后检查所有适用属性，并重跑原冻结见证/配对工作流/包络；记录测试范围内不再复现。要求修订是 supersession，不冒称修复了未改变的原见证；有限回归不证明永远不发生 |
| S7 T2/T3 判别 | 采纳 | T2 是某必需语义单独都缺失；T3 有相同 bound profile 内两侧独立成功、共同失败与互相破坏的修复见证。缺资料不得走较松分类；相关症状用单一 episode/primary classification，不重复记预算 |
| S8 临时禁用 | 采纳，禁止到期自启 | 每个 hold/disable 有 owner、reason/property、scope/evidence、exit/revisit 条件与复核期限。到期只是要求复核，不恢复执行或证明 T1；永久 unsupported 要明确前瞻决策，不隐瞒未满足义务 |

## 实际文档效果与资格边界

- [契约](../../docs/contracts.md)：新增 admission proof、reviewer holds、release schema authority、applicability evidence、requirement-review lane、repair/structural-review 和历史查询语义。
- [1604](../261111-1604-architecture-meta-loop-and-migration.md)：入口、修复矩阵、T2/T3、T4 口径、评审失效、原始见证回归和 hold 复核同步。
- [M1](../261105-1555-m1-minimal-contract-and-reuse.md) / [M2](../261105-1555-m2-skill-and-thin-helpers.md) / [M3](../261105-1555-m3-automatic-planning-and-review.md)：负责实际 provider/proof/schema/评审路径的后续实现。
- [M4](../261105-1555-m4-scientific-property-qualification.md)：新增分层自动化与强制语义评审、对应失败注入；[M6](../261105-1555-m6-new-work-cutover-and-continuity.md)验证适用属性和原见证，保持历史消费。
- [本轮校验](../review/261111-1808-contracts-review-validation.json)仅验证文档、引用、版本、属性 ID 与评审处置覆盖；不等于 native proof 或隐私/生命周期保证已经通过。

原中文评审保持为 2.0.0 输入，不覆盖其人类评语；本记录是独立回应。完整中文规范、运行时实现/资格、实际 legacy concordance 均不声称完成。

## User Prompts, Verbatim

~~~text
address local_artifacts/dsh-research/architecture-revision/contracts-human-review-zh.md
~~~

~~~text
doublecheck and address local_artifacts/dsh-research/architecture-revision/contracts-human-review-zh.md
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-11 18:15 -0800 | 逐项核验并处置 F-1–F-8、S1–S8；保留原评审与旧规范，记录 2.1.0 文档效果、限定与未完成资格。 |
