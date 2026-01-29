import type { Theme } from "../types";
import { CATPPUCCIN_MOCHA } from "../types";

interface ModalProps {
  title: string;
  height: number;
  children: any;
  theme?: Theme;
}

export default function Modal({
  title,
  height = 10,
  children,
  theme = CATPPUCCIN_MOCHA,
}: ModalProps) {
  const colors = theme.colors;

  return (
    <box
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 60,
        height,
        marginTop: -Math.floor(height / 2),
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
        {title}
      </text>
      {children}
    </box>
  );
}
