import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { api } from "@shared/routes";
import { type StreamConfig } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

// Stream State Management
class StreamManager {
  private streamlinkProcess: ChildProcessWithoutNullStreams | null = null;
  private ffmpegProcess: ChildProcessWithoutNullStreams | null = null;
  private isStreaming: boolean = false;
  private isMuted: boolean = false;
  private logs: string[] = [];
  private currentConfig: StreamConfig | null = null;
  private status: "idle" | "starting" | "streaming" | "error" | "reconnecting" = "idle";
  private logLimit = 1000;

  constructor() {}

  private addLog(message: string) {
    // Clean up ANSI codes if any
    const cleanMessage = message.replace(/\u001b\[[0-9;]*m/g, '').trim();
    if (!cleanMessage) return;
    
    const timestamp = new Date().toLocaleTimeString();
    this.logs.push(`[${timestamp}] ${cleanMessage}`);
    if (this.logs.length > this.logLimit) {
      this.logs.shift();
    }
  }

  async start(config: StreamConfig) {
    if (this.isStreaming) {
      throw new Error("Stream already running");
    }

    this.currentConfig = config;
    this.status = "starting";
    this.logs = []; // Clear logs on start
    this.addLog("Starting stream processes...");

    try {
      const tiktokUrl = config.tiktokUsername.startsWith("http") 
        ? config.tiktokUsername 
        : `https://www.tiktok.com/@${config.tiktokUsername.replace("@", "")}/live`;
      
      this.addLog(`Source URL: ${tiktokUrl}`);

      // 1. Start Streamlink with extra headers for TikTok
      const streamlinkArgs = [
        "--stdout",
        "--loglevel", "debug", // Increased logging
        "--http-header", "User-Agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "--http-header", "Referer=https://www.tiktok.com/",
        "--http-header", "Origin=https://www.tiktok.com",
        "--http-header", "Accept-Language=en-US,en;q=0.9",
        tiktokUrl,
        config.quality
      ];

      this.addLog(`Running: streamlink ${streamlinkArgs.join(' ')}`);
      // Use the locally installed streamlink from .pythonlibs
      const streamlinkPath = "./.pythonlibs/bin/streamlink";
      this.streamlinkProcess = spawn(streamlinkPath, streamlinkArgs);

      // 2. Start FFmpeg with improved pipe handling
      const targets: string[] = [];
      if (config.youtubeKey) {
        const key = config.youtubeKey.trim();
        const url = key.startsWith("rtmp") ? key : `rtmp://a.rtmp.youtube.com/live2/${key}`;
        targets.push(`[f=flv]${url}`);
      }
      if (config.facebookKey) {
        const key = config.facebookKey.trim();
        const url = key.startsWith("rtmp") ? key : `rtmps://live-api-s.facebook.com:443/rtmp/${key}`;
        // Facebook requires very specific profile and GOP for some keys
        targets.push(`[f=flv]${url}`);
      }

      if (targets.length === 0) {
        throw new Error("No output target provided");
      }

      const teeOutput = targets.join("|");

      // Aspect Ratio Handling
      const vfFilters = [];
      if (config.ratio === "mobile") {
        vfFilters.push("scale=720:1280", "setdar=9/16");
      } else {
        vfFilters.push("scale=1280:720", "setdar=16/9");
      }

      const ffmpegArgs = [
        "-f", "flv",
        "-i", "pipe:0",
        "-vf", vfFilters.join(","),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-b:v", "2500k",
        "-maxrate", "2500k",
        "-bufsize", "5000k",
        "-profile:v", "baseline",
        "-level", "3.1",
        "-pix_fmt", "yuv420p",
        "-r", config.fps,
        "-g", String(parseInt(config.fps) * 2),
        "-c:a", "aac",
"-b:a", "96k",
"-ar", "48000",
"-af", "aresample=async=1:first_pts=0",
        "-f", "tee",
        "-map", "0:v",
        "-map", "0:a",
        teeOutput
      ];

      this.addLog(`Running: ffmpeg ${ffmpegArgs.join(' ')}`);
      this.ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      // Handle Process Events
      this.setupProcessListeners();

      // Pipe Streamlink -> FFmpeg with error handling
      if (this.streamlinkProcess.stdout && this.ffmpegProcess.stdin) {
        this.streamlinkProcess.stdout.pipe(this.ffmpegProcess.stdin);
        
        this.streamlinkProcess.stdout.on('error', (err) => {
          this.addLog(`Streamlink pipe error: ${err.message}`);
        });
        
        this.ffmpegProcess.stdin.on('error', (err) => {
          this.addLog(`FFmpeg pipe error: ${err.message}`);
        });
      }

      this.isStreaming = true;
      this.status = "streaming";
      this.addLog("Stream started successfully.");

    } catch (error) {
      this.status = "error";
      this.isStreaming = false;
      this.addLog(`Failed to start stream: ${error}`);
      throw error;
    }
  }

  private setupProcessListeners() {
    if (!this.streamlinkProcess || !this.ffmpegProcess) return;

    // Streamlink Logs
    this.streamlinkProcess.stderr.on("data", (data) => {
      this.addLog(`[Streamlink] ${data.toString()}`);
    });

    this.streamlinkProcess.on("close", (code) => {
      this.addLog(`Streamlink exited with code ${code}`);
      if (this.isStreaming) {
        this.addLog("Streamlink exited unexpectedly. Stopping stream.");
        this.stop(); 
        this.status = "error";
      }
    });

    // FFmpeg Logs
    this.ffmpegProcess.stderr.on("data", (data) => {
      this.addLog(`[FFmpeg] ${data.toString()}`);
    });

    this.ffmpegProcess.on("close", (code) => {
      this.addLog(`FFmpeg exited with code ${code}`);
      if (this.isStreaming) {
         this.addLog("FFmpeg exited unexpectedly. Stopping stream.");
         this.stop();
         this.status = "error";
      }
    });
  }

  stop() {
    this.addLog("Stopping streams...");
    if (this.streamlinkProcess) {
      this.streamlinkProcess.kill();
      this.streamlinkProcess = null;
    }
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill();
      this.ffmpegProcess = null;
    }
    this.isStreaming = false;
    this.status = "idle";
    this.addLog("Streams stopped.");
  }

  async setMute(muted: boolean) {
    if (this.isMuted === muted) return;
    this.isMuted = muted;
    this.addLog(`Mute set to ${muted}`);
    
    if (this.isStreaming && this.currentConfig) {
      this.addLog("Restarting stream to apply mute setting...");
      this.stop();
      // Small delay to ensure processes clean up
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.start(this.currentConfig);
    }
  }

  getStatus() {
    return {
      isStreaming: this.isStreaming,
      status: this.status,
      logs: this.logs,
      config: this.currentConfig || undefined,
      isMuted: this.isMuted
    };
  }
}

const streamManager = new StreamManager();

// Auth Middleware
const AUTH_PASSWORD = "bintunet";
const sessions = new Set<string>();

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

function isAuthenticated(req: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return sessions.has(token);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth Routes
  app.post(api.auth.login.path, (req, res) => {
    const input = api.auth.login.input.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Invalid input" });

    if (input.data.password === AUTH_PASSWORD) {
      const token = generateToken();
      sessions.add(token);
      return res.json({ success: true, token });
    }
    return res.status(401).json({ message: "Invalid password" });
  });

  // Stream Routes
  app.get("/api/stream/check-live/:username", async (req, res) => {
    if (!isAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });
    const username = req.params.username.replace("@", "");
    const url = `https://www.tiktok.com/@${username}/live`;
    
    try {
      const { execa } = await import("execa");
      const streamlinkPath = "./.pythonlibs/bin/streamlink";
      
      this.addLog(`Checking if ${url} is live...`);
      // Try to get streams directly, which is the most reliable "live" check
      try {
        const { stdout } = await execa(streamlinkPath, ["--json", url]);
        const data = JSON.parse(stdout);
        if (data && data.streams && Object.keys(data.streams).length > 0) {
          return res.json({ isLive: true, url });
        }
        return res.json({ isLive: false, url, reason: "No active streams found for this user." });
      } catch (e: any) {
        // If it fails, check if it's because it's not live or plugin issue
        if (e.stdout && e.stdout.includes("No plugin can handle URL")) {
           return res.json({ isLive: false, url, reason: "TikTok plugin issue. Please contact support." });
        }
        return res.json({ isLive: false, url, reason: "User is not currently live or account is private." });
      }
    } catch (error) {
      res.json({ isLive: false, url, error: String(error) });
    }
  });

  app.post(api.stream.start.path, async (req, res) => {
    if (!isAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });

    try {
      const config = api.stream.start.input.parse(req.body);
      await streamManager.start(config);
      res.json({ success: true, message: "Stream started" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: String(error) });
    }
  });

  app.post(api.stream.stop.path, (req, res) => {
    if (!isAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });
    streamManager.stop();
    res.json({ success: true, message: "Stream stopped" });
  });

  app.get(api.stream.status.path, (req, res) => {
    if (!isAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });
    res.json(streamManager.getStatus());
  });

  app.post(api.stream.mute.path, async (req, res) => {
    if (!isAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });
    const input = api.stream.mute.input.parse(req.body);
    await streamManager.setMute(input.muted);
    res.json({ success: true, isMuted: input.muted });
  });

  return httpServer;
}
