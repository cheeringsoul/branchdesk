export interface Repo { root:string; branch:string; bare:boolean; changes:Change[] }
export interface Change { path:string; status:string }
export interface Entry { name:string; path:string; directory:boolean }
export interface DocumentData { content:string; version:string }
export interface Tab extends DocumentData { path:string; saved:string }
export interface Commit {hash:string;parents:string[];subject:string;author:string;date:string;refs:string}
export interface Snapshot {branches:string[];log:Commit[];staged:string[];unstaged:string[]}
export interface FileDiff {before:string;after:string}
