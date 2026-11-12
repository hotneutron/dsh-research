# N8–N10 处理记录

创建：2026-11-11 20:31:48 -0800。当前规范：[docs/contracts.md](../../docs/contracts.md) 2.3.1，仍为 specified；无 runtime/provider 资格、原生覆盖测试、profile/state 迁移或云发布。

## 核验输入

[原始中文评审](../../local_artifacts/dsh-research/architecture-revision/contracts-human-review-zh.md) 保留未改，SHA-256 `bf4a3e69955c753d3d43fc49370f12b00757df2c9639545e61eb8f6263f9f8ec`。被评审 2.3.0 SHA-256 `681a105d83893f8fa956df1f98792544d86c9753a61d9c1520dbde5e4819f452` 与 `681a105d…` 一致；[原快照](../../local_artifacts/dsh-research/contract-history/261111-2030-reviewed-contract-2.3.0-681a105d8389.md)保留。

| 项目 | 处置 | 具体规则与限制 |
|---|---|---|
| N-8 摊销窗口脱钩 | 已修订 | 固定 accepted envelope_ref，包括窗口 W、分母 D、units/rates/ceiling/allocation；默认 H = W、分母为已接受 D。更长 H/更大分母必须另行前瞻评审与权限，且始终报告原 W/D 内 C_run+C_qual 和原 pass/fail。扩展分析通过不能覆盖原失败，不允许把付款移到窗口外或假设未来更多 workflow 来藏成本 |
| N-9 qualification hold | 已关联既有规则 | 预算/coverage 不足的 unqualified 路线必须记录 owner、受影响 profile/scope/cells、原因/证据、当前 budget/consumption、退出条件、下次事件/检查与复核期限。到期只复核，不授预算、不判 qualified；新计划/预算 proposal 不等于 exit 条件已经满足 |
| N-10 T4 表口径 | 已同步 | T4 证据列直接写 accepted envelope_ref/W/D、C_run 与 C_qual 分别及合计、原窗归因/结果，以及资格成本规则链接。1604/M1/M4/M6/追踪记录同步同一口径 |

## 判定与资格边界

更长 horizon 可以作为有独立审阅的额外经济性分析，但不改变原已接受包络。要真正改变 accepted envelope，必须走新要求/契约评审并保留旧结果。所有 hold 沿用已有 project/engineering authority，不新建 financial ledger；不把预算不足自动视为 T4 或科学耗尽。

[本轮校验](../review/261111-2030-N8-N10-validation.json)核验规范、引用、原评审/快照、版本与 ID、hold 字段和 T4 表关联。它不执行实际 budget、native trace 或 coverage 测量。

## User Prompt, Verbatim

~~~text
doublecheck and address N8-10 of local_artifacts/dsh-research/architecture-revision/contracts-human-review-zh.md
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-11 20:31:48 -0800 | 逐项处理 N8–N10，绑定原包络窗口/分母、qualification owned hold 与 T4 合计成本；保留评审及原规范、记录未执行资格。 |
