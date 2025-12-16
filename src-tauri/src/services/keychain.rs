use keyring::Entry;

const SERVICE_NAME: &str = "dev.vibebase";

pub struct KeychainService;

impl KeychainService {
    pub fn save_api_key(environment: &str, api_key: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, &format!("env:{}", environment))
            .map_err(|e| format!("Keychain error: {}", e))?;
        
        entry
            .set_password(api_key)
            .map_err(|e| format!("Failed to save API key: {}", e))?;
        
        Ok(())
    }

    pub fn get_api_key(environment: &str) -> Result<String, String> {
        let entry = Entry::new(SERVICE_NAME, &format!("env:{}", environment))
            .map_err(|e| format!("Keychain error: {}", e))?;
        
        entry
            .get_password()
            .map_err(|e| format!("API key not found: {}", e))
    }

    pub fn delete_api_key(environment: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, &format!("env:{}", environment))
            .map_err(|e| format!("Keychain error: {}", e))?;
        
        entry
            .delete_password()
            .map_err(|e| format!("Failed to delete API key: {}", e))?;
        
        Ok(())
    }

    pub fn has_api_key(environment: &str) -> bool {
        let entry = Entry::new(SERVICE_NAME, &format!("env:{}", environment));
        if let Ok(entry) = entry {
            entry.get_password().is_ok()
        } else {
            false
        }
    }
}

