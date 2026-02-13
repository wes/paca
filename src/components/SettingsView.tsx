import { getSystemTimezone, getTheme, getThemeDisplayNames } from "../types.ts";
import type { AppSettings, Theme } from "../types.ts";

interface SettingsViewProps {
  settings: AppSettings;
  selectedIndex: number;
  theme: Theme;
  currentDbFilename: string;
  onSelectDatabase: () => void;
  onEditBusinessName: () => void;
  onEditStripeKey: () => void;
  onEditTimezone: () => void;
  onSelectTheme: () => void;
  onToggleMenuBar: () => void;
  onExportDatabase: () => void;
  onImportDatabase: () => void;
}

type SettingsItem = { key: string; label: string; type: string };

const BUSINESS_SETTINGS: SettingsItem[] = [
  { key: "businessName", label: "Business Name", type: "text" },
  { key: "stripeApiKey", label: "Stripe API Key", type: "secret" },
];

const APP_SETTINGS: SettingsItem[] = [
  { key: "database", label: "Database", type: "select" },
  { key: "theme", label: "Theme", type: "select" },
  { key: "timezone", label: "Timezone", type: "text" },
  { key: "menuBar", label: "Menu Bar", type: "toggle" },
  { key: "exportDatabase", label: "Export Database", type: "action" },
  { key: "importDatabase", label: "Import Database", type: "action" },
];

const ALL_SETTINGS = [...BUSINESS_SETTINGS, ...APP_SETTINGS];

export function SettingsView({
  settings,
  selectedIndex,
  theme,
  currentDbFilename,
  onSelectDatabase,
  onEditBusinessName,
  onEditStripeKey,
  onEditTimezone,
  onSelectTheme,
  onToggleMenuBar,
  onExportDatabase,
  onImportDatabase,
}: SettingsViewProps) {
  const colors = theme.colors;

  const maskSecret = (value: string) => {
    if (!value) return "(not set)";
    if (value.length <= 8) return "*".repeat(value.length);
    return value.slice(0, 4) + "*".repeat(value.length - 8) + value.slice(-4);
  };

  const formatTimezone = (tz: string) => {
    if (!tz || tz === "auto") {
      return `Auto (${getSystemTimezone()})`;
    }
    return tz;
  };

  const getThemeDisplay = () => {
    const currentTheme = getTheme(settings.theme);
    return currentTheme.displayName;
  };

  const getValue = (key: string) => {
    switch (key) {
      case "database":
        return currentDbFilename.replace(/\.db$/, "");
      case "theme":
        return getThemeDisplay();
      case "businessName":
        return settings.businessName || "(not set)";
      case "stripeApiKey":
        return maskSecret(settings.stripeApiKey);
      case "timezone":
        return formatTimezone(settings.timezone);
      case "menuBar":
        return settings.menuBar === "enabled" ? "Enabled" : "Disabled";
      case "exportDatabase":
        return "Export to file...";
      case "importDatabase":
        return "Import from file...";
      default:
        return "";
    }
  };

  const getAction = (key: string) => {
    switch (key) {
      case "database":
        return onSelectDatabase;
      case "theme":
        return onSelectTheme;
      case "businessName":
        return onEditBusinessName;
      case "stripeApiKey":
        return onEditStripeKey;
      case "timezone":
        return onEditTimezone;
      case "menuBar":
        return onToggleMenuBar;
      case "exportDatabase":
        return onExportDatabase;
      case "importDatabase":
        return onImportDatabase;
      default:
        return () => {};
    }
  };

  const getActionLabel = (type: string) => {
    if (type === "action") return "run";
    if (type === "select") return "select";
    if (type === "toggle") return "toggle";
    return "edit";
  };

  const renderItem = (item: SettingsItem, globalIndex: number) => {
    const isSelected = globalIndex === selectedIndex;
    return (
      <box
        key={item.key}
        style={{
          flexDirection: "row",
          paddingLeft: 1,
          paddingRight: 1,
          backgroundColor: isSelected ? colors.selectedRowBg : "transparent",
        }}
      >
        <box style={{ width: 20 }}>
          <text
            fg={isSelected ? colors.selectedText : colors.textPrimary}
            attributes={isSelected ? "bold" : undefined}
          >
            {item.label}
          </text>
        </box>
        <box style={{ flexGrow: 1 }}>
          <text fg={isSelected ? colors.selectedText : colors.textSecondary}>
            {getValue(item.key)}
          </text>
        </box>
        {isSelected && (
          <text fg={colors.accent}>[Enter to {getActionLabel(item.type)}]</text>
        )}
      </box>
    );
  };

  return (
    <box
      style={{
        flexDirection: "column",
        flexGrow: 1,
        padding: 1,
      }}
    >
      <box
        title="Business"
        style={{
          border: true,
          borderColor: colors.borderSubtle,
          padding: 1,
          flexDirection: "column",
        }}
      >
        {BUSINESS_SETTINGS.map((item, i) => renderItem(item, i))}
      </box>

      <box
        title="App"
        style={{
          border: true,
          borderColor: colors.borderSubtle,
          padding: 1,
          flexDirection: "column",
          marginTop: 1,
        }}
      >
        {APP_SETTINGS.map((item, i) =>
          renderItem(item, BUSINESS_SETTINGS.length + i),
        )}
      </box>

      <box style={{ marginTop: 2 }}>
        <text fg={colors.textMuted}>
          Use j/k or arrows to navigate, Enter to select, Esc to go back
        </text>
      </box>

      <box style={{ marginTop: 1 }}>
        <text fg={colors.textMuted}>Database: ~/.paca/{currentDbFilename}</text>
      </box>
    </box>
  );
}

export const SETTINGS_COUNT = ALL_SETTINGS.length;
