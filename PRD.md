# VibeBase - 产品需求文档 (PRD)

## 文档信息

| 项目 | 内容 |
|------|------|
| **项目名称** | VibeBase |
| **版本** | v1.0 (MVP) |
| **状态** | Draft / Planning |
| **Slogan** | Version your vibe, scale your base. |
| **类型** | Open Source Desktop Application (Local-First) |
| **核心理念** | Git-Native, Local Execution, Environment Management |

---

## 1. 背景与愿景 (Background & Vision)

### 1.1 问题陈述 (Problem)

随着 LLM 应用的爆发，Prompt Engineering 正在演变为 Prompt Ops。目前开发者面临三大痛点：

- **管理混乱**：Prompt 散落在代码字符串、Excel 或 Notion 中，缺乏统一视图。
- **协作困难**：无法进行版本控制（Git），无法进行 Code Review，修改 Prompt 容易破坏线上代码。
- **评测缺失**：缺乏系统性的测试（Eval），每次修改只能靠"肉眼看"，不敢轻易上线新模型。

### 1.2 产品愿景 (Vision)

VibeBase 旨在打造 **Prompt 领域的 VS Code + Postman**。它是一个本地优先（Local-First）的 Prompt IDE，利用开发者熟悉的 Git 作为后端存储，提供类似于 Paw/RapidAPI 的环境管理和动态变量体验，并内置强大的 Level 3 AI 评测系统。

### 1.3 竞品分析 (Competitive Analysis)

#### 云端方案：LangSmith / PromptLayer / Helicone

**核心定位**：基于云端的 Prompt 管理与监控平台

**优势**：
- 团队协作友好，多人实时查看运行数据
- 强大的监控与分析能力（成本、延迟、错误率）
- 与 LangChain 等框架深度集成

**劣势**：
- 需要上传所有 Prompt 和运行数据到云端，存在隐私风险
- 依赖网络连接，无法离线工作
- 通常采用 SaaS 订阅模式，存在成本门槛
- Prompt 版本管理依赖平台自身系统，难以与现有 Git 工作流整合

**VibeBase 差异化**：
- **本地优先**：所有数据存储在本地，无需上传敏感信息
- **Git-Native**：直接使用 Git 进行版本控制，与开发者工作流无缝衔接
- **零成本启动**：开源免费，无需订阅费用

---

#### IDE 内嵌方案：Cursor / Continue.dev

**核心定位**：集成在代码编辑器中的 AI 助手

**优势**：
- 与编码环境紧密集成，上下文感知能力强
- 即时反馈，无需切换工具
- 适合快速原型开发

**劣势**：
- Prompt 管理能力薄弱，缺乏结构化组织
- 没有专门的测试与评测功能
- 不支持环境隔离（Dev/Prod）
- 难以进行批量测试和对比分析

**VibeBase 差异化**：
- **独立 IDE**：专注于 Prompt 工程，提供完整的测试、评测、版本管理能力
- **批量评测**：支持数据集驱动的 Matrix 测试，系统化验证 Prompt 质量
- **环境管理**：支持多环境配置，安全地在不同模型间切换
- **Git 原生集成**：内置 Git 工作流（Commit, Pull, Push），无需切换到 Terminal

---

#### 单次测试工具：OpenAI Playground / Claude Web UI

**核心定位**：官方提供的在线测试工具

**优势**：
- 简单直观，无需配置
- 官方支持，稳定可靠
- 适合快速实验

**劣势**：
- 仅支持单次运行，无法批量测试
- 没有版本控制和历史记录
- 无法导出为代码或集成到项目中
- 不支持自定义评测标准

**VibeBase 差异化**：
- **批量测试**：支持 CSV/JSON 数据集，一键运行数百个测试用例
- **版本控制**：每次修改都可追溯，支持 Git Commit 和 Tag
- **代码集成**：实时生成 SDK 代码，一键复制到业务项目
- **AI 裁判系统**：自动化评测，无需人工逐一检查

---

#### 核心差异化总结

| 维度 | LangSmith | Cursor/Continue | OpenAI Playground | VibeBase |
|------|-----------|-----------------|-------------------|----------|
| **数据隐私** | 云端存储 ⚠️ | 本地 ✓ | 云端存储 ⚠️ | 本地优先 ✓✓ |
| **版本控制** | 平台内置 | 无 ❌ | 无 ❌ | Git-Native ✓✓ |
| **私有仓库** | 支持 ✓ | 无 ❌ | 无 ❌ | 完整支持 ✓✓ |
| **批量测试** | 支持 ✓ | 无 ❌ | 无 ❌ | Matrix 运行 ✓✓ |
| **AI 评测** | 基础支持 | 无 ❌ | 无 ❌ | Level 3 Judge ✓✓ |
| **环境管理** | 支持 ✓ | 无 ❌ | 无 ❌ | Paw-like ✓✓ |
| **成本** | 订阅制 💰 | 部分免费 | 免费 ✓ | 开源免费 ✓✓ |
| **离线能力** | 无 ❌ | 有 ✓ | 无 ❌ | 完全离线 ✓✓ |

**VibeBase 的四大核心优势**：
1. **Git-Native**：将 Prompt 视为代码资产，利用成熟的 Git 工作流进行版本管理和协作
   - 内置完整 Git 工作流（Commit, Pull, Push, Branch）
   - **AI 生成 Commit Message**，提高提交质量和效率
2. **本地优先**：保护数据隐私，支持离线工作，无需担心云端服务稳定性
3. **强评测系统**：内置 Matrix 测试和 AI Judge，系统化保障 Prompt 质量
4. **AI 增强开发体验**：不仅是 Prompt IDE，更是 AI-powered IDE
   - AI 生成 Commit Message
   - 智能变量推断（P2）
   - 未来：AI 辅助 Prompt 优化建议

---

## 2. 用户画像 (User Personas)

### P1: AI 工程师 (The Builder)

- **关注点**：Prompt 如何集成到代码中、版本控制、API 稳定性、SDK 易用性。
- **核心行为**：在 IDE 调试 Prompt，导出 SDK 代码，通过 CI/CD 部署。

### P2: Prompt 工程师 (The Tuner)

- **关注点**：调试效果、对比不同模型输出、批量跑测试用例（数据集）。
- **核心行为**：编写 Prompt，调整 System Message，运行大规模评测矩阵。

---

## 3. 核心功能范围 (Scope)

### 3.1 核心模块架构

产品由三个部分组成：

1. **Vibe Studio (Client)**: 基于 Tauri + React 的桌面客户端 (macOS/Windows)。
2. **Vibe Format (Protocol)**: 基于 YAML 的文件协议，实现逻辑与数据分离。
3. **Vibe SDK (Integration)**: Python/Node.js 库，用于在业务代码中加载 Prompt。

### 3.2 优先级排序 (MoSCoW)

| 优先级 | 功能模块 | 描述 |
|--------|----------|------|
| **P0 (Must-have)** | 文件系统监听 | 自动扫描本地文件夹中的 `.vibe.yaml` 文件。 |
| **P0** | 结构化编辑器 | 支持 System/User 分块，支持 `{{variable}}` 语法高亮。 |
| **P0** | 执行引擎 | 本地直连 OpenAI/Anthropic API，支持流式输出。 |
| **P0** | 环境管理 | 类似 Paw，支持切换 Dev/Prod 环境（自动替换 Model/Key）。 |
| **P1 (Should-have)** | 测试矩阵 | 引入 CSV 数据集，批量运行测试，表格展示结果。 |
| **P1** | AI 裁判 (Level 3) | 引用另一个 Prompt 作为裁判，自动打分。 |
| **P1** | SDK 集成 | Python SDK 读取本地 YAML 并执行。 |
| **P1** | AI 生成 Commit Message | 使用 LLM 自动生成高质量的 Git 提交消息。 |
| **P1** | Git 私有仓库支持 | SSH 和 HTTPS 认证，支持 GitHub/GitLab/Bitbucket 等平台的私有仓库。 |
| **P2 (Could-have)** | 引用/链式调用 | 在 Prompt 中引用另一个 Prompt 的结果。 |

---

## 4. 详细功能需求 (Functional Requirements)

### 4.1 项目与文件管理 (Project & Files)

- **FR-01 打开项目**：用户选择一个本地文件夹作为 Workspace。
- **FR-02 文件树导航**：左侧栏显示项目结构，自动过滤出 `.vibe.yaml` 和测试数据文件（`.csv`, `.json`）。
- **FR-03 双向同步**：
  - 在 VibeBase 中修改保存 → 自动写入硬盘文件。
  - 在 VS Code 中修改文件 → VibeBase 界面自动刷新（File Watcher）。

### 4.2 编辑器体验 (The Editor)

- **FR-04 块状编辑**：将 Prompt 分为 System, User, Assistant (Few-shot) 不同的可折叠块。
- **FR-05 动态变量 (Smart Pills)**：
  - 检测到 `{{user_name}}` 语法时，渲染为彩色胶囊。
  - 点击胶囊可绑定到测试数据集的特定列。
- **FR-06 环境切换 (Environments)**：
  - 顶部下拉菜单：OpenAI Prod, Local Llama, Anthropic Dev。
  - 切换环境时，全局替换 Base URL, API Key, Model Name。

### 4.3 评测与测试 (Evaluation & Matrix)

- **FR-07 数据集链接**：在 Prompt 配置中指定测试数据源（`test_data: ./tests/refund.csv`）。
- **FR-08 矩阵运行 (The Matrix Run)**：
  - 点击 "Run All Tests"。
  - 并发执行所有测试用例。
  - 底部面板展示表格：Input Vars | Model Output | Latency | Cost。
- **FR-09 AI 裁判 (LLM-as-a-Judge)**：
  - 支持配置 Evaluator。
  - 逻辑：执行完目标 Prompt 后，自动执行裁判 Prompt，将 `{{output}}` 作为输入传给裁判。
  - 结果展示：在矩阵表格中增加 Score 和 Reasoning 列。

### 4.4 集成与交付 (Integration)

- **FR-10 代码生成**：右侧栏提供 "Code Snippet" 面板，实时生成 Python/JS 调用代码。
- **FR-11 标签系统**：支持给当前的 Prompt 版本打 Git Tag（需调用本地 Git 命令）。

### 4.5 Git 版本控制 (Git Integration)

作为 Git-Native 工具，VibeBase 内置基础的 Git 操作，让 Prompt 管理与代码版本控制无缝集成。

- **FR-12 Git 状态监控**：
  - 实时显示当前工作区的 Git 状态
  - 显示未提交的文件数量（Modified / Untracked）
  - 在文件树中标记文件状态（M = Modified, U = Untracked, A = Added）
  - 显示当前分支和远程同步状态

- **FR-13 提交更改（Commit）**：
  - 类似 VS Code 的 Source Control 面板
  - 选择要提交的文件（Staging）
  - 输入 Commit Message（支持多行）
  - **AI 生成 Commit Message**：
    - 点击 [✨ AI Generate] 按钮自动生成
    - 使用配置的环境/模型（`source_control.commit_message_model`）
    - 支持多种风格：Conventional Commits / 详细描述 / 简洁
    - 支持多语言：根据 locale 自动选择或手动指定
    - 实时预览，可编辑，可重新生成
  - 支持 Conventional Commits 提示（feat:, fix:, docs: 等）
  - 一键提交到本地仓库

- **FR-14 拉取更新（Pull）**：
  - 从远程仓库拉取最新更新
  - 自动检测冲突并提示用户
  - 如果有冲突，显示冲突文件列表
  - 支持 Pull with Rebase / Pull with Merge

- **FR-15 推送更改（Push）**：
  - 推送本地提交到远程仓库
  - 显示待推送的 Commit 数量
  - 支持强制推送（需二次确认）
  - 推送前自动检查远程是否有新提交

- **FR-16 分支管理**：
  - 查看当前分支
  - 切换分支（Checkout）
  - 创建新分支
  - 合并分支（基础支持）
  - 显示分支列表和最近提交

- **FR-19 私有仓库支持**：
  - **SSH 密钥认证**：
    - 自动检测系统 SSH 密钥（`~/.ssh/id_rsa`, `~/.ssh/id_ed25519`）
    - 支持自定义 SSH 密钥路径
    - SSH 密钥密码管理（存储在 OS Keychain）
    - 支持 SSH Agent
  - **HTTPS 凭据管理**：
    - 支持用户名/密码认证
    - 支持 Personal Access Token (PAT)
    - 凭据存储在 OS Keychain（安全）
    - 支持 Git Credential Helper
  - **多平台支持**：
    - GitHub（公有/私有仓库）
    - GitLab（自托管/云端）
    - Bitbucket
    - Azure DevOps
    - Gitee（码云）
    - 企业内网 Git 服务器
  - **认证状态检测**：
    - 自动检测 Remote 是否需要认证
    - Pull/Push 失败时提示配置凭据
    - 显示认证状态（已认证 ✓ / 需要配置 ⚠️）

- **FR-17 冲突解决**：
  - 检测到冲突时，高亮显示冲突文件
  - 提供简单的冲突解决 UI（Accept Theirs / Accept Ours / Manual Edit）
  - 对于 `.vibe.yaml` 文件，提供并排对比视图
  - 解决冲突后自动完成合并提交

- **FR-18 提交历史与对比**：
  - 查看当前文件的 Git 历史
  - 对比任意两个 Commit
  - 查看某个 Commit 的完整变更（Diff）
  - 支持 Checkout 到历史版本（只读模式）

---

## 5. 数据协议规范 (Data Protocol)

### 5.1 Prompt 定义 (`*.vibe.yaml`)

这是 VibeBase 的核心资产格式，采用逻辑与数据分离的设计。

```yaml
schema: "v1"
name: "Refund Reply"
description: "处理退款请求的标准回复"

# 1. 默认模型配置 (可被环境覆盖)
config:
  provider: openai
  model: gpt-4-turbo
  parameters:
    temperature: 0.5

# 2. 测试数据引用 (分离设计)
test_data: "../../tests/refund_cases.csv"

# 3. 提示词逻辑
messages:
  - role: system
    content: "You are a helpful customer support agent."
  - role: user
    content: |
      Client: {{customer_name}}
      Order: {{order_id}}
      Reason: {{refund_reason}}
      
      Write a refund email.

# 4. 评测配置
evaluation:
  - name: "Politeness Check"
    type: llm_judge
    ref: "../judges/politeness.vibe.yaml" # 引用裁判 Prompt
```

### 5.2 项目配置 (`vibe.config.yaml`)

用于定义环境变量和全局设置。

```yaml
project_name: "My AI App"

# 默认语言设置（支持 i18n）
locale: "zh-CN"  # zh-CN (简中) | zh-TW (繁中) | en-US (英文) | ja-JP (日语)

# 主题设置
theme: "system"  # system (跟随系统) | light (亮色) | dark (暗色)

# Source Control 设置
source_control:
  auto_generate_commit_message: true  # 是否自动生成 Commit Message
  commit_message_model: "production"  # 使用哪个环境的模型生成（引用 environments 中的配置）
  commit_message_style: "conventional"  # conventional (Conventional Commits) | detailed (详细描述) | simple (简洁)
  commit_message_language: "auto"  # auto (跟随 locale) | zh-CN | en-US
  
# 环境配置
environments:
  production:
    provider: openai
    api_key_env_var: "OPENAI_API_KEY_PROD" # 从系统环境变量读取，不硬编码
    model: "gpt-4o"
    parameters:
      temperature: 0.7
  
  production_via_openrouter:
    provider: openrouter
    api_key_env_var: "OPENROUTER_API_KEY"
    model: "openai/gpt-4o"  # OpenRouter 格式: provider/model
    base_url: "https://openrouter.ai/api/v1"
    parameters:
      temperature: 0.7
  
  deepseek_prod:
    provider: deepseek
    api_key_env_var: "DEEPSEEK_API_KEY"
    model: "deepseek-chat"
    base_url: "https://api.deepseek.com/v1"
    parameters:
      temperature: 0.7
  
  local_dev:
    provider: ollama
    model: "llama3:70b"
    base_url: "http://localhost:11434/v1"
    # Ollama 本地模型无需 API Key
```

#### 提供商与模型命名规范

VibeBase 支持多种 LLM 提供商，为了清晰区分，采用以下命名规范：

**1. 标准提供商（直连）**

| 提供商 | Provider 值 | 模型格式 | 示例 |
|--------|-------------|----------|------|
| OpenAI | `openai` | 官方模型名 | `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo` |
| Anthropic | `anthropic` | 官方模型名 | `claude-3-opus-20240229`, `claude-3-sonnet-20240229` |
| DeepSeek | `deepseek` | 官方模型名 | `deepseek-chat`, `deepseek-coder` |
| Ollama | `ollama` | 模型:标签 | `llama3:70b`, `mixtral:8x7b`, `qwen:14b` |

**2. 聚合提供商（通过中间层）**

| 提供商 | Provider 值 | 模型格式 | 示例 |
|--------|-------------|----------|------|
| OpenRouter | `openrouter` | `provider/model` | `openai/gpt-4o`, `anthropic/claude-3-opus`, `meta-llama/llama-3-70b` |
| Azure OpenAI | `azure_openai` | 部署名称 | `my-gpt4-deployment` |

**UI 显示规范**

在 VibeBase 界面中，环境名称和模型信息应清晰显示：

```
环境选择下拉菜单：
┌────────────────────────────────────────┐
│ Production (OpenAI)                    │
│  └─ GPT-4o                             │
├────────────────────────────────────────┤
│ Production via OpenRouter (OpenRouter) │
│  └─ OpenAI/GPT-4o                      │
├────────────────────────────────────────┤
│ DeepSeek Production (DeepSeek)         │
│  └─ deepseek-chat                      │
├────────────────────────────────────────┤
│ Local Dev (Ollama)                     │
│  └─ llama3:70b                         │
└────────────────────────────────────────┘
```

**配置示例：多提供商场景**

```yaml
environments:
  # OpenAI 官方
  openai_gpt4:
    name: "OpenAI GPT-4o"  # 可选，用于 UI 显示
    provider: openai
    model: "gpt-4o"
    api_key_env_var: "OPENAI_API_KEY"
  
  # OpenRouter 转发（更便宜，但有延迟）
  openrouter_gpt4:
    name: "OpenRouter GPT-4o (Backup)"
    provider: openrouter
    model: "openai/gpt-4o"
    api_key_env_var: "OPENROUTER_API_KEY"
    base_url: "https://openrouter.ai/api/v1"
  
  # Claude 官方
  anthropic_opus:
    name: "Claude 3 Opus"
    provider: anthropic
    model: "claude-3-opus-20240229"
    api_key_env_var: "ANTHROPIC_API_KEY"
  
  # OpenRouter 转发 Claude
  openrouter_opus:
    name: "OpenRouter Claude Opus"
    provider: openrouter
    model: "anthropic/claude-3-opus"
    api_key_env_var: "OPENROUTER_API_KEY"
    base_url: "https://openrouter.ai/api/v1"
  
  # DeepSeek（国内）
  deepseek:
    name: "DeepSeek Chat"
    provider: deepseek
    model: "deepseek-chat"
    api_key_env_var: "DEEPSEEK_API_KEY"
    base_url: "https://api.deepseek.com/v1"
  
  # 本地 Ollama
  local_llama:
    name: "Local Llama 3 70B"
    provider: ollama
    model: "llama3:70b"
    base_url: "http://localhost:11434/v1"
```

**Arena 模式中的显示**

在模型对比模式中，清晰区分来源：

```
┌─ Model Arena ─────────────────────────────────────┐
│ 选择要对比的模型：                                 │
│                                                   │
│ ☑ GPT-4o (OpenAI Direct)                         │
│ ☑ GPT-4o (via OpenRouter)                        │
│ ☑ Claude 3 Opus (Anthropic Direct)               │
│ ☐ Claude 3 Opus (via OpenRouter)                 │
│ ☑ DeepSeek Chat (DeepSeek)                       │
│ ☐ Llama 3 70B (Local Ollama)                    │
│                                                   │
│ 💡 提示: 相同模型通过不同提供商可能有性能差异       │
│                                                   │
│ [Run Arena] [Cancel]                              │
└───────────────────────────────────────────────────┘
```

### 5.3 测试数据格式规范

VibeBase 支持两种测试数据格式：CSV（简单场景）和 JSON（复杂场景）。

#### CSV 格式（推荐用于简单变量）

适用于变量类型为简单字符串的场景。第一行为变量名（Header），后续每行为一个测试用例。

```csv
customer_name,order_id,refund_reason,expected_tone
John Doe,#12345,Defective product,apologetic
Jane Smith,#67890,Changed mind,understanding
Bob Johnson,#11111,Late delivery,sympathetic
```

**使用规则**：
- 第一行必须是变量名，需与 Prompt 中的 `{{variable}}` 完全匹配
- 支持逗号、分号作为分隔符（自动识别）
- 支持引号包裹字段（处理包含分隔符的内容）
- 可包含 `expected_*` 列用于 Level 2 评测（如 `expected_tone`, `expected_contains`）

#### JSON 格式（支持复杂数据结构）

适用于需要嵌套对象、数组或复杂数据类型的场景。

```json
{
  "test_cases": [
    {
      "id": "case_001",
      "description": "处理缺陷产品退款请求",
      "variables": {
        "customer_name": "John Doe",
        "order_id": "#12345",
        "order_history": ["#12345", "#11111", "#09876"],
        "customer_tier": "premium",
        "refund_reason": "Defective product"
      },
      "expected": {
        "contains": ["refund", "apology", "replacement"],
        "not_contains": ["reject", "deny"],
        "sentiment": "positive",
        "max_length": 500
      },
      "metadata": {
        "priority": "high",
        "category": "defect"
      }
    },
    {
      "id": "case_002",
      "description": "处理改变主意的退款请求",
      "variables": {
        "customer_name": "Jane Smith",
        "order_id": "#67890",
        "order_history": ["#67890"],
        "customer_tier": "standard",
        "refund_reason": "Changed mind"
      },
      "expected": {
        "contains": ["policy", "understanding"],
        "sentiment": "neutral"
      }
    }
  ]
}
```

**JSON Schema 定义**：

```typescript
interface TestDataJSON {
  test_cases: TestCase[];
}

interface TestCase {
  id: string;                          // 测试用例唯一标识
  description?: string;                // 用例描述
  variables: Record<string, any>;      // 变量字典（支持任意 JSON 类型）
  expected?: ExpectedOutput;           // 期望输出（用于自动化评测）
  metadata?: Record<string, any>;      // 元数据（不传递给 Prompt）
}

interface ExpectedOutput {
  contains?: string[];                 // 必须包含的关键词
  not_contains?: string[];             // 不能包含的关键词
  regex?: string;                      // 正则匹配
  sentiment?: "positive" | "negative" | "neutral";
  min_length?: number;                 // 最小字符数
  max_length?: number;                 // 最大字符数
  json_schema?: object;                // 如果输出是 JSON，验证其结构
}
```

**使用场景对比**：

| 场景 | 推荐格式 | 理由 |
|------|----------|------|
| 简单文本变量 | CSV | 易于编辑，Excel 兼容 |
| 包含数组/对象 | JSON | 支持复杂数据结构 |
| 需要详细测试元数据 | JSON | 支持 `expected` 和 `metadata` |
| 团队协作编辑 | CSV | 非技术人员友好 |
| 程序化生成测试数据 | JSON | 易于脚本生成 |

---

### 5.4 评测器（Judge）格式

评测器（Judge）是一种特殊的 Prompt 文件，用于对其他 Prompt 的输出进行质量评分。

#### 基础评测器示例

```yaml
schema: "v1"
type: judge
name: "Politeness Evaluator"
description: "评估客户服务回复的礼貌程度"

# 评测器也需要模型配置
config:
  provider: openai
  model: "gpt-4-turbo"
  parameters:
    temperature: 0.2  # 评测器应使用较低温度以保证一致性

# 评测 Prompt
messages:
  - role: system
    content: |
      You are an expert in evaluating customer service responses.
      Your task is to rate the politeness of responses on a scale of 1-10.
      
      Scoring criteria:
      - 1-3: Rude or dismissive
      - 4-6: Neutral, functional but cold
      - 7-8: Polite and professional
      - 9-10: Exceptionally warm and empathetic
      
      You MUST respond with valid JSON only.
  
  - role: user
    content: |
      Please evaluate the following customer service response:
      
      ---
      {{target_output}}
      ---
      
      Respond with JSON in this exact format:
      {
        "score": <number between 1-10>,
        "reasoning": "<brief explanation>",
        "suggestions": "<optional improvement suggestions>"
      }

# 输出解析配置
output_parser:
  type: json
  schema:
    score: number
    reasoning: string
    suggestions: string?
  
  # 如果解析失败的处理策略
  on_error: "fail"  # "fail" | "skip" | "retry"
```

#### 多维度评测器

```yaml
schema: "v1"
type: judge
name: "Multi-Dimension Evaluator"
description: "多维度评估：准确性、语气、简洁性"

config:
  provider: openai
  model: "gpt-4-turbo"
  parameters:
    temperature: 0.1

messages:
  - role: system
    content: |
      You are evaluating customer service responses across multiple dimensions.
      Rate each dimension from 1-10 and provide an overall score.
  
  - role: user
    content: |
      Original Request:
      {{original_input}}
      
      Response to Evaluate:
      {{target_output}}
      
      Evaluate on these dimensions:
      1. Accuracy: Does it correctly address the request?
      2. Tone: Is the tone appropriate and professional?
      3. Clarity: Is the response clear and easy to understand?
      4. Completeness: Does it provide all necessary information?
      
      Respond in JSON:
      {
        "accuracy": <1-10>,
        "tone": <1-10>,
        "clarity": <1-10>,
        "completeness": <1-10>,
        "overall": <1-10>,
        "reasoning": "<explanation>"
      }

output_parser:
  type: json
  schema:
    accuracy: number
    tone: number
    clarity: number
    completeness: number
    overall: number
    reasoning: string
```

#### 比较式评测器（A/B 测试）

```yaml
schema: "v1"
type: judge
name: "Comparison Judge"
description: "对比两个输出，选择更好的一个"

config:
  provider: anthropic
  model: "claude-3-opus"
  parameters:
    temperature: 0.0

messages:
  - role: user
    content: |
      Compare these two responses to the same customer request:
      
      **Response A:**
      {{output_a}}
      
      **Response B:**
      {{output_b}}
      
      Which response is better overall? Consider:
      - Helpfulness
      - Professionalism
      - Completeness
      
      Respond in JSON:
      {
        "winner": "A" or "B",
        "confidence": <0-1>,
        "reasoning": "<explanation>"
      }

output_parser:
  type: json
  schema:
    winner: string
    confidence: number
    reasoning: string
```

#### Level 2 评测（非 LLM）

除了 LLM-based Judge，VibeBase 也支持基于规则的评测：

```yaml
schema: "v1"
type: judge
name: "Keyword Checker"
description: "检查输出是否包含必需的关键词"

# Level 2 评测不需要 LLM
evaluations:
  - name: "Contains Required Keywords"
    type: contains
    keywords: ["refund", "policy", "business days"]
    all_required: true  # true: 需全部包含, false: 包含任一即可
  
  - name: "Does Not Contain Forbidden Words"
    type: not_contains
    keywords: ["stupid", "idiot", "impossible"]
  
  - name: "Length Check"
    type: length
    min: 50
    max: 500
  
  - name: "Regex Pattern"
    type: regex
    pattern: "\\b\\d{1,2} (business|working) days\\b"
    description: "Must mention specific timeframe"
```

#### 评测器使用方式

在 Prompt 文件中引用评测器：

```yaml
schema: "v1"
name: "Refund Reply"
# ... 其他配置 ...

evaluation:
  - name: "Politeness Check"
    type: llm_judge
    ref: "../judges/politeness.vibe.yaml"
    weight: 1.0  # 权重（用于综合评分）
  
  - name: "Multi-Dimension"
    type: llm_judge
    ref: "../judges/multi_dimension.vibe.yaml"
    weight: 2.0
  
  - name: "Keyword Check"
    type: llm_judge
    ref: "../judges/keyword_checker.vibe.yaml"
    weight: 0.5
```

执行时，VibeBase 会：
1. 先执行目标 Prompt
2. 将输出（`target_output`）传递给每个评测器
3. 收集所有评分和反馈
4. 计算加权平均分（如果指定了 weight）
5. 在 Matrix 表格中展示结果

---

### 5.5 变量系统高级特性

#### 变量类型定义

在 Prompt 文件中可以声明变量类型和默认值：

```yaml
schema: "v1"
name: "Advanced Prompt"

variables:
  customer_name:
    type: string
    required: true
    description: "客户姓名"
  
  order_count:
    type: number
    default: 1
    min: 1
    max: 100
  
  is_premium:
    type: boolean
    default: false
  
  tags:
    type: array
    items: string
    default: []

messages:
  - role: user
    content: |
      Customer: {{customer_name}}
      Orders: {{order_count}}
      Premium: {{is_premium}}
      Tags: {{tags}}
```

#### 变量转换函数

在变量替换时支持内置函数：

```yaml
messages:
  - role: user
    content: |
      Uppercase Name: {{customer_name | upper}}
      First Name: {{customer_name | split(' ') | first}}
      Order Date: {{order_date | date('YYYY-MM-DD')}}
      Price: {{price | currency('USD')}}
      List: {{tags | join(', ')}}
```

**支持的函数**：
- `upper` / `lower` / `capitalize`: 字符串转换
- `split(delimiter)`: 分割字符串
- `first` / `last`: 获取第一个/最后一个元素
- `join(delimiter)`: 数组连接
- `date(format)`: 日期格式化
- `currency(code)`: 货币格式化
- `default(value)`: 提供默认值

---

### 5.6 核心用户旅程 (User Journeys)

#### Journey 1: AI 工程师 - 集成 Prompt 到生产环境

**用户角色**：Alex（后端工程师），负责在公司的客服系统中集成 AI 功能

**场景**：需要为客服系统添加自动化的退款回复功能，要求 Prompt 可版本控制、可测试、易于部署。

**详细步骤**：

**1. 初始化项目（第 1 天）**
- Alex 下载并安装 VibeBase 桌面应用
- 点击 "Open Workspace"，选择公司项目的 Git 仓库目录：`~/projects/customer-service-ai/`
- VibeBase 自动检测这是一个新项目，提示创建 `vibe.config.yaml`
- 选择模板 "Python Backend Project"，自动生成配置文件

```yaml
# 自动生成的 vibe.config.yaml
project_name: "Customer Service AI"
environments:
  development:
    provider: openai
    model: "gpt-4-turbo"
    api_key_env_var: "OPENAI_API_KEY_DEV"
  
  production:
    provider: openai
    model: "gpt-4-turbo"
    api_key_env_var: "OPENAI_API_KEY_PROD"
```

**2. 创建第一个 Prompt（第 1 天）**
- 在左侧文件树中，右键点击 `prompts/` 文件夹 → "New Vibe File"
- 输入文件名：`refund_reply.vibe.yaml`
- VibeBase 打开编辑器，显示模板
- Alex 编写 System Message 和 User Message：

```yaml
schema: "v1"
name: "Refund Reply Generator"
description: "自动生成退款请求的标准回复"

config:
  provider: openai
  model: "gpt-4-turbo"
  parameters:
    temperature: 0.7

messages:
  - role: system
    content: "You are a professional customer service representative. Generate polite and helpful refund response emails."
  
  - role: user
    content: |
      Customer: {{customer_name}}
      Order ID: {{order_id}}
      Reason: {{refund_reason}}
      
      Write a refund approval email.
```

**3. 本地测试（第 1 天）**
- 点击顶部环境切换器，选择 "Development"
- 在右侧 "Variables" 面板填入测试值：
  - `customer_name`: "John Doe"
  - `order_id`: "#12345"
  - `refund_reason`: "Product arrived damaged"
- 点击绿色 "Run" 按钮
- 中间编辑器下方实时显示流式输出
- 输出满意后，点击 "Save"（Cmd+S）

**4. 生成集成代码（第 1 天）**
- 切换到右侧 "Code" 标签
- 选择语言：Python
- VibeBase 自动生成代码：

```python
from vibebase import VibeClient

client = VibeClient(workspace="./")
prompt = client.load_prompt("prompts/refund_reply.vibe.yaml")

result = prompt.execute(
    variables={
        "customer_name": customer.name,
        "order_id": order.id,
        "refund_reason": order.refund_reason,
    },
    environment="production"
)

return result.output
```

- 点击 "Copy Code"，粘贴到业务代码 `services/refund_service.py` 中

**5. 提交版本控制（第 2 天）**
- 切换到左侧 "Source Control" 标签页
- 看到 Changes 列表中有 2 个文件：
  - `M prompts/refund_reply.vibe.yaml`
  - `M vibe.config.yaml`
- 点击 "Stage All" 或分别点击每个文件的 [+] 按钮
- **使用 AI 生成 Commit Message**：
  - 点击 Commit Message 输入框旁的 [✨ AI Generate] 按钮
  - VibeBase 自动分析 Diff，调用 GPT-4o 生成消息
  - 3 秒后，输入框自动填入：
    ```
    feat(prompts): add refund reply template
    
    - Added new prompt for handling customer refund requests
    - Configured production environment with GPT-4 Turbo
    - Includes empathetic tone and professional language
    ```
  - Alex 快速检查，觉得很好，无需修改
- 点击 "✓ Commit" 按钮
- 提交成功，顶部显示 `↑1`（1 个待推送的 Commit）
- 点击顶部的 [↑] 图标或 "Sync" 按钮
- 推送成功，远程仓库更新
- 团队其他成员可以通过 Git 查看和 Review Prompt 变更

**价值体现**：
- ✅ AI 自动生成高质量 Commit Message，节省时间
- ✅ 自动遵循 Conventional Commits 规范
- ✅ 描述准确，团队成员一目了然

**6. CI/CD 部署（第 2 天）**
- 公司的 CI/CD 流程自动部署新代码
- 生产环境的 `OPENAI_API_KEY_PROD` 已配置在环境变量中
- 业务代码自动读取最新的 Prompt 文件并执行

**7. 后续迭代**
- Prompt 工程师优化 Prompt 效果后，提交新版本
- Alex 在 VibeBase 中查看 Git 历史，对比不同版本的效果
- 如果新版本有问题，可以快速回滚（`git revert`）

**价值体现**：
- ✅ Prompt 与代码分离，易于维护
- ✅ 使用 Git 进行版本控制，可追溯、可回滚
- ✅ 团队协作透明，支持 Code Review
- ✅ SDK 集成简单，只需 3 行代码

---

#### Journey 2: Prompt 工程师 - 优化效果并系统化评测

**用户角色**：Sarah（Prompt 工程师），负责优化客服 Prompt 的质量

**场景**：现有的退款回复 Prompt 效果不稳定，部分回复过于冷漠，需要系统化测试和优化。

**详细步骤**：

**1. 打开项目并分析现状（第 1 天上午）**
- Sarah 在 VibeBase 中打开项目
- 选择 `refund_reply.vibe.yaml`
- 点击右下角 "History" 图标，查看执行历史
- 发现过去 7 天有 156 次执行，平均延迟 1.2s，总成本 $4.68
- 点击某次历史记录，查看当时的输入和输出

**2. 创建测试数据集（第 1 天上午）**
- 在 `tests/` 文件夹创建 `refund_cases.csv`：

```csv
customer_name,order_id,refund_reason,expected_tone
John Doe,#12345,Product arrived damaged,sympathetic
Jane Smith,#67890,Changed my mind,understanding
Bob Lee,#11111,Late delivery,apologetic
Alice Wang,#22222,Wrong item received,helpful
```

- 在 `refund_reply.vibe.yaml` 中添加引用：
  ```yaml
  test_data: "../../tests/refund_cases.csv"
  ```

**3. 运行批量测试（第 1 天上午）**
- 点击 "Run Tests" 按钮
- 底部面板展开，显示 Matrix 表格，实时更新进度
- 4 个测试用例并发执行，10 秒内完成
- 表格列：`customer_name | order_id | refund_reason | Output | Latency | Cost`
- Sarah 逐条查看输出，发现 Case 2 和 Case 3 的回复语气偏冷漠

**4. 优化 Prompt（第 1 天下午）**
- Sarah 修改 System Message：
  ```yaml
  content: "You are a warm and empathetic customer service representative. Always show understanding and use friendly language."
  ```
- 点击 "Run Tests" 重新测试
- 对比前后两次运行的结果（VibeBase 自动高亮差异）
- 效果改善，但 Case 4 的回复过长（超过 200 字）

**5. 引入 AI 评测器（第 2 天上午）**
- 在 `judges/` 文件夹创建 `politeness.vibe.yaml`：

```yaml
schema: "v1"
type: judge
name: "Politeness Evaluator"

config:
  provider: openai
  model: "gpt-4-turbo"
  parameters:
    temperature: 0.2

messages:
  - role: system
    content: "Rate the politeness of customer service responses (1-10)."
  - role: user
    content: |
      Response: {{target_output}}
      
      JSON format: {"score": <number>, "reasoning": "<text>"}

output_parser:
  type: json
  schema:
    score: number
    reasoning: string
```

- 在 `refund_reply.vibe.yaml` 中添加评测配置：
  ```yaml
  evaluation:
    - name: "Politeness Check"
      type: llm_judge
      ref: "../judges/politeness.vibe.yaml"
  ```

**6. 运行自动化评测（第 2 天上午）**
- 再次点击 "Run Tests"
- Matrix 表格新增两列：`Score | Reasoning`
- 评测结果：
  - Case 1: 8.5/10 - "Very empathetic and professional"
  - Case 2: 9.0/10 - "Warm and understanding"
  - Case 3: 8.0/10 - "Apologetic but could be warmer"
  - Case 4: 7.5/10 - "Helpful but too lengthy"

**7. 继续迭代优化（第 2 天下午）**
- 增加长度控制：
  ```yaml
  parameters:
    max_tokens: 150
  ```
- 再次运行测试，所有 Case 得分均在 8.5 以上
- Sarah 对结果满意

**8. 版本标记与发布（第 2 天下午）**
- 点击右上角 "Create Tag" 按钮
- 输入 Tag 名称：`v1.2-optimized`
- 输入备注：`提升礼貌度，增加长度控制`
- VibeBase 调用 Git 创建标签
- 提交并推送：
  ```bash
  git add .
  git commit -m "improve: enhance politeness and add length control"
  git push --tags
  ```

**9. 对比历史版本（第 3 天）**
- 同事报告生产环境效果很好，但成本上升
- Sarah 在 VibeBase 中对比 `v1.1` 和 `v1.2` 的历史运行数据
- 发现平均 Token 数从 80 增加到 120，成本上升 50%
- 决定将 `max_tokens` 调整为 100，平衡效果与成本

**价值体现**：
- ✅ 批量测试节省时间，4 个用例 10 秒完成
- ✅ AI 评测自动化，无需人工逐一检查
- ✅ 版本对比清晰，优化路径可追溯
- ✅ 数据驱动决策，平衡效果与成本

---

#### Journey 3: 团队协作 - Code Review Prompt 变更

**场景**：Sarah 优化了 Prompt，需要 Alex 进行 Code Review。

**步骤**：

1. **Sarah 提交 Pull Request**
   - 在 GitHub 上创建 PR：`feat: improve refund reply tone`
   - PR 中包含：
     - `refund_reply.vibe.yaml` 的修改
     - 新增的 `judges/politeness.vibe.yaml`
     - 测试结果截图（Matrix 表格）

2. **Alex Review Prompt 变更**
   - Alex 在 GitHub PR 页面查看 Diff：
     ```diff
     - content: "You are a professional customer service representative."
     + content: "You are a warm and empathetic customer service representative."
     ```
   - Alex 在本地 VibeBase 中切换到 Sarah 的分支
   - 运行测试验证效果
   - 查看评测得分是否有提升

3. **讨论与迭代**
   - Alex 评论："效果不错，但担心成本上升"
   - Sarah 回复："我可以降低 `max_tokens`"
   - Sarah 更新代码并推送

4. **合并与部署**
   - Alex 批准 PR
   - 合并到 `main` 分支
   - CI/CD 自动部署到生产环境

**价值体现**：
- ✅ Prompt 变更可视化，易于 Review
- ✅ Git Workflow 完整支持
- ✅ 团队协作流程标准化

---

#### Journey 5: 团队协作 - 拉取更新并解决冲突

**场景**：团队成员 Bob 修改了同一个 Prompt 文件，Alex 需要拉取更新并解决冲突。

**步骤**：

1. **检测到远程更新**
   - Alex 打开 VibeBase，顶部显示 `↓2`（2 个远程 Commit）
   - 显示通知："Remote has 2 new commits"

2. **拉取更新**
   - 切换到 "Source Control" 标签页
   - 点击更多选项菜单 [⋯] → "Pull"
   - 或点击顶部的 [↻] 刷新按钮
   - 开始拉取远程更新

3. **检测到冲突**
   - 拉取过程中检测到冲突
   - 显示错误消息：
     ```
     ⚠️  Merge Conflict Detected
     
     The following files have conflicts:
     • prompts/refund_reply.vibe.yaml
     
     Please resolve conflicts to continue.
     
     [Open Conflict Files] [Cancel]
     ```
   - 文件树中 `refund_reply.vibe.yaml` 显示红色 `C` 标记

4. **打开冲突解决视图**
   - 点击 "Open Conflict Files" 或直接点击冲突文件
   - 编辑器切换为三栏视图：

```
┌─ Resolve Conflict: prompts/refund_reply.vibe.yaml ──────────────────┐
│ [Accept Ours] [Accept Theirs] [Manual Edit]                         │
├─────────────┬──────────────────┬─────────────────────────────────┤
│ YOURS       │ BASE (Original)  │ THEIRS (Bob's version)           │
├─────────────┼──────────────────┼─────────────────────────────────┤
│ content: >  │ content: >       │ content: >                       │
│   You are a │   You are a      │   You are an empathetic and      │
│   warm and  │   professional   │   professional customer service  │
│   empathetic│   customer       │   representative who prioritizes │
│   ...       │   service...     │   customer satisfaction...       │
├─────────────┴──────────────────┴─────────────────────────────────┤
│ 💡 Suggestion: These changes both modify the tone. Consider       │
│    combining both approaches for better results.                   │
└───────────────────────────────────────────────────────────────────┘
```

5. **选择解决方案**
   - **选项 1**：点击 "Accept Ours"（保留自己的版本）
   - **选项 2**：点击 "Accept Theirs"（使用 Bob 的版本）
   - **选项 3**：点击 "Manual Edit"，手动合并两个版本：
     ```yaml
     content: >
       You are a warm, empathetic, and professional customer service
       representative who prioritizes customer satisfaction.
     ```
   - Alex 选择手动合并，结合了两者的优点

6. **标记冲突已解决**
   - 编辑完成后，点击 "Mark as Resolved"
   - 文件从冲突列表移除，`C` 标记消失
   - 显示在 Staged Changes 中

7. **完成合并提交**
   - VibeBase 自动填入 Merge Commit Message：
     ```
     Merge branch 'main' of origin/main
     
     Conflicts resolved:
     - prompts/refund_reply.vibe.yaml
     ```
   - 点击 "✓ Commit"
   - 合并完成

8. **推送合并结果**
   - 顶部显示 `↑1`（1 个待推送的 Merge Commit）
   - 点击 [↑] 推送到远程
   - 团队其他成员可以看到合并后的版本

**价值体现**：
- ✅ 可视化的冲突解决，无需命令行
- ✅ 三栏对比，清晰展示差异
- ✅ 智能提示，帮助做出决策
- ✅ 完整的合并流程，与团队协作无缝衔接

---

#### Journey 4: 问题排查 - 时间旅行调试

**场景**：生产环境某次执行效果异常，需要定位原因。

**步骤**：

1. **发现问题**
   - 用户投诉收到的退款回复不合理
   - 运营团队记录了问题发生的时间：2025-12-10 14:32

2. **时间旅行定位**
   - Sarah 在 VibeBase 中打开 "History" 面板
   - 筛选条件：
     - 时间范围：2025-12-10 14:00 - 15:00
     - Prompt：`refund_reply.vibe.yaml`
   - 找到问题执行记录（ID: `exec_abc123`）

3. **重放运行状态**
   - 点击该记录，VibeBase 显示完整上下文：
     - 使用的 Prompt 版本（Git SHA）
     - 输入变量值
     - 使用的环境和模型
     - 当时的输出
   - 点击 "Replay"，使用相同输入重新运行
   - 发现这次输出正常，判断是偶发问题

4. **对比分析**
   - 对比当时的输出和重放的输出
   - 发现差异，怀疑是模型不稳定
   - 将 `temperature` 从 0.7 降低到 0.5

**价值体现**：
- ✅ 完整的执行上下文记录
- ✅ 可重放历史状态
- ✅ 快速定位问题

---

## 6. 用户界面设计 (UI/UX)

采用经典的**三栏式布局**（参考 Paw/Postman）：

### 左栏 (Navigator)
- **顶部**：
  - 项目名称
  - Git 分支显示器（显示当前分支）
  - Git 同步状态指示器（↑2 ↓1 表示 2 个待推送，1 个待拉取）
- **主体**：
  - 文件资源管理器（树状结构）
  - 文件状态标记（M = Modified, U = Untracked, C = Conflict）
- **标签页**：
  - **Files**：文件树视图
  - **Source Control**：Git 操作面板（类似 VS Code）
- **底部**：设置入口。

### 中栏 (Canvas - 核心工作区)
- **Header**: 环境切换器 (Dropdown)、模型参数配置 (Temp, TopP)。
- **Body**: 垂直滚动的块状编辑器 (System Block, User Block)。
- **Variables**: 浮动或嵌入式的变量填值预览。

### 右栏 (Inspector & Actions)
- **Top**: 运行按钮 (Play Button)、Token 估算。
- **Tabs**: Variables (变量列表), Preview (SDK调用代码), Tests (测试配置)。

### 底栏 (Console/Results)
- 可升降的面板。
- 显示最近一次运行的 Matrix 表格视图。

---

### Source Control 面板详细设计

左栏的 "Source Control" 标签页提供类似 VS Code 的 Git 操作界面：

```
┌─ Source Control ──────────────────────────────┐
│ main ● ↑2 ↓1                     [⋯] [↻] [↑] │ 
│                                                │
│ Changes (3)                           [Stage All]│
│ ┌────────────────────────────────────────────┐ │
│ │ M  prompts/refund.vibe.yaml        [+]     │ │
│ │ M  tests/refund_cases.csv          [+]     │ │
│ │ U  prompts/greeting.vibe.yaml      [+]     │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ Staged Changes (2)                    [Unstage All]│
│ ┌────────────────────────────────────────────┐ │
│ │ M  vibe.config.yaml                [-]     │ │
│ │ A  prompts/new_prompt.vibe.yaml    [-]     │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ Message                              [✨ AI Generate]│
│ ┌────────────────────────────────────────────┐ │
│ │ feat: improve refund reply tone            │ │
│ │                                            │ │
│ │ - Enhanced system message                  │ │
│ │ - Added politeness evaluator               │ │
│ └────────────────────────────────────────────┘ │
│ ⚙️ Style: Conventional Commits | Model: GPT-4o │
│                                                │
│ [✓ Commit] [⇄ Sync] [Cancel]                  │
│                                                │
│ Last commit: 2 hours ago by Alice              │
│ "fix: correct variable name in greeting"      │
└────────────────────────────────────────────────┘

图标说明：
● = 有未提交更改
↑2 = 2 个 Commit 待推送
↓1 = 1 个 Commit 待拉取
[⋯] = 更多选项菜单
[↻] = 刷新状态
[↑] = 一键 Push
```

**更多选项菜单（⋯）**：
- Pull（拉取）
- Push（推送）
- Push Force（强制推送，需确认）
- Fetch（获取远程更新，不合并）
- View History（查看历史）
- Create Branch（创建分支）
- Switch Branch（切换分支）
- Stash Changes（暂存更改）
- **Remote Settings（远程设置）**
- **Configure Credentials（配置凭据）** ← 私有仓库需要

**交互行为**：
- 点击文件名：在编辑器中打开并显示 Diff
- 点击 [+]：Stage 该文件
- 点击 [-]：Unstage 该文件
- 双击 Commit Message：编辑历史消息
- 右键文件：显示上下文菜单（Discard Changes, Open File, View History）
- **点击 [✨ AI Generate]**：使用 AI 自动生成 Commit Message

---

### AI 生成 Commit Message 详细设计

**功能目标**：
自动分析代码变更，生成符合规范的 Commit Message，提高开发效率和提交质量。

**触发方式**：
1. **手动触发**：点击 Commit Message 输入框旁的 [✨ AI Generate] 按钮
2. **自动触发**（可选）：勾选 "Auto-generate on stage" 后，每次 Stage 文件时自动生成

**生成流程**：

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Tauri
    participant Git
    participant LLM
    
    User->>UI: 点击 "AI Generate"
    UI->>UI: 显示加载状态
    UI->>Tauri: generate_commit_message()
    Tauri->>Git: git diff --staged
    Git-->>Tauri: 返回 Diff 内容
    Tauri->>LLM: 调用配置的模型
    Note over Tauri,LLM: Prompt: 分析 Diff + 生成风格
    LLM-->>Tauri: 返回 Commit Message
    Tauri-->>UI: 显示生成的消息
    UI->>User: 预览并可编辑
```

**Prompt 模板设计**：

```yaml
# 内置的 Commit Message 生成 Prompt
schema: "internal"
type: system
name: "Commit Message Generator"

messages:
  - role: system
    content: |
      You are an expert Git commit message generator.
      Analyze the provided git diff and generate a commit message following {{style}} style.
      
      Guidelines:
      - Conventional Commits: Use format "type(scope): subject"
        Valid types: feat, fix, docs, style, refactor, test, chore
      - Detailed: Provide comprehensive description with bullet points
      - Simple: One-line summary only
      
      Output language: {{language}}
      Be concise, specific, and professional.
  
  - role: user
    content: |
      Generate a commit message for the following changes:
      
      {{git_diff}}
      
      Focus on:
      - What files changed (especially .vibe.yaml files)
      - What functionality was added/modified
      - Why these changes matter for Prompt engineering
      
      Output format:
      {{#if conventional}}
      type(scope): subject
      
      - Detail 1
      - Detail 2
      {{else}}
      <Your commit message here>
      {{/if}}
```

**生成示例**：

**示例 1：Conventional Commits 风格（英文）**

Diff 内容：
```diff
diff --git a/prompts/refund.vibe.yaml b/prompts/refund.vibe.yaml
--- a/prompts/refund.vibe.yaml
+++ b/prompts/refund.vibe.yaml
@@ -10,7 +10,7 @@
 messages:
   - role: system
-    content: "You are a professional customer service representative."
+    content: "You are a warm and empathetic customer service representative."
```

生成的 Commit Message：
```
feat(prompts): enhance refund reply tone

- Updated system message to be more empathetic
- Changed from "professional" to "warm and empathetic"
- Improves customer satisfaction in refund scenarios
```

**示例 2：详细描述风格（中文）**

Diff 内容：（同上）

生成的 Commit Message：
```
改进退款回复 Prompt 的语气

本次提交优化了退款场景的客服回复语气，使其更加温暖和富有同理心。

主要变更：
- 修改了 system message，从"专业的"改为"温暖且富有同理心的"
- 这个变更有助于提升客户在退款场景下的满意度
- 预期能够改善客户体验评分

相关文件：
- prompts/refund.vibe.yaml
```

**示例 3：简洁风格**

生成的 Commit Message：
```
Update refund prompt to be more empathetic
```

**配置选项**：

在 Commit Message 输入框下方显示配置选项：

```
┌─ AI Generation Settings ──────────────────────┐
│ Style: ● Conventional Commits                 │
│        ○ Detailed Description                 │
│        ○ Simple                               │
│                                               │
│ Language: ● Auto (follows locale)             │
│           ○ English                           │
│           ○ 简体中文                           │
│                                               │
│ Model: Production (GPT-4o) [Change]          │
│                                               │
│ ☑ Auto-generate on stage                     │
│ ☐ Always review before commit                │
└───────────────────────────────────────────────┘
```

**用户体验优化**：

1. **实时预览**：生成后立即显示在输入框中，用户可以编辑
2. **重新生成**：如果不满意，可以点击 "🔄 Regenerate" 重新生成
3. **保存为草稿**：未提交的 Message 自动保存，重新打开项目时恢复
4. **历史记录**：记录最近 5 条生成的 Message，可以快速选择
5. **快捷键**：`Cmd/Ctrl + Shift + G` 触发 AI 生成

**错误处理**：

- **API Key 未配置**：提示用户配置 Source Control 模型
- **网络错误**：显示友好错误，提供"重试"按钮
- **Diff 过大**：如果 Diff 超过 10,000 行，截断并提示
- **无变更**：如果 Staged Changes 为空，提示先 Stage 文件

**成本控制**：

- 默认使用较便宜的模型（如 GPT-4o-mini）
- 显示每次生成的 Token 数和成本（约 $0.001-0.01）
- 在设置中可以查看累计生成成本
- 提供"本地模式"选项：使用 Ollama 生成，完全免费

**隐私保护**：

- Diff 内容仅发送到用户配置的 LLM 提供商
- 不会上传到 VibeBase 服务器
- 敏感信息检测：如果 Diff 包含 API Key、密码等，警告用户

---

### Git 私有仓库支持详细设计

**背景**：企业用户通常使用私有 Git 仓库来保护 Prompt 资产，需要完整的认证支持。

#### 认证方式支持

**1. SSH 密钥认证（推荐）**

适用场景：开发者个人使用，安全性高

配置流程：
1. VibeBase 自动检测系统 SSH 密钥
2. 如果不存在，引导用户生成
3. 显示公钥内容，提示用户添加到 Git 平台
4. 测试连接
5. 如果密钥有密码，存储在 OS Keychain

**UI 界面**：

```
┌─ Git SSH Configuration ───────────────────────┐
│ SSH Key: ~/.ssh/id_ed25519                   │
│ Status: ✓ Connected                          │
│                                               │
│ Public Key:                                   │
│ ┌───────────────────────────────────────────┐│
│ │ ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB... ││
│ └───────────────────────────────────────────┘│
│ [Copy Public Key] [Generate New Key]          │
│                                               │
│ [Test Connection]                             │
└───────────────────────────────────────────────┘
```

**2. HTTPS 认证（通用）**

适用场景：简单快速，适合临时使用

**UI 界面**：

```
┌─ Git HTTPS Credentials ───────────────────────┐
│ Remote: https://github.com/user/repo.git     │
│                                               │
│ Authentication Method:                        │
│ ● Personal Access Token (Recommended)        │
│ ○ Username & Password                         │
│                                               │
│ Token / Password:                             │
│ ┌───────────────────────────────────────────┐│
│ │ ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ││
│ └───────────────────────────────────────────┘│
│                                               │
│ [Test Connection] [Save]                      │
│ Status: ✓ Authenticated                      │
└───────────────────────────────────────────────┘
```

#### 多平台支持

- **GitHub**: SSH/HTTPS, PAT 权限需要 `repo`
- **GitLab**: SSH/HTTPS, 支持自托管
- **Bitbucket**: SSH/HTTPS, App Password
- **Azure DevOps**: SSH/HTTPS, PAT
- **Gitee**: SSH/HTTPS, 私人令牌
- **企业内网 Git**: 自定义域名，自签名证书支持

#### 凭据存储安全

所有凭据安全存储在 OS Keychain：
- Service Name: `dev.vibebase.git`
- Account: `{remote_url}`

---

### Git 工作流程示例

**场景 1：提交本地更改**
1. 用户在编辑器中修改 `refund.vibe.yaml`
2. 文件树中该文件显示 `M` 标记
3. 切换到 "Source Control" 标签
4. 文件自动出现在 "Changes" 列表中
5. 点击 [+] 或 "Stage All"
6. 输入 Commit Message
7. 点击 "✓ Commit"
8. 提交成功，顶部显示 `↑1`（1 个待推送）

**场景 2：同步远程更新**
1. 顶部显示 `↓3`（3 个远程 Commit）
2. 点击 [↻] 或菜单中的 "Pull"
3. 显示拉取进度
4. 如果无冲突，自动合并
5. 刷新文件树和编辑器
6. 显示通知："Pulled 3 commits from origin/main"

**场景 3：解决冲突**
1. Pull 时检测到冲突
2. 显示冲突文件列表（红色标记 C）
3. 点击冲突文件
4. 编辑器分为三栏：Ours | Base | Theirs
5. 用户选择保留哪个版本或手动编辑
6. 点击 "Mark as Resolved"
7. 所有冲突解决后，自动创建 Merge Commit

**场景 4：推送到远程**
1. 本地有 2 个待推送的 Commit（`↑2`）
2. 点击 [↑] 图标或菜单中的 "Push"
3. 检查远程是否有新 Commit
4. 如果远程有更新，提示先 Pull
5. 如果无冲突，推送成功
6. 顶部 `↑2` 消失

---

### 6.5 差异化创新功能 (Innovation Features)

#### 创新点 1: 时间旅行调试 (Time-Travel Debugging)

**问题场景**：
- "上周五下午那次运行为什么效果这么好？当时用的是什么版本？"
- "生产环境昨天凌晨出现了一次异常输出，但现在无法复现"
- "我想对比一下三天前和现在的 Prompt 性能差异"

**传统方案的不足**：
- LangSmith 等工具只记录输出，不记录完整的 Prompt 版本
- 手动记录成本高，容易遗漏关键信息
- Git History 可以看代码变更，但看不到实际运行效果

**VibeBase 解决方案**：

将每次执行视为一个"时间快照"，记录完整上下文：
- Prompt 内容（Git SHA 或完整文本）
- 输入变量值
- 环境配置（模型、参数）
- 输出结果
- 元数据（时间、成本、延迟）
- 评测结果

**核心功能设计**：

**1. 历史记录面板**
- 位置：底栏新增 "History" 标签页
- 展示形式：时间轴 + 卡片列表

```
┌─ History ─────────────────────────────────────────┐
│ 筛选: [所有 Prompts ▾] [所有环境 ▾] [最近 7 天 ▾]  │
│                                                   │
│ 📅 2025-12-12                                     │
│   ┌─────────────────────────────────────────┐   │
│   │ 🕐 14:32:45  refund_reply.vibe.yaml     │   │
│   │ Environment: Production | GPT-4 Turbo   │   │
│   │ Input: customer_name="John Doe"         │   │
│   │ Cost: $0.023 | Latency: 1.2s           │   │
│   │ Score: 8.5/10 ✓                         │   │
│   │ [Replay] [Compare] [View Details]       │   │
│   └─────────────────────────────────────────┘   │
│                                                   │
│   ┌─────────────────────────────────────────┐   │
│   │ 🕐 10:15:22  greeting.vibe.yaml         │   │
│   │ Environment: Development | GPT-3.5      │   │
│   │ ...                                      │   │
│   └─────────────────────────────────────────┘   │
│                                                   │
│ 📅 2025-12-11                                     │
│   ...                                             │
└───────────────────────────────────────────────────┘
```

**2. 重放（Replay）功能**
- 点击某条历史记录的 "Replay" 按钮
- VibeBase 自动：
  1. 加载当时的 Prompt 版本（如果文件已修改，从 Git 恢复）
  2. 填入当时的变量值
  3. 使用当时的环境配置
- 用户可以选择：
  - **完全重放**：完全相同的配置，用于验证幂等性
  - **修改后重放**：调整某些参数后重新运行

**3. 对比（Compare）功能**
- 支持选择两条历史记录进行对比
- 并排展示：

```
┌─ Comparison ───────────────────────────────────────────────┐
│ Run A (2025-12-10 14:32)  │  Run B (2025-12-12 10:15)     │
│                           │                                │
│ Prompt Version:           │                                │
│  commit abc123 (v1.1)     │  commit def456 (v1.2)         │
│                           │                                │
│ Diff:                     │                                │
│ - professional            │ + warm and empathetic          │
│                           │                                │
│ Input Variables:          │                                │
│  customer_name: John      │  customer_name: John (same)   │
│                           │                                │
│ Output:                   │                                │
│ "Dear John, We have..."   │ "Hi John! We're so sorry..."  │
│                           │                                │
│ Metrics:                  │                                │
│  Latency: 1.4s            │  Latency: 1.2s (-14%) ✓       │
│  Cost: $0.025             │  Cost: $0.023 (-8%) ✓         │
│  Score: 7.5/10            │  Score: 8.5/10 (+13%) ✓       │
└────────────────────────────────────────────────────────────┘
```

**4. 数据存储策略**

**SQLite Schema 扩展**：
```sql
CREATE TABLE execution_snapshots (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL,
    prompt_name TEXT NOT NULL,
    prompt_version TEXT, -- Git SHA
    prompt_content TEXT, -- 完整 YAML（防止 Git 文件丢失）
    environment_name TEXT NOT NULL,
    environment_config TEXT NOT NULL, -- JSON
    input_vars TEXT NOT NULL, -- JSON
    output TEXT NOT NULL,
    metadata TEXT NOT NULL, -- JSON (latency, cost, tokens)
    evaluation_results TEXT, -- JSON
    timestamp INTEGER NOT NULL,
    
    INDEX idx_prompt_id (prompt_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_environment (environment_name)
);
```

**数据清理策略**：
- 默认保留 30 天（可配置：7 / 30 / 90 天 / 永久）
- 超过期限的记录自动删除
- 支持手动标记"重要记录"（永久保留）

**5. 高级筛选**

支持多维度筛选：
- 时间范围：今天 / 最近7天 / 最近30天 / 自定义
- Prompt 文件：单选或多选
- 环境：Development / Production
- 评分范围：例如 "Score > 8.0"
- 成本范围：例如 "Cost < $0.05"
- 关键词：输入或输出包含特定文本

**优先级**：P1（Should-have）

**技术实现**：
- 使用 SQLite FTS5 实现全文搜索
- 使用 Tauri Event 实现实时更新
- 前端使用虚拟滚动处理大量历史记录

---

#### 创新点 2: 模型对比模式 (Model Arena)

**问题场景**：
- "GPT-4 和 Claude 3 Opus 在这个任务上哪个更好？"
- "GPT-4 Turbo 和 GPT-4o 的效果差异有多大？成本差多少？"
- "本地 Llama 3 能不能达到 GPT-3.5 的水平？"

**传统方案的不足**：
- 需要手动切换环境，多次运行，人工对比
- LangSmith 的 A/B 测试功能需要写代码集成
- 无法直观地并排对比输出

**VibeBase 解决方案**：

提供类似于 LMSYS Chatbot Arena 的对比界面，支持同时测试多个模型，并进行投票和分析。

**核心功能设计**：

**1. Arena 模式入口**
- 右侧栏新增 "Arena" 标签页
- 或在顶部增加 "Arena Mode" 切换按钮

**2. 模型选择界面**

```
┌─ Model Arena ─────────────────────────────────────┐
│ 选择要对比的模型：                                 │
│                                                   │
│ ☑ GPT-4 Turbo (OpenAI)                           │
│ ☑ Claude 3 Opus (Anthropic)                      │
│ ☑ Claude 3 Sonnet (Anthropic)                    │
│ ☐ GPT-3.5 Turbo (OpenAI)                         │
│ ☐ Llama 3 70B (Local Ollama)                    │
│ ☐ Mixtral 8x7B (Local Ollama)                   │
│                                                   │
│ 已选择 3 个模型                                    │
│                                                   │
│ [Run Arena] [Cancel]                              │
└───────────────────────────────────────────────────┘
```

**3. 并排对比视图**

```
┌─ Arena Results ───────────────────────────────────────────────────────┐
│ Input: customer_name="John Doe", order_id="#12345"                    │
│                                                                        │
│ ┌─ Model A ─────────┐ ┌─ Model B ─────────┐ ┌─ Model C ─────────┐  │
│ │ GPT-4 Turbo       │ │ Claude 3 Opus     │ │ Claude 3 Sonnet   │  │
│ │                   │ │                   │ │                   │  │
│ │ "Dear John,       │ │ "Hi John!         │ │ "Hello John,      │  │
│ │ We sincerely      │ │ I'm so sorry to   │ │ Thank you for     │  │
│ │ apologize for..."  │ │ hear about..."     │ │ reaching out..."   │  │
│ │                   │ │                   │ │                   │  │
│ │ Latency: 1.2s     │ │ Latency: 0.9s ✓   │ │ Latency: 0.6s ✓✓ │  │
│ │ Cost: $0.023      │ │ Cost: $0.045      │ │ Cost: $0.012 ✓   │  │
│ │ Tokens: 128       │ │ Tokens: 145       │ │ Tokens: 98 ✓     │  │
│ │                   │ │                   │ │                   │  │
│ │ [👍 Vote]         │ │ [👍 Vote]         │ │ [👍 Vote]         │  │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘  │
│                                                                        │
│ 🏆 Current Winner: Model B (Claude 3 Opus)                           │
└────────────────────────────────────────────────────────────────────────┘
```

**4. 投票与评分**
- 用户可以为每个模型投票（👍 / 👎）
- 可以选择"最佳输出"
- 投票数据存储到 SQLite

**Schema**：
```sql
CREATE TABLE arena_battles (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL,
    input_vars TEXT NOT NULL, -- JSON
    models TEXT NOT NULL, -- JSON array of model names
    outputs TEXT NOT NULL, -- JSON array of outputs
    metadata TEXT NOT NULL, -- JSON (latency, cost per model)
    winner_model TEXT, -- 用户选择的最佳模型
    votes TEXT, -- JSON (user vote per model)
    timestamp INTEGER NOT NULL
);
```

**5. 统计分析**

在 Arena 标签页显示统计数据：

```
┌─ Arena Statistics ─────────────────────────────────┐
│ Prompt: refund_reply.vibe.yaml                     │
│ Total Battles: 42                                  │
│                                                    │
│ Win Rate:                                          │
│ 1. Claude 3 Opus      🏆 45% (19 wins)            │
│ 2. GPT-4 Turbo        🥈 36% (15 wins)            │
│ 3. Claude 3 Sonnet    🥉 19% (8 wins)             │
│                                                    │
│ Average Latency:                                   │
│ 1. Claude 3 Sonnet    ⚡ 0.7s                     │
│ 2. GPT-4 Turbo        ⚡ 1.3s                     │
│ 3. Claude 3 Opus      ⚡ 1.5s                     │
│                                                    │
│ Average Cost:                                      │
│ 1. Claude 3 Sonnet    💰 $0.015                   │
│ 2. GPT-4 Turbo        💰 $0.025                   │
│ 3. Claude 3 Opus      💰 $0.050                   │
│                                                    │
│ 💡 Recommendation: Claude 3 Opus 质量最高，         │
│    但成本是 Sonnet 的 3.3 倍。如果预算有限，        │
│    建议使用 Sonnet。                                │
└────────────────────────────────────────────────────┘
```

**6. 批量 Arena 测试**

支持在测试矩阵模式下运行 Arena：
- 选择多个模型
- 运行所有测试用例
- 生成综合报告

**输出示例**：
```
┌─ Matrix Arena Report ──────────────────────────────────────┐
│ Test Cases: 50                                             │
│                                                            │
│ Overall Winner: Claude 3 Opus (32/50 cases)               │
│                                                            │
│ Detailed Breakdown:                                        │
│ ┌─────────────┬─────────┬──────────┬────────┬──────────┐ │
│ │ Model       │ Win %   │ Avg Score│ Avg Cost│ Avg Time │ │
│ ├─────────────┼─────────┼──────────┼────────┼──────────┤ │
│ │ Claude Opus │ 64%     │ 8.7/10   │ $0.048 │ 1.4s     │ │
│ │ GPT-4 Turbo │ 52%     │ 8.2/10   │ $0.025 │ 1.2s     │ │
│ │ Claude Sonnet│ 38%    │ 7.8/10   │ $0.013 │ 0.8s     │ │
│ └─────────────┴─────────┴──────────┴────────┴──────────┘ │
│                                                            │
│ 💡 Insight: GPT-4 Turbo 提供了最佳的性价比              │
└────────────────────────────────────────────────────────────┘
```

**7. 导出报告**

支持导出 Arena 结果为：
- **Markdown**：用于文档或 PR 描述
- **CSV**：用于进一步数据分析
- **JSON**：用于程序化处理

**优先级**：P2（Could-have），但作为 PR 亮点

**技术实现**：
- 使用 Tokio 并发执行多个模型请求
- 前端使用 React 状态管理实时更新
- 使用 Chart.js 绘制统计图表

---

#### 创新点 3: AI 生成 Commit Message（P1）

**场景**：开发者修改了 Prompt 文件，需要提交到 Git，但不知道如何写一个好的 Commit Message。

**功能**：
- 点击 [✨ AI Generate] 按钮
- VibeBase 自动分析 Git Diff
- 使用配置的 LLM 模型生成符合规范的 Commit Message
- 支持多种风格：Conventional Commits / 详细描述 / 简洁
- 支持多语言：中文、英文等
- 用户可以预览、编辑、重新生成

**实现方式**：
- 内置专门的 Prompt 模板用于生成 Commit Message
- 使用用户配置的环境/模型（`source_control.commit_message_model`）
- 分析 Staged 文件的 Diff，理解变更内容
- 特别优化对 `.vibe.yaml` 文件的理解

**优先级**：P1（Should-have）

**差异化价值**：
- 市场上少有 IDE 内置 AI 生成 Commit Message
- 对 Prompt 工程场景特别优化（理解 `.vibe.yaml` 的结构和语义）
- 节省时间，提高 Commit 质量，促进团队协作

---

#### 创新点 4: 智能变量推断（P2）

**场景**：用户编写 Prompt 时，VibeBase 自动检测变量并提供智能建议。

**功能**：
- 检测到 `{{customer_name}}` 后，自动在右侧 Variables 面板列出
- 如果项目中已有测试数据文件，自动建议绑定到 CSV 列
- 如果变量名与常见类型匹配（如 `*_date`, `*_price`），自动推断类型

**优先级**：P2

---

#### 创新点 5: Prompt 模板市场（P3）

**场景**：提供社区共享的 Prompt 模板，加速开发。

**功能**：
- 内置模板库：客服回复、代码生成、内容总结等
- 用户可以发布自己的模板（匿名）
- 支持评分和评论

**优先级**：P3（Nice-to-have）

---

## 7. 技术架构 (Technical Stack)

### 7.1 系统架构概览

VibeBase 采用三层架构设计，将表现层、核心逻辑层和集成层清晰分离：

```mermaid
graph TB
    subgraph presentation [Presentation Layer]
        ReactUI[React UI]
        TauriAPI[Tauri API Bridge]
    end
    
    subgraph core [Core Layer - Rust]
        FileWatcher[File Watcher]
        YAMLParser[YAML Parser]
        ExecutionEngine[Execution Engine]
        GitIntegration[Git Integration]
        SQLiteDB[(SQLite Cache)]
    end
    
    subgraph integration [Integration Layer]
        PythonSDK[Python SDK]
        NodeSDK[Node.js SDK]
        PluginSystem[Plugin System]
    end
    
    subgraph external [External Services]
        OpenAI[OpenAI API]
        Anthropic[Anthropic API]
        LocalLLM[Local LLM - Ollama]
    end
    
    ReactUI --> TauriAPI
    TauriAPI --> FileWatcher
    TauriAPI --> YAMLParser
    TauriAPI --> ExecutionEngine
    TauriAPI --> GitIntegration
    
    ExecutionEngine --> OpenAI
    ExecutionEngine --> Anthropic
    ExecutionEngine --> LocalLLM
    
    FileWatcher --> SQLiteDB
    ExecutionEngine --> SQLiteDB
    
    PythonSDK -.读取.-> YAMLParser
    NodeSDK -.读取.-> YAMLParser
```

**架构说明**：

- **Presentation Layer（表现层）**：基于 Tauri WebView，使用 React 构建用户界面，通过 Tauri Command 与 Rust 后端通信。
- **Core Layer（核心层）**：完全由 Rust 实现，负责文件监听、YAML 解析、Prompt 执行、Git 集成等核心逻辑。
- **Integration Layer（集成层）**：提供多语言 SDK，允许业务代码直接加载和执行 Vibe 文件。
- **External Services（外部服务）**：支持多种 LLM 提供商，包括云端 API 和本地模型。

---

### 7.2 核心数据模型

#### Rust 端数据结构

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// Prompt 运行时模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptRuntime {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub messages: Vec<Message>,
    pub config: ModelConfig,
    pub variables: HashMap<String, Variable>,
    pub test_data: Option<String>,
    pub evaluation: Option<Vec<EvaluationConfig>>,
}

// 消息块
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: MessageRole,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
}

// 模型配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub provider: Provider,
    pub model: String,
    pub parameters: ModelParameters,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelParameters {
    pub temperature: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

// 提供商枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    OpenAI,
    Anthropic,
    DeepSeek,
    OpenRouter,
    AzureOpenAI,
    Ollama,
    // 未来扩展: Google, Cohere, Mistral
}

// 变量定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub name: String,
    pub value_type: VariableType,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VariableType {
    String,
    Number,
    Boolean,
}

// 评测配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationConfig {
    pub name: String,
    pub eval_type: EvaluationType,
    pub config: EvaluationDetails,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EvaluationType {
    LlmJudge,
    Regex,
    Contains,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EvaluationDetails {
    LlmJudge { ref_path: String },
    Regex { pattern: String },
    Contains { keywords: Vec<String> },
}

// 执行结果模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub id: Uuid,
    pub prompt_id: Uuid,
    pub input_vars: HashMap<String, String>,
    pub output: String,
    pub metadata: ExecutionMetadata,
    pub evaluation_results: Vec<EvaluationResult>,
    pub timestamp: i64,
}

// 执行元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionMetadata {
    pub model: String,
    pub provider: Provider,
    pub latency_ms: u64,
    pub tokens_input: u32,
    pub tokens_output: u32,
    pub cost_usd: f64,
}

// 评测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationResult {
    pub evaluator_name: String,
    pub score: Option<f64>,
    pub passed: bool,
    pub reasoning: Option<String>,
}

// 环境配置模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    pub name: String,
    pub provider: Provider,
    pub model: String,
    pub api_key_ref: SecureKeyRef,
    pub base_url: Option<String>,
}

// 安全密钥引用（指向 OS Keychain）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecureKeyRef {
    pub service: String,
    pub account: String,
}

// Git 提交信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommit {
    pub sha: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
    pub tags: Vec<String>,
}

// 工作区模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub path: String,
    pub name: String,
    pub config: WorkspaceConfig,
    pub prompts: Vec<PromptMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub environments: HashMap<String, Environment>,
    pub default_environment: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptMetadata {
    pub id: Uuid,
    pub file_path: String,
    pub name: String,
    pub last_modified: i64,
}
```

---

### 7.3 技术选型详解

| 层级 | 技术选型 | 理由 | 关键库/框架 |
|------|----------|------|-------------|
| **Client Core** | Tauri (Rust) | 高性能、安装包极小（~5MB）、原生系统调用能力强、内存安全 | `tauri`, `tokio`, `serde` |
| **Frontend** | React + TypeScript | 生态丰富，组件库完善，类型安全 | `react`, `typescript`, `vite` |
| **Styling** | Tailwind CSS + Shadcn/ui | 快速构建现代、干净的 UI (Vibe Check!)，组件可复用 | `tailwindcss`, `@shadcn/ui` |
| **Code Editor** | Monaco Editor | VS Code 同款编辑器，支持语法高亮、智能提示 | `@monaco-editor/react` |
| **State Mgmt** | Zustand | 轻量级状态管理（~1KB），API 简洁，性能优秀 | `zustand` |
| **i18n** | react-i18next | 国际化库，支持多语言切换 | `react-i18next`, `i18next` |
| **Local DB** | SQLite | 嵌入式数据库，存储运行历史、评测结果缓存（不存 Git 的数据） | `rusqlite` |
| **File Watching** | Notify | 跨平台文件系统监听，支持热重载 | `notify` |
| **YAML Parser** | Serde YAML | Rust 标准序列化库，类型安全 | `serde_yaml` |
| **Git Integration** | Git2 | libgit2 的 Rust 绑定，支持完整 Git 操作 | `git2` |
| **HTTP Client** | Reqwest | 异步 HTTP 客户端，支持流式响应 | `reqwest` |
| **Keychain** | Keyring | 跨平台密钥管理，支持 macOS Keychain / Windows Credential Manager | `keyring` |
| **LLM Providers** | - | 支持多个 LLM 提供商 | OpenAI, Anthropic, DeepSeek, OpenRouter, Ollama |
| **Python SDK** | Pydantic + PyYAML | 用于后端集成，强类型校验，数据验证 | `pydantic`, `pyyaml`, `openai` |
| **Node.js SDK** | Zod + js-yaml | TypeScript 类型安全，数据验证 | `zod`, `js-yaml`, `openai` |

---

### 7.4 数据流图

```mermaid
sequenceDiagram
    participant User
    participant ReactUI
    participant Tauri
    participant FileWatcher
    participant YAMLParser
    participant ExecutionEngine
    participant SQLite
    participant LLM_API
    
    User->>ReactUI: 打开 Workspace
    ReactUI->>Tauri: open_workspace(path)
    Tauri->>FileWatcher: 启动文件监听
    FileWatcher->>YAMLParser: 扫描 .vibe.yaml 文件
    YAMLParser-->>Tauri: 返回 Prompt 列表
    Tauri-->>ReactUI: 显示文件树
    
    User->>ReactUI: 编辑 Prompt
    ReactUI->>Tauri: save_prompt(content)
    Tauri->>FileWatcher: 写入文件
    FileWatcher-->>ReactUI: 文件变更通知
    
    User->>ReactUI: 点击 "Run"
    ReactUI->>Tauri: execute_prompt(id, vars)
    Tauri->>ExecutionEngine: 执行 Prompt
    ExecutionEngine->>LLM_API: HTTP 请求 (流式)
    LLM_API-->>ExecutionEngine: 流式响应
    ExecutionEngine-->>ReactUI: 实时更新输出
    ExecutionEngine->>SQLite: 保存执行结果
    
    User->>ReactUI: 点击 "Run Tests"
    ReactUI->>Tauri: run_evaluation_matrix(id)
    Tauri->>ExecutionEngine: 批量执行
    loop 每个测试用例
        ExecutionEngine->>LLM_API: 执行测试
        LLM_API-->>ExecutionEngine: 返回结果
        ExecutionEngine->>SQLite: 保存结果
    end
    ExecutionEngine-->>ReactUI: 返回 Matrix 结果
```

---

### 7.5 Tauri Command API 设计

Tauri Command 是前端（React）与后端（Rust）通信的桥梁。以下是核心 API 接口定义：

#### 工作区管理

```rust
/// 打开工作区
#[tauri::command]
async fn open_workspace(path: String) -> Result<Workspace, String> {
    // 1. 验证路径是否存在
    // 2. 读取 vibe.config.yaml
    // 3. 启动文件监听器
    // 4. 扫描所有 .vibe.yaml 文件
    // 5. 返回工作区信息
}

/// 关闭工作区
#[tauri::command]
async fn close_workspace() -> Result<(), String> {
    // 停止文件监听器，清理资源
}

/// 获取工作区配置
#[tauri::command]
async fn get_workspace_config() -> Result<WorkspaceConfig, String> {
    // 返回当前工作区的环境配置
}

/// 更新工作区配置
#[tauri::command]
async fn update_workspace_config(config: WorkspaceConfig) -> Result<(), String> {
    // 保存配置到 vibe.config.yaml
}
```

#### Prompt 管理

```rust
/// 获取 Prompt 列表
#[tauri::command]
async fn list_prompts() -> Result<Vec<PromptMetadata>, String> {
    // 返回当前工作区的所有 Prompt 文件元数据
}

/// 读取 Prompt 内容
#[tauri::command]
async fn read_prompt(file_path: String) -> Result<PromptRuntime, String> {
    // 解析 YAML 文件并返回 Prompt 对象
}

/// 保存 Prompt
#[tauri::command]
async fn save_prompt(file_path: String, content: PromptRuntime) -> Result<(), String> {
    // 序列化为 YAML 并写入文件
}

/// 创建新 Prompt
#[tauri::command]
async fn create_prompt(file_path: String, template: String) -> Result<PromptRuntime, String> {
    // 根据模板创建新文件
}

/// 删除 Prompt
#[tauri::command]
async fn delete_prompt(file_path: String) -> Result<(), String> {
    // 删除文件（需要确认）
}
```

#### 执行引擎

```rust
/// 单次执行 Prompt
#[tauri::command]
async fn execute_prompt(
    prompt_id: String,
    variables: HashMap<String, String>,
    environment: Option<String>,
) -> Result<ExecutionResult, String> {
    // 1. 加载 Prompt 和环境配置
    // 2. 替换变量
    // 3. 调用 LLM API
    // 4. 保存执行结果到 SQLite
    // 5. 返回结果
}

/// 流式执行 Prompt（支持实时输出）
#[tauri::command]
async fn execute_prompt_stream(
    window: tauri::Window,
    prompt_id: String,
    variables: HashMap<String, String>,
    environment: Option<String>,
) -> Result<String, String> {
    // 通过 window.emit() 发送流式事件
    // 事件名: "prompt_stream_chunk"
}

/// 批量执行测试矩阵
#[tauri::command]
async fn run_evaluation_matrix(
    window: tauri::Window,
    prompt_id: String,
) -> Result<Vec<ExecutionResult>, String> {
    // 1. 读取测试数据文件（CSV/JSON）
    // 2. 并发执行所有测试用例（限流）
    // 3. 如果配置了 Evaluator，自动运行评测
    // 4. 实时发送进度事件: "matrix_progress"
    // 5. 返回所有结果
}

/// 停止当前执行
#[tauri::command]
async fn cancel_execution(execution_id: String) -> Result<(), String> {
    // 取消正在运行的任务
}
```

#### 环境管理

```rust
/// 获取所有环境
#[tauri::command]
async fn list_environments() -> Result<Vec<Environment>, String> {
    // 返回 vibe.config.yaml 中定义的所有环境
}

/// 获取当前激活的环境
#[tauri::command]
async fn get_active_environment() -> Result<String, String> {
    // 返回当前选中的环境名称
}

/// 切换环境
#[tauri::command]
async fn switch_environment(env_name: String) -> Result<(), String> {
    // 切换到指定环境
}

/// 测试环境连接
#[tauri::command]
async fn test_environment(env_name: String) -> Result<bool, String> {
    // 发送测试请求验证 API Key 和连接
}
```

#### Git 集成

```rust
/// 获取 Git 仓库状态
#[tauri::command]
async fn get_git_status() -> Result<GitStatus, String> {
    // 返回当前仓库状态
    // - 当前分支
    // - 未提交的文件列表（Modified, Untracked, Staged）
    // - 待推送/拉取的 Commit 数量
    // - 是否有冲突
}

/// 获取所有分支
#[tauri::command]
async fn list_git_branches() -> Result<Vec<GitBranch>, String> {
    // 返回本地和远程分支列表
}

/// 切换分支
#[tauri::command]
async fn checkout_branch(branch_name: String) -> Result<(), String> {
    // 切换到指定分支
    // 如果有未提交的更改，提示用户
}

/// 创建新分支
#[tauri::command]
async fn create_branch(branch_name: String) -> Result<(), String> {
    // 基于当前 HEAD 创建新分支
}

/// Stage 文件
#[tauri::command]
async fn git_stage_file(file_path: String) -> Result<(), String> {
    // 将文件添加到暂存区
}

/// Unstage 文件
#[tauri::command]
async fn git_unstage_file(file_path: String) -> Result<(), String> {
    // 将文件从暂存区移除
}

/// Stage 所有更改
#[tauri::command]
async fn git_stage_all() -> Result<(), String> {
    // git add .
}

/// AI 生成 Commit Message
#[tauri::command]
async fn generate_commit_message(
    style: String,        // "conventional" | "detailed" | "simple"
    language: String,     // "auto" | "en-US" | "zh-CN"
    model_env: String,    // 使用哪个环境的模型
) -> Result<GeneratedCommitMessage, String> {
    // 1. 获取 Staged 文件的 Diff
    // 2. 使用配置的 LLM 模型生成 Commit Message
    // 3. 返回生成的消息和元数据（Token 数、成本）
}

/// 提交更改
#[tauri::command]
async fn git_commit(message: String) -> Result<GitCommit, String> {
    // 创建新的 Commit
}

/// 拉取远程更新
#[tauri::command]
async fn git_pull(
    remote: String,   // 默认 "origin"
    branch: String,   // 默认当前分支
    rebase: bool,     // 是否使用 rebase
) -> Result<GitPullResult, String> {
    // 拉取并合并远程更新
    // 返回是否有冲突
}

/// 推送到远程
#[tauri::command]
async fn git_push(
    remote: String,   // 默认 "origin"
    branch: String,   // 默认当前分支
    force: bool,      // 是否强制推送
) -> Result<GitPushResult, String> {
    // 推送本地 Commit 到远程
}

/// 获取远程更新（不合并）
#[tauri::command]
async fn git_fetch(remote: String) -> Result<(), String> {
    // git fetch
}

/// 丢弃文件更改
#[tauri::command]
async fn git_discard_changes(file_path: String) -> Result<(), String> {
    // git checkout -- <file>
}

/// 获取文件的 Git 历史
#[tauri::command]
async fn list_git_versions(file_path: String) -> Result<Vec<GitCommit>, String> {
    // 使用 git2 库获取文件的提交历史
}

/// 查看特定版本的文件内容
#[tauri::command]
async fn get_git_version_content(
    file_path: String,
    commit_sha: String,
) -> Result<String, String> {
    // 读取指定 commit 的文件内容
}

/// 创建 Git Tag
#[tauri::command]
async fn create_git_tag(tag_name: String, message: String) -> Result<(), String> {
    // 为当前 HEAD 创建标签
}

/// 对比两个版本
#[tauri::command]
async fn git_diff(
    file_path: String,
    commit_sha_1: String,
    commit_sha_2: String,
) -> Result<String, String> {
    // 返回 diff 文本
}

/// 获取冲突文件列表
#[tauri::command]
async fn get_conflict_files() -> Result<Vec<String>, String> {
    // 返回有冲突的文件路径列表
}

/// 解析冲突文件内容
#[tauri::command]
async fn parse_conflict_file(file_path: String) -> Result<ConflictContent, String> {
    // 解析冲突标记（<<<<<<< HEAD, =======, >>>>>>>）
    // 返回结构化的冲突内容（Ours, Base, Theirs）
}

/// 解决冲突（选择版本）
#[tauri::command]
async fn resolve_conflict(
    file_path: String,
    resolution: ConflictResolution, // "ours" | "theirs" | "manual"
    content: Option<String>,         // 如果是 manual，提供编辑后的内容
) -> Result<(), String> {
    // 解决冲突并标记为已解决
}

/// Stash 当前更改
#[tauri::command]
async fn git_stash(message: Option<String>) -> Result<(), String> {
    // git stash save
}

/// 应用 Stash
#[tauri::command]
async fn git_stash_pop() -> Result<(), String> {
    // git stash pop
}

/// 获取 Stash 列表
#[tauri::command]
async fn list_git_stashes() -> Result<Vec<GitStash>, String> {
    // 返回所有 stash
}

/// 检测 Remote 认证状态
#[tauri::command]
async fn check_git_auth(remote_url: String) -> Result<GitAuthStatus, String> {
    // 检测远程仓库是否需要认证，当前是否已认证
}

/// 配置 SSH 密钥
#[tauri::command]
async fn configure_ssh_key(
    key_path: Option<String>,  // 自定义路径，null = 使用默认
    passphrase: Option<String>, // SSH 密钥密码（可选）
) -> Result<(), String> {
    // 配置 SSH 密钥
    // 如果有 passphrase，存储到 OS Keychain
}

/// 生成新 SSH 密钥
#[tauri::command]
async fn generate_ssh_key(
    email: String,
    key_type: String,  // "ed25519" | "rsa"
) -> Result<SSHKeyInfo, String> {
    // 生成新的 SSH 密钥对
    // 返回公钥内容供用户复制
}

/// 获取 SSH 公钥
#[tauri::command]
async fn get_ssh_public_key(key_path: Option<String>) -> Result<String, String> {
    // 读取并返回 SSH 公钥内容
}

/// 配置 HTTPS 凭据
#[tauri::command]
async fn configure_https_credentials(
    remote_url: String,
    username: Option<String>,  // PAT 时可以为空或 "x-access-token"
    password: String,          // 密码或 PAT
) -> Result<(), String> {
    // 保存 HTTPS 凭据到 OS Keychain
}

/// 测试 Git 连接
#[tauri::command]
async fn test_git_connection(
    remote_url: String,
    auth_method: String,  // "ssh" | "https"
) -> Result<GitConnectionTest, String> {
    // 测试能否连接到远程仓库
    // 返回测试结果和错误信息（如果失败）
}

/// 获取已保存的凭据
#[tauri::command]
async fn get_saved_git_credentials(
    remote_url: String,
) -> Result<Option<GitCredentials>, String> {
    // 从 OS Keychain 读取凭据
    // 不返回密码/Token 内容，只返回是否存在和类型
}

/// 删除保存的凭据
#[tauri::command]
async fn remove_git_credentials(remote_url: String) -> Result<(), String> {
    // 从 OS Keychain 删除凭据
}
```

**相关数据结构**：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub current_branch: String,
    pub modified: Vec<String>,      // 已修改文件
    pub untracked: Vec<String>,     // 未跟踪文件
    pub staged: Vec<String>,        // 已暂存文件
    pub conflicted: Vec<String>,    // 冲突文件
    pub ahead: usize,               // 领先远程的 Commit 数
    pub behind: usize,              // 落后远程的 Commit 数
    pub is_clean: bool,             // 工作区是否干净
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub last_commit: Option<GitCommit>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitPullResult {
    pub success: bool,
    pub conflicts: Vec<String>,     // 冲突文件列表
    pub merged_commits: usize,      // 合并的 Commit 数量
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitPushResult {
    pub success: bool,
    pub pushed_commits: usize,
    pub rejected: bool,             // 是否被拒绝（远程有新 Commit）
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictContent {
    pub ours: String,               // 本地版本
    pub theirs: String,             // 远程版本
    pub base: Option<String>,       // 共同祖先（如果可用）
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConflictResolution {
    Ours,
    Theirs,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStash {
    pub index: usize,
    pub message: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedCommitMessage {
    pub message: String,            // 生成的 Commit Message
    pub metadata: GenerationMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationMetadata {
    pub model: String,              // 使用的模型
    pub tokens_input: u32,          // 输入 Token 数
    pub tokens_output: u32,         // 输出 Token 数
    pub cost_usd: f64,              // 生成成本
    pub latency_ms: u64,            // 生成耗时
    pub style: String,              // 生成风格
    pub language: String,           // 生成语言
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitAuthStatus {
    pub remote_url: String,
    pub requires_auth: bool,        // 是否需要认证
    pub is_authenticated: bool,     // 是否已认证
    pub auth_method: Option<String>, // "ssh" | "https" | null
    pub last_checked: i64,          // 上次检查时间
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSHKeyInfo {
    pub public_key: String,         // 公钥内容
    pub private_key_path: String,   // 私钥路径
    pub key_type: String,           // "ed25519" | "rsa"
    pub fingerprint: String,        // 指纹
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitConnectionTest {
    pub success: bool,
    pub message: String,            // 成功或错误消息
    pub remote_url: String,
    pub auth_method: String,
    pub latency_ms: u64,            // 连接耗时
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCredentials {
    pub remote_url: String,
    pub auth_type: String,          // "ssh" | "https_token" | "https_password"
    pub username: Option<String>,   // HTTPS 用户名
    pub has_credential: bool,       // 是否有保存的凭据
    // 注意：不返回实际的密码/Token
}
```

#### 历史与缓存

```rust
/// 获取执行历史
#[tauri::command]
async fn get_execution_history(
    prompt_id: Option<String>,
    limit: usize,
    offset: usize,
) -> Result<Vec<ExecutionResult>, String> {
    // 从 SQLite 查询历史记录
}

/// 获取特定执行结果
#[tauri::command]
async fn get_execution_result(execution_id: String) -> Result<ExecutionResult, String> {
    // 根据 ID 查询完整结果
}

/// 清除历史记录
#[tauri::command]
async fn clear_history(before_timestamp: Option<i64>) -> Result<usize, String> {
    // 删除指定时间前的记录，返回删除数量
}

/// 导出执行结果
#[tauri::command]
async fn export_results(
    execution_ids: Vec<String>,
    format: String, // "csv" | "json"
) -> Result<String, String> {
    // 导出为 CSV 或 JSON 格式
}
```

#### 密钥管理

```rust
/// 保存 API Key 到系统 Keychain
#[tauri::command]
async fn save_api_key(
    environment: String,
    api_key: String,
) -> Result<(), String> {
    // 使用 keyring 库保存到 OS Keychain
    // Service: "dev.vibebase"
    // Account: "env:{environment}"
}

/// 验证 API Key 是否存在
#[tauri::command]
async fn has_api_key(environment: String) -> Result<bool, String> {
    // 检查 Keychain 中是否存在密钥
}

/// 删除 API Key
#[tauri::command]
async fn delete_api_key(environment: String) -> Result<(), String> {
    // 从 Keychain 删除
}
```

---

### 7.6 SDK 接口设计

#### Python SDK

```python
# vibebase-sdk Python 包

from typing import Dict, List, Optional
from pathlib import Path

class VibeClient:
    """VibeBase Python SDK 客户端"""
    
    def __init__(self, workspace: str):
        """
        初始化客户端
        
        Args:
            workspace: 工作区路径
        """
        self.workspace = Path(workspace)
        self.config = self._load_config()
    
    def load_prompt(self, path: str) -> Prompt:
        """
        加载 Prompt 文件
        
        Args:
            path: 相对于工作区的文件路径
            
        Returns:
            Prompt 对象
        """
        pass
    
    def list_prompts(self) -> List[str]:
        """列出所有 Prompt 文件路径"""
        pass

class Prompt:
    """Prompt 对象"""
    
    def __init__(self, runtime: dict, client: VibeClient):
        self.runtime = runtime
        self.client = client
    
    def execute(
        self,
        variables: Dict[str, str],
        environment: Optional[str] = None,
        stream: bool = False,
    ) -> ExecutionResult:
        """
        执行 Prompt
        
        Args:
            variables: 变量字典
            environment: 环境名称（默认使用配置中的默认环境）
            stream: 是否流式输出
            
        Returns:
            执行结果
        """
        pass
    
    def run_tests(
        self,
        environment: Optional[str] = None,
        parallel: int = 5,
    ) -> List[ExecutionResult]:
        """
        运行测试矩阵
        
        Args:
            environment: 环境名称
            parallel: 并发数
            
        Returns:
            所有测试结果
        """
        pass

class ExecutionResult:
    """执行结果"""
    
    output: str
    metadata: ExecutionMetadata
    evaluation_results: List[EvaluationResult]
    
    def to_dict(self) -> dict:
        """转换为字典"""
        pass

# 使用示例
client = VibeClient(workspace="./my-ai-project")
prompt = client.load_prompt("prompts/greeting.vibe.yaml")

result = prompt.execute(
    variables={"user_name": "Alice"},
    environment="production"
)

print(result.output)
print(f"Latency: {result.metadata.latency_ms}ms")
print(f"Cost: ${result.metadata.cost_usd}")
```

#### Node.js SDK

```typescript
// vibebase-sdk npm 包

import { z } from 'zod';

export interface VibeClientOptions {
  workspace: string;
}

export class VibeClient {
  private workspace: string;
  private config: WorkspaceConfig;

  constructor(options: VibeClientOptions) {
    this.workspace = options.workspace;
    this.config = this.loadConfig();
  }

  /**
   * 加载 Prompt 文件
   */
  async loadPrompt(path: string): Promise<Prompt> {
    // 读取并解析 YAML 文件
  }

  /**
   * 列出所有 Prompt
   */
  async listPrompts(): Promise<string[]> {
    // 扫描 .vibe.yaml 文件
  }
}

export class Prompt {
  private runtime: PromptRuntime;
  private client: VibeClient;

  constructor(runtime: PromptRuntime, client: VibeClient) {
    this.runtime = runtime;
    this.client = client;
  }

  /**
   * 执行 Prompt
   */
  async execute(options: {
    variables: Record<string, string>;
    environment?: string;
    stream?: boolean;
  }): Promise<ExecutionResult> {
    // 调用 LLM API
  }

  /**
   * 运行测试矩阵
   */
  async runTests(options?: {
    environment?: string;
    parallel?: number;
  }): Promise<ExecutionResult[]> {
    // 批量执行测试
  }
}

export interface ExecutionResult {
  output: string;
  metadata: ExecutionMetadata;
  evaluationResults: EvaluationResult[];
}

// 使用示例
const client = new VibeClient({
  workspace: './my-ai-project',
});

const prompt = await client.loadPrompt('prompts/greeting.vibe.yaml');

const result = await prompt.execute({
  variables: { user_name: 'Alice' },
  environment: 'production',
});

console.log(result.output);
console.log(`Latency: ${result.metadata.latencyMs}ms`);
console.log(`Cost: $${result.metadata.costUsd}`);
```

---

## 8. 开发路线图 (Roadmap)

### 总体规划

**目标**：在 12 周（约 3 个月）内完成 MVP，发布 v1.0 版本

**里程碑**：
- **Week 2**：Demo 版本（可展示核心概念）
- **Week 6**：Alpha 版本（核心功能可用，内部测试）
- **Week 10**：Beta 版本（功能完整，公开测试）
- **Week 12**：v1.0 正式发布

---

### Phase 1: 基础架构 (Week 1-4)

#### Week 1: 项目初始化与核心框架

**目标**：搭建项目骨架，实现基础的文件读取功能

**任务清单**：
- [ ] 创建 Tauri 项目脚手架
  - 配置 Rust 后端项目结构（`src-tauri/`）
  - 配置 React + TypeScript 前端（`src/`）
  - 配置 Vite 构建系统
  - 配置 Tailwind CSS + Shadcn/ui
- [ ] 实现国际化基础设施
  - 配置 `react-i18next`
  - 创建翻译文件结构（`src/locales/`）
  - 实现语言切换逻辑
  - 初始支持：简体中文、英文
- [ ] 实现主题系统基础
  - 配置 Dark Mode（Tailwind dark mode）
  - 定义 CSS 变量（Light / Dark 调色板）
  - 实现主题切换逻辑
  - 主题持久化
- [ ] 实现基础 UI 布局
  - 三栏式布局（Navigator + Canvas + Inspector）
  - 左侧文件树组件（使用 React Tree View）
  - 空白编辑器区域
  - **所有 UI 支持 i18n 和 Dark Mode**
- [ ] 实现 "Open Workspace" 功能
  - Tauri 文件对话框集成
  - 目录扫描（递归查找 `.vibe.yaml` 文件）
  - 在左侧文件树显示结果
- [ ] 编写单元测试
  - 文件扫描逻辑测试

**交付物**：
- 可运行的 Tauri 应用（macOS / Windows）
- 支持中英文切换，支持 Light/Dark Mode
- 能够打开文件夹并显示文件列表

---

#### Week 2: YAML 解析与编辑器

**目标**：实现 `.vibe.yaml` 文件的解析和基础编辑

**任务清单**：
- [ ] 实现 YAML 解析器（Rust）
  - 使用 `serde_yaml` 解析 `.vibe.yaml`
  - 定义 Rust 数据结构（`PromptRuntime`）
  - 支持多提供商配置（OpenAI, Anthropic, DeepSeek, OpenRouter, Ollama）
  - 错误处理（格式校验、必填字段检查）
- [ ] 集成 Monaco Editor
  - 安装 `@monaco-editor/react`
  - 配置 YAML 语法高亮
  - 实现基础编辑功能（编辑、保存）
  - **同步应用主题到 Monaco Editor（Light/Dark）**
- [ ] 实现变量高亮
  - 正则提取 `{{variable}}` 
  - 使用 Monaco Decorations API 高亮显示
- [ ] 实现文件保存
  - Tauri Command: `save_prompt`
  - 写入文件系统
- [ ] 补充翻译文件
  - 编辑器相关的所有文本（简中 + 英文）
- [ ] 编写集成测试
  - YAML 解析正确性测试
  - 文件保存/读取测试
  - Dark Mode UI 测试

**交付物**：
- 可以打开、编辑、保存 `.vibe.yaml` 文件
- 变量高亮显示
- Monaco Editor 主题与应用同步

**Demo 里程碑** ✅

---

#### Week 3: 执行引擎基础

**目标**：实现单次 Prompt 执行

**任务清单**：
- [ ] 实现 OpenAI API 集成（Rust）
  - 使用 `reqwest` crate 发送 HTTP 请求
  - 实现 Chat Completions API 调用
  - 支持流式响应（SSE）
- [ ] 实现变量替换引擎
  - 模板引擎（支持 `{{variable}}` 替换）
  - 类型验证（string, number, boolean）
- [ ] 实现执行 UI
  - 右侧 Variables 面板（输入框）
  - "Run" 按钮
  - 流式输出显示区域
- [ ] 实现执行结果存储
  - SQLite 数据库初始化
  - 存储执行记录到 `execution_history` 表
- [ ] 错误处理
  - API Key 未配置提示
  - 网络错误处理
  - 超时处理（60s）

**交付物**：
- 可以执行 Prompt 并实时显示输出
- 执行历史保存到本地数据库

---

#### Week 4: 环境管理

**目标**：支持多环境配置和切换

**任务清单**：
- [ ] 实现 `vibe.config.yaml` 解析
  - 解析环境配置（`environments`）
  - 验证配置完整性
- [ ] 实现 OS Keychain 集成
  - 使用 `keyring` crate
  - `save_api_key` / `get_api_key` 命令
  - 首次使用引导（输入 API Key）
- [ ] 实现环境切换 UI
  - 顶部环境下拉菜单
  - 显示当前环境（Development / Production）
  - 切换时自动替换模型配置
- [ ] 实现"Test Connection"功能
  - 发送测试请求验证 API Key
  - 显示连接状态（✓ / ✗）
- [ ] 编写端到端测试
  - 环境切换流程测试

**交付物**：
- 支持多环境配置
- API Key 安全存储在系统 Keychain

---

### Phase 2: 测试与评测 (Week 5-8)

#### Week 5: 文件监听与热重载

**目标**：实现双向同步（VibeBase ↔ 外部编辑器）

**任务清单**：
- [ ] 实现文件监听（Rust）
  - 使用 `notify` crate
  - 监听 `.vibe.yaml` 文件变更
  - 监听 `vibe.config.yaml` 变更
- [ ] 实现热重载
  - 文件变更时自动刷新 UI
  - 使用 Tauri Event 通知前端
  - 处理冲突（编辑中的文件被外部修改）
- [ ] 优化用户体验
  - 防抖（Debounce）：300ms 内的连续变更合并
  - 显示"文件已更新"提示

**交付物**：
- 在 VS Code 中修改文件，VibeBase 自动刷新
- 在 VibeBase 中修改文件，VS Code 自动刷新

---

#### Week 6: 测试矩阵 - CSV 支持

**目标**：支持批量测试（CSV 数据源）

**任务清单**：
- [ ] 实现 CSV 解析（Rust）
  - 使用 `csv` crate
  - 解析 CSV 文件为测试用例列表
  - 验证 CSV Header 与 Prompt 变量匹配
- [ ] 实现 Matrix 执行引擎
  - 并发执行（Tokio Semaphore 限流）
  - 实时进度反馈（Tauri Event）
  - 支持暂停/取消
- [ ] 实现 Matrix 结果 UI
  - 底栏展示表格（DataTable 组件）
  - 列：Input Vars | Output | Latency | Cost
  - 支持排序、筛选
- [ ] 实现成本计算
  - Token 计数（使用 `tiktoken` 或近似算法）
  - 根据模型定价计算成本
  - 汇总总成本

**交付物**：
- 可以运行 CSV 测试数据集
- 底部表格显示所有结果

**Alpha 里程碑** ✅

---

#### Week 7: 测试矩阵 - JSON 支持与导出

**目标**：支持复杂测试数据和结果导出

**任务清单**：
- [ ] 实现 JSON 解析
  - 支持嵌套对象和数组
  - 支持 `expected` 字段（用于 Level 2 评测）
- [ ] 实现 Level 2 评测
  - `contains` 关键词检查
  - `not_contains` 禁词检查
  - `regex` 正则匹配
  - `length` 长度检查
  - 在 Matrix 表格中显示评测结果（✓ / ✗）
- [ ] 实现结果导出
  - 导出为 CSV（Excel 兼容）
  - 导出为 JSON（程序化处理）
  - 导出为 Markdown（文档）
- [ ] 补充多语言翻译（P1）
  - 繁体中文（zh-TW）100% 翻译
  - 日语（ja-JP）100% 翻译
  - 更新所有现有界面文本

**交付物**：
- 支持 JSON 测试数据
- 支持基础自动化评测
- 支持导出测试结果
- 完整支持简中、英文、繁中、日语

---

#### Week 8: AI 评测器（Level 3）

**目标**：实现 LLM-as-a-Judge 评测

**任务清单**：
- [ ] 实现评测器 YAML 解析
  - 解析 `type: judge` 文件
  - 解析 `output_parser` 配置
- [ ] 实现评测执行逻辑
  - 主 Prompt 执行后，自动调用评测器
  - 将 `{{target_output}}` 传递给评测器
  - 解析评测器输出（JSON Parser）
- [ ] 实现评测结果展示
  - Matrix 表格增加 `Score` 和 `Reasoning` 列
  - 支持多个评测器（并排显示）
- [ ] 实现加权综合评分
  - 根据 `weight` 计算总分
  - 显示综合评分

**交付物**：
- 支持 AI 评测器
- Matrix 表格显示评分

---

### Phase 3: Git 集成与高级功能 (Week 9-12)

#### Week 9: Git 集成与版本控制

**目标**：完整的 Git 工作流支持（Status, Commit, Pull, Push, Branch）

**任务清单**：
- [ ] 实现 Git 核心操作（Rust）
  - 使用 `git2` crate
  - `get_git_status`: 获取仓库状态
  - `git_stage_file` / `git_unstage_file`: Stage/Unstage 文件
  - `git_commit`: 提交更改
  - `git_pull`: 拉取远程更新（支持 merge 和 rebase）
  - `git_push`: 推送到远程（支持 force push）
  - `git_fetch`: 获取远程更新（不合并）
  - `list_git_branches` / `checkout_branch` / `create_branch`: 分支管理
- [ ] 实现 Source Control UI
  - 左侧栏新增 "Source Control" 标签页
  - 显示 Changes / Staged Changes 列表
  - Commit Message 输入框
  - **AI 生成 Commit Message 按钮和配置**
  - Stage/Unstage 按钮
  - Commit / Sync 按钮
- [ ] 实现 AI 生成 Commit Message
  - 内置生成 Prompt 模板
  - 调用用户配置的模型
  - 支持多种风格（Conventional / Detailed / Simple）
  - 支持多语言
  - 显示生成成本和 Token 数
  - 提供重新生成和编辑功能
- [ ] 实现 Git 状态指示器
  - 顶部显示当前分支和同步状态（↑↓）
  - 文件树中显示文件状态标记（M, U, A, C）
  - 实时监听文件变更并更新状态
- [ ] 实现冲突检测与解决
  - Pull 时检测冲突
  - 显示冲突文件列表
  - 提供三栏冲突解决视图（Ours | Base | Theirs）
  - Accept Ours / Accept Theirs / Manual Edit
- [ ] 实现版本历史功能
  - 查看文件的 Git 历史（Commit 列表）
  - 对比任意两个版本（Diff 视图）
  - Checkout 到历史版本（只读模式）
- [ ] 实现 Tag 管理
  - 创建 Tag（带 message）
  - 查看所有 Tag
  - Push Tag 到远程
- [ ] 实现 Stash 功能
  - 暂存当前更改
  - 查看 Stash 列表
  - 应用 Stash
- [ ] **实现私有仓库支持**
  - SSH 密钥认证（自动检测系统密钥）
  - HTTPS 认证（PAT / 用户名密码）
  - 凭据配置 UI（SSH / HTTPS 配置界面）
  - 凭据安全存储（OS Keychain）
  - 认证状态检测和提示
  - 连接测试功能
  - 支持多平台（GitHub, GitLab, Bitbucket, Azure DevOps, Gitee, 企业内网）
- [ ] 错误处理与用户引导
  - 检测是否为 Git 仓库（如果不是，提示初始化）
  - 检测远程是否配置（如果没有，提示添加 remote）
  - **检测是否需要认证（私有仓库），引导配置凭据**
  - **认证失败时，提供清晰的错误提示和解决方案**
  - Push 被拒绝时，提示先 Pull
  - 提供友好的错误消息和解决建议

**交付物**：
- 完整的 Git 工作流支持（类似 VS Code）
- 可以在应用内完成 Commit, Pull, Push
- 支持分支管理和冲突解决
- 支持查看历史和对比版本

---

#### Week 10: 时间旅行调试

**目标**：实现执行历史的完整记录和重放

**任务清单**：
- [ ] 扩展 SQLite Schema
  - 增加 `prompt_content` 字段（存储完整 YAML）
  - 增加 `prompt_version` 字段（Git SHA）
- [ ] 实现历史记录 UI
  - 底栏新增 "History" 标签页
  - 时间轴 + 卡片列表展示
  - 支持筛选（时间、Prompt、环境、评分）
- [ ] 实现 Replay 功能
  - 点击"Replay"，恢复当时的状态
  - 自动填入变量值
  - 自动切换环境
- [ ] 实现 Compare 功能
  - 选择两条记录进行对比
  - 并排展示输入、输出、指标
  - 高亮差异

**交付物**：
- 完整的时间旅行调试功能
- 可以重放和对比历史执行

**Beta 里程碑** ✅

---

#### Week 11: Python SDK

**目标**：发布 Python SDK v1.0

**任务清单**：
- [ ] 创建 Python 包
  - 项目结构：`vibebase-sdk/`
  - 使用 Pydantic 定义数据模型
  - 使用 PyYAML 解析文件
- [ ] 实现核心 API
  - `VibeClient` 类
  - `Prompt.execute()` 方法
  - `Prompt.run_tests()` 方法
- [ ] 集成 OpenAI / Anthropic SDK
  - 支持 OpenAI API
  - 支持 Anthropic API
  - 支持 OpenAI-compatible endpoints
- [ ] 编写文档和示例
  - README.md
  - 使用示例（Jupyter Notebook）
  - API Reference
- [ ] 发布到 PyPI
  - 配置 `pyproject.toml`
  - 发布到 PyPI
  - 配置 CI/CD（GitHub Actions）

**交付物**：
- `vibebase` Python 包发布到 PyPI
- 完整文档和示例

---

#### Week 12: 优化、测试与发布

**目标**：完成最后的优化和测试，发布 v1.0

**任务清单**：
- [ ] 性能优化
  - 启动时间优化（目标 < 2s）
  - 大文件渲染优化
  - Matrix 执行优化
- [ ] UI/UX 打磨
  - 统一视觉风格
  - 动画和过渡效果
  - 错误提示优化
- [ ] 全面测试
  - 单元测试覆盖率 > 80%
  - 集成测试（E2E）
  - 跨平台测试（macOS / Windows）
  - 性能测试（基准测试）
- [ ] 文档完善
  - 用户手册
  - 开发者文档
  - 视频教程（可选）
- [ ] 发布准备
  - 更新 CHANGELOG.md
  - 打包安装程序（macOS DMG / Windows MSI）
  - GitHub Release
  - 发布到官网（如果有）
- [ ] 社区推广
  - 在 Hacker News / Reddit 发帖
  - 撰写发布博客
  - 联系 AI 社区 KOL

**交付物**：
- VibeBase v1.0 正式发布
- 完整文档
- 安装包

**v1.0 里程碑** 🎉

---

### Phase 4: 扩展功能 (Post-v1.0)

#### 未来版本规划

**v1.1 (Month 4)**：
- [ ] 模型对比模式 (Arena)
- [ ] Node.js SDK
- [ ] 插件系统基础架构

**v1.2 (Month 5-6)**：
- [ ] 链式调用（Prompt 引用 Prompt）
- [ ] 协作功能（团队工作区）
- [ ] 云端同步（可选）

**v2.0 (Month 7+)**：
- [ ] 图形化 Prompt Builder
- [ ] 模板市场
- [ ] 多语言支持（中文、日文）
- [ ] 企业版功能（权限管理、审计日志）

---

## 9. 非功能性需求 (Non-Functional Requirements)

### 9.1 隐私与安全 (Privacy & Security)

#### API Key 管理

**需求**：所有敏感信息必须安全存储，绝不能以明文形式出现在 Git 仓库中。

**实现方案**：
- 使用操作系统原生的密钥管理系统：
  - **macOS**: Keychain Services
  - **Windows**: Credential Manager
  - **Linux**: Secret Service API (libsecret)
- 使用 Rust `keyring` crate 实现跨平台抽象
- Service Name: `dev.vibebase`
- Account 命名规则: `env:{environment_name}`

**存储流程**：
```rust
// 保存 API Key
fn save_api_key(env_name: &str, api_key: &str) -> Result<()> {
    let entry = Entry::new("dev.vibebase", &format!("env:{}", env_name))?;
    entry.set_password(api_key)?;
    Ok(())
}

// 读取 API Key
fn get_api_key(env_name: &str) -> Result<String> {
    let entry = Entry::new("dev.vibebase", &format!("env:{}", env_name))?;
    entry.get_password()
}
```

**配置文件中的引用方式**：
```yaml
environments:
  production:
    provider: openai
    api_key_env_var: "OPENAI_API_KEY_PROD"  # 方式1: 系统环境变量
    # 或
    api_key_ref: "keychain"  # 方式2: 从 OS Keychain 读取
    model: "gpt-4-turbo"
```

#### YAML 注入防护

**风险**：恶意的 YAML 文件可能包含注入攻击。

**防护措施**：
- 变量名白名单验证：只允许字母、数字、下划线，禁止特殊字符
- 变量值长度限制：单个变量最大 10,000 字符
- YAML 解析沙箱：使用 `serde_yaml` 的安全模式，禁止执行任意代码
- 文件大小限制：单个 `.vibe.yaml` 文件最大 1MB

```rust
fn validate_variable_name(name: &str) -> Result<()> {
    let regex = Regex::new(r"^[a-zA-Z_][a-zA-Z0-9_]*$")?;
    if !regex.is_match(name) {
        return Err("Invalid variable name");
    }
    Ok(())
}
```

#### 插件系统沙箱（P2 功能）

如果未来支持插件系统，必须实现权限隔离：
- 插件运行在独立进程中
- 明确声明所需权限（文件读写、网络访问）
- 用户确认后才授予权限
- 参考 VS Code Extension API 的安全模型

---

### 9.2 错误处理策略 (Error Handling)

#### API 限流与重试

**问题**：LLM API 经常遇到 429 限流错误，需要智能重试。

**解决方案**：
- 实现指数退避（Exponential Backoff）
- 初始延迟：1 秒
- 最大重试次数：3 次
- 退避因子：2x（1s → 2s → 4s）
- 遵循 `Retry-After` Header

```rust
async fn execute_with_retry(request: Request) -> Result<Response> {
    let mut delay = Duration::from_secs(1);
    
    for attempt in 1..=3 {
        match send_request(&request).await {
            Ok(response) => return Ok(response),
            Err(e) if e.is_rate_limit() => {
                if attempt < 3 {
                    tokio::time::sleep(delay).await;
                    delay *= 2;
                } else {
                    return Err(e);
                }
            }
            Err(e) => return Err(e),
        }
    }
    
    Err("Max retries exceeded")
}
```

#### 网络异常处理

**场景**：用户离线或网络不稳定。

**处理策略**：
- **执行时**：显示友好错误提示，提供"重试"按钮
- **离线模式**：允许编辑 Prompt，查看历史记录（从 SQLite 读取）
- **自动重连**：网络恢复后自动提示用户重试

**错误提示示例**：
```
❌ 网络请求失败

无法连接到 OpenAI API (https://api.openai.com)

可能的原因：
• 网络连接中断
• API 服务暂时不可用
• 防火墙拦截

建议：
1. 检查网络连接
2. 稍后重试
3. 切换到其他环境

[重试] [查看详情] [取消]
```

#### 文件冲突处理

**场景**：用户同时在 VibeBase 和 VS Code 中修改同一文件。

**检测机制**：
- 使用文件 Hash（SHA-256）检测内容变更
- 保存前对比 Hash，如果不一致则警告

**冲突解决流程**：
```
⚠️  文件冲突检测

文件 "prompts/refund_reply.vibe.yaml" 已被外部程序修改。

VibeBase 版本（你的修改）:
  - content: "You are warm and empathetic..."
  
磁盘版本（外部修改）:
  - content: "You are professional and efficient..."

请选择：
[使用我的版本] [使用磁盘版本] [查看 Diff] [取消]
```

#### 执行超时处理

**配置**：
- 单次执行超时：60 秒
- Matrix 批量执行单个用例超时：30 秒
- 总执行时间提示：超过 5 分钟时显示进度和预估剩余时间

---

### 9.3 性能优化 (Performance)

#### 启动性能

**目标**：冷启动时间 < 2 秒

**优化措施**：
- Tauri 打包优化：启用 LTO（Link Time Optimization）
- 延迟加载：非核心模块（Git、评测器）按需加载
- SQLite 连接池：预先初始化数据库连接
- 工作区索引缓存：首次扫描后缓存文件列表

**性能监控**：
```rust
// 启动时间打点
let start = Instant::now();

// 初始化各模块
init_tauri(); // ~500ms
init_workspace(); // ~800ms
init_ui(); // ~600ms

let total = start.elapsed();
tracing::info!("Startup completed in {:?}", total);
```

#### 编辑器性能

**挑战**：处理大文本时（>10,000 行）可能卡顿。

**优化方案**：
- 使用 Monaco Editor 的虚拟滚动（Virtual Scrolling）
- 语法高亮增量更新：只重新渲染可见区域
- 防抖（Debounce）：变量提取延迟 300ms 执行

#### Matrix 批量执行优化

**场景**：运行 1000 个测试用例。

**并发控制**：
- 使用 Tokio Semaphore 限制并发数
- 默认并发数：5（可配置）
- 根据系统资源动态调整

```rust
async fn run_matrix(cases: Vec<TestCase>) -> Vec<Result> {
    let semaphore = Arc::new(Semaphore::new(5)); // 最多 5 个并发
    
    let tasks: Vec<_> = cases.iter().map(|case| {
        let sem = semaphore.clone();
        async move {
            let _permit = sem.acquire().await;
            execute_case(case).await
        }
    }).collect();
    
    futures::future::join_all(tasks).await
}
```

**进度反馈**：
- 实时更新进度条：`42 / 1000 (4.2%) | ETA: 8m 32s`
- 支持暂停/恢复
- 支持取消（已完成的结果保留）

#### 结果缓存

**策略**：相同输入 + 模型 + 参数 = 相同输出（幂等性假设）

**缓存键计算**：
```rust
fn compute_cache_key(prompt: &Prompt, vars: &HashMap, env: &Environment) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prompt.id.as_bytes());
    hasher.update(serde_json::to_string(vars).unwrap().as_bytes());
    hasher.update(env.model.as_bytes());
    hasher.update(prompt.config.temperature.to_string().as_bytes());
    format!("{:x}", hasher.finalize())
}
```

**缓存失效**：
- Prompt 内容变更
- 环境配置变更
- 手动清除缓存（> 7 天的记录）

---

### 9.4 可观测性 (Observability)

#### 结构化日志

**框架**：使用 Rust `tracing` crate

**日志级别**：
- `ERROR`: 致命错误，需要人工介入
- `WARN`: 非致命问题，但需要关注
- `INFO`: 关键操作（启动、执行、保存）
- `DEBUG`: 详细调试信息
- `TRACE`: 最详细的追踪信息

**日志格式**：
```json
{
  "timestamp": "2025-12-12T10:30:45.123Z",
  "level": "INFO",
  "target": "vibebase::execution",
  "message": "Prompt executed successfully",
  "fields": {
    "prompt_id": "550e8400-e29b-41d4-a716-446655440000",
    "environment": "production",
    "model": "gpt-4-turbo",
    "latency_ms": 1234,
    "tokens_input": 45,
    "tokens_output": 128,
    "cost_usd": 0.0234
  }
}
```

**日志存储**：
- 路径：`~/.vibebase/logs/vibebase.log`
- 日志轮转：每个文件最大 10MB，保留最近 5 个文件
- 使用 `tracing-appender` 实现异步写入

#### 运行历史记录

**存储策略**：
- 所有执行结果保存到 SQLite（`~/.vibebase/history.db`）
- 数据保留期：默认 30 天（可配置）
- 自动清理：每天凌晨 2 点执行清理任务

**Schema 设计**：
```sql
CREATE TABLE execution_history (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL,
    prompt_version TEXT, -- Git SHA
    environment TEXT NOT NULL,
    model TEXT NOT NULL,
    input_vars TEXT NOT NULL, -- JSON
    output TEXT NOT NULL,
    latency_ms INTEGER NOT NULL,
    tokens_input INTEGER NOT NULL,
    tokens_output INTEGER NOT NULL,
    cost_usd REAL NOT NULL,
    evaluation_results TEXT, -- JSON
    timestamp INTEGER NOT NULL,
    INDEX idx_prompt_id (prompt_id),
    INDEX idx_timestamp (timestamp)
);
```

#### 成本追踪

**实时计算**：
- 根据 Token 数和模型定价计算成本
- 定价表内置（定期更新）：

```rust
fn calculate_cost(model: &str, tokens_in: u32, tokens_out: u32) -> f64 {
    let pricing = match model {
        "gpt-4-turbo" => (0.01, 0.03),  // (input, output) per 1K tokens
        "gpt-3.5-turbo" => (0.0005, 0.0015),
        "claude-3-opus" => (0.015, 0.075),
        "claude-3-sonnet" => (0.003, 0.015),
        _ => (0.0, 0.0),
    };
    
    let cost_in = (tokens_in as f64 / 1000.0) * pricing.0;
    let cost_out = (tokens_out as f64 / 1000.0) * pricing.1;
    cost_in + cost_out
}
```

**聚合统计**：
- 按 Prompt 统计：总成本、平均成本、执行次数
- 按时间统计：今日成本、本周成本、本月成本
- 按环境统计：区分开发和生产成本

**UI 展示**：
- 右上角显示当前工作区总成本：`💰 $24.56 (this month)`
- 点击查看详细统计仪表盘

#### 错误上报（可选）

**工具**：集成 Sentry

**隐私保护**：
- 默认关闭，首次启动时询问用户
- 只上报错误堆栈，不包含用户数据（Prompt 内容、API Key）
- 用户可随时在设置中关闭

**上报内容**：
- 错误类型和堆栈
- 应用版本
- 操作系统版本
- 匿名用户 ID（UUID）

---

### 9.5 兼容性 (Compatibility)

#### 操作系统支持

**必须支持**（P0）：
- macOS 11+ (Big Sur 及以上)
  - Intel x86_64
  - Apple Silicon (ARM64)
- Windows 10 / 11
  - x86_64

**未来支持**（P2）：
- Linux (Ubuntu 20.04+, Debian 11+)
  - x86_64
  - ARM64

#### 文件系统兼容性

**路径处理**：
- 使用 Rust `std::path` 进行跨平台路径处理
- 支持相对路径和绝对路径
- 自动处理 Windows 的 `\` 和 Unix 的 `/`

**文件监听**：
- 使用 `notify` crate 的跨平台抽象
- 处理不同系统的文件事件差异

#### Git 兼容性

**要求**：
- 系统已安装 Git（检测 `git --version`）
- 如果未安装，提示用户安装或使用内置 libgit2

**Git 集成方式**：
- 优先使用 `git2` crate（libgit2 绑定）
- 回退方案：调用系统 Git 命令

---

### 9.6 国际化与本地化 (i18n & l10n)

#### 支持的语言

VibeBase 支持以下语言（按优先级排序）：

| 语言 | Locale Code | 状态 | 覆盖率目标 |
|------|-------------|------|-----------|
| 简体中文 | `zh-CN` | P0 | 100% |
| 英文（美国）| `en-US` | P0 | 100% |
| 繁体中文（台湾）| `zh-TW` | P1 | 100% |
| 日语 | `ja-JP` | P1 | 100% |
| 韩语 | `ko-KR` | P2 | 90% |
| 西班牙语 | `es-ES` | P2 | 90% |

#### 语言切换方式

**自动检测**（首次启动）：
- 根据操作系统语言自动选择
- 优先级：`zh-CN` > `en-US` > `zh-TW` > `ja-JP`

**手动切换**：
- 在设置界面选择语言
- 实时切换，无需重启应用

**配置持久化**：
- 保存在 `vibe.config.yaml` 的 `locale` 字段
- 也可保存在 `~/.vibebase/preferences.json`（用户全局设置）

#### 国际化技术方案

**前端（React）**：
- 使用 `react-i18next` 库
- 翻译文件存储在 `src/locales/` 目录

```
src/locales/
├── en-US/
│   ├── common.json       # 通用文本
│   ├── editor.json       # 编辑器相关
│   ├── settings.json     # 设置页面
│   └── errors.json       # 错误消息
├── zh-CN/
│   ├── common.json
│   ├── editor.json
│   ├── settings.json
│   └── errors.json
└── ja-JP/
    └── ...
```

**示例翻译文件** (`en-US/common.json`)：
```json
{
  "app": {
    "name": "VibeBase",
    "slogan": "Version your vibe, scale your base."
  },
  "menu": {
    "file": "File",
    "edit": "Edit",
    "view": "View",
    "help": "Help"
  },
  "actions": {
    "open": "Open",
    "save": "Save",
    "run": "Run",
    "run_tests": "Run Tests",
    "cancel": "Cancel"
  },
  "prompt": {
    "execute": "Execute Prompt",
    "executing": "Executing...",
    "success": "Executed successfully",
    "failed": "Execution failed"
  }
}
```

**示例翻译文件** (`zh-CN/common.json`)：
```json
{
  "app": {
    "name": "VibeBase",
    "slogan": "版本化你的 Prompt，规模化你的应用"
  },
  "menu": {
    "file": "文件",
    "edit": "编辑",
    "view": "视图",
    "help": "帮助"
  },
  "actions": {
    "open": "打开",
    "save": "保存",
    "run": "运行",
    "run_tests": "运行测试",
    "cancel": "取消"
  },
  "prompt": {
    "execute": "执行 Prompt",
    "executing": "执行中...",
    "success": "执行成功",
    "failed": "执行失败"
  }
}
```

**后端（Rust）**：
- 使用 `fluent` crate（Mozilla 的 i18n 解决方案）
- 主要用于系统级错误消息和日志

**日期时间格式化**：
- 使用 `date-fns` 或 `luxon` 进行日期格式化
- 根据 Locale 自动调整格式：
  - `en-US`: `12/25/2025, 2:30 PM`
  - `zh-CN`: `2025年12月25日 14:30`
  - `ja-JP`: `2025/12/25 14:30`

**数字和货币格式化**：
- 成本显示：`$1,234.56` (en-US) vs `¥1,234.56` (zh-CN)
- 百分比：`85.5%` (统一格式)

#### 需要翻译的内容

**必须翻译**（P0）：
- 所有 UI 文本（按钮、标签、菜单）
- 错误提示和警告信息
- 设置界面文本
- 引导和帮助文本

**可选翻译**（P1）：
- 文档和教程
- 示例 Prompt 模板
- 欢迎页面和引导流程

**不翻译**（保持英文）：
- 代码和变量名
- API 字段名
- Git Commit 消息
- 技术术语（如 "Token", "Temperature"）

#### 多语言 UI 设计注意事项

**文本长度差异**：
- 中文通常比英文短 30%
- 日文可能比英文长 20%
- UI 布局需要支持动态宽度

**字体选择**：
- 中文：思源黑体 (Noto Sans CJK SC)
- 日文：思源黑体 (Noto Sans CJK JP)
- 英文：Inter / SF Pro
- 等宽字体（代码）：JetBrains Mono / Fira Code

**RTL 语言支持**（P3）：
- 未来如果支持阿拉伯语、希伯来语，需要支持从右到左布局

---

### 9.7 主题系统 (Theme System)

#### 支持的主题

**内置主题**：
1. **Light Mode（亮色模式）**：默认主题，白色背景
2. **Dark Mode（暗色模式）**：深色背景，护眼
3. **Auto（跟随系统）**：根据操作系统设置自动切换

**未来扩展**（P2）：
- 高对比度主题（可访问性）
- 自定义主题（用户自定义颜色）
- 社区主题市场

#### 主题切换方式

**自动检测**（首次启动）：
- 默认选择 "Auto"，跟随系统主题

**手动切换**：
- 顶部菜单：`View > Theme > Light / Dark / Auto`
- 快捷键：`Cmd/Ctrl + Shift + T`
- 设置界面：Theme Selector

**实时切换**：
- 切换时平滑过渡（200ms CSS transition）
- Monaco Editor 同步切换主题

#### 颜色设计系统

**Light Mode 调色板**：

```css
:root {
  /* 主色调 */
  --color-primary: #3b82f6;        /* 蓝色，用于主要按钮和链接 */
  --color-primary-hover: #2563eb;
  
  /* 背景 */
  --color-bg-primary: #ffffff;     /* 主背景 */
  --color-bg-secondary: #f9fafb;   /* 次要背景（侧边栏）*/
  --color-bg-tertiary: #f3f4f6;    /* 三级背景（悬停状态）*/
  
  /* 文本 */
  --color-text-primary: #111827;   /* 主要文本 */
  --color-text-secondary: #6b7280; /* 次要文本 */
  --color-text-tertiary: #9ca3af;  /* 提示文本 */
  
  /* 边框 */
  --color-border: #e5e7eb;
  
  /* 状态颜色 */
  --color-success: #10b981;        /* 成功 */
  --color-warning: #f59e0b;        /* 警告 */
  --color-error: #ef4444;          /* 错误 */
  --color-info: #3b82f6;           /* 信息 */
  
  /* 语法高亮（Monaco Editor）*/
  --color-variable: #8b5cf6;       /* 变量 {{}} */
  --color-keyword: #3b82f6;        /* 关键字 */
  --color-string: #10b981;         /* 字符串 */
  --color-comment: #9ca3af;        /* 注释 */
}
```

**Dark Mode 调色板**：

```css
:root[data-theme="dark"] {
  /* 主色调 */
  --color-primary: #60a5fa;
  --color-primary-hover: #3b82f6;
  
  /* 背景 */
  --color-bg-primary: #0f172a;     /* 深蓝黑色主背景 */
  --color-bg-secondary: #1e293b;   /* 次要背景 */
  --color-bg-tertiary: #334155;    /* 三级背景 */
  
  /* 文本 */
  --color-text-primary: #f1f5f9;   /* 浅色文本 */
  --color-text-secondary: #cbd5e1; /* 次要文本 */
  --color-text-tertiary: #64748b;  /* 提示文本 */
  
  /* 边框 */
  --color-border: #334155;
  
  /* 状态颜色 */
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;
  --color-info: #60a5fa;
  
  /* 语法高亮 */
  --color-variable: #a78bfa;
  --color-keyword: #60a5fa;
  --color-string: #34d399;
  --color-comment: #64748b;
}
```

#### Monaco Editor 主题同步

```typescript
// 根据应用主题切换 Monaco Editor 主题
function syncMonacoTheme(appTheme: 'light' | 'dark') {
  monaco.editor.setTheme(appTheme === 'dark' ? 'vs-dark' : 'vs');
}

// 监听主题变化
window.addEventListener('theme-change', (e) => {
  syncMonacoTheme(e.detail.theme);
});
```

#### 自定义 Monaco Editor 主题（变量高亮）

```typescript
monaco.editor.defineTheme('vibebase-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'variable', foreground: '8b5cf6', fontStyle: 'bold' },
    { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#111827',
  },
});

monaco.editor.defineTheme('vibebase-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'variable', foreground: 'a78bfa', fontStyle: 'bold' },
    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#0f172a',
    'editor.foreground': '#f1f5f9',
  },
});
```

#### UI 组件适配

**所有组件都需要支持主题切换**：

```tsx
// 使用 Tailwind 的 dark: 前缀
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <button className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">
    Run
  </button>
</div>
```

**图标和插图**：
- 使用 SVG，支持颜色动态替换
- 亮色模式：深色图标
- 暗色模式：浅色图标

**图表和可视化**：
- 使用 Dark Mode 友好的配色
- 避免使用纯白色/纯黑色背景

#### 主题持久化

```yaml
# vibe.config.yaml
theme: "dark"  # light | dark | system
```

或保存在用户全局配置：

```json
// ~/.vibebase/preferences.json
{
  "theme": "dark",
  "locale": "zh-CN",
  "editor": {
    "fontSize": 14,
    "fontFamily": "JetBrains Mono"
  }
}
```

#### 开发规范

**CSS 变量优先**：
- 所有颜色使用 CSS 变量，不要硬编码颜色值
- 避免使用 `#000000` 或 `#ffffff`

**测试要求**：
- 每个 UI 组件都需要在两种主题下测试
- 确保对比度符合 WCAG 2.1 AA 标准（至少 4.5:1）

**性能优化**：
- 使用 CSS `prefers-color-scheme` 媒体查询
- 避免 JavaScript 频繁切换类名

---

### 9.8 可访问性 (Accessibility)

**键盘快捷键**：
- `Cmd/Ctrl + O`: 打开工作区
- `Cmd/Ctrl + S`: 保存当前 Prompt
- `Cmd/Ctrl + R`: 运行 Prompt
- `Cmd/Ctrl + T`: 运行测试矩阵
- `Cmd/Ctrl + ,`: 打开设置
- `Cmd/Ctrl + /`: 切换侧边栏
- `Cmd/Ctrl + Shift + T`: 切换主题

**屏幕阅读器支持**（P2）：
- 使用语义化 HTML 标签
- 提供 ARIA 标签
- 支持 Tab 键导航

**对比度要求**：
- Light Mode: 至少 4.5:1（WCAG AA）
- Dark Mode: 至少 4.5:1（WCAG AA）
- 高对比度主题（P2）: 7:1（WCAG AAA）

---

### 9.7 测试策略

#### 单元测试

**覆盖率目标**：> 80%

**重点模块**：
- YAML 解析器：测试各种边界情况
- 变量替换引擎：测试嵌套变量、转换函数
- 成本计算：验证定价表准确性
- 缓存键生成：确保幂等性

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_variable_replacement() {
        let template = "Hello {{name | upper}}!";
        let vars = hashmap!{"name" => "alice"};
        let result = replace_variables(template, vars);
        assert_eq!(result, "Hello ALICE!");
    }
}
```

#### 集成测试

**工具**：Rust `#[tokio::test]`

**测试场景**：
- Tauri Command 端到端测试
- 文件监听触发更新
- Git 操作（commit、tag、diff）
- API 调用（使用 Mock Server）

#### UI 测试

**工具**：Playwright

**关键流程**：
- 打开工作区 → 选择文件 → 编辑 → 保存
- 运行 Prompt → 查看输出
- 运行测试矩阵 → 查看结果表格
- 切换环境 → 验证配置更新

```typescript
test('execute prompt', async ({ page }) => {
  await page.click('[data-testid="open-workspace"]');
  await page.fill('input[type="file"]', './test-workspace');
  await page.click('[data-testid="prompt-file"]');
  await page.fill('[data-testid="variable-name"]', 'Alice');
  await page.click('[data-testid="run-button"]');
  await expect(page.locator('[data-testid="output"]')).toContainText('Hello Alice');
});
```

#### 性能测试

**指标**：
- 启动时间：< 2s
- 大文件加载（10,000 行）：< 1s
- Matrix 运行 100 个用例：< 30s（5 并发）
- 内存占用：< 200MB（空闲状态）

**工具**：
- Rust `criterion` 进行基准测试
- macOS `Instruments` 分析性能瓶颈

---

## 附录 A: 术语表 (Glossary)

| 术语 | 英文 | 定义 |
|------|------|------|
| **Vibe File** | Vibe File | 以 `.vibe.yaml` 为扩展名的 Prompt 定义文件，是 VibeBase 的核心资产格式 |
| **Prompt** | Prompt | 发送给 LLM 的输入文本，通常包含 System Message 和 User Message |
| **System Message** | System Message | 设定 AI 角色和行为规范的指令，位于对话开头 |
| **User Message** | User Message | 用户的具体请求或问题 |
| **变量** | Variable | 在 Prompt 中使用 `{{variable_name}}` 语法定义的占位符，执行时动态替换 |
| **环境** | Environment | 一组模型配置（Provider + Model + API Key + 参数），如 Development / Production |
| **Matrix Run** | Matrix Run | 批量执行测试用例的过程，通常使用 CSV 或 JSON 数据集 |
| **评测器** | Judge / Evaluator | 用于评估 Prompt 输出质量的另一个 Prompt，通常返回评分和原因 |
| **Level 2 评测** | Level 2 Evaluation | 基于规则的评测，如关键词检查、正则匹配、长度验证 |
| **Level 3 评测** | Level 3 Evaluation | 基于 LLM 的评测，即 LLM-as-a-Judge，由另一个模型进行质量评分 |
| **时间旅行调试** | Time-Travel Debugging | 记录并重放历史执行状态的功能，用于问题排查和效果对比 |
| **Arena** | Arena | 模型对比模式，同时测试多个模型并进行投票和分析 |
| **工作区** | Workspace | 包含 Prompt 文件、测试数据、配置文件的项目文件夹 |
| **本地优先** | Local-First | 数据存储在本地，无需云端服务，保护隐私 |
| **Git-Native** | Git-Native | 将 Git 作为核心版本控制系统，Prompt 文件即代码 |
| **流式输出** | Streaming | LLM 实时返回生成内容，而非等待全部完成后返回 |
| **Token** | Token | LLM 处理的最小文本单元，通常一个 Token 约等于 0.75 个英文单词 |
| **Temperature** | Temperature | 控制 LLM 输出随机性的参数，0 = 确定性，1 = 高随机性 |
| **Top-P** | Top-P / Nucleus Sampling | 控制 LLM 输出多样性的参数，保留累积概率达到 P 的 Token |

---

## 附录 B: 典型项目文件结构 (Project Structure)

### 基础项目结构

```
my-ai-project/
├── vibe.config.yaml              # 项目配置文件（环境、全局设置）
├── prompts/                      # Prompt 文件夹
│   ├── customer-support/         # 按功能分组
│   │   ├── greeting.vibe.yaml   # 欢迎语 Prompt
│   │   ├── refund.vibe.yaml     # 退款回复 Prompt
│   │   └── complaint.vibe.yaml  # 投诉处理 Prompt
│   ├── content-generation/
│   │   ├── blog_post.vibe.yaml
│   │   └── social_media.vibe.yaml
│   └── judges/                   # 评测器文件夹
│       ├── politeness.vibe.yaml  # 礼貌度评测器
│       └── accuracy.vibe.yaml    # 准确性评测器
├── tests/                        # 测试数据文件夹
│   ├── refund_cases.csv         # CSV 测试数据
│   ├── greeting_cases.json      # JSON 测试数据
│   └── edge_cases.json          # 边界情况测试
├── docs/                         # 文档（可选）
│   ├── prompt_guidelines.md     # Prompt 编写规范
│   └── testing_strategy.md      # 测试策略
├── .git/                         # Git 仓库
├── .gitignore                    # Git 忽略规则
└── README.md                     # 项目说明
```

### .gitignore 建议配置

```gitignore
# VibeBase 本地文件（不应提交到 Git）
.vibebase/
*.db
*.db-shm
*.db-wal

# 操作系统文件
.DS_Store
Thumbs.db

# 编辑器配置
.vscode/
.idea/

# 环境变量（如果有）
.env
.env.local

# 注意：vibe.config.yaml 应该提交，但不包含 API Key（使用环境变量引用）
```

### 大型项目结构（多团队）

```
enterprise-ai-platform/
├── vibe.config.yaml
├── prompts/
│   ├── team-customer-service/
│   │   ├── greeting.vibe.yaml
│   │   └── refund.vibe.yaml
│   ├── team-sales/
│   │   ├── lead_qualification.vibe.yaml
│   │   └── proposal_generation.vibe.yaml
│   ├── team-hr/
│   │   ├── candidate_screening.vibe.yaml
│   │   └── onboarding_email.vibe.yaml
│   └── shared/                   # 共享的评测器和工具
│       ├── judges/
│       │   ├── politeness.vibe.yaml
│       │   └── compliance.vibe.yaml
│       └── templates/
│           └── base_template.vibe.yaml
├── tests/
│   ├── customer-service/
│   │   └── refund_test_suite.csv
│   ├── sales/
│   │   └── lead_qualification_tests.json
│   └── shared/
│       └── compliance_tests.json
└── scripts/                      # 自动化脚本
    ├── run_all_tests.sh         # 批量运行所有测试
    └── generate_report.py       # 生成测试报告
```

---

## 附录 C: SDK API 参考 (API Reference)

### Python SDK

#### 安装

```bash
pip install vibebase
```

#### 快速开始

```python
from vibebase import VibeClient

# 初始化客户端
client = VibeClient(workspace="./my-ai-project")

# 加载 Prompt
prompt = client.load_prompt("prompts/greeting.vibe.yaml")

# 执行 Prompt
result = prompt.execute(
    variables={"user_name": "Alice"},
    environment="production"
)

# 查看结果
print(result.output)
print(f"Cost: ${result.metadata.cost_usd}")
print(f"Latency: {result.metadata.latency_ms}ms")
```

#### VibeClient 类

```python
class VibeClient:
    """VibeBase Python SDK 客户端"""
    
    def __init__(self, workspace: str):
        """
        初始化客户端
        
        Args:
            workspace: 工作区路径（包含 vibe.config.yaml 的目录）
        """
        pass
    
    def load_prompt(self, path: str) -> Prompt:
        """
        加载 Prompt 文件
        
        Args:
            path: 相对于工作区的文件路径（如 "prompts/greeting.vibe.yaml"）
            
        Returns:
            Prompt 对象
            
        Raises:
            FileNotFoundError: 文件不存在
            ValueError: YAML 格式错误
        """
        pass
    
    def list_prompts(self) -> List[str]:
        """
        列出所有 Prompt 文件路径
        
        Returns:
            文件路径列表
        """
        pass
    
    def get_environment(self, name: str) -> Environment:
        """
        获取环境配置
        
        Args:
            name: 环境名称（如 "production"）
            
        Returns:
            环境配置对象
        """
        pass
```

#### Prompt 类

```python
class Prompt:
    """Prompt 对象"""
    
    @property
    def name(self) -> str:
        """Prompt 名称"""
        pass
    
    @property
    def description(self) -> Optional[str]:
        """Prompt 描述"""
        pass
    
    @property
    def variables(self) -> List[str]:
        """变量名列表"""
        pass
    
    def execute(
        self,
        variables: Dict[str, Any],
        environment: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> ExecutionResult:
        """
        执行 Prompt
        
        Args:
            variables: 变量字典，键为变量名，值为变量值
            environment: 环境名称（默认使用配置中的默认环境）
            stream: 是否流式输出（如果为 True，返回迭代器）
            **kwargs: 额外的模型参数（覆盖配置中的参数）
            
        Returns:
            执行结果对象
            
        Raises:
            ValueError: 缺少必需变量
            APIError: API 调用失败
        """
        pass
    
    def run_tests(
        self,
        environment: Optional[str] = None,
        parallel: int = 5,
        timeout: int = 30,
    ) -> List[ExecutionResult]:
        """
        运行测试矩阵
        
        Args:
            environment: 环境名称
            parallel: 并发数（默认 5）
            timeout: 单个用例超时时间（秒）
            
        Returns:
            所有测试结果列表
        """
        pass
    
    def validate(self) -> Dict[str, Any]:
        """
        验证 Prompt 配置
        
        Returns:
            验证结果字典，包含 errors 和 warnings
        """
        pass
```

#### ExecutionResult 类

```python
class ExecutionResult:
    """执行结果"""
    
    @property
    def output(self) -> str:
        """模型输出文本"""
        pass
    
    @property
    def metadata(self) -> ExecutionMetadata:
        """执行元数据"""
        pass
    
    @property
    def evaluation_results(self) -> List[EvaluationResult]:
        """评测结果列表"""
        pass
    
    def to_dict(self) -> dict:
        """转换为字典"""
        pass
    
    def to_json(self) -> str:
        """转换为 JSON 字符串"""
        pass
```

#### ExecutionMetadata 类

```python
class ExecutionMetadata:
    """执行元数据"""
    
    model: str                  # 模型名称（如 "gpt-4-turbo"）
    provider: str               # 提供商（如 "openai"）
    latency_ms: int            # 延迟（毫秒）
    tokens_input: int          # 输入 Token 数
    tokens_output: int         # 输出 Token 数
    cost_usd: float            # 成本（美元）
    timestamp: datetime        # 执行时间
```

#### 流式执行示例

```python
# 流式执行
for chunk in prompt.execute(
    variables={"topic": "AI"},
    stream=True
):
    print(chunk, end="", flush=True)
```

#### 批量测试示例

```python
# 运行所有测试
results = prompt.run_tests(environment="production")

# 统计通过率
passed = sum(1 for r in results if all(e.passed for e in r.evaluation_results))
print(f"Pass rate: {passed}/{len(results)} ({passed/len(results)*100:.1f}%)")

# 导出结果
import pandas as pd
df = pd.DataFrame([r.to_dict() for r in results])
df.to_csv("test_results.csv", index=False)
```

---

### Node.js SDK

#### 安装

```bash
npm install vibebase
# 或
yarn add vibebase
```

#### 快速开始

```typescript
import { VibeClient } from 'vibebase';

// 初始化客户端
const client = new VibeClient({ workspace: './my-ai-project' });

// 加载 Prompt
const prompt = await client.loadPrompt('prompts/greeting.vibe.yaml');

// 执行 Prompt
const result = await prompt.execute({
  variables: { user_name: 'Alice' },
  environment: 'production',
});

// 查看结果
console.log(result.output);
console.log(`Cost: $${result.metadata.costUsd}`);
console.log(`Latency: ${result.metadata.latencyMs}ms`);
```

#### TypeScript 类型定义

```typescript
export interface VibeClientOptions {
  workspace: string;
}

export class VibeClient {
  constructor(options: VibeClientOptions);
  loadPrompt(path: string): Promise<Prompt>;
  listPrompts(): Promise<string[]>;
  getEnvironment(name: string): Promise<Environment>;
}

export class Prompt {
  readonly name: string;
  readonly description?: string;
  readonly variables: string[];
  
  execute(options: ExecuteOptions): Promise<ExecutionResult>;
  runTests(options?: RunTestsOptions): Promise<ExecutionResult[]>;
  validate(): Promise<ValidationResult>;
}

export interface ExecuteOptions {
  variables: Record<string, any>;
  environment?: string;
  stream?: boolean;
  [key: string]: any; // 额外的模型参数
}

export interface ExecutionResult {
  output: string;
  metadata: ExecutionMetadata;
  evaluationResults: EvaluationResult[];
  toJSON(): string;
}

export interface ExecutionMetadata {
  model: string;
  provider: string;
  latencyMs: number;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  timestamp: Date;
}
```

---

## 附录 D: 常见问题 (FAQ)

### 1. VibeBase 与 LangChain 有什么区别？

**LangChain** 是一个编程框架，帮助开发者构建复杂的 LLM 应用（如 Agent、RAG）。

**VibeBase** 是一个 Prompt IDE，专注于 Prompt 的编写、测试、版本管理和评测。

两者可以结合使用：用 VibeBase 管理 Prompt 文件，用 LangChain 构建应用逻辑。

---

### 2. 我的 API Key 安全吗？

是的。VibeBase 将 API Key 存储在操作系统的原生密钥管理系统中：
- **macOS**: Keychain
- **Windows**: Credential Manager
- **Linux**: Secret Service

绝不会以明文形式存储在文件或 Git 仓库中。

---

### 3. 我必须使用 Git 吗？

不强制，但**强烈推荐**。

- **如果使用 Git**：可以享受完整的版本控制、团队协作、历史追溯功能
- **如果不使用 Git**：VibeBase 仍然可以正常工作，但会失去以下功能：
  - Source Control 面板
  - Commit / Pull / Push 操作
  - 版本历史和对比
  - 时间旅行调试（只能基于 SQLite 历史）

如果你的项目文件夹不是 Git 仓库，VibeBase 会在首次打开时提示："是否初始化 Git 仓库？"

---

### 4. VibeBase 会自动推送我的代码吗？

**不会**。VibeBase 绝不会自动推送代码，所有 Git 操作都需要用户手动触发：

- **不会自动**：Commit、Push、Merge
- **会自动**：监听文件变更、刷新 Git 状态
- **可配置**：自动 Fetch（定期检查远程更新，但不合并）

这确保你对代码版本有完全的控制权。

---

### 5. 如果我不熟悉 Git，VibeBase 会不会太复杂？

不会。VibeBase 的 Git 集成设计非常友好：

- **图形化界面**：无需记忆 Git 命令
- **引导式操作**：每个按钮都有清晰的说明
- **智能提示**：遇到问题时提供解决建议
- **简化流程**：只暴露最常用的功能（Commit, Pull, Push, Branch）

即使你从未使用过 Git，也能在 5 分钟内上手。

**推荐学习资源**：
- [Git 基础教程](https://git-scm.com/book/zh/v2)
- [GitHub 快速入门](https://docs.github.com/zh/get-started)

---

### 6. AI 生成 Commit Message 会产生多少成本？

**成本非常低**，每次生成约 **$0.001-0.01**（根据模型和 Diff 大小）。

**成本示例**（假设使用 GPT-4o）：
- 小型变更（1-2 个文件，<100 行 Diff）：$0.001-0.003
- 中型变更（3-5 个文件，100-500 行 Diff）：$0.003-0.01
- 大型变更（>10 个文件，>500 行 Diff）：$0.01-0.03

**省钱技巧**：
1. 使用更便宜的模型（GPT-4o-mini：成本降低 80%）
2. 使用本地 Ollama 模型（完全免费）
3. 在设置中查看累计成本，控制预算

**每月成本估算**：
- 假设每天 Commit 5 次，每次 $0.005
- 月成本：5 × 22 × $0.005 = **$0.55/月**

相比手动编写 Commit Message 节省的时间，这个成本微不足道。

---

### 7. AI 生成 Commit Message 是否会泄露代码？

**不会**。VibeBase 的隐私保护措施：

1. **本地处理**：Diff 分析和生成完全在本地进行
2. **用户控制**：只发送到你配置的 LLM 提供商（OpenAI / Anthropic / 本地 Ollama）
3. **不上传到 VibeBase**：你的代码和 Diff 不会发送到 VibeBase 服务器
4. **敏感信息检测**：如果 Diff 包含 API Key、密码等，会警告你
5. **可选择本地模型**：使用 Ollama 本地模型，数据完全不离开电脑

**数据流**：
```
你的电脑 → [可选] 你的 LLM API → 你的电脑
```

**不会经过**：
```
你的电脑 → VibeBase 服务器 ❌
```

---

### 8. VibeBase 是否支持 Git 私有仓库？

**完全支持**！VibeBase 提供企业级的私有仓库认证支持。

**支持的认证方式**：
1. **SSH 密钥认证**（推荐）
   - 自动检测系统 SSH 密钥
   - 支持生成新密钥
   - SSH Agent 支持
   - 密钥密码安全存储在 OS Keychain

2. **HTTPS 认证**
   - Personal Access Token（PAT）
   - 用户名/密码
   - 凭据安全存储在 OS Keychain

**支持的平台**：
- GitHub（公有/私有仓库）
- GitLab（自托管/云端）
- Bitbucket
- Azure DevOps
- Gitee（码云）
- **企业内网 Git 服务器**（支持自签名证书）

**配置方式**：
1. 打开 Source Control 面板
2. 点击 [⋯] → "Configure Credentials"
3. 选择 SSH 或 HTTPS
4. 按引导完成配置
5. 测试连接

**企业用户优势**：
- 所有凭据本地存储，不上传云端
- 支持企业 SSO（未来功能）
- 支持自签名证书（内网环境）
- 完全离线工作（配置后）

---

### 9. 我的公司使用内网 GitLab，VibeBase 能连接吗？

**可以！** VibeBase 完全支持企业内网 Git 服务器。

**配置步骤**：
1. 确保你的电脑能访问内网 GitLab（VPN 或内网环境）
2. 在 VibeBase 中配置 SSH 密钥或 HTTPS Token
3. Remote URL 使用内网地址，如：
   - SSH: `git@gitlab.company.com:team/repo.git`
   - HTTPS: `https://gitlab.company.com/team/repo.git`
4. 如果 GitLab 使用自签名证书，VibeBase 会询问是否信任

**常见场景**：
- 内网 GitLab / GitHub Enterprise
- 自建 Gitea / Gogs 服务器
- 非标准端口（如 `git.company.com:2222`）

完全没有问题！

---

### 10. VibeBase 是否支持其他 LLM 提供商？

v1.0 支持：
- OpenAI（GPT-4, GPT-3.5）
- Anthropic（Claude 3 系列）
- DeepSeek（deepseek-chat, deepseek-coder）
- OpenRouter（多提供商聚合）
- Ollama（本地模型）

未来计划支持：
- Google (Gemini)
- Cohere
- Mistral AI

---

### 4. 可以在团队中使用 VibeBase 吗？

可以。VibeBase 的 Git-Native 设计天然支持团队协作：
- 使用 Git 进行版本控制
- 通过 GitHub/GitLab 进行 Code Review
- 多人可以同时编辑不同的 Prompt 文件

---

### 5. VibeBase 是否收费？

VibeBase 桌面应用和 SDK **完全开源免费**（MIT License）。

你只需要支付 LLM API 的使用费用（OpenAI / Anthropic 等）。

---

### 6. VibeBase 支持哪些语言？

v1.0 完整支持：
- 简体中文（zh-CN）
- 英文（en-US）
- 繁体中文（zh-TW）
- 日语（ja-JP）

可以在设置中切换，或通过 `vibe.config.yaml` 配置 `locale` 字段。

---

### 7. 如何切换深色模式？

三种方式：
1. **菜单**：`View > Theme > Dark Mode`
2. **快捷键**：`Cmd/Ctrl + Shift + T`
3. **设置**：`Settings > Appearance > Theme`

也可以选择"跟随系统"（Auto），自动根据操作系统设置切换。

---

### 8. OpenAI 官方和 OpenRouter 的 GPT-4o 有什么区别？

**技术差异**：
- **OpenAI 官方**：直连 OpenAI API，延迟最低，稳定性最高
- **OpenRouter**：通过 OpenRouter 转发，增加了一层中间层，延迟稍高（+50-200ms）

**成本差异**：
- OpenRouter 的定价可能与官方不同（有时更便宜，有时相同）
- 支持多种支付方式和账户管理

**使用建议**：
- **生产环境**：优先使用官方 API（稳定性）
- **开发测试**：可以使用 OpenRouter（成本优化）
- **备用方案**：配置两个环境，官方 API 故障时切换到 OpenRouter

在 VibeBase 中，可以同时配置两个环境，通过 Arena 模式对比效果。


---

## 附录 E: LLM 提供商配置参考 (Provider Configuration)

### 支持的提供商详细配置

#### 1. OpenAI

```yaml
environments:
  openai_production:
    provider: openai
    model: "gpt-4o"
    api_key_env_var: "OPENAI_API_KEY"
    # base_url 可选，默认为 https://api.openai.com/v1
    parameters:
      temperature: 0.7
      max_tokens: 2000
```

**支持的模型**：
- `gpt-4o` - 最新旗舰模型
- `gpt-4o-mini` - 更快、更便宜的版本
- `gpt-4-turbo` - 上一代旗舰模型
- `gpt-4` - 标准 GPT-4
- `gpt-3.5-turbo` - 快速且经济的模型

**API 文档**：[platform.openai.com/docs](https://platform.openai.com/docs)

**定价**（截至 2025-12）：
- GPT-4o: $5 / 1M input tokens, $15 / 1M output tokens
- GPT-4o-mini: $0.15 / 1M input tokens, $0.60 / 1M output tokens

---

#### 2. Anthropic (Claude)

```yaml
environments:
  anthropic_opus:
    provider: anthropic
    model: "claude-3-opus-20240229"
    api_key_env_var: "ANTHROPIC_API_KEY"
    parameters:
      temperature: 0.7
      max_tokens: 4096
```

**支持的模型**：
- `claude-3-opus-20240229` - 最强能力
- `claude-3-sonnet-20240229` - 平衡性能和成本
- `claude-3-haiku-20240307` - 最快最便宜
- `claude-3-5-sonnet-20241022` - 最新版本

**API 文档**：[docs.anthropic.com](https://docs.anthropic.com)

**定价**（截至 2025-12）：
- Claude 3 Opus: $15 / 1M input tokens, $75 / 1M output tokens
- Claude 3 Sonnet: $3 / 1M input tokens, $15 / 1M output tokens

---

#### 3. DeepSeek

```yaml
environments:
  deepseek_chat:
    provider: deepseek
    model: "deepseek-chat"
    api_key_env_var: "DEEPSEEK_API_KEY"
    base_url: "https://api.deepseek.com/v1"
    parameters:
      temperature: 0.7
```

**支持的模型**：
- `deepseek-chat` - 通用对话模型
- `deepseek-coder` - 代码生成优化模型

**API 文档**：[platform.deepseek.com](https://platform.deepseek.com)

**特点**：
- 国内访问速度快
- 支持中文优化
- 性价比高

---

#### 4. OpenRouter

```yaml
environments:
  openrouter_gpt4:
    provider: openrouter
    model: "openai/gpt-4o"  # 格式: provider/model
    api_key_env_var: "OPENROUTER_API_KEY"
    base_url: "https://openrouter.ai/api/v1"
    parameters:
      temperature: 0.7
```

**支持的模型**（部分）：
- `openai/gpt-4o` - OpenAI GPT-4o
- `openai/gpt-4-turbo` - OpenAI GPT-4 Turbo
- `anthropic/claude-3-opus` - Anthropic Claude 3 Opus
- `anthropic/claude-3-sonnet` - Anthropic Claude 3 Sonnet
- `meta-llama/llama-3-70b-instruct` - Meta Llama 3 70B
- `google/gemini-pro-1.5` - Google Gemini Pro

**API 文档**：[openrouter.ai/docs](https://openrouter.ai/docs)

**特点**：
- 统一接口访问多个提供商
- 自动负载均衡
- 灵活的计费方式

---

#### 5. Ollama（本地模型）

```yaml
environments:
  local_llama:
    provider: ollama
    model: "llama3:70b"
    base_url: "http://localhost:11434/v1"
    # 无需 API Key
    parameters:
      temperature: 0.7
```

**支持的模型**（需本地下载）：
- `llama3:70b` - Meta Llama 3 70B
- `llama3:8b` - Meta Llama 3 8B（更快）
- `mixtral:8x7b` - Mistral Mixtral 8x7B
- `qwen:14b` - 阿里 Qwen 14B
- `codellama:34b` - Code Llama 34B

**安装 Ollama**：
```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# 下载模型
ollama pull llama3:70b

# 启动服务（默认端口 11434）
ollama serve
```

**API 文档**：[github.com/ollama/ollama](https://github.com/ollama/ollama)

**特点**：
- 完全本地运行，无需网络
- 隐私保护
- 无使用成本
- 需要足够的硬件资源（GPU 推荐）

---

#### 6. Azure OpenAI

```yaml
environments:
  azure_gpt4:
    provider: azure_openai
    model: "my-gpt4-deployment"  # 你的部署名称
    api_key_env_var: "AZURE_OPENAI_API_KEY"
    base_url: "https://your-resource.openai.azure.com"
    parameters:
      temperature: 0.7
```

**配置说明**：
- `model` 字段填写你在 Azure 创建的部署名称（不是模型名）
- `base_url` 填写你的 Azure OpenAI 资源端点
- 需要 `api-version` 参数（VibeBase 自动处理）

**API 文档**：[learn.microsoft.com/azure/ai-services/openai](https://learn.microsoft.com/azure/ai-services/openai)

**特点**：
- 企业级 SLA
- 数据隐私保证
- 可在特定区域部署

---

### 提供商选择建议

| 场景 | 推荐提供商 | 理由 |
|------|-----------|------|
| **生产环境** | OpenAI 官方 / Anthropic | 稳定性最高，性能最好 |
| **成本优化** | OpenRouter / DeepSeek | 价格更优惠 |
| **中国大陆** | DeepSeek / OpenRouter | 访问速度快，合规 |
| **隐私保护** | Ollama 本地模型 | 数据不出本地 |
| **企业合规** | Azure OpenAI | 企业级 SLA，数据隐私 |
| **快速原型** | OpenAI GPT-4o-mini | 快速且便宜 |
| **代码生成** | DeepSeek Coder / Claude | 代码能力优化 |

---

**文档版本**: v1.0  
**最后更新**: 2025-12-12
