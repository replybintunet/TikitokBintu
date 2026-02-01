import { cn } from "@/lib/utils";
import { Circle, Radio, AlertTriangle, AlertCircle } from "lucide-react";

type Status = "idle" | "starting" | "streaming" | "error" | "reconnecting";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    idle: {
      icon: Circle,
      text: "Idle",
      style: "bg-secondary text-secondary-foreground border-border",
      pulse: false
    },
    starting: {
      icon: Radio,
      text: "Starting...",
      style: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      pulse: true
    },
    streaming: {
      icon: Radio,
      text: "LIVE",
      style: "bg-green-500/10 text-green-500 border-green-500/20",
      pulse: true
    },
    reconnecting: {
      icon: AlertTriangle,
      text: "Reconnecting",
      style: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      pulse: true
    },
    error: {
      icon: AlertCircle,
      text: "Error",
      style: "bg-red-500/10 text-red-500 border-red-500/20",
      pulse: false
    }
  };

  const { icon: Icon, text, style, pulse } = config[status];

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-300",
      style,
      className
    )}>
      <div className="relative flex items-center justify-center">
        {pulse && (
          <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-current" />
        )}
        <Icon className="w-4 h-4 relative z-10" />
      </div>
      <span className="uppercase tracking-wide text-xs font-bold">{text}</span>
    </div>
  );
}
