import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, Eye, EyeOff, LogIn, ShieldCheck, Cloud, Store } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("iletisim@thenoire.co");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Lütfen e-posta adresi ve şifrenizi giriniz.");
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      toast.success("🔑 Supabase oturumu başarıyla açıldı!");
    } else {
      let msg = result.error || "Giriş yapılamadı.";
      if (msg.includes("Invalid login credentials")) {
        msg = "E-posta adresi veya şifre hatalı. Lütfen Supabase veritabanında oluşturulan bilgileri giriniz.";
      }
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 relative overflow-hidden p-4">
      {/* Background Animated Glowing Spheres */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl relative z-10 animate-fade-in text-slate-100">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-primary/25">
            <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Store className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              The Noire
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1 flex items-center justify-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-emerald-400 inline" />
              <span>Yönetici Portalı Güvenli Girişi</span>
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleLoginSubmit}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-slate-300 font-medium">Yönetici E-Posta Adresi</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="iletisim@thenoire.co"
                  className="pl-9 bg-slate-950/60 border-slate-800 focus:border-primary text-white placeholder:text-slate-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-slate-300 font-medium">Parola</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-9 bg-slate-950/60 border-slate-800 focus:border-primary text-white placeholder:text-slate-500 font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 gap-2"
            >
              {isLoading ? (
                <span>Doğrulanıyor...</span>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Güvenli Giriş Yap
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 pt-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Supabase Cloud Auth 256-Bit SSL Şifreli Koruma</span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
