use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, State, WindowEvent};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

const GENERIC_RESPONSE: &str = "ENTENDIDO. ESTOU PROCESSANDO SUA SOLICITAÇÃO...";
const SPEECH_LABELS: [&str; 7] = [
    "speech",
    "speech-2",
    "speech-3",
    "speech-4",
    "speech-5",
    "speech-6",
    "speech-7",
];

#[derive(Clone, Serialize)]
struct SpeechResponse {
    label: String,
    response: String,
}

#[derive(Clone, Serialize)]
struct SpeechLock {
    label: String,
    locked: bool,
}

#[derive(Default)]
struct SpeechState {
    attached_to_avatar: Mutex<HashMap<String, bool>>,
    active_label: Mutex<Option<String>>,
    input_target: Mutex<Option<String>>,
    locked_labels: Mutex<HashSet<String>>,
}

fn is_speech_label(label: &str) -> bool {
    SPEECH_LABELS.contains(&label)
}

fn show_quick_input(app: &AppHandle, target_label: Option<String>) -> Result<(), String> {
    if let Some(label) = target_label.as_deref() {
        if !is_speech_label(label) {
            return Err("Balão de fala inválido.".to_string());
        }
    }

    let input_window = app
        .get_webview_window("quick-input")
        .ok_or_else(|| "Janela de entrada rápida não encontrada.".to_string())?;
    let avatar_window = app
        .get_webview_window("main")
        .ok_or_else(|| "Janela do avatar não encontrada.".to_string())?;
    let cursor = avatar_window
        .cursor_position()
        .map_err(|error| format!("Falha ao obter posição do cursor: {error}"))?;

    input_window
        .set_position(PhysicalPosition::new(cursor.x, cursor.y))
        .map_err(|error| format!("Falha ao posicionar entrada rápida: {error}"))?;
    input_window
        .emit("quick-input-opened", target_label.unwrap_or_default())
        .map_err(|error| format!("Falha ao resetar entrada rápida: {error}"))?;
    input_window
        .show()
        .map_err(|error| format!("Falha ao exibir entrada rápida: {error}"))?;
    input_window
        .set_focus()
        .map_err(|error| format!("Falha ao focar entrada rápida: {error}"))?;

    Ok(())
}

#[tauri::command]
fn submit_quick_speech(
    app: AppHandle,
    state: State<'_, SpeechState>,
    message: String,
    new_bubble: bool,
    target_label: Option<String>,
) -> Result<(), String> {
    let _ = message;
    let response = GENERIC_RESPONSE.to_string();
    let target_labels = if new_bubble {
        let active_label = state
            .active_label
            .lock()
            .map_err(|_| "Estado do balão indisponível.".to_string())?;
        vec![SPEECH_LABELS
            .iter()
            .find(|label| {
                app.get_webview_window(label)
                    .and_then(|window| window.is_visible().ok())
                    == Some(false)
            })
            .copied()
            .unwrap_or_else(|| active_label.as_deref().unwrap_or(SPEECH_LABELS[0]))
            .to_string()]
    } else if let Some(label) = target_label {
        if !is_speech_label(&label) {
            return Err("Balão de fala inválido.".to_string());
        }
        vec![label]
    } else {
        let locked_labels = state
            .locked_labels
            .lock()
            .map_err(|_| "Estado do lock indisponível.".to_string())?;
        if locked_labels.is_empty() {
            let active_label = state
                .active_label
                .lock()
                .map_err(|_| "Estado do balão indisponível.".to_string())?;
            vec![active_label
                .as_deref()
                .unwrap_or(SPEECH_LABELS[0])
                .to_string()]
        } else {
            locked_labels.iter().cloned().collect()
        }
    };

    {
        let mut attached = state
            .attached_to_avatar
            .lock()
            .map_err(|_| "Estado do balão indisponível.".to_string())?;
        for label in &target_labels {
            if new_bubble || !attached.contains_key(label) {
                attached.insert(label.clone(), true);
            }
        }
    }
    let avatar_window = app
        .get_webview_window("main")
        .ok_or_else(|| "Janela do avatar não encontrada.".to_string())?;

    let avatar_position = avatar_window
        .outer_position()
        .map_err(|error| format!("Falha ao obter posição do avatar: {error}"))?;
    let avatar_size = avatar_window
        .inner_size()
        .map_err(|error| format!("Falha ao obter tamanho do avatar: {error}"))?;
    let speech_x = avatar_position.x + avatar_size.width as i32 / 2 - 60;
    let speech_y = avatar_position.y - avatar_size.height as i32 / 2 - 20;

    for speech_label in &target_labels {
        let speech_window = app
            .get_webview_window(speech_label)
            .ok_or_else(|| format!("Janela de fala não encontrada: {speech_label}"))?;

        speech_window
            .set_position(PhysicalPosition::new(speech_x, speech_y))
            .map_err(|error| format!("Falha ao posicionar balão: {error}"))?;
        speech_window
            .emit(
                "quick-speech-response",
                SpeechResponse {
                    label: speech_label.clone(),
                    response: response.clone(),
                },
            )
            .map_err(|error| format!("Falha ao enviar resposta: {error}"))?;
        speech_window
            .show()
            .map_err(|error| format!("Falha ao exibir balão: {error}"))?;
    }

    if let Some(label) = target_labels.first() {
        *state
            .active_label
            .lock()
            .map_err(|_| "Estado do balão indisponível.".to_string())? = Some(label.clone());
    }

    if let Some(input_window) = app.get_webview_window("quick-input") {
        input_window
            .hide()
            .map_err(|error| format!("Falha ao ocultar entrada: {error}"))?;
    }

    Ok(())
}

#[tauri::command]
fn open_quick_speech(
    app: AppHandle,
    state: State<'_, SpeechState>,
    label: String,
) -> Result<(), String> {
    if !is_speech_label(&label) {
        return Err("Balão de fala inválido.".to_string());
    }
    *state
        .input_target
        .lock()
        .map_err(|_| "Estado da entrada indisponível.".to_string())? = Some(label.clone());
    show_quick_input(&app, Some(label))
}

#[tauri::command]
fn toggle_quick_speech_lock(
    app: AppHandle,
    state: State<'_, SpeechState>,
    label: String,
) -> Result<bool, String> {
    if !is_speech_label(&label) {
        return Err("Balão de fala inválido.".to_string());
    }
    let is_locked = {
        let mut locked_labels = state
            .locked_labels
            .lock()
            .map_err(|_| "Estado do lock indisponível.".to_string())?;
        if !locked_labels.insert(label.clone()) {
            locked_labels.remove(&label);
            false
        } else {
            true
        }
    };
    app.emit(
        "quick-speech-lock",
        SpeechLock {
            label,
            locked: is_locked,
        },
    )
        .map_err(|error| format!("Falha ao atualizar lock do balão: {error}"))?;
    Ok(is_locked)
}

#[tauri::command]
fn detach_quick_speech(
    state: State<'_, SpeechState>,
    label: String,
) -> Result<(), String> {
    state
        .attached_to_avatar
        .lock()
        .map_err(|_| "Estado do balão indisponível.".to_string())?
        .insert(label, false);
    Ok(())
}

#[tauri::command]
fn exit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let quick_shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::Space);

    tauri::Builder::default()
        .manage(SpeechState::default())
        .invoke_handler(tauri::generate_handler![
            submit_quick_speech,
            detach_quick_speech,
            open_quick_speech,
            toggle_quick_speech_lock,
            exit_app
        ])
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            let WindowEvent::Moved(position) = event else {
                return;
            };

            let state = window.state::<SpeechState>();
            let attached_labels = match state.attached_to_avatar.lock() {
                Ok(attached) => attached
                    .iter()
                    .filter(|(_, is_attached)| **is_attached)
                    .map(|(label, _)| label.clone())
                    .collect::<Vec<_>>(),
                Err(_) => {
                    eprintln!("Estado do balão indisponível durante movimento.");
                    return;
                }
            };

            for label in attached_labels {
                let Some(speech_window) = window.app_handle().get_webview_window(&label) else {
                    eprintln!("Janela de fala não encontrada durante movimento: {label}.");
                    continue;
                };

                let Ok(avatar_size) = window.inner_size() else {
                    eprintln!("Falha ao obter tamanho do avatar durante movimento.");
                    continue;
                };
                let speech_position = PhysicalPosition::new(
                    position.x + avatar_size.width as i32 / 2 - 60,
                    position.y - avatar_size.height as i32 / 2 - 20,
                );

                if let Err(error) = speech_window.set_position(speech_position) {
                    eprintln!("Falha ao acompanhar avatar com balão: {error}");
                }
            }
        })
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut(Shortcut::new(
                    Some(Modifiers::CONTROL | Modifiers::ALT),
                    Code::Space,
                ))
                .expect("Ctrl+Alt+Space shortcut must be valid")
                .with_shortcut(quick_shortcut.clone())
                .expect("Ctrl+Space shortcut must be valid")
                .with_handler(move |app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }

                    if shortcut == &quick_shortcut {
                        if let Err(error) = show_quick_input(app, None) {
                            eprintln!("Falha ao abrir entrada rápida: {error}");
                        }
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
