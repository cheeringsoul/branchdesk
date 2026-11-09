import { useEffect, useRef, useState } from "react";
import { Terminal, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { terminalApi } from "./repoApi";
import {
  defaultTerminalSettings,
  loadTerminalSettings,
  terminalRestartEvent,
  terminalSettingsEvent,
  type TerminalSettings,
} from "./terminalSettings";
import { storedTheme, type Theme } from "./ThemePicker";

const terminalTheme = (theme: Theme): ITheme =>
  theme === "ember"
    ? {
        background: "#fffdfb", foreground: "#382820", cursor: "#ff531f", cursorAccent: "#fffdfb",
        selectionBackground: "#ff531f38", black: "#382820", red: "#cc3f34", green: "#438257",
        yellow: "#9c6a14", blue: "#426ca8", magenta: "#93558c", cyan: "#337d7a", white: "#eee0d8",
        brightBlack: "#8c756a", brightRed: "#dd594d", brightGreen: "#57966a", brightYellow: "#ad7c27",
        brightBlue: "#5880ba", brightMagenta: "#a66b9f", brightCyan: "#488f8c", brightWhite: "#ffffff",
      }
    : theme === "violet"
    ? {
        background: "#1d2028", foreground: "#dce2ee", cursor: "#c4adf4", cursorAccent: "#1d2028",
        selectionBackground: "#7460d84d", black: "#20242d", red: "#f17c8e", green: "#98d7aa",
        yellow: "#e4c779", blue: "#84a9eb", magenta: "#c4adf4", cyan: "#79ccc8", white: "#dce2ee",
        brightBlack: "#7d8798", brightRed: "#ff96a5", brightGreen: "#b1e4be", brightYellow: "#f0d993",
        brightBlue: "#9bbbf0", brightMagenta: "#d4c0f7", brightCyan: "#94dbd7", brightWhite: "#ffffff",
      }
    : {
        background: "#ffffff", foreground: "#263142", cursor: "#7460d8", cursorAccent: "#ffffff",
        selectionBackground: "#7460d833", black: "#263142", red: "#c8445a", green: "#2e8b57",
        yellow: "#9a6c16", blue: "#4169b1", magenta: "#7750a8", cyan: "#2c7f88", white: "#e8edf3",
        brightBlack: "#758296", brightRed: "#d95a6f", brightGreen: "#3c9a68", brightYellow: "#ac7b27",
        brightBlue: "#557dc4", brightMagenta: "#8b64bb", brightCyan: "#41939c", brightWhite: "#ffffff",
      };

export function TerminalPanel({ root }: { root: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const settingsRef = useRef<TerminalSettings>(defaultTerminalSettings);
  const [settings, setSettings] = useState<TerminalSettings>(loadTerminalSettings);
  const [sessionVersion, setSessionVersion] = useState(0);
  settingsRef.current = settings;

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.options.fontSize = settings.fontSize;
    terminal.options.lineHeight = settings.lineHeight;
    terminal.options.cursorStyle = settings.cursorStyle;
    terminal.options.cursorBlink = settings.cursorBlink;
    terminal.options.scrollback = settings.scrollback;
    try {
      fitRef.current?.fit();
      terminal.refresh(0, terminal.rows - 1);
    } catch {
      // The terminal may be hidden while its settings are changed.
    }
  }, [settings]);

  useEffect(() => {
    const update = (event: Event) => setSettings((event as CustomEvent<TerminalSettings>).detail);
    const restart = () => setSessionVersion((version) => version + 1);
    window.addEventListener(terminalSettingsEvent, update);
    window.addEventListener(terminalRestartEvent, restart);
    return () => {
      window.removeEventListener(terminalSettingsEvent, update);
      window.removeEventListener(terminalRestartEvent, restart);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let sessionId = "";
    let poll: number | undefined;
    const currentSettings = settingsRef.current;
    const terminal = new Terminal({
      cursorBlink: currentSettings.cursorBlink,
      cursorStyle: currentSettings.cursorStyle,
      fontFamily: '"SFMono-Regular", "Symbols Nerd Font Mono", "JetBrains Mono", Menlo, Monaco, monospace',
      fontSize: currentSettings.fontSize,
      fontWeight: "400",
      fontWeightBold: "600",
      letterSpacing: 0.2,
      lineHeight: currentSettings.lineHeight,
      scrollback: currentSettings.scrollback,
      smoothScrollDuration: 120,
      allowTransparency: false,
      theme: terminalTheme(storedTheme()),
    });
    const fit = new FitAddon();
    terminalRef.current = terminal;
    fitRef.current = fit;
    terminal.loadAddon(fit);
    terminal.open(host);
    fit.fit();
    terminal.focus();
    void document.fonts.load(`${currentSettings.fontSize}px "Symbols Nerd Font Mono"`).then(() => {
      if (!disposed) {
        terminal.refresh(0, terminal.rows - 1);
        fit.fit();
      }
    });

    const handleThemeChange = (event: Event) => {
      terminal.options.theme = terminalTheme((event as CustomEvent<Theme>).detail);
    };
    window.addEventListener("branchdesk-theme", handleThemeChange);

    const dataSubscription = terminal.onData((data) => {
      if (sessionId) void terminalApi.write(sessionId, data);
    });
    const resizeObserver = new ResizeObserver(() => {
      try {
        fit.fit();
        if (sessionId) void terminalApi.resize(sessionId, terminal.cols, terminal.rows);
      } catch {
        // Tabs can briefly have no measurable size while switching.
      }
    });
    resizeObserver.observe(host);

    void terminalApi
      .start(root, terminal.cols, terminal.rows, currentSettings.shell || null)
      .then((id) => {
        if (disposed) {
          void terminalApi.close(id);
          return;
        }
        sessionId = id;
        poll = window.setInterval(async () => {
          if (!sessionId || document.hidden) return;
          try {
            const bytes = await terminalApi.read(sessionId);
            if (bytes.length) terminal.write(new Uint8Array(bytes));
          } catch (error) {
            terminal.write(`\r\n\x1b[31m${String(error)}\x1b[0m\r\n`);
            if (poll) window.clearInterval(poll);
          }
        }, 30);
      })
      .catch((error) => terminal.write(`\x1b[31m${String(error)}\x1b[0m\r\n`));

    return () => {
      disposed = true;
      window.removeEventListener("branchdesk-theme", handleThemeChange);
      if (poll) window.clearInterval(poll);
      resizeObserver.disconnect();
      dataSubscription.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
      if (sessionId) void terminalApi.close(sessionId);
    };
  }, [root, sessionVersion]);

  return <div className="terminal-wrap"><div className="terminal-panel" ref={hostRef} /></div>;
}
