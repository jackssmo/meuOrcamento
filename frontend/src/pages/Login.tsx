import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { Wallet, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showServerStartingMessage, setShowServerStartingMessage] = useState(false);

  useEffect(() => {
    if (!isLoading) return;

    const timer = window.setTimeout(() => {
      setShowServerStartingMessage(true);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setShowServerStartingMessage(false);

    try {
      await signIn(email, password);
      toast.success("Boas-vindas ao seu painel financeiro!");
      navigate("/dashboard");
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.error || "E-mail ou senha incorretos.");
      } else {
        toast.error("Ocorreu um erro inesperado ao conectar.");
      }
    } finally {
      setIsLoading(false);
      setShowServerStartingMessage(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#fbf9f4] p-4 sm:p-6 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_4px_24px_rgba(21,46,34,0.06)] border border-[#e8e1d5] overflow-hidden">
        {/* Cabeçalho de Destaque Verde-Floresta */}
        <div className="bg-[#152e22] p-8 text-left relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-[#236344] text-white shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold tracking-widest text-[#a2bdac] uppercase">
              Meu Orçamento
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            Boas-vindas de volta.
          </h1>
          <p className="text-[#a2bdac] text-xs sm:text-sm mt-1.5 leading-relaxed font-normal">
            Clareza, controle e sobriedade para as suas finanças.
          </p>

          {/* Sutil detalhe de textura decorativa */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#236344]/20 pointer-events-none blur-xl" />
        </div>

        {/* Formulário Editorial */}
        <div className="p-7 sm:p-8">
          <h2 className="text-base font-bold text-[#1b2920] mb-5 tracking-tight">
            Acesse sua conta
          </h2>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="bespoke-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="bespoke-input pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-[#64756a] hover:text-[#1b2920] transition-colors cursor-pointer p-0.5"
                  title={showPassword ? "Ocultar senha" : "Exibir senha"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 px-4 text-sm font-semibold rounded-xl shadow-xs mt-2 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  <span>Entrando na conta...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>

            {showServerStartingMessage && (
              <p
                className="text-center text-xs text-[#b86214] bg-[#fef7ee] p-2.5 rounded-xl border border-[#f5dfc6] animate-in fade-in"
                role="status"
                aria-live="polite"
              >
                Conectando ao banco de dados. Isso pode levar alguns segundos na primeira conexão...
              </p>
            )}
          </form>

          <div className="pt-6 mt-6 border-t border-[#ede7dc] text-center">
            <p className="text-xs text-[#64756a]">
              Ainda não tem uma conta?{" "}
              <Link to="/register" className="text-[#236344] font-bold hover:underline">
                Criar conta gratuita
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
