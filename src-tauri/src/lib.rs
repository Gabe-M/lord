use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut(Shortcut::new(
                    Some(Modifiers::CONTROL | Modifiers::ALT),
                    Code::Space,
                ))
                .expect("Ctrl+Alt+Space shortcut must be valid")
                .with_handler(|app, _, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }

                    let Some(chat_window) = app.get_webview_window("chat") else {
                        eprintln!("Janela de chat não encontrada.");
                        return;
                    };

                    match chat_window.is_visible() {
                        Ok(true) => {
                            if let Err(error) = chat_window.hide() {
                                eprintln!("Falha ao ocultar janela de chat: {error}");
                            }
                        }
                        Ok(false) => {
                            if let Err(error) = chat_window.show() {
                                eprintln!("Falha ao exibir janela de chat: {error}");
                            } else if let Err(error) = chat_window.set_focus() {
                                eprintln!("Falha ao focar janela de chat: {error}");
                            }
                        }
                        Err(error) => {
                            eprintln!("Falha ao consultar visibilidade do chat: {error}");
                        }
                    }
                })
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
