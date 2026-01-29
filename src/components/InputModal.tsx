import { useState } from "react";
import type { InputMode, Theme } from "../types.ts";
import { CATPPUCCIN_MOCHA } from "../types.ts";
import Modal from "./Modal";
import { usePaste } from "../hooks/usePaste";

interface InputModalProps {
  mode: InputMode;
  title: string;
  initialValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  theme?: Theme;
}

export function InputModal({
  title,
  initialValue = "",
  placeholder = "",
  onSubmit,
  theme = CATPPUCCIN_MOCHA,
}: InputModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = usePaste();
  const colors = theme.colors;

  return (
    <Modal title={title} theme={theme}>
      <box
        style={{
          border: true,
          borderColor: colors.borderSubtle,
          height: 3,
          marginTop: 1,
        }}
      >
        <input
          ref={inputRef}
          placeholder={placeholder}
          focused
          value={value}
          onInput={setValue}
          onSubmit={() => {
            if (value.trim()) {
              onSubmit(value.trim());
            }
          }}
        />
      </box>
    </Modal>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme?: Theme;
}

export function ConfirmModal({
  title,
  message,
  theme = CATPPUCCIN_MOCHA,
}: ConfirmModalProps) {
  const colors = theme.colors;

  return (
    <Modal title={title} theme={theme}>
      <text fg={colors.error} attributes="bold">
        {title}
      </text>
      <text fg={colors.textPrimary} style={{ marginTop: 1 }}>
        {message}
      </text>
      <box style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
        <text>
          <span fg={colors.success}>[y]</span>
          <span fg={colors.textSecondary}> Yes</span>
        </text>
        <text>
          <span fg={colors.error}>[n]</span>
          <span fg={colors.textSecondary}> No</span>
        </text>
      </box>
    </Modal>
  );
}
