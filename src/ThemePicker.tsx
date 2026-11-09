import{useEffect,useState}from'react';

export type Theme='light'|'violet'|'ember';
const themes:Theme[]=['light','violet','ember'];
const labels:Record<Theme,string>={light:'☀ Light',violet:'☾ Dusk',ember:'◆ Ember'};

export function storedTheme():Theme{
  const value=localStorage.getItem('branchdesk-theme');
  return value==='violet'||value==='ember'?value:'light';
}

export function applyTheme(theme:Theme){
  document.documentElement.dataset.theme=theme;
  localStorage.setItem('branchdesk-theme',theme);
  window.dispatchEvent(new CustomEvent<Theme>('branchdesk-theme',{detail:theme}));
}

export function ThemePicker(){
  const[theme,setTheme]=useState<Theme>(storedTheme);
  useEffect(()=>applyTheme(theme),[theme]);
  useEffect(()=>{const update=(event:Event)=>setTheme((event as CustomEvent<Theme>).detail);window.addEventListener('branchdesk-theme',update);return()=>window.removeEventListener('branchdesk-theme',update)},[]);
  const next=()=>setTheme(current=>themes[(themes.indexOf(current)+1)%themes.length]);
  return <button className="appearance-switch" title="Switch color theme" aria-label={`Current theme: ${labels[theme]}. Click to switch.`} onClick={next}>{labels[theme]}</button>
}

export function useEditorTheme(){
  const[value,setValue]=useState(()=>storedTheme()==='light'?'vs':storedTheme()==='ember'?'branchdesk-ember':'vs-dark');
  useEffect(()=>{const update=(event:Event)=>{const theme=(event as CustomEvent<Theme>).detail;setValue(theme==='light'?'vs':theme==='ember'?'branchdesk-ember':'vs-dark')};window.addEventListener('branchdesk-theme',update);return()=>window.removeEventListener('branchdesk-theme',update)},[]);
  return value
}
