#![allow(unexpected_cfgs)]

use tauri::{Manager, Window, WindowBuilder, WindowUrl};

#[tauri::command]
pub fn open_variables_window(window: Window) -> Result<(), String> {
    let app_handle = window.app_handle();
    
    // Check if window already exists
    if let Some(existing_window) = app_handle.get_window("variables") {
        existing_window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new window without decorations
    // We'll implement custom window controls in the UI
    let window_url = if cfg!(debug_assertions) {
        // Development mode: use the full URL with port
        WindowUrl::External("http://localhost:1420/variables.html".parse().unwrap())
    } else {
        // Production mode: use the bundled HTML
        WindowUrl::App("variables.html".into())
    };

    WindowBuilder::new(
        &app_handle,
        "variables",
        window_url
    )
    .title("Global Variables")
    .inner_size(800.0, 700.0)
    .min_inner_size(600.0, 500.0)
    .resizable(true)
    .center()
    .decorations(false)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn open_settings_window(window: Window) -> Result<(), String> {
    let app_handle = window.app_handle();
    
    // Check if window already exists
    if let Some(existing_window) = app_handle.get_window("settings") {
        existing_window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new window without decorations
    let window_url = if cfg!(debug_assertions) {
        WindowUrl::External("http://localhost:1420/settings.html".parse().unwrap())
    } else {
        WindowUrl::App("settings.html".into())
    };

    WindowBuilder::new(
        &app_handle,
        "settings",
        window_url
    )
    .title("Settings")
    .inner_size(1200.0, 800.0)
    .min_inner_size(1000.0, 600.0)
    .resizable(true)
    .center()
    .decorations(false)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_window_theme(window: Window, theme: String) -> Result<(), String> {
    println!("🎨 [Rust] set_window_theme called with theme: {}", theme);
    
    #[cfg(target_os = "macos")]
    {
        use cocoa::base::{id, nil};
        use cocoa::foundation::NSString;
        use objc::{class, msg_send, sel, sel_impl};
        
        window.with_webview(move |webview| unsafe {
            let ns_window = webview.ns_window() as id;
            
            let appearance_name_str = match theme.as_str() {
                "dark" => {
                    println!("🌙 [Rust] Setting DARK theme (NSAppearanceNameDarkAqua)");
                    "NSAppearanceNameDarkAqua"
                },
                "light" => {
                    println!("☀️ [Rust] Setting LIGHT theme (NSAppearanceNameAqua)");
                    "NSAppearanceNameAqua"
                },
                _ => {
                    println!("🖥️ [Rust] Setting SYSTEM theme (nil)");
                    // For "system", set appearance to nil (use system default)
                    let _: () = msg_send![ns_window, setAppearance: nil];
                    return;
                }
            };
            
            let appearance_name = NSString::alloc(nil).init_str(appearance_name_str);
            let appearance: id = msg_send![class!(NSAppearance), appearanceNamed: appearance_name];
            let _: () = msg_send![ns_window, setAppearance: appearance];
            println!("✅ [Rust] Window appearance set successfully");
        }).map_err(|e| format!("Failed to set window theme: {}", e))?;
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        // On other platforms, this is a no-op
        let _ = (window, theme);
    }
    
    Ok(())
}

#[tauri::command]
pub fn open_arena_window(window: Window) -> Result<(), String> {
    let app_handle = window.app_handle();
    
    // Check if window already exists
    if let Some(existing_window) = app_handle.get_window("arena") {
        existing_window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new window without decorations
    let window_url = if cfg!(debug_assertions) {
        WindowUrl::External("http://localhost:1420/arena.html".parse().unwrap())
    } else {
        WindowUrl::App("arena.html".into())
    };

    WindowBuilder::new(
        &app_handle,
        "arena",
        window_url
    )
    .title("Arena")
    .inner_size(1400.0, 900.0)
    .min_inner_size(1200.0, 700.0)
    .resizable(true)
    .center()
    .decorations(false)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn open_arena_history_window(window: Window) -> Result<(), String> {
    let app_handle = window.app_handle();
    
    // Check if window already exists
    if let Some(existing_window) = app_handle.get_window("arena_history") {
        existing_window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new window without decorations
    let window_url = if cfg!(debug_assertions) {
        WindowUrl::External("http://localhost:1420/arena-history.html".parse().unwrap())
    } else {
        WindowUrl::App("arena-history.html".into())
    };

    WindowBuilder::new(
        &app_handle,
        "arena_history",
        window_url
    )
    .title("Arena History")
    .inner_size(1400.0, 900.0)
    .min_inner_size(1200.0, 700.0)
    .resizable(true)
    .center()
    .decorations(false)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn open_arena_statistics_window(window: Window) -> Result<(), String> {
    let app_handle = window.app_handle();
    
    // Check if window already exists
    if let Some(existing_window) = app_handle.get_window("arena_statistics") {
        existing_window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new window without decorations
    let window_url = if cfg!(debug_assertions) {
        WindowUrl::External("http://localhost:1420/arena-statistics.html".parse().unwrap())
    } else {
        WindowUrl::App("arena-statistics.html".into())
    };

    WindowBuilder::new(
        &app_handle,
        "arena_statistics",
        window_url
    )
    .title("Arena Statistics")
    .inner_size(1200.0, 800.0)
    .min_inner_size(1000.0, 600.0)
    .resizable(true)
    .center()
    .decorations(false)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_system_theme() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::NSApplication;
        use cocoa::base::nil;
        use objc::{msg_send, sel, sel_impl};
        
        unsafe {
            let app = NSApplication::sharedApplication(nil);
            let appearance: cocoa::base::id = msg_send![app, effectiveAppearance];
            let name: cocoa::base::id = msg_send![appearance, name];
            let name_str: *const i8 = msg_send![name, UTF8String];
            let name_string = std::ffi::CStr::from_ptr(name_str).to_string_lossy();
            
            println!("🔍 [Rust] System appearance name: {}", name_string);
            
            // Check if it's a dark appearance
            if name_string.contains("Dark") {
                println!("🌙 [Rust] System theme is DARK");
                Ok("dark".to_string())
            } else {
                println!("☀️ [Rust] System theme is LIGHT");
                Ok("light".to_string())
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        // On other platforms, default to light
        Ok("light".to_string())
    }
}
