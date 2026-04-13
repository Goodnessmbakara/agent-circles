import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsdc(stroops: number): string {
  return (stroops / 1_000_000).toFixed(2);
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function stateLabel(state: string): string {
  const labels: Record<string, string> = {
    setup: "Waiting for members",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[state] ?? state;
}

export function stateColor(state: string): string {
  const colors: Record<string, string> = {
    setup: "bg-yellow-500/20 text-yellow-400",
    active: "bg-green-500/20 text-green-400",
    completed: "bg-blue-500/20 text-blue-400",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return colors[state] ?? "bg-gray-500/20 text-gray-400";
}
