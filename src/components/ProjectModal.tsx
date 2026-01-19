import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { COLORS } from "../types";
import Modal from "./Modal";
import { useMultiPaste } from "../hooks/usePaste";

interface ProjectModalProps {
  mode: "create" | "edit";
  initialName?: string;
  initialRate?: number | null;
  onSubmit: (name: string, rate: number | null) => void;
  onCancel: () => void;
}

export function ProjectModal({
  mode,
  initialName = "",
  initialRate = null,
  onSubmit,
  onCancel,
}: ProjectModalProps) {
  const [name, setName] = useState(initialName);
  const [rate, setRate] = useState(initialRate?.toString() ?? "");
  const [activeField, setActiveField] = useState<"name" | "rate">("name");
  const { registerInput } = useMultiPaste();

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
    >
      <box
        onClick={() => setActiveField("name")}
        style={{
          flexDirection: "column",
          marginTop: 1,
        }}
      >
        <box>
          <text fg="#94a3b8">Name</text>
        </box>
        <box
          style={{
            border: true,
            borderColor:
              activeField === "name" ? COLORS.border : COLORS.borderOff,
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
          <text fg="#94a3b8" style={{ minWidth: 12 }}>
            Hourly Rate
          </text>
        </box>
        <box
          style={{
            border: true,
            borderColor:
              activeField === "rate" ? COLORS.border : COLORS.borderOff,
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
