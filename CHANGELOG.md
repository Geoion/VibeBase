# Changelog

All notable changes to VibeBase will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.8] - 2025-12-23

### Added
- Console UI now uses Eraser icon instead of X icon for clear button to avoid confusion with close button
- History operations now logged to console (history save and history apply)
- File operations now show full absolute paths in console logs instead of just filenames

### Changed
- Improved console log messages to display complete file paths for better traceability
- Enhanced history tracking with console logging for all history save operations
- History apply operations now show version ID in console logs

### Improved
- Console UI/UX: Clear button now visually distinct from window close button
- Better debugging experience with full path information in logs
- More informative log messages for file history operations

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
