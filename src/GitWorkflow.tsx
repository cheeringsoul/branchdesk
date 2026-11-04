import {createPortal} from 'react-dom';
import {useEffect,useState} from 'react';
import {workflowApi} from './repoApi';
import type {Workflow} from './repoApi';

type AuthRequest={action:string;value:string;url:string};

function authRequest(error:unknown,action:string,value:string):AuthRequest|null{
  const message=String(error),marker='AUTH_REQUIRED\n',start=message.indexOf(marker);
  if(start<0)return null;
  const rest=message.slice(start+marker.length),newline=rest.indexOf('\n');
  return newline<0?null:{action,value,url:rest.slice(0,newline)};
}

function displayUrl(raw:string){
  try{const url=new URL(raw);url.username='';url.password='';return url.toString()}
  catch{return raw}
}

export function GitWorkflow({root,dirty,onRefresh,onOpen,branchControl}:{root:string;branchControl?:import('react').ReactNode;dirty:boolean;onRefresh:()=>Promise<void>;onOpen:(path:string)=>void}){
  const[operation,setOperation]=useState(''),[pending,setPending]=useState<{action:string;value:string}|null>(null),[auth,setAuth]=useState<AuthRequest|null>(null);
  const[username,setUsername]=useState(''),[password,setPassword]=useState(''),[authError,setAuthError]=useState('');
  const[state,setState]=useState<Workflow>(),[remote,setRemote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');

  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer)},[notice]);
  async function load(){const next=await workflowApi.state(root);setState(next);setRemote(current=>next.remotes.includes(current)?current:next.remotes[0]||'')}
  useEffect(()=>{void load().catch(e=>setError(String(e)));const refresh=()=>void load().catch(e=>setError(String(e)));window.addEventListener('branchdesk-workflow',refresh);window.addEventListener('focus',refresh);return()=>{window.removeEventListener('branchdesk-workflow',refresh);window.removeEventListener('focus',refresh)}},[root]);
  async function finish(){try{await load();await onRefresh()}catch(e){setError(String(e))}}

  async function act(action:string,value=''){
    if(dirty&&action!=='fetch'){setError('Save or close unsaved editor files first.');return}
    setOperation(action);setNotice('');setBusy(true);setError('');
    try{setNotice(await workflowApi.action(root,action,value))}
    catch(e){const request=authRequest(e,action,value);if(request){setAuth(request);setUsername('');setPassword('');setAuthError('')}else setError(String(e))}
    finally{await finish();setBusy(false)}
  }

  async function authenticate(event:import('react').FormEvent){
    event.preventDefault();if(!auth)return;
    setBusy(true);setAuthError('');setError('');
    try{setNotice(await workflowApi.authenticate(root,auth.action,auth.value,username,password));setPassword('');setAuth(null)}
    catch(e){setPassword('');setAuthError(String(e))}
    finally{await finish();setBusy(false)}
  }

  function closeAuth(){if(busy)return;setPassword('');setAuthError('');setAuth(null)}
  function ask(action:string,value=''){setPending({action,value})}

  return <div className="workflow">
    {pending&&<div className="sync-confirm-backdrop"><div className="sync-confirm" role="dialog" aria-modal="true" aria-label="Confirm Git operation"><h3>{pending.action.toUpperCase()}</h3><p>{pending.action==='push'?`Push ${state?.branch} → ${remote}/${state?.branch}`:pending.action==='pull'?`Update ${state?.branch} from ${state?.upstream} (fast-forward only)`:pending.action==='fetch'?`Fetch from ${pending.value}`:pending.action==='abort'?'Abort merge and discard in-progress resolutions?':`${pending.action} ${pending.value}`}</p><div className="sync-confirm-actions"><button onClick={()=>setPending(null)}>Cancel</button><button className="primary" onClick={()=>{const request=pending;setPending(null);void act(request.action,request.value)}}>Confirm</button></div></div></div>}
    {auth&&<div className="sync-confirm-backdrop"><form className="sync-confirm" onSubmit={authenticate} aria-label="Git credentials"><h3>Sign in to Git remote</h3><p>{displayUrl(auth.url)}</p><input autoFocus autoComplete="username" aria-label="Username" placeholder="Username" value={username} onChange={event=>setUsername(event.target.value)} required/><input autoComplete="current-password" aria-label="Password or access token" placeholder="Password or access token" type="password" value={password} onChange={event=>setPassword(event.target.value)} required/>{authError&&<p className="error" role="alert">{authError}</p>}<p className="small muted">Credentials are passed directly to Git and saved using your configured credential helper.</p><div className="sync-confirm-actions"><button type="button" disabled={busy} onClick={closeAuth}>Cancel</button><button className="primary" disabled={busy||!username.trim()||!password} type="submit">{busy?'Signing in…':'Sign in and Retry'}</button></div></form></div>}
    <div className="workflowbar"><strong>Git Sync</strong>{branchControl}<button title={!remote?'No remote configured':'Fetch remote refs'} disabled={busy||!remote} onClick={()=>ask('fetch',remote)}>Fetch</button><button title={state?.merging?'Finish the current merge first':!state?.upstream?'No upstream configured; push this branch first':'Fast-forward update from upstream'} disabled={busy||!state?.upstream||state?.merging} onClick={()=>ask('pull')}>Pull</button><button title={!remote?'No remote configured':state?.merging?'Finish the current merge first':'Push current branch'} disabled={busy||!remote||state?.merging} onClick={()=>ask('push',remote)}>Push</button></div>
    {busy&&['fetch','pull','push'].includes(operation)&&document.getElementById('git-progress-slot')&&createPortal(<div className="status-sync-progress" role="status" aria-live="polite"><span>{operation==='fetch'?'Fetching…':operation==='pull'?'Pulling…':'Pushing…'}</span><progress aria-label={operation+' in progress'}/></div>,document.getElementById('git-progress-slot')!)}
    {(error||notice)&&<div className={'git-result-toast '+(error?'toast-error':'')} role={error?'alert':'status'}><span>{error||notice}</span><button aria-label="Close notification" onClick={()=>{setError('');setNotice('')}}>×</button></div>}
    {state?.merging&&<div className="mergeprogress"><strong>Merge in progress · {state.conflicts.length} unresolved files</strong>{state.conflicts.map(path=><div key={path}><button onClick={()=>onOpen(path)}>{path} · Edit</button><button disabled={busy} onClick={()=>ask('resolve',path)}>Mark Resolved</button></div>)}<button disabled={busy||!!state.conflicts.length} onClick={()=>ask('continue')}>Continue Merge</button><button disabled={busy} onClick={()=>ask('abort')}>Abort Merge…</button></div>}
  </div>
}
