import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSettings, useUpdateSettings, useStreamStatus, useStartStream, useStopStream, useRestartStream, useStreamLogs } from "@/hooks/use-stream";
import { StatusIndicator } from "@/components/StatusIndicator";
import { LogConsole } from "@/components/LogConsole";
import { Radio, Monitor, Smartphone, Youtube, Facebook, Video, Settings2, Play, Square, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema, type InsertSettings } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  // Verify auth on mount
  useEffect(() => {
    const auth = localStorage.getItem("bintunet_auth");
    if (!auth) {
      setLocation("/");
    }
  }, [setLocation]);

  // Data fetching
  const { data: statusData } = useStreamStatus();
  const { data: logsData } = useStreamLogs();
  const { data: settingsData, isPending: isLoadingSettings } = useSettings();

  // Mutations
  const updateSettings = useUpdateSettings();
  const startStream = useStartStream();
  const stopStream = useStopStream();
  const restartStream = useRestartStream();

  // Form setup
  const form = useForm<InsertSettings>({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      tiktokUrl: "",
      youtubeUrl: "",
      facebookUrl: "",
      videoQuality: "best",
      fps: 30,
      ratioMode: "mobile",
      isMuted: false,
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (settingsData) {
      form.reset(settingsData);
    }
  }, [settingsData, form]);

  const onSaveSettings = (data: InsertSettings) => {
    updateSettings.mutate(data);
  };

  const handleMuteToggle = () => {
    const current = form.getValues("isMuted");
    form.setValue("isMuted", !current);
    // Auto-save mute state
    updateSettings.mutate({ ...form.getValues(), isMuted: !current });
  };

  const isStreaming = statusData?.status === "streaming";
  const isReconnecting = statusData?.status === "reconnecting";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display font-bold text-lg tracking-tight hidden sm:block">
              BintuNet <span className="text-primary">Stream</span>
            </h1>
          </div>
          
          <StatusIndicator 
            status={statusData?.status || "idle"} 
            uptime={statusData?.uptime || null} 
          />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        
        {/* Quick Actions / Controls */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => startStream.mutate()}
            disabled={isStreaming || startStream.isPending}
            className={clsx(
              "md:col-span-2 h-24 rounded-2xl font-display font-bold text-xl shadow-lg transition-all flex items-center justify-center gap-3",
              isStreaming 
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50" 
                : "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-900/20 hover:shadow-green-900/40"
            )}
          >
            {startStream.isPending ? (
               <RefreshCw className="animate-spin w-6 h-6" />
            ) : (
               <Play className="fill-current w-6 h-6" />
            )}
            START LIVE
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => stopStream.mutate()}
            disabled={!isStreaming || stopStream.isPending}
            className={clsx(
              "h-24 rounded-2xl font-bold text-lg shadow-lg transition-all flex flex-col items-center justify-center gap-2",
              !isStreaming
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
                : "bg-red-500/10 text-red-500 border-2 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/50"
            )}
          >
            <Square className="fill-current w-6 h-6" />
            STOP
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => restartStream.mutate()}
            disabled={!isStreaming && !isReconnecting}
            className={clsx(
              "h-24 rounded-2xl font-bold text-lg shadow-lg transition-all flex flex-col items-center justify-center gap-2",
              (!isStreaming && !isReconnecting)
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            )}
          >
            <RefreshCw className={clsx("w-6 h-6", restartStream.isPending && "animate-spin")} />
            RESTART
          </motion.button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)] min-h-[600px]">
          
          {/* Configuration Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">Configuration</h2>
                </div>
                
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    form.watch("isMuted") 
                      ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {form.watch("isMuted") ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {form.watch("isMuted") ? "MUTED" : "UNMUTED"}
                </button>
              </div>

              {isLoadingSettings ? (
                <div className="h-64 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSaveSettings)} className="space-y-6">
                  {/* Sources Section */}
                  <div className="space-y-4">
                    <label className="text-xs font-mono uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                      TikTok Source
                    </label>
                    <input
                      {...form.register("tiktokUrl")}
                      placeholder="Enter TikTok Live URL..."
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                        <Youtube className="w-3 h-3 text-red-500" />
                        YouTube RTMP
                      </label>
                      <input
                        {...form.register("youtubeUrl")}
                        placeholder="rtmp://a.rtmp.youtube.com/..."
                        className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                        <Facebook className="w-3 h-3 text-blue-500" />
                        Facebook RTMP
                      </label>
                      <input
                        {...form.register("facebookUrl")}
                        placeholder="rtmps://live-api-s.facebook.com/..."
                        className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-border/50 w-full my-6" />

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Quality</label>
                      <div className="relative">
                        <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <select
                          {...form.register("videoQuality")}
                          className="w-full appearance-none bg-background/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="best">Best Available</option>
                          <option value="720p">720p (HD)</option>
                          <option value="480p">480p (SD)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Framerate</label>
                      <div className="relative">
                        <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <select
                          {...form.register("fps", { valueAsNumber: true })}
                          className="w-full appearance-none bg-background/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value={30}>30 FPS</option>
                          <option value={25}>25 FPS</option>
                          <option value={20}>20 FPS</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Aspect Ratio</label>
                      <div className="flex bg-background/50 border border-border rounded-xl p-1">
                        <label className={clsx(
                          "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all",
                          form.watch("ratioMode") === "mobile" 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:bg-zinc-800"
                        )}>
                          <input type="radio" value="mobile" {...form.register("ratioMode")} className="hidden" />
                          <Smartphone className="w-3 h-3" />
                          Mobile
                        </label>
                        <label className={clsx(
                          "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all",
                          form.watch("ratioMode") === "desktop" 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:bg-zinc-800"
                        )}>
                          <input type="radio" value="desktop" {...form.register("ratioMode")} className="hidden" />
                          <Monitor className="w-3 h-3" />
                          Desktop
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={updateSettings.isPending}
                      className="px-8 py-3 bg-zinc-100 text-zinc-900 rounded-xl font-semibold hover:bg-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateSettings.isPending ? "Saving..." : "Save Configuration"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>

          {/* Logs Column */}
          <motion.div 
             initial={{ opacity: 0, x: 10 }}
             animate={{ opacity: 1, x: 0 }}
             className="lg:col-span-1 h-full min-h-[400px]"
          >
            <LogConsole logs={logsData || []} className="h-full shadow-xl" />
          </motion.div>

        </div>
      </main>
    </div>
  );
}