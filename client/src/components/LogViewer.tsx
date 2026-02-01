import { useEffect, useRef } from "react";
import { Terminal, ScrollText } from "lucide-react";

interface LogViewerProps {
  logs: string[];
}

export function LogViewer({ logs }: LogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-secondary/20">
        <Terminal className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground font-mono">Stream Logs</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-500/80 font-mono uppercase">Tail -f</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm logs-scroll">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-3">
            <ScrollText className="w-12 h-12 opacity-20" />
            <p>No logs available yet. Start the stream to see output.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {logs.map((log, i) => (
              <div key={i} className="break-all whitespace-pre-wrap text-green-400/90 font-medium">
                <span className="opacity-40 mr-2 select-none">›</span>
                {log}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
