import { useMutation } from "@tanstack/react-query";
import { api, type LoginRequest } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function useLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const validated = api.auth.login.input.parse(data);
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid password");
        throw new Error("Login failed");
      }

      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      setLocation("/");
      toast({ title: "Welcome back", description: "Successfully logged in to BintuNet Stream" });
    },
    onError: (error) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    },
  });
}
