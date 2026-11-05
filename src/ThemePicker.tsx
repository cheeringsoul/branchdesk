import{useEffect,useState}from'react';

export type Theme='light'|'violet';
const themes:Theme[]=['light','violet'];
const labels:Record<Theme,string>={light:'☀ Light',violet:'☾ Dusk'};

export function storedTheme():Theme{
  const value=localStorage.getItem('branchdesk-theme');
  return value==='violet'?value:'light';
}

export function applyTheme(theme:Theme){
  document.documentElement.dataset.theme=theme;
  localStorage.setItem('branchdesk-theme',theme);
  window.dispatchEvent(new CustomEvent('branchdesk-theme',{detail:theme==='violet'?'vs-dark':'vs'}));
}

export function ThemePicker(){
  const[theme,setTheme]=useState<Theme>(storedTheme);
  useEffect(()=>applyTheme(theme),[theme]);
  useEffect(()=>{const update=(event:Event)=>setTheme((event as CustomEvent<string>).detail==='vs-dark'?'violet':'light');window.addEventListener('branchdesk-theme',update);return()=>window.removeEventListener('branchdesk-theme',update)},[]);
  const next=()=>setTheme(current=>themes[(themes.indexOf(current)+1)%themes.length]);
  return <button className="appearance-switch" title="Switch Light / Dusk theme" aria-label={`Current theme: ${labels[theme]}. Click to switch.`} onClick={next}>{labels[theme]}</button>
}

export function useEditorTheme(){
  const[value,setValue]=useState(()=>storedTheme()==='violet'?'vs-dark':'vs');
  useEffect(()=>{const update=(event:Event)=>setValue((event as CustomEvent<string>).detail);window.addEventListener('branchdesk-theme',update);return()=>window.removeEventListener('branchdesk-theme',update)},[]);
  return value
}
