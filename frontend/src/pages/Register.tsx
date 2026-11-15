import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { Wallet, Eye, EyeOff, Check } from "lucide-react";

export function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas digitadas não coincidem.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve possuir pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/register", { name, email, password });
      toast.success("Conta criada com sucesso! Faça seu primeiro acesso.");
      navigate("/login");
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Erro ao registrar conta.");
      } else {
        toast.error("Erro inesperado ao criar conta.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#fbf9f4] p-4 sm:p-6 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_4px_24px_rgba(21,46,34,0.06)] border border-[#e8e1d5] overflow-hidden">
        {/* Topo Verde-Floresta */}
        <div className="bg-[#152e22] p-8 text-left relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-[#236344] text-white shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold tracking-widest text-[#a2bdac] uppercase">
              Meu Orçamento
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            Comece pelo seu primeiro mês.
          </h1>
          <p className="text-[#a2bdac] text-xs sm:text-sm mt-1.5 leading-relaxed font-normal">
            Organização financeira intuitiva, elegante e sem complicação.
          </p>

          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#236344]/20 pointer-events-none blur-xl" />
        </div>

        {/* Formulário de Registro */}
        <div className="p-7 sm:p-8">
          <h2 className="text-base font-bold text-[#1b2920] mb-5 tracking-tight">
            Criar sua conta
          </h2>

          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex.: Carolina Mendes"
                className="bespoke-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="bespoke-input text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    minLength={6}
                    placeholder="Mín. 6 dígitos"
                    className="bespoke-input pr-9 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-2.5 text-[#64756a] hover:text-[#1b2920] cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Confirmar
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Repita a senha"
                  className="bespoke-input text-sm"
                />
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
                  <span>Criando conta...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Criar Minha Conta</span>
                </span>
              )}
            </button>
          </form>

          <div className="pt-6 mt-6 border-t border-[#ede7dc] text-center">
            <p className="text-xs text-[#64756a]">
              Já possui uma conta cadastrada?{" "}
              <Link to="/login" className="text-[#236344] font-bold hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
