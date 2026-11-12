# 契约 2.1.0 复检残余的处理记录

创建：2026-11-11 19:01:22 -0800。当前规范：[docs/contracts.md](../../docs/contracts.md)，2.2.0，状态仍为 specified。本文只记录文档修订与核验；无 runtime、provider、fixture/live、profile/state 迁移或云发布执行。

## 核验输入

[原始人类评审 r5](../../local_artifacts/dsh-research/architecture-revision/contracts-human-review-zh.md) 保留未改，SHA-256 `9f283c3c4dd7d5560e38f8dae4ced38f0432c5c93076b6bf033325301fe890ff`。
被复检的契约 2.1.0 SHA-256 `089b8d9b6652f212cc6ae5b18d9f8a5f7bc25be817e0619f36fcbad1c14b2f96`，与评审所列 `089b8d9b…` 一致；[原字节快照](../../local_artifacts/dsh-research/contract-history/261111-1859-reviewed-contract-2.1.0-089b8d9b6652.md)保留。原 [2.1.0 处理记录](../review/261111-1808-contracts-human-review-resolution-zh.md) 和 [校验](../review/261111-1808-contracts-review-validation.json)保持其历史含义。

## N-1–N-3 与 F-8 的处置

| 项目 | 文档处置 | 判定依据与未完成部分 |
|---|---|---|
| N-1 applicability 示例 | 已修正 | 示例明确只指 DATA-2 的 enabled-release 前提在已批准 off profile 下不适用，并要求证据。DATA-1 在 off 模式仍适用，必须阻止受保护字节读取；不能据此排除 DATA-1 |
| N-2 更新时间 | 新 r5 按实际最后写入更新 | 当前 header 与 r5 使用最后内容写入的带时区秒级时间。2.1.0 的旧字节/旧时间异常保留，不回填造出历史一致性。验证回执自然晚于被验证文件，其自身时间/哈希独立记录；mtime 不作 native 因果排序证明 |
| N-3 声明范围覆盖 | 已定义可判定规则 | M1 先冻结 scope strata、性质/边界/模式/生命周期/故障/交互、case fixture 与预期断言；M4 要求全部必需 cell 有符合身份与 assurance 的观察且断言通过，无 failed/unresolved，N/A 有证据。不允许一小组正例外推到未覆盖范围 |
| F-8 残余 | 规范闭合，执行待完成 | 分层优先级继续保留；补入“每适用性质/stratum 正向+拒绝反例、每已知故障形状、边界各分支、支持的 off/on、生命周期和交互”的有限矩阵。计数是最低完整性条件，不是普遍/统计充分性证明。实际编码、case 设计执行与 provider 资格仍是 M1/M4 工作 |

## 覆盖完成的定义

- 每个适用性质/声明 stratum 至少一个 satisfying 与一个 controlled rejecting-witness case；已列出的不同故障形状分别覆盖。
- claimed L/F 边界覆盖成功及相关拒绝/挂起/重放分支；每个声明支持的 mode 有 guard case。
- 初始 confirmation-off 不要求虚构 on-mode 实机资格；DATA-1 的 off guard 是必需，DATA-2 的 N/A 要留前提证明。M5 既有反馈要求不能被排除。
- 声明的恢复、未知派发、停止/到期、迁移及交互风险需要 cell。一个 execution 可以支持多个 cell，但每个断言/观察要明确关联。
- 负向测试通过表示违规被正确拒绝/挂起；接受违规是 fail，不是“成功观察到了反例”。
- 完成只针对冻结 matrix 与目标 assurance；fixture 不能代替 live。新见证要扩展/重开计划；缩范围需前瞻新评审并保留旧失败。

## 既有复检结论

原 r5 表中的 F-1–F-7 与 S1–S8 文档关闭结论不重开，也不解释为代码保证。F-2 继续撤销；完整中文规范仍按真实受众需要另行提供。实际 legacy query concordance 没有新案例输入，仍不编造映射。

[本轮校验](../review/261111-1859-contracts-review-r5-validation.json)记录当前性质/阶段 ID、文件引用、输入快照/原评审、更新时间及 matrix 规则检查。scope/case 的实际 qualification 尚未执行，不能报覆盖率为 100%。

## User Prompt, Verbatim

~~~text
doublecheck and address local_artifacts/dsh-research/architecture-revision/contracts-human-review-zh.md again
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-11 19:01:22 -0800 | 逐项处理评审 r5 N-1–N-3 与 F-8 残余；保留旧输入/时间异常和既有关闭记录，明确 2.2.0 文档效果及未执行资格。 |
