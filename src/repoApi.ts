import {invoke} from '@tauri-apps/api/core';import type {Repo,Entry,DocumentData} from './types';
export const desktop=!!(window as unknown as {__TAURI_INTERNALS__?:unknown}).__TAURI_INTERNALS__;
export const repoApi={open:()=>invoke<Repo|null>('open_repo'),status:(root:string)=>invoke<Repo>('repo_status',{root}),list:(root:string,path:string)=>invoke<Entry[]>('list_directory',{root,path}),read:(root:string,path:string)=>invoke<DocumentData>('read_document',{root,path}),save:(root:string,path:string,content:string,version:string)=>invoke<DocumentData>('save_document',{root,path,content,version})};
import type {Snapshot,FileDiff} from './types';
export const gitApi={snapshot:(root:string,includeHistory=true,branch?:string,includeBranches=true)=>invoke<Snapshot>('git_snapshot',{root,includeHistory,branch:branch||null,includeBranches}),diff:(root:string,path:string,kind:string,commit='')=>invoke<FileDiff>('git_diff',{root,path,kind,commit}),files:(root:string,commit:string)=>invoke<string[]>('commit_files',{root,commit}),write:(root:string,action:string,value:string)=>invoke<string>('git_write',{root,action,value})};

export const fileHistory=(root:string,path:string)=>invoke<import('./types').Commit[]>('file_history',{root,path});

export interface Workflow {merging:boolean;conflicts:string[];remotes:string[];upstream:string;branch:string}
export const workflowApi={state:(root:string)=>invoke<Workflow>('git_workflow',{root}),action:(root:string,action:string,value='')=>invoke<string>('git_workflow_action',{root,action,value})};

export const createEntry=(root:string,path:string,directory:boolean)=>invoke<void>('create_entry',{root,path,directory});

export const mutateEntry=(root:string,path:string,action:string,destination='')=>invoke<void>('mutate_entry',{root,path,action,destination});
