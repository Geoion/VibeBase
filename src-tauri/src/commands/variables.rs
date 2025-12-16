use crate::services::database::AppDatabase;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use uuid::Uuid;

pub struct VariablesState {
    pub app_db: Mutex<AppDatabase>,
}

impl VariablesState {
    pub fn new(app_db: AppDatabase) -> Self {
        Self {
            app_db: Mutex::new(app_db),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalVariable {
    pub id: String,
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub fn list_global_variables(
    state: State<'_, VariablesState>,
) -> Result<Vec<GlobalVariable>, String> {
    let db = state.app_db.lock().unwrap();
    
    let mut stmt = db.conn.prepare(
        "SELECT id, key, value FROM global_variables ORDER BY key"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let variables = stmt.query_map([], |row| {
        Ok(GlobalVariable {
            id: row.get(0)?,
            key: row.get(1)?,
            value: row.get(2)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    variables.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect results: {}", e))
}

#[tauri::command]
pub fn save_global_variables(
    variables: Vec<GlobalVariable>,
    state: State<'_, VariablesState>,
) -> Result<(), String> {
    let db = state.app_db.lock().unwrap();
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;

    // Start transaction
    db.conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;

    // Clear existing variables
    db.conn.execute("DELETE FROM global_variables", [])
        .map_err(|e| format!("Failed to clear variables: {}", e))?;

    // Insert new variables
    for var in variables {
        let id = if var.id.is_empty() {
            Uuid::new_v4().to_string()
        } else {
            var.id
        };

        db.conn.execute(
            "INSERT INTO global_variables (id, key, value, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                id,
                var.key,
                var.value,
                now,
                now,
            ],
        ).map_err(|e| format!("Failed to insert variable: {}", e))?;
    }

    // Commit transaction
    db.conn.execute("COMMIT", [])
        .map_err(|e| format!("Failed to commit: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_global_variable(
    key: String,
    state: State<'_, VariablesState>,
) -> Result<GlobalVariable, String> {
    let db = state.app_db.lock().unwrap();

    db.conn.query_row(
        "SELECT id, key, value FROM global_variables WHERE key = ?1",
        rusqlite::params![key],
        |row| {
            Ok(GlobalVariable {
                id: row.get(0)?,
                key: row.get(1)?,
                value: row.get(2)?,
            })
        },
    ).map_err(|e| format!("Variable not found: {}", e))
}

#[tauri::command]
pub fn delete_global_variable(
    key: String,
    state: State<'_, VariablesState>,
) -> Result<(), String> {
    let db = state.app_db.lock().unwrap();

    db.conn.execute(
        "DELETE FROM global_variables WHERE key = ?1",
        rusqlite::params![key],
    ).map_err(|e| format!("Failed to delete: {}", e))?;

    Ok(())
}

