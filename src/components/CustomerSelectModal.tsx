import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { CATPPUCCIN_MOCHA, type Customer, type Theme } from "../types.ts";

interface CustomerSelectModalProps {
  customers: Customer[];
  currentCustomerId?: string | null;
  projectName: string;
  onSelect: (customerId: string | null) => void;
  onCreateNew: () => void;
  onEdit: (customer: Customer) => void;
  onCancel: () => void;
  theme?: Theme;
}

export function CustomerSelectModal({
  customers,
  currentCustomerId,
  projectName,
  onSelect,
  onCreateNew,
  onEdit,
  onCancel,
  theme = CATPPUCCIN_MOCHA,
}: CustomerSelectModalProps) {
  const colors = theme.colors;
  // Create items list: customers + "None" option + "Create new" option
  const items: { id: string | null; label: string; isAction: boolean; customer?: Customer }[] = [
    { id: null, label: "(No customer)", isAction: false },
    ...customers.map((c) => ({
      id: c.id,
      label: `${c.name} <${c.email}>${c.stripeCustomerId ? " [Stripe]" : ""}`,
      isAction: false,
      customer: c,
    })),
    { id: "__create__", label: "+ Create new customer", isAction: true },
  ];

  const currentIndex = currentCustomerId
    ? items.findIndex((i) => i.id === currentCustomerId)
    : 0;

  const [selectedIndex, setSelectedIndex] = useState(currentIndex >= 0 ? currentIndex : 0);

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel();
      return;
    }
    if (key.name === "return" && items[selectedIndex]) {
      const item = items[selectedIndex];
      if (item.id === "__create__") {
        onCreateNew();
      } else {
        onSelect(item.id);
      }
      return;
    }
    // Edit customer
    if (key.name === "e" && items[selectedIndex]) {
      const item = items[selectedIndex];
      if (item.customer) {
        onEdit(item.customer);
      }
      return;
    }
    // Create new customer shortcut
    if (key.name === "n") {
      onCreateNew();
      return;
    }
    if (key.name === "j" || key.name === "down") {
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      return;
    }
    if (key.name === "k" || key.name === "up") {
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
  });

  const modalHeight = Math.min(items.length + 6, 18);

  return (
    <box
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 60,
        height: modalHeight,
        marginTop: -Math.floor(modalHeight / 2),
        marginLeft: -30,
        border: true,
        borderColor: colors.border,
        flexDirection: "column",
        backgroundColor: colors.bg,
        padding: 1,
        zIndex: 99999,
      }}
    >
      <text fg={colors.textPrimary} attributes="bold">
        Link Customer to Project
      </text>
      <text fg={colors.accentSecondary}>{projectName}</text>
      <box style={{ marginTop: 1, flexGrow: 1 }}>
        <scrollbox focused style={{ flexGrow: 1 }}>
          {items.map((item, index) => (
            <box
              key={item.id ?? "none"}
              style={{
                paddingLeft: 1,
                paddingRight: 1,
                backgroundColor:
                  index === selectedIndex ? colors.selectedRowBg : "transparent",
              }}
            >
              <text>
                {item.id === currentCustomerId && (
                  <span fg={colors.success}>[*] </span>
                )}
                {item.id !== currentCustomerId && item.id !== "__create__" && (
                  <span fg={colors.textMuted}>[ ] </span>
                )}
                <span
                  fg={
                    item.isAction
                      ? colors.success
                      : index === selectedIndex
                        ? colors.selectedText
                        : colors.textPrimary
                  }
                  attributes={index === selectedIndex ? "bold" : undefined}
                >
                  {item.label}
                </span>
              </text>
            </box>
          ))}
        </scrollbox>
      </box>
      <text fg={colors.textMuted}>Enter: select | n: new | e: edit | Esc: cancel</text>
    </box>
  );
}
