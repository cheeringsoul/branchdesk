#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{path::{Path,PathBuf},process::Command,fs,collections::hash_map::DefaultHasher,hash::{Hash,Hasher},sync::atomic::{AtomicU64,Ordering}};
use serde::Serialize;
use tauri::{Emitter, Manager};
use tauri::menu::{MenuBuilder, MenuItem, SubmenuBuilder};
mod git_features;
mod terminal;
use git_features::*;
use terminal::*;
#[derive(Serialize)]struct Change{path:String,status:String}
#[derive(Serialize)]struct Repo{root:String,branch:String,bare:bool,changes:Vec<Change>}
#[derive(Serialize)]struct Entry{name:String,path:String,directory:bool}
#[derive(Serialize)]struct DocumentData{content:String,version:String}
static NEXT_WINDOW_ID:AtomicU64=AtomicU64::new(1);
fn git(root:&Path,args:&[&str])->Result<Vec<u8>,String>{let out=Command::new("git").arg("-C").arg(root).args(args).output().map_err(|e|e.to_string())?;if !out.status.success(){return Err(String::from_utf8_lossy(&out.stderr).trim().to_string())}Ok(out.stdout)}
fn text(bytes:Vec<u8>)->String{String::from_utf8_lossy(&bytes).trim().to_string()}
fn root_path(root:&str)->Result<PathBuf,String>{let p=fs::canonicalize(root).map_err(|e|e.to_string())?;let actual=text(git(&p,&["rev-parse","--show-toplevel"])?);if fs::canonicalize(actual).map_err(|e|e.to_string())?!=p{return Err("Repository root mismatch".into())}Ok(p)}
fn checked_in(root:&Path,path:&str)->Result<PathBuf,String>{let p=fs::canonicalize(root.join(path)).map_err(|e|e.to_string())?;if !p.starts_with(root){return Err("Path is outside the repository".into())}if p.components().any(|c|c.as_os_str()==".git"){return Err("Git metadata is protected".into())}Ok(p)}
fn checked(root:&str,path:&str)->Result<PathBuf,String>{let base=root_path(root)?;checked_in(&base,path)}
fn version(bytes:&[u8])->String{let mut h=DefaultHasher::new();bytes.hash(&mut h);format!("{:x}",h.finish())}
fn repo_status_sync(root:String)->Result<Repo,String>{let input=fs::canonicalize(root).map_err(|e|e.to_string())?;let bare=text(git(&input,&["rev-parse","--is-bare-repository"])? )=="true";if bare{return Err("Bare repositories have no editable working tree".into())}let root=text(git(&input,&["rev-parse","--show-toplevel"])?);let p=Path::new(&root);let branch=text(git(p,&["rev-parse","--abbrev-ref","HEAD"]).unwrap_or_else(|_|b"Unborn HEAD".to_vec()));let output=git(p,&["status","--porcelain=v1","-z","-uall"])?;let mut changes=Vec::new();let mut records=output.split(|b|*b==0);while let Some(row)=records.next(){if row.len()<4{continue}let status=String::from_utf8_lossy(&row[..2]).trim().to_string();let path=String::from_utf8(row[3..].to_vec()).map_err(|_|"Non-UTF-8 file names are unsupported")?;if row[..2].contains(&b'R')||row[..2].contains(&b'C'){records.next();}changes.push(Change{path,status});}Ok(Repo{root,branch,bare,changes})}
#[tauri::command]
async fn open_repo(app:tauri::AppHandle,mode:String)->Result<Option<Repo>,String>{
    if mode!="current"&&mode!="new"{return Err("Invalid repository window mode".into())}
    let Some(folder)=rfd::AsyncFileDialog::new().pick_folder().await else{return Ok(None)};
    let path=folder.path().to_string_lossy().into_owned();
    let repo=tauri::async_runtime::spawn_blocking(move||repo_status_sync(path))
        .await
        .map_err(|e|e.to_string())?
        ?;
    if mode=="new"{
        let encoded=repo.root.as_bytes().iter().fold(String::new(),|mut out,byte|{if byte.is_ascii_alphanumeric()||matches!(*byte,b'-'|b'_'|b'.'|b'~'){out.push(*byte as char)}else{out.push_str(&format!("%{byte:02X}"))}out});
        let name=Path::new(&repo.root).file_name().and_then(|value|value.to_str()).unwrap_or("Repository");
        let label=format!("repository-{}",NEXT_WINDOW_ID.fetch_add(1,Ordering::Relaxed));
        tauri::WebviewWindowBuilder::new(&app,label,tauri::WebviewUrl::App(format!("index.html?repo={encoded}").into()))
            .title(format!("BranchDesk — {name}"))
            .inner_size(1280.0,860.0)
            .min_inner_size(800.0,600.0)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .traffic_light_position(tauri::LogicalPosition::new(16.0,26.0))
            .build()
            .map_err(|error|error.to_string())?;
        return Ok(None)
    }
    Ok(Some(repo))
}
fn list_directory_sync(root:String,path:String)->Result<Vec<Entry>,String>{let base=root_path(&root)?;let p=checked_in(&base,&path)?;let mut entries=Vec::new();for entry in fs::read_dir(p).map_err(|e|e.to_string())?{let e=entry.map_err(|e|e.to_string())?;if e.file_name()==".git"{continue}let entry_path=e.path();let relative=entry_path.strip_prefix(&base).map_err(|e|e.to_string())?.to_string_lossy().to_string();let Ok(resolved)=fs::canonicalize(&entry_path)else{continue};if !resolved.starts_with(&base){continue}entries.push(Entry{name:e.file_name().to_string_lossy().into(),path:relative,directory:resolved.is_dir()});}entries.sort_by(|a,b|b.directory.cmp(&a.directory).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));Ok(entries)}
fn read_document_sync(root:String,path:String)->Result<DocumentData,String>{let p=checked(&root,&path)?;if fs::metadata(&p).map_err(|e|e.to_string())?.len()>5_000_000{return Err("Files larger than 5 MB cannot be edited in this version".into())}let bytes=fs::read(p).map_err(|e|e.to_string())?;if bytes.contains(&0){return Err("Binary files cannot be edited".into())}let content=String::from_utf8(bytes.clone()).map_err(|_|"Only UTF-8 files can be edited")?;Ok(DocumentData{content,version:version(&bytes)})}
fn save_document_sync(root:String,path:String,content:String,version:String)->Result<DocumentData,String>{let p=checked(&root,&path)?;let current=fs::read(&p).map_err(|e|e.to_string())?;if self::version(&current)!=version{return Err("File changed outside BranchDesk. Your editor content is preserved; reopen the file to review external changes.".into())}fs::write(p,content.as_bytes()).map_err(|e|e.to_string())?;Ok(DocumentData{version:self::version(content.as_bytes()),content})}
fn main(){
    tauri::Builder::default()
        .setup(|app| {
            let settings = MenuItem::with_id(app, "settings", "Settings…", true, Some("CmdOrCtrl+,"))?;
            let app_menu = SubmenuBuilder::new(app, "BranchDesk")
                .about(None)
                .separator()
                .item(&settings)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;
            let file_menu = SubmenuBuilder::new(app, "File").close_window().build()?;
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo().redo().separator().cut().copy().paste().select_all().build()?;
            let view_menu = SubmenuBuilder::new(app, "View").fullscreen().build()?;
            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize().maximize().separator().close_window().separator().bring_all_to_front().build()?;
            let help_menu = SubmenuBuilder::new(app, "Help").build()?;
            let menu = MenuBuilder::new(app)
                .items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu, &help_menu])
                .build()?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id() == "settings" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                let _ = app.emit("open-settings", ());
            }
        })
        .invoke_handler(tauri::generate_handler![open_repo,repo_status,list_directory,read_document,save_document,terminal_start,terminal_read,terminal_write,terminal_resize,terminal_close,git_snapshot,git_diff,git_write,git_revision_action,commit_files,file_history,git_workflow,git_workflow_action,git_workflow_auth,create_entry,mutate_entry])
        .run(tauri::generate_context!())
        .expect("Unable to start BranchDesk");
}

#[tauri::command]async fn repo_status(root:String)->Result<Repo,String>{tauri::async_runtime::spawn_blocking(move||repo_status_sync(root)).await.map_err(|e|e.to_string())?}

#[tauri::command]async fn list_directory(root:String,path:String)->Result<Vec<Entry>,String>{tauri::async_runtime::spawn_blocking(move||list_directory_sync(root,path)).await.map_err(|e|e.to_string())?}

#[tauri::command]async fn read_document(root:String,path:String)->Result<DocumentData,String>{tauri::async_runtime::spawn_blocking(move||read_document_sync(root,path)).await.map_err(|e|e.to_string())?}

#[tauri::command]async fn save_document(root:String,path:String,content:String,version:String)->Result<DocumentData,String>{tauri::async_runtime::spawn_blocking(move||save_document_sync(root,path,content,version)).await.map_err(|e|e.to_string())?}
#[tauri::command]async fn create_entry(root:String,path:String,directory:bool)->Result<(),String>{tauri::async_runtime::spawn_blocking(move||{let base=root_path(&root)?;if path.is_empty()||Path::new(&path).components().any(|c|!matches!(c,std::path::Component::Normal(_)))||path.split('/').any(|s|s==".git"){return Err("Invalid path".into())}let target=base.join(path);let parent=target.parent().ok_or("Invalid parent")?.strip_prefix(&base).map_err(|e|e.to_string())?.to_string_lossy();checked_in(&base,&parent)?;if directory{fs::create_dir(target).map_err(|e|e.to_string())}else{fs::OpenOptions::new().write(true).create_new(true).open(target).map(|_|()).map_err(|e|e.to_string())}}).await.map_err(|e|e.to_string())?}
#[cfg(test)]mod entry_tests{use super::*;#[test]fn create_entry_validation(){let p=std::env::temp_dir().join(format!("branchdesk-entry-{}",std::process::id()));fs::create_dir_all(&p).unwrap();git(&p,&["init"]).unwrap();let root=p.to_string_lossy().to_string();tauri::async_runtime::block_on(async{assert!(create_entry(root.clone(),"../outside".into(),false).await.is_err());assert!(create_entry(root.clone(),".git/config".into(),false).await.is_err());create_entry(root.clone(),"new.txt".into(),false).await.unwrap();assert!(create_entry(root.clone(),"new.txt".into(),false).await.is_err());create_entry(root.clone(),"folder".into(),true).await.unwrap();assert!(mutate_entry(root.clone(),"new.txt".into(),"rename".into(),"../outside".into()).await.is_err());mutate_entry(root.clone(),"new.txt".into(),"rename".into(),"renamed.txt".into()).await.unwrap();mutate_entry(root.clone(),"renamed.txt".into(),"delete".into(),String::new()).await.unwrap();assert!(mutate_entry(root,String::new(),"delete".into(),String::new()).await.is_err());});fs::remove_dir_all(p).unwrap();}}
#[tauri::command]async fn mutate_entry(root:String,path:String,action:String,destination:String)->Result<(),String>{tauri::async_runtime::spawn_blocking(move||{let base=root_path(&root)?;if path.is_empty(){return Err("Cannot modify repository root".into())}let source=checked_in(&base,&path)?;if source==base{return Err("Cannot modify repository root".into())}match action.as_str(){"rename"=>{if destination.is_empty()||Path::new(&destination).components().any(|c|!matches!(c,std::path::Component::Normal(_)))||destination.split('/').any(|s|s==".git"){return Err("Invalid destination".into())}let target=base.join(&destination);let parent=target.parent().ok_or("Invalid parent")?.strip_prefix(&base).map_err(|e|e.to_string())?.to_string_lossy();checked_in(&base,&parent)?;if target.exists(){return Err("Destination already exists".into())}fs::rename(source,target).map_err(|e|e.to_string())},"delete"=>{if fs::symlink_metadata(base.join(&path)).map_err(|e|e.to_string())?.file_type().is_symlink(){return fs::remove_file(base.join(path)).map_err(|e|e.to_string())}if source.is_dir(){fs::remove_dir_all(source).map_err(|e|e.to_string())}else{fs::remove_file(source).map_err(|e|e.to_string())}},_=>Err("Unsupported file operation".into())}}).await.map_err(|e|e.to_string())?}
