import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { CATPPUCCIN_MOCHA, type Theme } from "../types";
import Modal from "./Modal";
import { useMultiPaste } from "../hooks/usePaste";

interface CustomerModalProps {
  mode: "create" | "edit";
  initialName?: string;
  initialEmail?: string;
  initialStripeId?: string;
  onSubmit: (name: string, email: string, stripeCustomerId?: string) => void;
  onCancel: () => void;
  theme?: Theme;
}

type Field = "name" | "email" | "stripeId";

export function CustomerModal({
  mode,
  initialName = "",
  initialEmail = "",
  initialStripeId = "",
  onSubmit,
  onCancel,
  theme = CATPPUCCIN_MOCHA,
}: CustomerModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [stripeId, setStripeId] = useState(initialStripeId);
  const [activeField, setActiveField] = useState<Field>("name");
  const { registerInput } = useMultiPaste();
  const colors = theme.colors;

  const fields: Field[] = mode === "edit" ? ["name", "email", "stripeId"] : ["name", "email"];

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel();
      return;
    }
    if (key.name === "tab" || key.name === "down") {
      setActiveField((f) => {
        const idx = fields.indexOf(f);
        return fields[(idx + 1) % fields.length] as Field;
      });
      return;
    }
    if (key.name === "up") {
      setActiveField((f) => {
        const idx = fields.indexOf(f);
        return fields[(idx - 1 + fields.length) % fields.length] as Field;
      });
      return;
    }
  });

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    onSubmit(name.trim(), email.trim(), stripeId.trim() || undefined);
  };

  return (
    <Modal
      title={mode === "create" ? "Create New Customer" : "Edit Customer"}
      height={mode === "edit" ? 18 : 14}
      theme={theme}
    >
      <box
        onClick={() => setActiveField("name")}
        style={{
          flexDirection: "column",
          marginTop: 1,
        }}
      >
        <box>
          <text fg={colors.accentSecondary}>Name</text>
        </box>
        <box
          style={{
            border: true,
            borderColor:
              activeField === "name" ? colors.border : colors.borderOff,
            height: 3,
            width: "100%",
          }}
        >
          <input
            ref={registerInput("name")}
            placeholder="Customer name..."
            focused={activeField === "name"}
            onInput={setName}
            onSubmit={handleSubmit}
            value={name}
          />
        </box>
      </box>

      <box
        onClick={() => setActiveField("email")}
        style={{
          flexDirection: "column",
          marginTop: 1,
        }}
      >
        <box>
          <text fg={colors.accentSecondary}>Email</text>
        </box>
        <box
          style={{
            border: true,
            borderColor:
              activeField === "email" ? colors.border : colors.borderOff,
            height: 3,
            width: "100%",
          }}
        >
          <input
            ref={registerInput("email")}
            placeholder="customer@example.com"
            focused={activeField === "email"}
            onInput={setEmail}
            onSubmit={handleSubmit}
            value={email}
          />
        </box>
      </box>

      {mode === "edit" && (
        <box
          onClick={() => setActiveField("stripeId")}
          style={{
            flexDirection: "column",
            marginTop: 1,
          }}
        >
          <box>
            <text fg={colors.accentSecondary}>Stripe Customer ID</text>
          </box>
          <box
            style={{
              border: true,
              borderColor:
                activeField === "stripeId" ? colors.border : colors.borderOff,
              height: 3,
              width: "100%",
            }}
          >
            <input
              ref={registerInput("stripeId")}
              placeholder="cus_... (optional)"
              focused={activeField === "stripeId"}
              onInput={setStripeId}
              onSubmit={handleSubmit}
              value={stripeId}
            />
          </box>
        </box>
      )}
    </Modal>
  );
}
