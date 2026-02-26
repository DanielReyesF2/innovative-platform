import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";
import { Send, Lock, Eye, EyeOff, AlertCircle, ChevronRight } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("Pruebas");
  const [password, setPassword] = useState("Pruebas2026");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(username, password);
      toast({
        title: "Bienvenido",
        description: "Sesion iniciada correctamente",
      });
    } catch (err: any) {
      const message = err.message || "Error al iniciar sesion";
      if (message.includes("429")) {
        setError("Demasiados intentos. Intenta de nuevo en 15 minutos.");
      } else {
        setError("Credenciales invalidas");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#388E3C] relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 rounded-full border-2 border-white"></div>
          <div className="absolute top-40 right-20 w-60 h-60 rounded-full border border-white"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full border border-white"></div>
          <div className="absolute bottom-40 right-10 w-32 h-32 rounded-full border-2 border-white"></div>
        </div>

        <div className="flex flex-col items-center justify-center w-full relative z-10">
          <img
            src="/IGMexico-Blanco.png"
            alt="Innovative Group Mexico"
            className="w-80 drop-shadow-lg"
          />
          <div className="mt-12 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">Hub Digital</h2>
            <p className="text-white/80 text-sm max-w-sm mx-auto leading-relaxed">
              Gestion integral de pipeline comercial, operaciones, trazabilidad y KPIs del equipo.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3 max-w-md">
            {["Pipeline Comercial", "Kanban Board", "Trazabilidad", "KPIs en Tiempo Real", "Economia Circular"].map((feature) => (
              <span
                key={feature}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white/90 text-xs font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#faf7f2] px-8">
        <div className="w-full max-w-md">
          {/* Logo for mobile (hidden on desktop) */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src="/IGMexico-V-Color-Logo.png"
              alt="Innovative Group Mexico"
              className="w-48"
            />
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1c2c4a] mb-2">Bienvenido</h1>
            <p className="text-[#6b7280] text-sm">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#1c2c4a] mb-2">Usuario</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                  <Send size={16} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="Usuario"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e7eb] rounded-lg text-sm text-[#1c2c4a] placeholder-[#6b7280]/50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32] transition-all"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#1c2c4a] mb-2">Contrasena</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="********"
                  className="w-full pl-10 pr-12 py-3 bg-white border border-[#e5e7eb] rounded-lg text-sm text-[#1c2c4a] placeholder-[#6b7280]/50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32] transition-all"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#1c2c4a] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#e5e7eb] text-[#2E7D32] focus:ring-[#2E7D32] accent-[#2E7D32]"
                />
                <span className="text-sm text-[#6b7280]">Recordarme</span>
              </label>
              <button
                type="button"
                className="text-sm text-[#2E7D32] hover:text-[#1B5E20] font-medium transition-colors"
              >
                Olvide mi contrasena
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !username || !password}
              className="w-full py-3 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] hover:from-[#2E7D32] hover:to-[#388E3C] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  Iniciar Sesion
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-[#6b7280]">
              Innovative Group Mexico © 2026
            </p>
            <p className="text-xs text-[#6b7280]/60 mt-1">
              Powered by EcoNova Tech Solutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
