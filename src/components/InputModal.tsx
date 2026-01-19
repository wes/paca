import { useState } from "react";
import type { InputMode } from "../types.ts";
import Modal from "./Modal";
import { usePaste } from "../hooks/usePaste";

interface InputModalProps {
  mode: InputMode;
  title: string;
  initialValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function InputModal({
  title,
  initialValue = "",
  placeholder = "",
  onSubmit,
}: InputModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = usePaste();

  return (
    <Modal title={title}>
      <box
        style={{
          border: true,
          borderColor: "#475569",
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
}

export function ConfirmModal({ title, message }: ConfirmModalProps) {
  return (
    <Modal title={title}>
      <text fg="#ef4444" attributes="bold">
        {title}
      </text>
      <text fg="#e2e8f0" style={{ marginTop: 1 }}>
        {message}
      </text>
      <box style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
        <text>
          <span fg="#10b981">[y]</span>
          <span fg="#94a3b8"> Yes</span>
        </text>
        <text>
          <span fg="#ef4444">[n]</span>
          <span fg="#94a3b8"> No</span>
        </text>
      </box>
    </Modal>
  );
}
