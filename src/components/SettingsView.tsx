import { COLORS, getSystemTimezone } from "../types.ts";
import type { AppSettings } from "../types.ts";

interface SettingsViewProps {
  settings: AppSettings;
  selectedIndex: number;
  onEditBusinessName: () => void;
  onEditStripeKey: () => void;
  onEditTimezone: () => void;
  onExportDatabase: () => void;
  onImportDatabase: () => void;
}

const SETTINGS_ITEMS = [
  { key: "businessName", label: "Business Name", type: "text" },
  { key: "stripeApiKey", label: "Stripe API Key", type: "secret" },
  { key: "timezone", label: "Timezone", type: "text" },
  { key: "exportDatabase", label: "Export Database", type: "action" },
  { key: "importDatabase", label: "Import Database", type: "action" },
] as const;

export function SettingsView({
  settings,
  selectedIndex,
  onEditBusinessName,
  onEditStripeKey,
  onEditTimezone,
  onExportDatabase,
  onImportDatabase,
}: SettingsViewProps) {
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

  const getValue = (key: string) => {
    switch (key) {
      case "businessName":
        return settings.businessName || "(not set)";
      case "stripeApiKey":
        return maskSecret(settings.stripeApiKey);
      case "timezone":
        return formatTimezone(settings.timezone);
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
      case "businessName":
        return onEditBusinessName;
      case "stripeApiKey":
        return onEditStripeKey;
      case "timezone":
        return onEditTimezone;
      case "exportDatabase":
        return onExportDatabase;
      case "importDatabase":
        return onImportDatabase;
      default:
        return () => {};
    }
  };

  return (
    <box
      style={{
        flexDirection: "column",
        flexGrow: 1,
        padding: 1,
      }}
    >
      <box style={{ marginBottom: 1 }}>
        <text fg="#64748b">Application Settings</text>
      </box>

      <box
        title="Settings"
        style={{
          border: true,
          borderColor: "#334155",
          padding: 1,
          flexDirection: "column",
        }}
      >
        {SETTINGS_ITEMS.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <box
              key={item.key}
              style={{
                flexDirection: "row",
                paddingLeft: 1,
                paddingRight: 1,
                backgroundColor: isSelected ? COLORS.selectedRowBg : "transparent",
              }}
            >
              <box style={{ width: 20 }}>
                <text
                  fg={isSelected ? "#ffffff" : "#e2e8f0"}
                  attributes={isSelected ? "bold" : undefined}
                >
                  {item.label}
                </text>
              </box>
              <box style={{ flexGrow: 1 }}>
                <text fg={isSelected ? "#ffffff" : "#94a3b8"}>
                  {getValue(item.key)}
                </text>
              </box>
              {isSelected && (
                <text fg="#64748b">[Enter to {item.type === "action" ? "run" : "edit"}]</text>
              )}
            </box>
          );
        })}
      </box>

      <box style={{ marginTop: 2 }}>
        <text fg="#475569">
          Use j/k or arrows to navigate, Enter to select, Esc to go back
        </text>
      </box>

      <box style={{ marginTop: 1 }}>
        <text fg="#475569">Database location: ~/.paca/paca.db</text>
      </box>
    </box>
  );
}

export const SETTINGS_COUNT = SETTINGS_ITEMS.length;
