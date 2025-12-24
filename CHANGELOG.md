# Changelog

All notable changes to VibeBase will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-12-24

### Changed
- **Internationalization Improvements**: Enhanced multi-language support for button hover tooltips across the interface
  - All buttons in Variables Manager now use i18n translations for tooltips
  - "Global Variables" and "Settings" button tooltips in the Header toolbar are now internationalized
  - Inspector area placeholder text when no file is selected is now internationalized
  - All translations synchronized across Simplified Chinese, Traditional Chinese, and English

### Fixed
- Fixed missing internationalization for hover tooltips on various UI elements
- Improved consistency of multi-language user experience across the interface

## [0.2.0] - 2025-12-24

### 🚀 Major Update: Tauri 2.0 Migration

This release represents a significant architectural upgrade with the migration from Tauri 1.x to Tauri 2.0, introducing breaking changes in the permission system and window management.

### Added
- **Real-time Token Estimation**: Added live token counting in the editor header using `js-tiktoken`
  - Displays estimated token count for current Markdown file (gpt-4/cl100k_base encoding)
  - Shows "..." loading state when switching files or during calculation
  - 800ms debounce to prevent UI freezing during typing
  - Token count displayed in right side of editor header with "Tokens: XXX" format
  - Automatically hidden when viewing history versions
  - Uses thousand separators for better readability (e.g., "1,234")
- **Tauri 2.0 Permission System (ACL)**: Implemented comprehensive capability-based permission system
  - Created `src-tauri/capabilities/default.json` with all necessary window management permissions
  - Added explicit permissions for window close, minimize, maximize, dragging, and focus operations
  - Resolved all window operation failures caused by missing permissions in Tauri 2.0

### Changed
- **Multi-Platform Window Styling**: Optimized independent window appearance for different operating systems
  - **macOS**: Large rounded corners (`rounded-xl` - 12px) with transparent background
  - **Linux**: Medium rounded corners (`rounded-lg` - 8px)
  - **Windows**: No rounded corners (sharp edges, native Windows style)
  - Window control buttons now match platform conventions (macOS left-side traffic lights, Windows/Linux right-side icons)
- **Window Controls Initialization**: Fixed platform detection to prevent style flashing
  - Changed initial platform state from "macos" to empty string
  - Added UserAgent fallback for platform detection
  - Prevents Windows/Linux users from seeing macOS-style buttons during startup
- **Transparent Window Implementation**: Improved window transparency and rounded corner rendering
  - Modified global CSS to use transparent body background
  - Moved background color to `#root` container for proper layering
  - macOS-only transparent window configuration using conditional compilation

### Fixed
- **Tauri 2.0 Window Operations**: Fixed all window management issues after Tauri 2.0 upgrade
  - Window close, minimize, maximize now work correctly with proper async/await handling
  - Window dragging via `data-tauri-drag-region` now functional with ACL permissions
  - All window API calls properly await Promise resolution
- **Window Styling Consistency**: Resolved window appearance issues across platforms
  - Fixed rounded corners not displaying on macOS due to opaque body background
  - Corrected platform-specific styling to match OS conventions
  - Eliminated style flashing when opening new windows
- **Permission Configuration**: Removed invalid `core:window:allow-set-zoom` permission that caused build errors

### Technical Details
- Added `js-tiktoken` dependency (v1.0.21) for client-side token calculation
- Implemented debounced token counting with React hooks and refs
- Created Tauri 2.0 capabilities configuration following new security model
- Updated Rust window creation code with platform-specific conditional compilation
- Enhanced CSS architecture for transparent window support

## [0.1.11] - 2025-12-23

### Added
- **Custom Provider Type**: Added dedicated "custom" provider type to properly distinguish custom providers from built-in OpenAI provider, eliminating configuration conflicts
- **Custom Provider Editing**: Added ability to edit custom provider configurations after creation, including name, base URL, and description. Name changes are handled by deleting the old configuration and creating a new one.
- **Custom Provider Validation**: Added validation to prevent custom provider names from conflicting with built-in provider IDs and names (case-insensitive)
- **Ollama Provider**: Added Ollama to built-in provider list with special handling:
  - No API Key required (hidden in UI)
  - Configurable Base URL for local or LAN access (default: http://localhost:11434)
  - Supports remote Ollama instances on local network
- **Debug Logging**: Added comprehensive debug logging for custom provider operations (add, update, fetch models, test connection) to help diagnose configuration issues
- **Database Migration System**: Added automatic migration for v0.1.11 to:
  - Simplify built-in provider names by removing `_default` suffix (e.g., `openai_default` → `openai`)
  - Migrate existing custom providers from 'openai' type to 'custom' type and clear their model lists

### Changed
- **Model Display Consistency**: Unified model list display across Arena and Execution panels to show provider name instead of provider type for better clarity (e.g., "Deepseek2" instead of "custom", "deepseek" instead of "deepseek")
- **Provider Naming Convention**: Simplified built-in provider names to use clean IDs (e.g., "openai", "deepseek") instead of "{id}_default" format, with validation preventing custom providers from using these reserved names

### Fixed
- **DeepSeek API Base URL**: Corrected DeepSeek base URL from `https://api.deepseek.com/v1` to `https://api.deepseek.com` according to official documentation
- **Provider Log Labels**: Fixed log messages to correctly display provider names (DeepSeek, OpenRouter, Ollama, AiHubMix) instead of always showing "OpenAI Provider" for OpenAI-compatible APIs
- **Arena Mode Provider Configuration**: Fixed critical bug where Arena mode only set provider correctly for OpenRouter, causing DeepSeek and other providers to use wrong API endpoints and keys. Now all providers are correctly configured in Arena mode.
- **Custom Provider Display and Management**: Fixed custom providers not appearing in the provider list. Custom providers are now correctly identified by their unique name and custom base URL, and can be properly configured, saved, and used for execution.
- **Provider Configuration Isolation**: Fixed critical bug where built-in and custom providers with the same provider type (e.g., OpenAI) would share configurations and models. Now each provider configuration is properly isolated by unique name (built-in use `{id}_default` pattern, custom use user-defined names).
- **Custom Provider Model Fetching**: Fixed model fetching for custom providers with OpenAI-compatible APIs. The GPT model filter is now only applied to official OpenAI API, allowing custom providers to return all their models (e.g., deepseek-chat, deepseek-reasoner).

## [0.1.10] - 2025-12-23

### Added
- **Global Search Feature**: Added comprehensive search functionality in the header toolbar
  - Search across file names, file paths, file content, tags, and history versions
  - Real-time search with 300ms debounce for optimal performance
  - Dropdown search results panel with detailed match information
  - Visual indicators showing match types (content, tags, history)
  - Content snippet preview for matched file content
  - Click to open files directly from search results
  - Full internationalization support (Simplified Chinese, Traditional Chinese, English)

### Improved
- Enhanced search experience with categorized results display
- Search results show match counts for each category (content, tags, history)
- Added color-coded badges for different match types (green for content, blue for tags, amber for history)

### Changed
- Removed unused search code from Navigator component for better code maintainability
- All code comments and logs now use English for international development standards

## [0.1.9] - 2025-12-23

### Added
- **Enhanced cross-platform system theme detection**: Implemented native system theme detection for Windows using registry (winreg) and Linux using gsettings/GTK_THEME
- Added `winreg` dependency for Windows platform to access registry settings

### Changed
- Refactored window command functions to be async for better consistency and performance
- Improved `get_system_theme` command to support all major platforms (macOS, Windows, Linux)

### Fixed
- Minor package.json configuration fixes

## [0.1.8] - 2025-12-23

### Added
- Console UI now uses Eraser icon instead of X icon for clear button to avoid confusion with close button
- History operations now logged to console (history save and history apply)
- File operations now show full absolute paths in console logs instead of just filenames
- **Windows native theme detection**: Now reads Windows registry to detect system dark/light mode
- **Linux theme detection**: Checks GTK_THEME environment variable for theme preference

### Changed
- Improved console log messages to display complete file paths for better traceability
- Enhanced history tracking with console logging for all history save operations
- History apply operations now show version ID in console logs

### Improved
- Console UI/UX: Clear button now visually distinct from window close button
- Better debugging experience with full path information in logs
- More informative log messages for file history operations
- **Windows 10/11 compatibility**: Native system theme detection via registry (AppsUseLightTheme)
- **Cross-platform theme detection**: All platforms now have native or environment-based detection

## [0.1.7] - 2025-12-23

### Fixed
- Fixed Arena History and Arena Statistics windows not opening in production build
- Added missing HTML entry points (arena-history.html, arena-statistics.html) to Vite build configuration
- Improved cross-platform theme detection fallback mechanism

### Changed
- Updated Vite multi-page build configuration to include all window entry points
- Improved system theme detection on non-macOS platforms to return error and rely on JavaScript matchMedia fallback
- Enhanced cross-platform compatibility documentation
- Converted all code comments to English for better international collaboration
- Changed log messages to English for consistency across development teams

### Added
- Console logging system with 10 log types (INFO, SUCCESS, WARNING, ERROR, SAVE, DELETE, CREATE, UPDATE, EXECUTE, GIT)
- Memory-only log storage with automatic cleanup on app close
- Console UI with collapsible panel, log count, and clear button
- Color-coded log types with timestamps
- Logging for file operations (save, create, delete, rename)
- Full i18n support for Console UI (English, Simplified Chinese, Traditional Chinese)
- Logger utility functions for use outside React components
- Created comprehensive cross-platform compatibility documentation
- Added CROSS_PLATFORM_STATUS.md for quick reference
- Added docs/CROSS_PLATFORM_COMPATIBILITY.md for detailed technical information
- Added docs/CONSOLE_LOGGING.md for logging system documentation
- Added CONSOLE_FEATURE_SUMMARY.md and I18N_UPDATE_SUMMARY.md

## [0.1.6] - 2025-12-23

### Fixed
- Fixed TypeScript compilation error in GitSettingsPanel component
- Removed unused `SaveStatus` type declaration

### Changed
- Updated version number across all configuration files

## [0.1.5] - 2025-12-23

### Changed
- Version bump for release preparation
- Updated build configurations

## [0.1.4] - 2025-12-23

### Added
- Arena feature for model comparison
- Arena history tracking
- Arena statistics visualization
- Git integration features
- LLM provider management
- Custom provider support
- Multi-language support (English, Simplified Chinese, Traditional Chinese)

### Changed
- Improved settings panel organization
- Enhanced Git commit message generation
- Updated UI/UX for better user experience

### Fixed
- Various bug fixes and stability improvements

## [0.1.0] - Initial Release

### Added
- Initial release of VibeBase
- Prompt IDE for LLM Engineering
- Monaco editor integration
- File tree navigation
- Workspace management
- Variable management
- Execution panel
- History tracking
- Dark/Light theme support
- Multi-language interface

---

## Version Categories

### Added
New features and functionality

### Changed
Changes in existing functionality

### Deprecated
Features that will be removed in upcoming releases

### Removed
Features that have been removed

### Fixed
Bug fixes

### Security
Security vulnerability fixes
