import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { api } from "../services/api";

export interface AuthUser {
  id: number;
  name?: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signed: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("fintrack_token")) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    api.get<AuthUser>("/auth/me")
      .then((response) => setUser(response.data))
      .catch((error: unknown) => {
        if (isAxiosError(error) && error.response?.status === 401) {
          localStorage.removeItem("fintrack_token");
          setUser(null);
        } else {
          console.error("Não foi possível validar a sessão com o servidor no momento.", error);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function signIn(email: string, password: string) {
    const response = await api.post<{ token: string; user: AuthUser }>("/auth/login", { email, password });
    localStorage.setItem("fintrack_token", response.data.token);
    setUser(response.data.user);
  }

  function signOut() {
    localStorage.removeItem("fintrack_token");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, signed: Boolean(user), signIn, signOut }),
    [user, loading],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#c8d9f5] border-t-[#2454a6]" />
          <p className="mt-4 text-sm font-medium text-[#52627a]">
            Conectando ao servidor e validando sessão...
          </p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
