import { z } from 'zod';
import { streamConfigSchema, loginSchema, streamStatusSchema } from './schema';

export const errorSchemas = {
  unauthorized: z.object({ message: z.string() }),
  serverError: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: loginSchema,
      responses: {
        200: z.object({ success: z.boolean(), token: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  stream: {
    start: {
      method: 'POST' as const,
      path: '/api/stream/start',
      input: streamConfigSchema,
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    stop: {
      method: 'POST' as const,
      path: '/api/stream/stop',
      input: z.object({}),
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    status: {
      method: 'GET' as const,
      path: '/api/stream/status',
      responses: {
        200: streamStatusSchema,
        401: errorSchemas.unauthorized,
      },
    },
    mute: {
      method: 'POST' as const,
      path: '/api/stream/mute',
      input: z.object({ muted: z.boolean() }),
      responses: {
        200: z.object({ success: z.boolean(), isMuted: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
