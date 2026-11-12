# N4–N7 处理记录

创建：2026-11-11 20:22:19 -0800。当前规范：[docs/contracts.md](../../docs/contracts.md) 2.3.0，状态 specified；无实现/provider/fixture/live 资格或运行 profile/state 迁移。

## 评审与核验范围

[原人类评审 r6](../../local_artifacts/dsh-research/architecture-revision/contracts-human-review-zh.md) 原字节不改，SHA-256 `4d8e58b115622b530e8d3356724476a712925650000ab664f5ff465e340520d6`。被评审的 2.2.0 SHA-256 `ef684ac90fc50186f32d6a6f020044212416b9d061527608a1bce7732b2b1e32` 与 `ef684ac9…` 一致，[快照](../../local_artifacts/dsh-research/contract-history/261111-2020-reviewed-contract-2.2.0-ef684ac90fc5.md)保留。既有 N1–N3/F8 关闭与 23 个性质、L/F 阶段不改号。

| 项目 | 处置 | 依据与限定 |
|---|---|---|
| N-4 新义务/兼容性 | 已修订规范说明 | 2.2.0 的覆盖矩阵是新增强制义务，不仅措辞澄清；2.3.0 增加资格预算与归因义务。文档编辑不执行 runtime/schema/state 迁移，故本任务执行影响为零。仓库没有已实现 mapping 或运行 adoption 证据，不据此宣称外部 profile 影响为零；M1/M6 仍需编码、清点、兼容性和适用新评审 |
| N-5 资格成本/T4 | 已加入预算与归因规则 | M1 冻结资格 budget owner、cell 与实际 execution 数、setup/review/capture/storage 成本、units/rates、retry/failure reserve、总额及窗口。C_qual 纳入包协调 C_run+C_qual，科学验证 C_science 分开；同一物理成本只记一次，窗口/分母/摊销提前冻结。预算不足不得扩支出、删失败 cell 或冒称覆盖完成 |
| N-6 r4 时间异常 | 明确标注，保留原数值 | 单独的 Recorded historical timestamp anomaly 段点名 r4 的 `18:08`，对应旧 2.1.0 已记录 mtime `18:19:52.459747`，链接冻结上下文。旧行与旧快照不回写；r4 不作为最终写入/因果证明。新 header/修订行使用真实最终写入，校验随后单独记录 |
| N-7 README 旧修订 | 已补当前记录 | README 当前正文链接 2.3.0，并追加最新修订；原 r6 描述 2.1.0 的历史事实保留，未伪改成后来的版本。简短 branching 段与 Mermaid 未改 |

## 预算的具体界限

资格化指 dsh-research/provider 契约一致性，不是项目的科学 validation/replication/final confirmation。使用同一个 domain evaluator 不改变开销目的：contract fixture 是 C_qual；只复用既有科学 trace 不二次计原科学执行，仅计分析。现有原生计费/项目 authority 保持唯一，不新建平行财务账本。

覆盖矩阵是适用 cell 的显式并集，不自动做全维度笛卡尔积。可共享一次执行的观察，但每个 cell 的断言/assurance 要单独成立。预算超限首先是计划/运维问题；T4 仍需材料性、架构成因和局部优化不充分。稳态 C_run 与窗口总 C_run+C_qual 均诚实报告，改变/迁移/资格重叠凭 work ID 和预声明分摊避免重复。

## 实际效果与待完成部分

[本轮校验](../review/261111-2020-N4-N7-validation.json)仅核验文档、源 hash、版本/引用、成本字段与历史保留。预算估计、执行和 native/provider 保证未完成；不凭本文件启动任何 qualification 或科学任务。

## User Prompt, Verbatim

~~~text
doublecheck and address N4-7 of local_artifacts/dsh-research/architecture-revision/contracts-human-review-zh.md
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-11 20:22:19 -0800 | 处置 N4–N7，记录新增义务、限定兼容性影响、资格预算/T4、r4 异常和 README 当前版本；保留原评审与旧规范。 |
