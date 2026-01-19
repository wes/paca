import { useState, useEffect } from "react";
import type { RunningTimer } from "../types.ts";

interface TimerProps {
  runningTimer: RunningTimer | null;
  onStop: () => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatDurationHuman(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  }
  return "<1m";
}

export function Timer({ runningTimer, onStop }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!runningTimer) {
      setElapsed(0);
      return;
    }

    const updateElapsed = () => {
      const start = new Date(runningTimer.startTime).getTime();
      setElapsed(Date.now() - start);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [runningTimer]);

  if (!runningTimer) {
    return (
      <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
        <text fg="#64748b">No timer running</text>
        <text>
          <span fg="#475569">[</span>
          <span fg="#10b981">t</span>
          <span fg="#475569">] Start</span>
        </text>
      </box>
    );
  }

  const earnings =
    runningTimer.project.hourlyRate != null
      ? (elapsed / 3600000) * runningTimer.project.hourlyRate
      : null;

  return (
    <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
      <text>
        <span fg="#ef4444">●</span>
      </text>
      <text fg={runningTimer.project.color} attributes="bold">
        {runningTimer.project.name}
      </text>
      <text fg="#f59e0b" attributes="bold">
        {formatDuration(elapsed)}
      </text>
      {earnings !== null && (
        <text fg="#10b981">${earnings.toFixed(2)}</text>
      )}
      <text>
        <span fg="#475569">[</span>
        <span fg="#ef4444">s</span>
        <span fg="#475569">] Stop</span>
      </text>
    </box>
  );
}
