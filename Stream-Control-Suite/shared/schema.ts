import { z } from "zod";

// Configuration Types
export const QUALITY_OPTIONS = ["best", "720p", "480p"] as const;
export const FPS_OPTIONS = ["20", "25", "30"] as const;
export const RATIO_OPTIONS = ["mobile", "desktop"] as const;

export const streamConfigSchema = z.object({
  tiktokUsername: z.string().min(1, "Username is required"),
  youtubeKey: z.string().optional(),
  facebookKey: z.string().optional(),
  quality: z.enum(QUALITY_OPTIONS).default("best"),
  fps: z.enum(FPS_OPTIONS).default("30"),
  ratio: z.enum(RATIO_OPTIONS).default("desktop"),
});

export type StreamConfig = z.infer<typeof streamConfigSchema>;

export const loginSchema = z.object({
  password: z.string(),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export const streamStatusSchema = z.object({
  isStreaming: z.boolean(),
  status: z.enum(["idle", "starting", "streaming", "error", "reconnecting"]),
  logs: z.array(z.string()),
  config: streamConfigSchema.optional(),
  isMuted: z.boolean(),
});

export type StreamStatus = z.infer<typeof streamStatusSchema>;
