// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;

use commands::workspace::*;
use commands::prompt::*;
use commands::execution::*;
use commands::config::*;

fn main() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            open_workspace,
            list_prompts,
            create_folder,
            read_prompt,
            save_prompt,
            create_new_prompt,
            parse_yaml,
            extract_variables,
            execute_prompt,
            get_execution_history,
            read_config,
            save_api_key_to_keychain,
            get_api_key_from_keychain,
            has_api_key_in_keychain,
            delete_api_key_from_keychain,
            get_api_key_for_environment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

