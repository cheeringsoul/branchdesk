import { useEffect, useState } from "react";
import { Monitor, RotateCcw, SquareTerminal, X } from "lucide-react";
import { applyTheme, storedTheme, type Theme } from "./ThemePicker";
import {
  defaultTerminalSettings,
  loadTerminalSettings,
  saveTerminalSettings,
  terminalRestartEvent,
  type CursorStyle,
  type TerminalSettings,
} from "./terminalSettings";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [section, setSection] = useState<"appearance" | "terminal">("terminal");
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [terminal, setTerminal] = useState<TerminalSettings>(loadTerminalSettings);

  useEffect(() => {
    if (!open) return;
    setTheme(storedTheme());
    setTerminal(loadTerminalSettings());
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  if (!open) return null;
  const update = <K extends keyof TerminalSettings,>(key: K, value: TerminalSettings[K]) =>
    setTerminal((current) => ({ ...current, [key]: value }));
  const save = (restart: boolean) => {
    applyTheme(theme);
    saveTerminalSettings(terminal);
    if (restart) window.dispatchEvent(new Event(terminalRestartEvent));
    onClose();
  };

  return (
    <div className="settings-backdrop" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-window" role="dialog" aria-modal="true" aria-label="BranchDesk Settings">
        <header className="settings-header"><strong>Settings</strong><button aria-label="Close settings" onClick={onClose}><X size={16} /></button></header>
        <div className="settings-body">
          <aside className="settings-sidebar">
            <button className={section === "appearance" ? "selected" : ""} onClick={() => setSection("appearance")}><Monitor size={16} />Appearance</button>
            <button className={section === "terminal" ? "selected" : ""} onClick={() => setSection("terminal")}><SquareTerminal size={16} />Terminal</button>
          </aside>
          <div className="settings-content">
            {section === "appearance" ? (
              <><h2>Appearance</h2><p className="muted">Choose the BranchDesk interface theme.</p><div className="settings-theme-options"><button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><span className="settings-theme-swatch light" />Light</button><button className={theme === "violet" ? "selected" : ""} onClick={() => setTheme("violet")}><span className="settings-theme-swatch violet" />Dusk</button><button className={theme === "ember" ? "selected" : ""} onClick={() => setTheme("ember")}><span className="settings-theme-swatch ember" />Ember</button></div></>
            ) : (
              <><h2>Terminal</h2><p className="muted">These settings apply to all BranchDesk terminals.</p><div className="settings-form">
                <label><span>Shell</span><select value={terminal.shell} onChange={(event) => update("shell", event.target.value)}><option value="">System Default</option><option value="/bin/zsh">zsh</option><option value="/bin/bash">bash</option></select><small>Shell changes take effect after restarting the terminal.</small></label>
                <label><span>Font Size</span><div className="settings-range"><input type="range" min="10" max="24" step="1" value={terminal.fontSize} onChange={(event) => update("fontSize", Number(event.target.value))} /><output>{terminal.fontSize}px</output></div></label>
                <label><span>Line Height</span><div className="settings-range"><input type="range" min="1" max="1.6" step="0.05" value={terminal.lineHeight} onChange={(event) => update("lineHeight", Number(event.target.value))} /><output>{terminal.lineHeight.toFixed(2)}</output></div></label>
                <label><span>Cursor</span><select value={terminal.cursorStyle} onChange={(event) => update("cursorStyle", event.target.value as CursorStyle)}><option value="bar">Bar</option><option value="block">Block</option><option value="underline">Underline</option></select></label>
                <label className="settings-checkbox"><span>Cursor Blink</span><input type="checkbox" checked={terminal.cursorBlink} onChange={(event) => update("cursorBlink", event.target.checked)} /></label>
                <label><span>Scrollback</span><select value={terminal.scrollback} onChange={(event) => update("scrollback", Number(event.target.value))}><option value={1000}>1,000 lines</option><option value={10000}>10,000 lines</option><option value={50000}>50,000 lines</option></select></label>
              </div><button className="settings-reset" onClick={() => setTerminal(defaultTerminalSettings)}><RotateCcw size={14} />Restore Terminal Defaults</button></>
            )}
          </div>
        </div>
        <footer className="settings-footer"><button onClick={onClose}>Cancel</button><button onClick={() => save(false)}>Apply</button><button className="primary" onClick={() => save(true)}>Apply and Restart Terminals</button></footer>
      </section>
    </div>
  );
}
