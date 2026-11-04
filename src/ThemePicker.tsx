import{useEffect,useState}from'react';

type Theme='light'|'violet';
const themes:Theme[]=['light','violet'];
const labels:Record<Theme,string>={light:'☀ 浅色',violet:'☾ 暮紫'};

function storedTheme():Theme{
  const value=localStorage.getItem('branchdesk-theme');
  return value==='violet'?value:'light';
}

function apply(theme:Theme){
  document.documentElement.dataset.theme=theme;
  localStorage.setItem('branchdesk-theme',theme);
  window.dispatchEvent(new CustomEvent('branchdesk-theme',{detail:theme==='violet'?'vs-dark':'vs'}));
}

export function ThemePicker(){
  const[theme,setTheme]=useState<Theme>(storedTheme);
  useEffect(()=>apply(theme),[theme]);
  const next=()=>setTheme(current=>themes[(themes.indexOf(current)+1)%themes.length]);
  return <button className="appearance-switch" title="切换浅色 / 暮紫主题" aria-label={`当前${labels[theme]}主题，点击切换`} onClick={next}>{labels[theme]}</button>
}

export function useEditorTheme(){
  const[value,setValue]=useState(()=>storedTheme()==='violet'?'vs-dark':'vs');
  useEffect(()=>{const update=(event:Event)=>setValue((event as CustomEvent<string>).detail);window.addEventListener('branchdesk-theme',update);return()=>window.removeEventListener('branchdesk-theme',update)},[]);
  return value
}
