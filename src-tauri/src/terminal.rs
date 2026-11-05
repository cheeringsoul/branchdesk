use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::{
    collections::HashMap,
    io::{Read, Write},
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex, OnceLock,
    },
    thread,
};

struct Session {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
    output: Arc<Mutex<Vec<u8>>>,
}

static SESSIONS: OnceLock<Mutex<HashMap<String, Session>>> = OnceLock::new();
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

fn sessions() -> &'static Mutex<HashMap<String, Session>> {
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
pub async fn terminal_start(root: String, cols: u16, rows: u16, shell: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let cwd = PathBuf::from(root).canonicalize().map_err(|e| e.to_string())?;
        let pair = native_pty_system()
            .openpty(PtySize {
                rows: rows.max(2),
                cols: cols.max(2),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
        let shell = shell
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into()));
        let shell_path = PathBuf::from(&shell);
        if !shell_path.is_absolute() || !shell_path.is_file() {
            return Err(format!("Shell does not exist: {shell}"));
        }
        let mut command = CommandBuilder::new(shell_path);
        command.arg("-l");
        command.cwd(cwd);
        command.env("TERM", "xterm-256color");
        command.env("COLORTERM", "truecolor");
        command.env("TERM_PROGRAM", "BranchDesk");
        command.env("TERM_PROGRAM_VERSION", env!("CARGO_PKG_VERSION"));
        let child = pair
            .slave
            .spawn_command(command)
            .map_err(|e| e.to_string())?;
        drop(pair.slave);
        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
        let output = Arc::new(Mutex::new(Vec::new()));
        let reader_output = output.clone();
        thread::spawn(move || {
            let mut chunk = [0_u8; 8192];
            while let Ok(count) = reader.read(&mut chunk) {
                if count == 0 {
                    break;
                }
                if let Ok(mut buffer) = reader_output.lock() {
                    buffer.extend_from_slice(&chunk[..count]);
                } else {
                    break;
                }
            }
        });
        let id = format!("terminal-{}", NEXT_ID.fetch_add(1, Ordering::Relaxed));
        sessions()
            .lock()
            .map_err(|_| "Terminal session lock failed")?
            .insert(
                id.clone(),
                Session {
                    master: pair.master,
                    writer,
                    child,
                    output,
                },
            );
        Ok(id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn terminal_read(id: String) -> Result<Vec<u8>, String> {
    let sessions = sessions().lock().map_err(|_| "Terminal session lock failed")?;
    let session = sessions.get(&id).ok_or("Terminal session not found")?;
    let mut output = session.output.lock().map_err(|_| "Terminal output lock failed")?;
    Ok(output.drain(..).collect())
}

#[tauri::command]
pub fn terminal_write(id: String, data: String) -> Result<(), String> {
    let mut sessions = sessions().lock().map_err(|_| "Terminal session lock failed")?;
    let session = sessions.get_mut(&id).ok_or("Terminal session not found")?;
    session.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    session.writer.flush().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn terminal_resize(id: String, cols: u16, rows: u16) -> Result<(), String> {
    let sessions = sessions().lock().map_err(|_| "Terminal session lock failed")?;
    let session = sessions.get(&id).ok_or("Terminal session not found")?;
    session
        .master
        .resize(PtySize {
            rows: rows.max(2),
            cols: cols.max(2),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn terminal_close(id: String) -> Result<(), String> {
    let Some(mut session) = sessions()
        .lock()
        .map_err(|_| "Terminal session lock failed")?
        .remove(&id)
    else {
        return Ok(());
    };
    let _ = session.child.kill();
    let _ = session.child.wait();
    Ok(())
}
