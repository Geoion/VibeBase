# VibeBase

> **A Prompt Management & Model Selection Platform for LLM Engineering**

VibeBase is a local-first desktop application that helps you manage prompts, compare multiple LLM models side-by-side, and debug your prompt engineering workflow with precision.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/Geoion/VibeBase)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-1.5-orange.svg)](https://tauri.app)

**🎯 What is VibeBase?**

A desktop tool for **prompt engineers** and **LLM developers** to:
- 📁 Manage and organize prompts in Markdown format
- 🏟️ Compare multiple models side-by-side (Arena Mode)
- 🔍 Select the best model for your specific use case
- 🐛 Debug prompts with detailed metrics and execution history

## Features

### Core Capabilities

- **🏟️ Arena Mode**: Compare 2-10 LLM models simultaneously to find the best one for your prompt
- **📝 Prompt Management**: Organize, version, and manage prompts in `.vibe.md` Markdown format
- **🔍 Model Selection**: Evaluate different models side-by-side with voting and statistics
- **🐛 Engineering Debug**: Track execution history, metadata, and performance metrics
- **⚡ Multi-Provider Support**: OpenAI, Anthropic, DeepSeek, OpenRouter, Ollama, and more
- **🎨 Monaco Editor**: Professional editing experience with syntax highlighting
- **🔐 Secure API Keys**: Store credentials safely in system Keychain/Credential Manager
- **🗂️ Workspace Management**: Organize prompts with folder structure and file tree navigation

### Engineering & Debug Tools

- **📊 Performance Metrics**: Track latency, token usage, and cost for every execution
- **📈 Arena Statistics**: Analyze model performance with votes, win rates, and comparisons
- **🔄 File History**: Version control for prompt iterations with rollback capability
- **🧪 Global Variables**: Define reusable variables across all prompts for testing
- **⚙️ Metadata Management**: Configure provider, model, temperature, and parameters per prompt
- **💾 Execution History**: Complete audit trail of all prompt executions
- **🌙 Dark Mode**: Adaptive theme (Light/Dark/System) for comfortable debugging
- **🗄️ Workspace Database**: SQLite-based local storage for all your engineering data

## Why VibeBase?

**Problem**: When developing LLM applications, you need to:
- Test the same prompt across multiple models
- Find the best model for your specific use case
- Track performance and cost across different providers
- Version and organize your prompts effectively

**Solution**: VibeBase provides a **unified workspace** where you can:
1. **Manage** all your prompts in one place
2. **Compare** models side-by-side with Arena mode
3. **Debug** with detailed metrics and execution history
4. **Optimize** by analyzing performance and cost data

Perfect for prompt engineers, LLM developers, and AI product teams who need to make data-driven decisions about model selection and prompt optimization.

## Quick Start

### Prerequisites

- Node.js 18+ 
- Rust 1.70+
- macOS, Windows, or Linux

### Installation

```bash
# Clone the repository
git clone https://github.com/Geoion/VibeBase.git
cd VibeBase

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
# Build for your platform
npm run tauri build

# Output will be in src-tauri/target/release/bundle/
```

## Usage

### 1. Open a Workspace

Click "Open Workspace" and select a folder containing your prompts.

### 2. Create a Prompt File

Create a new file with `.vibe.md` extension:

```markdown
# Customer Greeting

Generate personalized greeting messages for customers.

## System Message

You are a friendly customer service representative.
Always be warm and professional.

## User Message

Customer: {{customer_name}}
Account Type: {{account_type}}

Generate a greeting message.
```

### 3. Configure LLM Provider

1. Open Settings (⚙️ icon)
2. Go to **Providers** tab
3. Add a new provider:
   - **Provider**: OpenAI
   - **API Key**: Your OpenAI API key
   - **Models**: Select models to enable (e.g., gpt-4o, gpt-4o-mini)
4. Save configuration

### 4. Execute a Prompt

1. Click on your prompt file in the Navigator
2. Fill in variable values in the Execution panel
3. Select a model from the dropdown
4. Click **Run** button
5. View the response with metadata (latency, tokens, cost)

### 5. Use Arena Mode

1. Open Settings → Arena
2. Enable concurrent execution and configure settings
3. Select multiple models in the Execution panel
4. Click **Run Arena**
5. Compare responses side-by-side
6. Vote for the best response

## Architecture

### Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite (Build tool)
- Tailwind CSS (Styling)
- Monaco Editor (Code editor)
- Zustand (State management)
- react-i18next (Internationalization)

**Backend**
- Tauri 1.5 (Rust)
- SQLite (Database)
- keyring (System Keychain)
- reqwest (HTTP client)
- serde (Serialization)

### Project Structure

```
VibeBase/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # React components
│   │   ├── arena/          # Arena mode components
│   │   ├── editor/         # Monaco editor
│   │   ├── execution/      # Execution panel
│   │   ├── history/        # File history
│   │   ├── metadata/       # Metadata management
│   │   ├── settings/       # Settings panels
│   │   └── variables/      # Global variables
│   ├── stores/             # Zustand stores
│   ├── i18n/               # Translations
│   └── App.tsx             # Main app component
├── src-tauri/              # Backend (Rust)
│   ├── src/
│   │   ├── commands/       # Tauri commands
│   │   ├── db/             # Database operations
│   │   ├── llm/            # LLM integrations
│   │   └── main.rs         # Entry point
│   └── Cargo.toml
└── examples/               # Example workspaces
```

### Data Storage

```
~/.vibebase/                # Global application data
├── app.db                  # Global database
│   ├── llm_providers       # Provider configurations
│   ├── global_variables    # Global variables
│   └── workspace_history   # Recent workspaces
└── logs/                   # Application logs

{workspace}/.vibebase/      # Workspace-specific data
└── workspace.db            # Workspace database
    ├── prompt_metadata     # Prompt configurations
    ├── execution_history   # Execution records
    ├── file_history        # Version history
    └── arena_battles       # Arena results
```

## Supported LLM Providers

| Provider | Status | Base URL | Notes |
|----------|--------|----------|-------|
| **OpenAI** | ✅ | `api.openai.com/v1` | Full support |
| **Anthropic** | ✅ | `api.anthropic.com` | Claude models |
| **DeepSeek** | ✅ | `api.deepseek.com` | Chinese LLM |
| **OpenRouter** | ✅ | `openrouter.ai/api/v1` | Multi-provider gateway |
| **Ollama** | ✅ | `localhost:11434/v1` | Local models |
| **AiHubMix** | ✅ | `aihubmix.com/v1` | OpenAI-compatible |
| **Custom** | ✅ | User-defined | OpenAI-compatible APIs |

### Custom Provider Support

VibeBase supports any OpenAI-compatible API endpoint. You can add custom providers by:

1. Settings → Providers → Add Custom Provider
2. Enter provider ID, display name, and base URL
3. Configure API key and models

## Key Features

### Arena Mode - Find Your Best Model

**The killer feature for model selection and prompt engineering.**

Arena Mode allows you to compare multiple LLM models simultaneously with the same prompt, helping you make data-driven decisions about which model performs best for your specific use case.

**How it works:**

```
1. Select 2-10 models from different providers
2. Run the same prompt across all models concurrently
3. View responses side-by-side in a clean comparison view
4. Vote for the best response based on your criteria
5. Analyze statistics: win rates, average latency, cost per model
6. Make informed decisions about model selection
```

**Arena Settings:**
- **Concurrent Execution**: Run models in parallel for faster results
- **Max Concurrent Models**: Choose 1-10 models (default: 3)
- **Cost Warning**: Get alerts when execution cost exceeds threshold
- **Auto-Save Results**: Automatically save all battle results to database
- **Remember Selection**: Restore previously selected models
- **Card Density**: Customize information density (Compact/Normal/Detailed)

**Use Cases:**
- Compare GPT-4 vs Claude vs DeepSeek for your specific task
- Find the most cost-effective model that meets quality standards
- A/B test different providers for production deployment
- Evaluate new models as they are released

### Global Variables

Define variables once, use everywhere:

```markdown
# In any prompt file
Customer: {{company_name}}
API Endpoint: {{api_base_url}}
```

**Variable Management:**
- Create global variables in Settings
- Use `{{variable_name}}` syntax in prompts
- Override with custom values during execution
- Stored in `~/.vibebase/app.db`

### File History

Every save creates a version snapshot:

- View all historical versions
- Preview differences
- Rollback to any previous version
- Automatic timestamping

### Metadata Management

Configure per-prompt settings:

- **Tags**: Organize and filter prompts
- **Provider Reference**: Link to global LLM configuration
- **Model Override**: Override default model
- **Parameters**: Temperature, max tokens
- **Test Data**: Path to test data file
- **Variables**: Detected variables

## Troubleshooting

### Prompt files not showing up

**Solution:**
1. Ensure files have `.vibe.md` extension
2. Click Refresh button in Navigator
3. Check file is not in hidden directory

### Database errors

**Solution:**
1. Close the application
2. Delete `.vibebase/` directory
3. Restart application (database will be recreated)

### API key issues

**Solution:**
1. Go to Settings → Providers
2. Re-enter API key
3. Test connection with "Test Connection" button

### Arena mode not working

**Solution:**
1. Ensure multiple models are selected
2. Check all providers have valid API keys
3. Verify network connection
4. Check Settings → Arena for configuration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](./LICENSE) file for details

---

**⭐ Star us on GitHub if you find VibeBase useful!**
