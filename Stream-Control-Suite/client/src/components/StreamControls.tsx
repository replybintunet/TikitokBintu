import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  streamConfigSchema, type StreamConfig, 
  QUALITY_OPTIONS, FPS_OPTIONS, RATIO_OPTIONS 
} from "@shared/schema";
import { 
  Play, Square, RefreshCw, Volume2, VolumeX, Settings2, Activity, CheckCircle2, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface StreamControlsProps {
  isStreaming: boolean;
  isMuted: boolean;
  defaultConfig?: StreamConfig;
  onStart: (data: StreamConfig) => void;
  onStop: () => void;
  onMute: (muted: boolean) => void;
  isPending: boolean;
}

export function StreamControls({ 
  isStreaming, isMuted, defaultConfig, onStart, onStop, onMute, isPending 
}: StreamControlsProps) {
  const { toast } = useToast();
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [liveStatus, setLiveStatus] = useState<{ isLive: boolean; reason?: string } | null>(null);

  const [extraTargets, setExtraTargets] = useState<
  { id: number; rtmp: string; key: string; isStreaming: boolean }[]
>([]);

const form = useForm<StreamConfig>({
    resolver: zodResolver(streamConfigSchema),
    defaultValues: defaultConfig || {
      tiktokUsername: "",
      youtubeKey: "",
      facebookKey: "",
      quality: "best",
      fps: "30",
      ratio: "desktop"
    }
  });

  const checkLive = async () => {
    const username = form.getValues("tiktokUsername");
    if (!username) {
      toast({ title: "Error", description: "Please enter a TikTok username", variant: "destructive" });
      return;
    }

    setIsCheckingLive(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/stream/check-live/${username}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setLiveStatus(data);
      if (data.isLive) {
        toast({ title: "Live Detected!", description: `${username} is currently live!`, className: "bg-green-500/10 border-green-500/20 text-green-500" });
      } else {
        toast({ title: "Not Live", description: data.reason || "User is not live", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to check live status", variant: "destructive" });
    } finally {
      setIsCheckingLive(false);
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-primary">
          <Settings2 className="w-5 h-5" />
          <h2 className="text-xl font-bold font-display">Configuration</h2>
        </div>
        {liveStatus !== null && (
          <Badge variant={liveStatus.isLive ? "default" : "destructive"} className="gap-1">
            {liveStatus.isLive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {liveStatus.isLive ? "Live" : "Offline"}
          </Badge>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onStart)} className="space-y-5">
          <div className="flex items-end gap-2">
            <FormField
              control={form.control}
              name="tiktokUsername"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-foreground/80">TikTok Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="@username" 
                      className="bg-secondary/50 border-border/50 focus:border-primary/50 transition-colors h-11"
                      disabled={isStreaming}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="button" 
              variant="outline" 
              className="h-11" 
              onClick={checkLive}
              disabled={isCheckingLive || isStreaming}
            >
              {isCheckingLive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
              Check
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="youtubeKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">YouTube Stream Key</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="abcd-1234-..." 
                      className="bg-secondary/50 border-border/50 focus:border-primary/50 h-11"
                      disabled={isStreaming}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facebookKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Facebook Stream Key</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="FB-12345..." 
                      className="bg-secondary/50 border-border/50 focus:border-primary/50 h-11"
                      disabled={isStreaming}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-2 py-2">
             <Button 
  type="button" 
  variant="outline" 
  size="sm" 
  className="text-xs h-8"
  onClick={() => {
  setExtraTargets(prev => [
    ...prev,
    { id: Date.now(), rtmp: "", key: "", isStreaming: false }
  ]);
}}
>
  + Add Stream Target
</Button>
          </div>

          {extraTargets.map((target, index) => (
  <div
    key={target.id}
    className="border border-border/50 rounded-xl p-4 bg-secondary/30 space-y-3"
  >
    <div className="flex items-center justify-between">
      <h4 className="font-semibold text-sm">
        Extra Stream Target {index + 1}
      </h4>

      <Badge variant="outline">Idle</Badge>
    </div>

    <Input
      placeholder="RTMP URL (e.g rtmp://a.rtmp.youtube.com/live2)"
      className="bg-secondary/50 border-border/50 h-11"
      disabled={isStreaming}
      value={target.rtmp}
      onChange={(e) => {
        const updated = [...extraTargets];
        updated[index].rtmp = e.target.value;
        setExtraTargets(updated);
      }}
    />

    <Input
      placeholder="Stream Key"
      className="bg-secondary/50 border-border/50 h-11"
      disabled={isStreaming}
      value={target.key}
      onChange={(e) => {
        const updated = [...extraTargets];
        updated[index].key = e.target.value;
        setExtraTargets(updated);
      }}
    />

    <div className="flex items-center gap-2 pt-2">
      <Button size="sm" className="gap-1">
        <Play className="w-4 h-4" />
        Start
      </Button>

      <Button size="sm" variant="destructive" className="gap-1">
        <Square className="w-4 h-4" />
        Stop
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="ml-auto"
        onClick={() =>
          setExtraTargets(prev =>
            prev.filter(t => t.id !== target.id)
          )
        }
      >
        ✕
      </Button>
    </div>
  </div>
))}
<div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="quality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Quality</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isStreaming}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50 border-border/50 h-11">
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {QUALITY_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt} className="uppercase">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">FPS</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isStreaming}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50 border-border/50 h-11">
                        <SelectValue placeholder="FPS" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FPS_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt} FPS</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ratio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Aspect Ratio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isStreaming}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50 border-border/50 h-11">
                        <SelectValue placeholder="Ratio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RATIO_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {!isStreaming ? (
              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20"
                disabled={isPending}
              >
                {isPending ? (
                  <>Starting...</>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    Start Stream
                  </>
                )}
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                <Button 
                  type="button" 
                  onClick={onStop}
                  variant="destructive"
                  className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>Stopping...</>
                  ) : (
                    <>
                      <Square className="w-5 h-5 mr-2 fill-current" />
                      Stop Stream
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  onClick={() => onMute(!isMuted)}
                  variant="outline"
                  className={cn(
                    "w-full h-14 text-lg font-semibold border-2 transition-all",
                    isMuted 
                      ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/20" 
                      : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80"
                  )}
                >
                  {isMuted ? (
                    <>
                      <Volume2 className="w-5 h-5 mr-2" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-5 h-5 mr-2" />
                      Mute
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {isStreaming && (
              <Button
                type="submit"
                variant="secondary"
                className="w-full h-14 text-lg font-semibold sm:col-span-2"
                disabled={isPending}
              >
                <RefreshCw className={cn("w-5 h-5 mr-2", isPending && "animate-spin")} />
                Restart Stream
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
