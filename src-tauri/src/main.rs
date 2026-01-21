// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;

use services::database::AppDatabase;

use commands::workspace::*;
use commands::prompt::*;
use commands::execution::*;
use commands::config::*;
use commands::llm_provider::*;
use commands::validation::*;
use commands::variables::*;
use commands::window::*;
use commands::recent_projects::*;
use commands::provider_models::*;
use commands::history::*;
use commands::metadata::*;
use commands::update::*;
use commands::git::*;

use commands::config::AppSettingsState;

fn main() {
    let app_state = AppState::new();
    let app_db = AppDatabase::new().expect("Failed to initialize app database");
    let llm_provider_state = LLMProviderState::new();
    let variables_state = VariablesState::new(app_db);
    let app_settings_state = AppSettingsState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(app_state)
        .manage(llm_provider_state)
        .manage(variables_state)
        .manage(app_settings_state)
        .invoke_handler(tauri::generate_handler![
            open_workspace,
            list_prompts,
            create_folder,
            move_file,
            rename_file,
            delete_file,
            delete_file_with_metadata,
            read_prompt,
            save_prompt,
            create_new_prompt,
            parse_yaml,
            extract_variables,
            extract_variables_from_markdown,
            load_prompt_runtime,
            execute_prompt,
            get_execution_history,
            read_config,
            save_config,
            save_api_key_to_keychain,
            get_api_key_from_keychain,
            has_api_key_in_keychain,
            delete_api_key_from_keychain,
            get_api_key_for_environment,
            get_arena_settings,
            save_arena_settings,
            save_app_setting,
            get_app_setting,
            list_llm_providers,
            save_llm_provider,
            update_llm_provider,
            delete_llm_provider,
            get_llm_provider,
            test_llm_provider_connection,
            list_enabled_models,
            validate_prompt_file,
            validate_workspace,
            quick_validate_file,
            list_global_variables,
            save_global_variables,
            get_global_variable,
            delete_global_variable,
            open_variables_window,
            open_settings_window,
            open_arena_window,
            open_arena_history_window,
            open_arena_statistics_window,
            set_window_theme,
            get_system_theme,
            get_platform,
            get_recent_projects,
            add_recent_project,
            remove_recent_project,
            toggle_pin_project,
            fetch_provider_models,
            test_provider_connection,
            save_file_history,
            get_file_history,
            get_history_content,
            apply_history,
            get_prompt_metadata,
            save_prompt_metadata,
            get_all_tags,
            get_workspace_stats,
            initialize_workspace_db,
            clear_workspace_db,
            save_arena_battle,
            update_arena_votes,
            get_arena_battles,
            get_arena_statistics,
            show_in_folder,
            check_for_updates,
            install_update,
            get_app_version,
            get_git_config,
            save_git_config,
            get_git_status,
            list_branches,
            checkout_branch,
            create_branch,
            stage_files,
            commit_changes,
            pull_changes,
            push_changes,
            get_commit_history,
            get_git_diff,
            get_workspace_git_summary,
            generate_commit_message,
            get_system_git_config,
            init_git_repository,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

