import { COLORS } from "../types";

interface ProjectModalProps {
  title: string;
  height: number;
  children: any;
}

export default function ProjectModal({
  title,
  height = 10,
  children,
}: ProjectModalProps) {
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
        borderColor: COLORS.border,
        flexDirection: "column",
        backgroundColor: COLORS.bg,
        padding: 1,
        zIndex: 99999,
      }}
    >
      <text fg="#ffffff" attributes="bold">
        {title}
      </text>
      {children}
    </box>
  );
}
