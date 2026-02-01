import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginRequest } from "@shared/schema";
import { useLogin } from "@/hooks/use-auth";
import { Lock, Radio, KeyRound } from "lucide-react";

export default function Login() {
  const loginMutation = useLogin();
  
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: ""
    }
  });

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 text-primary mb-4 ring-1 ring-primary/50 shadow-[0_0_30px_-5px_rgba(124,58,237,0.3)]">
            <Radio className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            BintuNet Stream
          </h1>
          <p className="text-muted-foreground text-lg">
            Secure Control Panel Access
          </p>
        </div>

        <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter access password" 
                          className="pl-10 h-12 bg-secondary/50 border-white/5 focus:border-primary/50 text-lg transition-all"
                          {...field} 
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Verifying..." : (
                  <>
                    Authenticate <KeyRound className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
        
        <p className="mt-8 text-center text-sm text-muted-foreground/50 font-mono">
          System ID: BINTU-NET-V1
        </p>
      </div>
    </div>
  );
}
