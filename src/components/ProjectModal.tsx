import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { CATPPUCCIN_MOCHA, type Theme } from "../types";
import Modal from "./Modal";
import { useMultiPaste } from "../hooks/usePaste";

interface ProjectModalProps {
  mode: "create" | "edit";
  initialName?: string;
  initialRate?: number | null;
  onSubmit: (name: string, rate: number | null) => void;
  onCancel: () => void;
  theme?: Theme;
}

export function ProjectModal({
  mode,
  initialName = "",
  initialRate = null,
  onSubmit,
  onCancel,
  theme = CATPPUCCIN_MOCHA,
}: ProjectModalProps) {
  const [name, setName] = useState(initialName);
  const [rate, setRate] = useState(initialRate?.toString() ?? "");
  const [activeField, setActiveField] = useState<"name" | "rate">("name");
  const { registerInput } = useMultiPaste();
  const colors = theme.colors;

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel();
      return;
    }
    if (key.name === "tab" || key.name === "down" || key.name === "up") {
      setActiveField((f) => (f === "name" ? "rate" : "name"));
      return;
    }
  });

  const handleSubmit = () => {
    if (!name.trim()) return;
    const parsedRate = rate.trim() === "" ? null : parseFloat(rate);
    const validRate =
      parsedRate !== null && !isNaN(parsedRate) && parsedRate >= 0
        ? parsedRate
        : null;
    onSubmit(name.trim(), validRate);
  };

  return (
    <Modal
      title={mode === "create" ? "Create New Project" : "Edit Project"}
      height={14}
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
            placeholder="Project name..."
            focused={activeField === "name"}
            onInput={setName}
            onSubmit={handleSubmit}
            value={name}
          />
        </box>
      </box>

      <box
        onClick={() => setActiveField("rate")}
        style={{
          flexDirection: "column",
          marginTop: 1,
        }}
      >
        <box>
          <text fg={colors.accentSecondary} style={{ minWidth: 12 }}>
            Hourly Rate
          </text>
        </box>
        <box
          style={{
            border: true,
            borderColor:
              activeField === "rate" ? colors.border : colors.borderOff,
            height: 3,
            width: "100%",
          }}
        >
          <input
            ref={registerInput("rate")}
            placeholder="e.g. 75.00 (optional)"
            focused={activeField === "rate"}
            onInput={setRate}
            onSubmit={handleSubmit}
            value={rate}
          />
        </box>
      </box>
    </Modal>
  );
}
