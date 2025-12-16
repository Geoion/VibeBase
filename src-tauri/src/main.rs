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

fn main() {
    let app_state = AppState::new();
    let app_db = AppDatabase::new().expect("Failed to initialize app database");
    let llm_provider_state = LLMProviderState::new();
    let variables_state = VariablesState::new(app_db);

    tauri::Builder::default()
        .manage(app_state)
        .manage(llm_provider_state)
        .manage(variables_state)
        .invoke_handler(tauri::generate_handler![
            open_workspace,
            list_prompts,
            create_folder,
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
            save_api_key_to_keychain,
            get_api_key_from_keychain,
            has_api_key_in_keychain,
            delete_api_key_from_keychain,
            get_api_key_for_environment,
            list_llm_providers,
            save_llm_provider,
            update_llm_provider,
            delete_llm_provider,
            get_llm_provider,
            test_llm_provider_connection,
            validate_prompt_file,
            validate_workspace,
            quick_validate_file,
            list_global_variables,
            save_global_variables,
            get_global_variable,
            delete_global_variable,
            open_variables_window,
            open_settings_window,
            get_recent_projects,
            add_recent_project,
            remove_recent_project,
            toggle_pin_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

