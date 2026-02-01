import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useStreamStatus, useStartStream, useStopStream, useMuteStream } from "@/hooks/use-stream";
import { StreamControls } from "@/components/StreamControls";
import { LogViewer } from "@/components/LogViewer";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { LogOut, Radio } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: statusData, error, isLoading } = useStreamStatus();
  
  const startMutation = useStartStream();
  const stopMutation = useStopStream();
  const muteMutation = useMuteStream();

const [streams, setStreams] = useState<
  { id: number; config?: any }[]
>([
  { id: Date.now() }
]);

  useEffect(() => {
    if (error && (error as Error).message === "Unauthorized") {
      setLocation("/login");
    }
  }, [error, setLocation]);

  const handleLogout = () => {
    // In a real app we'd clear tokens, but here we just redirect 
    // since auth is session/cookie based or simple state
    setLocation("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">Connecting to BintuNet...</p>
        </div>
      </div>
    );
  }

  const isStreaming = statusData?.isStreaming ?? false;
  const currentStatus = statusData?.status ?? "idle";
  const isMuted = statusData?.isMuted ?? false;
  const logs = statusData?.logs ?? [];
  const config = statusData?.config;

  const isPending = startMutation.isPending || stopMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
              <Radio className="w-6 h-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight hidden sm:block">
              BintuNet Stream
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <StatusBadge status={currentStatus} />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full w-10 h-10"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)] min-h-[600px]">
          
          {/* Left Panel: Controls */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
  {streams.map((stream) => (
    <StreamControls
      key={stream.id}
      isStreaming={isStreaming}
      isMuted={isMuted}
      defaultConfig={stream.config}
      onStart={(data) =>
        startMutation.mutate({ ...data, streamId: stream.id })
      }
      onStop={() =>
        stopMutation.mutate({ streamId: stream.id })
      }
      onMute={(muted) =>
        muteMutation.mutate({ streamId: stream.id })
      }
      isPending={isPending}
    />
  ))}

  <Button
    variant="outline"
    size="sm"
    className="self-start"
    onClick={() =>
      setStreams(prev => [...prev, { id: Date.now() }])
    }
  >
    + Add Stream
  </Button>
            
            
            <div className="bg-gradient-to-br from-primary/20 via-secondary/30 to-background border border-border/50 rounded-2xl p-6 relative overflow-hidden hidden lg:flex flex-1 flex-col justify-end">
              <div className="absolute top-0 right-0 p-32 bg-primary/20 blur-[100px] rounded-full" />
              <h3 className="text-2xl font-bold font-display mb-2 relative z-10">Stream like a Pro</h3>
              <p className="text-muted-foreground relative z-10">
                Optimized for Termux & Ubuntu with FFmpeg + Streamlink pipeline. 
                Dual-streaming to YouTube and Facebook supported.
              </p>
            </div>
          </div>

          {/* Right Panel: Logs */}
          <div className="lg:col-span-7 xl:col-span-8 h-[500px] lg:h-auto">
            <LogViewer logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}
