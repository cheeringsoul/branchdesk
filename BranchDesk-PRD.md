# BranchDesk — 产品需求文档（PRD）

> 版本 0.1.0 · 2026-10-31 · 状态：可供 AI Coding 执行的 MVP 基线

## 1. 产品概述

BranchDesk（暂定代号）是一款 **Git-first 轻量级桌面代码编辑器**。它提供接近 IntelliJ IDEA 的 Project / Editor / Commit / Git Log / Branches 体验，但不做 IDE 的语言智能、编译、调试和插件平台。主要面向使用 AI Coding 工具、经常需要检查外部代码修改的开发者。

核心原则：文件树是入口；文件可直接编辑；Git 状态一眼可见；Diff 与编辑可快速切换；Git 操作可靠、可恢复；本地优先，无账号与云端服务。

### 1.1 目标用户与场景
- 开发者无需打开重量级 IDE，即可浏览、修改并提交仓库文件。
- AI 或其他进程修改本地文件后，用户可快速定位修改位置、审查 Diff、修正后提交。
- 用户可通过图形化提交拓扑查看分支演化并执行 Checkout/Merge。
- 首发 macOS，代码结构兼容 Linux；Windows 后续再考虑。

### 1.2 成功标准
- 用户 30 秒内完成：打开仓库→找到变更文件→查看 Diff→编辑并保存。
- 不产生意外文件覆盖、未保存内容丢失或隐式破坏性 Git 操作。
- 在约 10,000 文件的仓库中可正常浏览；文件树按需加载，Git 查询与渲染不阻塞 UI。
- 首版不依赖后台服务器、账户系统或任何 AI API。

### 1.3 不在范围内
代码语义导航、LSP/智能补全、重构、编译、运行调试、终端模拟器、远程开发、Git 托管平台账号集成、内置 AI 助手、扩展插件生态、多人实时协作。

## 2. 用户界面与信息架构

主窗口由四个可调整区域构成：
1. 顶部工具栏：仓库名称、当前分支、打开目录、刷新、全局搜索入口。
2. 左侧 Project：目录树、Git 文件状态、创建/重命名/删除、过滤 Changed Files。
3. 中央 Editor：多标签文本编辑器、普通编辑/Diff 视图切换、未保存标记。
4. 底部工具窗口：Changes、Git Log、Branches（可收起、可调高度）。

布局默认：左侧 280px，中央自适应，底部 260px。记忆布局、最近仓库、最近文件。初版暗色主题，后续增加亮色主题。

### 2.1 关键交互
- 单击文件：预览；双击：固定标签；`⌘S` 保存；`⌘P` 按文件名打开；`⌘F` 当前文件搜索。
- 文件树中 Git 状态：M 修改、A 新增、D 删除、? 未跟踪、R 重命名、! 冲突；目录聚合后代状态。
- 点击已修改文件默认打开编辑器；右键 `Show Diff` 打开该文件 Diff；Diff 可回到 Editor。
- Changes 列表展示 staged/unstaged/untracked，点击时展示 Diff。
- Log 使用拓扑连线+提交列表+refs 标签；选择提交后显示文件变更详情。
- 分支菜单中的 Merge 始终显示方向 `Merge <source> into <current>`，禁止模糊的“Merge”。

## 3. 功能需求与验收标准

优先级：P0=首个可用切片；P1=MVP 必备；P2=下一迭代。

### F01 仓库管理（P0）
- 使用系统目录选择器打开本地路径。
- 检测普通仓库、子目录、bare repo 和 worktree；普通仓库允许打开子目录并定位根目录；bare repo 显示只读提示。
- 显示分支、HEAD 和 dirty 状态；记录最近仓库。
- 验收：非仓库目录提示可理解的错误；不存在路径/权限不足不崩溃。

### F02 文件树（P0）
- 文件夹懒加载、展开/折叠、按名称排序、隐藏 `.git` 元数据。
- 已修改文件和父目录有状态标识；尊重 Git 忽略规则，但允许切换显示隐藏文件。
- 文件操作（新建、重命名、删除）均更新 UI 与 Git 状态。
- 验收：10k 文件仓库的首次打开不需要一次性读完文件内容；目录不可访问时显示错误。

### F03 文件编辑（P0）
- Monaco 文本编辑器；语法高亮、行号、缩进、撤销/重做、查找、保存；多标签。
- 只允许在确认的仓库根目录内读写，阻止路径穿越；符号链接访问须重新验证规范化路径。
- 保留 UTF-8、LF/CRLF；二进制/超大文件默认只读提示；MVP 不保证任意编码无损保存。
- 编辑未保存时标签出现 `●`；关闭、切仓库、切分支前必须处理未保存内容。
- 验收：编辑→保存→重新打开内容一致；外部修改与未保存内容冲突时，禁止静默覆盖，给出 Reload / Keep Editor / Compare 选项。

### F04 Git 状态与变更查看（P0）
- 通过 `git status --porcelain=v2 -z --branch --untracked-files=normal` 获取结构化状态；正确解析重命名双路径、空格和特殊文件名；遵循 Git 以字节为单位的 -z 规则。
- 查询失败不得把上一次状态误显示成 CLEAN；显示刷新时间/错误。
- 从文件树或 Changes 面板打开已修改文件的 unstaged/staged Diff。
- 验收：修改、新建、删除、重命名、冲突都能区分；文件名含空格可正确处理。

### F05 Diff（P1）
- Monaco Diff Editor 左右对比，支持行内/左右模式切换与基本语法高亮。
- 支持 Working Tree vs Index、Index vs HEAD、Commit vs parent；新增/删除文件可查看。
- 大文件 Diff 可限流或降级为纯文本提示，不阻塞窗口。
- 验收：区分 staged 与 unstaged 内容；二进制文件不错误尝试文本解码。

### F06 Commit（P1）
- Staged/Unstaged/Untracked 分组，按文件 stage/unstage；输入 Commit Message，提交到当前分支。
- 提交前展示准确文件清单；暂不做行级暂存。
- Discard 必须显示目标路径、范围及不可逆警告；不能批量默认勾选破坏性操作。
- 验收：提交后 HEAD 更新；没有 staged 文件时禁用 Commit；失败时保留编辑内容和用户输入。

### F07 Git Log 和分支图（P1）
- 展示 commit DAG：带颜色的拓扑 lane、作者、时间、摘要、SHA、HEAD/本地/远程 refs、tags。
- 使用 `git log`/`git rev-list --parents` 等获取真实关系；可分批分页加载。
- Merge commit 有多个父边；支持从提交进入 files/diff。
- 验收：含并行分支、多次 Merge 的测试仓库中，连线反映真实父子关系；1000+ 提交滚动流畅。

### F08 分支与合并（P1）
- 列出本地/远程 refs；创建、切换、删除本地分支；Merge 到当前分支。
- 每次执行前明确显示源和目标、是否有未保存文件和未提交改动。
- 冲突后提供冲突列表、外部工具打开入口与 `Continue/Abort`；首次不要求实现 IDEA 的三方冲突编辑器。
- 验收：Merge 成功有明确结果；冲突不误标记成功；用户可以安全 Abort。

### F09 搜索（P2）
- `⌘P` 文件名模糊搜索；仓库内容搜索基于 ripgrep，结果显示路径/行号并支持跳转（仅跳到文本行，不涉及语义导航）。

### F10 设置（P2）
- 主题、字体、字号、缩进、自动保存（默认关）、文件类型忽略、Git 可执行文件路径、最近仓库。

## 4. 非功能需求

### 4.1 稳定性及安全
- Rust 层统一检查路径是否在仓库根目录，禁止任意 shell 拼接；子进程使用参数数组传值。
- Git 命令串行化写操作；每次命令带 repo root、超时/可取消状态，输出区分 stdout/stderr 和 exit code。
- 与外部进程并存：watcher 事件防抖；出现脏文档时保留编辑缓存并提示冲突。
- Git Hooks 会由 Git 在部分操作中执行：不得宣称执行 Git 命令是“沙箱安全”；后续可以做仓库信任提示。
- Rebase、reset --hard、clean 等高风险操作不在首个切片内。

### 4.2 性能目标（开发基准而非硬保证）
- 目标：10k 文件仓库打开 Project 初屏 <2 秒（典型 SSD 测试机）；状态刷新 <1 秒（典型仓库）。
- 文件树虚拟滚动；避免每次状态变化重挂 Monaco 或刷新全树。
- Git Log 默认一次加载 200–500 条；后台任务不可阻塞前端交互。
- 性能以 macOS 真机记录，结果写入 `docs/PERF.md`；不要在未经测量时宣称达到目标。

### 4.3 可访问性与平台
- 支持 macOS 常用快捷键、键盘导航和高 DPI；UI 文案首版英文，后续 i18n。
- Tauri 2 保留 Linux 可移植性，但首版只承诺 macOS 手工验收。

## 5. 技术方案

- Tauri 2 + Rust：本地文件 IO、路径权限校验、Git CLI 子进程、后台状态任务。
- React + TypeScript + Vite：界面与状态管理。
- Monaco Editor + DiffEditor：文本编辑/代码 Diff；不加载 LSP。
- Git CLI：使用 `--porcelain=v2 -z` 等稳定接口；对复杂二进制输出采取 Rust 字节解析。
- `notify`（第二切片）：文件系统监听；先以手动 Refresh 保证正确性。
- Git Graph：P1 自有 DAG lane 算法配合 SVG/Canvas 绘制；优先正确性和性能。

**模块边界**：React 仅通过类型化 `repoApi` 与 Tauri commands 通信；Git/FS/Editor 文档状态分别建模；Git commands 不直接散落在 React 组件内部。

## 6. 实施阶段

### M0 — 可运行基础工程（当前交付）
- 基础窗口、三栏布局、目录选择、仓库识别、文件夹列表、文件打开与保存、简易 Git 状态、手动 Refresh。
- UI 用 Monaco；数据读写走 Tauri Rust commands。
- **完成标准**：在 macOS 安装 Rust + Node 依赖后，能够 `npm run tauri dev` 运行；打开真实 Git 仓库并保存文件。

### M1 — 可靠的 Changes/Editor
- 状态颜色、完整 porcelain v2 -z 解析、Dirty tabs、文件外部修改检测、安全 Reload、基本 Diff。

### M2 — Commit/Log/Branches
- Stage、Commit、refs、Graph、Checkout、Merge、冲突结果展示。

### M3 — 打磨发布
- 虚拟化、大型仓库测试、快捷键、搜索、设置、安装打包、自动化 E2E/集成测试。

## 7. 测试矩阵
- 标准仓库：clean、modified、untracked、staged、deleted、renamed、merge conflict。
- 文件名：空格、中文、特殊字符；Windows 特定命名作为后续测试。
- 文件类型：UTF-8、CRLF、超大文件、二进制、无读权限、symlink。
- 生命周期：未保存时关闭标签/切换仓库/切换分支；外部修改同一文件；Git 写操作失败。
- 历史：线性、fork+merge、octopus merge、detached HEAD、worktree。
- 性能：10k 文件、5k commits、单次批量写入 100 个文件。

## 8. AI Coding 执行规则
1. 每个 Milestone 分成可单独验收的 PR；不可直接跳到高级 Git 功能。
2. 新命令必须有 Rust 端参数校验、错误建模和相应单元/集成测试。
3. 绝不在未提示的情况下覆盖脏文档、Discard、reset 或 checkout。
4. Git CLI 调用不使用 `sh -c`；必须使用 `Command::new("git").args([...])`。
5. 前端不自行解析无结构 Git 日志；跨边界类型统一在 `src/types.ts` 定义。
6. 每次变更执行 `npm run build`，Rust 环境可用时执行 `cargo check`，并记录无法验证项。
7. 优先功能可运行与测试覆盖，不为追求视觉效果增加复杂抽象。

## 9. 需要后续确认但不阻塞 M0 的决策
- 产品正式名称、图标、是否开源及许可证。
- Git Graph 默认显示全部 refs 还是当前分支相关提交。
- 是否支持同时打开多个仓库窗口。
- 自动保存默认关闭（当前建议）；binary、非 UTF-8 只读。
