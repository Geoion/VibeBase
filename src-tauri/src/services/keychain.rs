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

    // Git SSH Passphrase
    pub fn save_git_ssh_passphrase(workspace_id: &str, passphrase: &str) -> Result<(), String> {
        let key = format!("git:ssh_passphrase:{}", workspace_id);
        let entry = Entry::new(SERVICE_NAME, &key)
            .map_err(|e| format!("Keychain error: {}", e))?;
        
        entry
            .set_password(passphrase)
            .map_err(|e| format!("Failed to save SSH passphrase: {}", e))?;
        
        Ok(())
    }

    pub fn get_git_ssh_passphrase(workspace_id: &str) -> Result<String, String> {
        let key = format!("git:ssh_passphrase:{}", workspace_id);
        let entry = Entry::new(SERVICE_NAME, &key)
            .map_err(|e| format!("Keychain error: {}", e))?;
        
        entry
            .get_password()
            .map_err(|e| format!("SSH passphrase not found: {}", e))
    }

    // Git Token (GitHub/GitLab/etc)
    pub fn save_git_token(workspace_id: &str, token: &str) -> Result<(), String> {
        let key = format!("git:token:{}", workspace_id);
        let entry = Entry::new(SERVICE_NAME, &key)
            .map_err(|e| format!("Keychain error: {}", e))?;
        
        entry
            .set_password(token)
            .map_err(|e| format!("Failed to save Git token: {}", e))?;
        
        Ok(())
    }

    pub fn get_git_token(workspace_id: &str) -> Result<String, String> {
        let key = format!("git:token:{}", workspace_id);
        let entry = Entry::new(SERVICE_NAME, &key)
            .map_err(|e| format!("Keychain error: {}", e))?;
        
        entry
            .get_password()
            .map_err(|e| format!("Git token not found: {}", e))
    }

}

