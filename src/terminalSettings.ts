export type CursorStyle = "block" | "underline" | "bar";

export type TerminalSettings = {
  shell: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  scrollback: number;
};

export const defaultTerminalSettings: TerminalSettings = {
  shell: "",
  fontSize: 13,
  lineHeight: 1.25,
  cursorStyle: "bar",
  cursorBlink: true,
  scrollback: 10_000,
};

export const terminalSettingsEvent = "branchdesk-terminal-settings";
export const terminalRestartEvent = "branchdesk-terminal-restart";

export function loadTerminalSettings(): TerminalSettings {
  try {
    const value = JSON.parse(localStorage.getItem("branchdesk-terminal-settings") || "{}") as Partial<TerminalSettings>;
    return {
      shell: typeof value.shell === "string" ? value.shell : defaultTerminalSettings.shell,
      fontSize: typeof value.fontSize === "number" && value.fontSize >= 10 && value.fontSize <= 24 ? value.fontSize : defaultTerminalSettings.fontSize,
      lineHeight: typeof value.lineHeight === "number" && value.lineHeight >= 1 && value.lineHeight <= 1.6 ? value.lineHeight : defaultTerminalSettings.lineHeight,
      cursorStyle: value.cursorStyle === "block" || value.cursorStyle === "underline" || value.cursorStyle === "bar" ? value.cursorStyle : defaultTerminalSettings.cursorStyle,
      cursorBlink: typeof value.cursorBlink === "boolean" ? value.cursorBlink : defaultTerminalSettings.cursorBlink,
      scrollback: value.scrollback === 1_000 || value.scrollback === 10_000 || value.scrollback === 50_000 ? value.scrollback : defaultTerminalSettings.scrollback,
    };
  } catch {
    return defaultTerminalSettings;
  }
}

export function saveTerminalSettings(settings: TerminalSettings) {
  localStorage.setItem("branchdesk-terminal-settings", JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent<TerminalSettings>(terminalSettingsEvent, { detail: settings }));
}
