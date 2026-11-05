import {invoke} from '@tauri-apps/api/core';import type {Repo,Entry,DocumentData} from './types';
export const desktop=!!(window as unknown as {__TAURI_INTERNALS__?:unknown}).__TAURI_INTERNALS__;
export const repoApi={open:(mode:'current'|'new')=>invoke<Repo|null>('open_repo',{mode}),status:(root:string)=>invoke<Repo>('repo_status',{root}),list:(root:string,path:string)=>invoke<Entry[]>('list_directory',{root,path}),read:(root:string,path:string)=>invoke<DocumentData>('read_document',{root,path}),save:(root:string,path:string,content:string,version:string)=>invoke<DocumentData>('save_document',{root,path,content,version})};
import type {Snapshot,FileDiff} from './types';
export const gitApi={snapshot:(root:string,includeHistory=true,branch?:string,includeBranches=true)=>invoke<Snapshot>('git_snapshot',{root,includeHistory,branch:branch||null,includeBranches}),diff:(root:string,path:string,kind:string,commit='')=>invoke<FileDiff>('git_diff',{root,path,kind,commit}),files:(root:string,commit:string)=>invoke<string[]>('commit_files',{root,commit}),write:(root:string,action:string,value:string)=>invoke<string>('git_write',{root,action,value}),revision:(root:string,action:string,commit:string,value='')=>invoke<string>('git_revision_action',{root,action,commit,value})};

export const fileHistory=(root:string,path:string)=>invoke<import('./types').Commit[]>('file_history',{root,path});

export interface Workflow {merging:boolean;conflicts:string[];remotes:string[];upstream:string;branch:string}
export const workflowApi={
  state:(root:string)=>invoke<Workflow>('git_workflow',{root}),
  action:(root:string,action:string,value='')=>invoke<string>('git_workflow_action',{root,action,value}),
  authenticate:(root:string,action:string,value:string,username:string,password:string)=>invoke<string>('git_workflow_auth',{root,action,value,username,password})
};

export const createEntry=(root:string,path:string,directory:boolean)=>invoke<void>('create_entry',{root,path,directory});

export const mutateEntry=(root:string,path:string,action:string,destination='')=>invoke<void>('mutate_entry',{root,path,action,destination});

export const terminalApi={
  start:(root:string,cols:number,rows:number,shell:string|null)=>invoke<string>('terminal_start',{root,cols,rows,shell}),
  read:(id:string)=>invoke<number[]>('terminal_read',{id}),
  write:(id:string,data:string)=>invoke<void>('terminal_write',{id,data}),
  resize:(id:string,cols:number,rows:number)=>invoke<void>('terminal_resize',{id,cols,rows}),
  close:(id:string)=>invoke<void>('terminal_close',{id})
};
