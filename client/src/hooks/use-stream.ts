import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type StreamConfig } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
};

// GET /api/stream/status
export function useStreamStatus() {
  return useQuery({
    queryKey: [api.stream.status.path],
    queryFn: async () => {
      const res = await fetch(api.stream.status.path, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch status");
      return api.stream.status.responses[200].parse(await res.json());
    },
    refetchInterval: 1000, // Poll every second for live logs/status
  });
}

// POST /api/stream/start
export function useStartStream() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: StreamConfig) => {
      const validated = api.stream.start.input.parse(data);
      const res = await fetch(api.stream.start.path, {
        method: api.stream.start.method,
        headers: getAuthHeaders(),
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid configuration");
        }
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to start stream");
      }
      
      return api.stream.start.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      toast({ title: "Stream Started", description: data.message, className: "bg-green-500/10 border-green-500/20 text-green-500" });
      queryClient.invalidateQueries({ queryKey: [api.stream.status.path] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

// POST /api/stream/stop
export function useStopStream() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.stream.stop.path, { 
        method: api.stream.stop.method,
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to stop stream");
      return api.stream.stop.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      toast({ title: "Stream Stopped", description: data.message });
      queryClient.invalidateQueries({ queryKey: [api.stream.status.path] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

// POST /api/stream/mute
export function useMuteStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (muted: boolean) => {
      const res = await fetch(api.stream.mute.path, {
        method: api.stream.mute.method,
        headers: getAuthHeaders(),
        body: JSON.stringify({ muted }),
      });
      if (!res.ok) throw new Error("Failed to toggle mute");
      return api.stream.mute.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stream.status.path] });
    }
  });
}
