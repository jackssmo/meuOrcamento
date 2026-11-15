import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  User,
  Tags,
  Landmark,
  Shield,
  Lock,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  PiggyBank,
  Wallet,
  CreditCard,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { SYSTEM_CATEGORY_COLORS } from "../constants/designSystem";
import { formatCurrency, formatCurrencyInput } from "../utils/formatters";
import type { Category, Account, CategoryType, AccountType } from "../types/models";

// Paleta selecionada de cores harmônicas para categorias personalizadas
const PRESET_COLORS = [
  "#236344", // Verde Musgo
  "#1B6E44", // Verde Esmeralda
  "#3D795A", // Verde Folha
  "#5B8E73", // Sálvia Profunda
  "#2D5A7B", // Azul Petróleo
  "#5D7C8A", // Ardósia
  "#B86214", // Âmbar Queimado
  "#C68A35", // Mostarda Suave
  "#B33A3A", // Terracota
  "#8A755D", // Castanho Linho
  "#7C5D8A", // Ameixa
  "#152E22", // Verde Floresta
];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const ACCOUNT_TYPE_LABELS: Record<AccountType, { label: string; icon: typeof Landmark; desc: string }> = {
  checking: {
    label: "Conta Corrente",
    icon: Landmark,
    desc: "Movimentação diária e transferências",
  },
  savings: {
    label: "Poupança / Investimento",
    icon: PiggyBank,
    desc: "Reservas de emergência e aplicações",
  },
  cash: {
    label: "Dinheiro / Carteira",
    icon: Wallet,
    desc: "Dinheiro físico e pequenos gastos",
  },
  credit_card: {
    label: "Cartão de Crédito",
    icon: CreditCard,
    desc: "Controle de fatura, fechamento e limite",
  },
};

export function Settings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "categories" | "accounts">("profile");

  // ==========================================
  // ABA 1: PERFIL E SEGURANÇA
  // ==========================================
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setIsProfileLoading(true);
      const res = await api.get<{ id: number; name?: string; email: string }>("/auth/profile");
      setProfileName(res.data.name || "");
      setProfileEmail(res.data.email || "");
    } catch {
      toast.error("Não foi possível carregar os dados do perfil.");
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();

    if (!profileName.trim() || profileName.trim().length < 2) {
      toast.error("O nome deve ter no mínimo 2 caracteres.");
      return;
    }
    if (!profileEmail.trim() || !profileEmail.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!currentPassword) {
      toast.error("A senha atual é obrigatória para salvar alterações.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }

    try {
      setIsSavingProfile(true);
      const res = await api.put<{ id: number; name: string; email: string }>("/auth/profile", {
        name: profileName.trim(),
        email: profileEmail.trim(),
        currentPassword,
        newPassword: newPassword || undefined,
      });

      updateUser(res.data);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Perfil e dados de acesso atualizados com sucesso!");
    } catch (error) {
      const msg = isAxiosError(error) ? error.response?.data?.error : undefined;
      toast.error(msg || "Não foi possível atualizar o perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ==========================================
  // ABA 2: CATEGORIAS PERSONALIZADAS
  // ==========================================
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<CategoryType>("expense");
  const [catColor, setCatColor] = useState("#236344");

  const loadCategories = useCallback(async () => {
    try {
      setIsCategoriesLoading(true);
      const res = await api.get<Category[]>("/financial/categories");
      setCategories(res.data || []);
    } catch {
      toast.error("Erro ao carregar categorias.");
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    }
  }, [activeTab, loadCategories]);

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCatName("");
    setCatType("expense");
    setCatColor("#236344");
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatColor(cat.color || "#236344");
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = catName.trim();
    if (cleanName.length < 2 || cleanName.length > 80) {
      toast.error("O nome da categoria deve ter entre 2 e 80 caracteres.");
      return;
    }
    if (catColor && !HEX_COLOR_PATTERN.test(catColor)) {
      toast.error("A cor deve ser um código hexadecimal de 6 dígitos (ex: #236344).");
      return;
    }
    const colorInUse = categories.find(
      (category) =>
        category.id !== editingCategory?.id &&
        category.color?.toLowerCase() === catColor.toLowerCase(),
    );
    if (colorInUse) {
      toast.error(`A cor já está sendo usada pela categoria "${colorInUse.name}".`);
      return;
    }
    if (
      editingCategory?.color?.toLowerCase() !== catColor.toLowerCase() &&
      SYSTEM_CATEGORY_COLORS.some((color) => color.toLowerCase() === catColor.toLowerCase())
    ) {
      toast.error("Essa cor é reservada para o uso automático do sistema.");
      return;
    }

    try {
      if (editingCategory) {
        await api.patch(`/financial/categories/${editingCategory.id}`, {
          name: cleanName,
          type: catType,
          color: catColor,
        });
        toast.success("Categoria atualizada com sucesso!");
      } else {
        await api.post("/financial/categories", {
          name: cleanName,
          type: catType,
          color: catColor,
        });
        toast.success("Categoria criada com sucesso!");
      }
      setIsCategoryModalOpen(false);
      loadCategories();
    } catch (error) {
      const msg = isAxiosError(error) ? error.response?.data?.error : undefined;
      toast.error(msg || "Erro ao salvar categoria.");
    }
  };

  // ==========================================
  // ABA 3: CONTAS FINANCEIRAS
  // ==========================================
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<AccountType>("checking");
  const [accInitialBalanceInput, setAccInitialBalanceInput] = useState("");
  const [accCreditLimitInput, setAccCreditLimitInput] = useState("");
  const [accClosingDay, setAccClosingDay] = useState<number | "">("");
  const [accDueDay, setAccDueDay] = useState<number | "">("");

  const loadAccounts = useCallback(async () => {
    try {
      setIsAccountsLoading(true);
      const res = await api.get<Account[]>("/financial/accounts");
      setAccounts(res.data || []);
    } catch {
      toast.error("Erro ao carregar contas bancárias.");
    } finally {
      setIsAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "accounts") {
      loadAccounts();
    }
  }, [activeTab, loadAccounts]);

  const openCreateAccount = () => {
    setEditingAccount(null);
    setAccName("");
    setAccType("checking");
    setAccInitialBalanceInput("");
    setAccCreditLimitInput("");
    setAccClosingDay("");
    setAccDueDay("");
    setIsAccountModalOpen(true);
  };

  const openEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccInitialBalanceInput(
      acc.initial_balance ? (acc.initial_balance * 100).toFixed(0) : ""
    );
    setAccCreditLimitInput(
      acc.credit_limit ? (acc.credit_limit * 100).toFixed(0) : ""
    );
    setAccClosingDay(acc.closing_day ?? "");
    setAccDueDay(acc.due_day ?? "");
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = accName.trim();
    if (cleanName.length < 2 || cleanName.length > 120) {
      toast.error("O nome da conta deve ter entre 2 e 120 caracteres.");
      return;
    }

    const rawBal = accInitialBalanceInput.replace(/\D/g, "");
    const initial_balance = rawBal ? Number(rawBal) / 100 : 0;

    let credit_limit: number | null = null;
    let closing_day: number | null = null;
    let due_day: number | null = null;

    if (accType === "credit_card") {
      const rawLimit = accCreditLimitInput.replace(/\D/g, "");
      credit_limit = rawLimit ? Number(rawLimit) / 100 : 0;
      closing_day = accClosingDay !== "" ? Number(accClosingDay) : null;
      due_day = accDueDay !== "" ? Number(accDueDay) : null;

      if (closing_day !== null && (closing_day < 1 || closing_day > 31)) {
        toast.error("O dia de fechamento deve ser entre 1 e 31.");
        return;
      }
      if (due_day !== null && (due_day < 1 || due_day > 31)) {
        toast.error("O dia de vencimento deve ser entre 1 e 31.");
        return;
      }
    }

    try {
      if (editingAccount) {
        await api.patch(`/financial/accounts/${editingAccount.id}`, {
          name: cleanName,
          type: accType,
          initial_balance,
          credit_limit,
          closing_day,
          due_day,
        });
        toast.success("Conta atualizada com sucesso!");
      } else {
        await api.post("/financial/accounts", {
          name: cleanName,
          type: accType,
          initial_balance,
          credit_limit,
          closing_day,
          due_day,
        });
        toast.success("Conta cadastrada com sucesso!");
      }
      setIsAccountModalOpen(false);
      loadAccounts();
    } catch (error) {
      const msg = isAxiosError(error) ? error.response?.data?.error : undefined;
      toast.error(msg || "Erro ao salvar conta bancária.");
    }
  };

  // ==========================================
  // MODAIS DE CONFIRMAÇÃO BESPOKE (ZERO window.confirm)
  // ==========================================
  const [itemToDelete, setItemToDelete] = useState<{
    type: "category" | "account";
    id: number;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      if (itemToDelete.type === "category") {
        await api.delete(`/financial/categories/${itemToDelete.id}`);
        toast.success("Categoria excluída com sucesso!");
        loadCategories();
      } else {
        await api.delete(`/financial/accounts/${itemToDelete.id}`);
        toast.success("Conta excluída com sucesso!");
        loadAccounts();
      }
      setItemToDelete(null);
    } catch (error) {
      const msg = isAxiosError(error) ? error.response?.data?.error : undefined;
      toast.error(msg || "Não foi possível excluir o item selecionado.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header com Navegação em Abas Editorial */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="brand">Ajustes do Sistema</Badge>
              <span className="text-xs text-[#8a9990] font-medium hidden sm:inline">•</span>
              <span className="text-xs text-[#64756a] hidden sm:inline">
                Personalização e Segurança
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b2920] tracking-tight">
              Conta e Ajustes
            </h2>
            <p className="text-xs sm:text-sm text-[#64756a] mt-0.5">
              Gerencie seus dados de acesso e categorias personalizadas.
            </p>
          </div>

          {/* Botão de Criação Rápida de Acordo com a Aba Ativa */}
          {activeTab === "categories" && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={openCreateCategory}
              className="self-start sm:self-auto"
            >
              Nova Categoria
            </Button>
          )}

        </div>

        {/* Barra de Abas Estilizada */}
        <div className="flex items-center gap-2 border-t border-[#ede7dc] pt-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "profile"
                ? "bg-[#152e22] text-[#fbf9f4] shadow-sm"
                : "text-[#64756a] hover:text-[#1b2920] hover:bg-[#f4efe6]"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Perfil e Segurança</span>
            {user?.name && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  activeTab === "profile"
                    ? "bg-[#236344] text-[#fbf9f4]"
                    : "bg-[#e8e1d5] text-[#4a5850]"
                }`}
              >
                {user.name.split(" ")[0]}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "categories"
                ? "bg-[#152e22] text-[#fbf9f4] shadow-sm"
                : "text-[#64756a] hover:text-[#1b2920] hover:bg-[#f4efe6]"
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>Categorias Personalizadas</span>
            {categories.length > 0 && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                  activeTab === "categories"
                    ? "bg-[#236344] text-[#fbf9f4]"
                    : "bg-[#e8e1d5] text-[#4a5850]"
                }`}
              >
                {categories.length}
              </span>
            )}
          </button>

        </div>
      </Card>

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 1: PERFIL E SEGURANÇA */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card padding="lg">
              {isProfileLoading ? (
                <div className="py-12 text-center text-sm text-[#64756a]">
                  Carregando informações do perfil...
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {/* Seção 1: Dados Pessoais */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-[#236344]" />
                      <h3 className="text-base font-bold text-[#1b2920]">
                        Dados Pessoais
                      </h3>
                    </div>
                    <p className="text-xs text-[#64756a] mb-4">
                      Atualize seu nome de exibição e e-mail vinculado ao login.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                          Nome de Exibição
                        </label>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={120}
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Seu nome completo"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] text-sm text-[#1b2920] focus:outline-none focus:border-[#236344] focus:ring-1 focus:ring-[#236344] transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                          E-mail de Acesso
                        </label>
                        <input
                          type="email"
                          required
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          placeholder="seu.email@exemplo.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] text-sm text-[#1b2920] focus:outline-none focus:border-[#236344] focus:ring-1 focus:ring-[#236344] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-[#ede7dc]" />

                  {/* Seção 2: Alteração de Senha & Validação Obrigatória */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-[#236344]" />
                      <h3 className="text-base font-bold text-[#1b2920]">
                        Segurança e Senha
                      </h3>
                    </div>
                    <p className="text-xs text-[#64756a] mb-4">
                      Para confirmar qualquer alteração cadastral, digite sua senha atual.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                          Senha Atual <span className="text-[#b33a3a]">* (Obrigatória)</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPass ? "text" : "password"}
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Digite sua senha atual para confirmar"
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] text-sm text-[#1b2920] focus:outline-none focus:border-[#236344] focus:ring-1 focus:ring-[#236344] transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9990] hover:text-[#1b2920] transition-colors"
                          >
                            {showCurrentPass ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                            Nova Senha <span className="text-[#8a9990] font-normal">(Opcional)</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPass ? "text" : "password"}
                              minLength={6}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Mínimo 6 caracteres"
                              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] text-sm text-[#1b2920] focus:outline-none focus:border-[#236344] focus:ring-1 focus:ring-[#236344] transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPass(!showNewPass)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9990] hover:text-[#1b2920] transition-colors"
                            >
                              {showNewPass ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                            Confirmar Nova Senha
                          </label>
                          <input
                            type={showNewPass ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repita a nova senha"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] text-sm text-[#1b2920] focus:outline-none focus:border-[#236344] focus:ring-1 focus:ring-[#236344] transition-all"
                          />
                        </div>
                      </div>

                      {newPassword && confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-[#b33a3a] font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          As novas senhas digitadas não coincidem.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#ede7dc]">
                    <Button
                      type="submit"
                      variant="primary"
                      leftIcon={<Check className="w-4 h-4" />}
                      isLoading={isSavingProfile}
                    >
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>

          {/* Coluna Lateral: Dicas de Segurança e Resumo da Sessão */}
          <div className="space-y-5">
            <Card padding="md" className="space-y-3.5 bg-[#f4efe6]/60 border-[#ded7cb]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#eef7f2] text-[#236344] border border-[#c2ded0]">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1b2920]">
                    Proteção de Dados
                  </h4>
                  <p className="text-xs text-[#64756a]">Criptografia segura</p>
                </div>
              </div>
              <p className="text-xs text-[#526358] leading-relaxed">
                Suas senhas são protegidas com salt e hash criptográfico bcrypt na camada de persistência. 
                Nunca compartilhe seus dados de acesso com terceiros.
              </p>
            </Card>

            <Card padding="md" className="space-y-3">
              <h4 className="text-xs font-bold text-[#4a5850] uppercase tracking-wider">
                Sessão Ativa
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#ede7dc]">
                  <span className="text-[#64756a]">Usuário ID:</span>
                  <span className="font-semibold text-[#1b2920] tabular-nums">#{user?.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#ede7dc]">
                  <span className="text-[#64756a]">Status da Conta:</span>
                  <span className="font-bold text-[#1b6e44]">Ativa & Verificada</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#64756a]">Design System:</span>
                  <span className="font-medium text-[#4a5850]">Verde & Bege v2.0</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 2: CATEGORIAS PERSONALIZADAS */}
      {/* ========================================================================= */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <Card padding="md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#1b2920]">
                  Categorias Customizadas
                </h3>
                <p className="text-xs text-[#64756a] mt-0.5">
                  Além das categorias padrão do sistema (como Alimentação, Moradia e Salário), 
                  você pode criar categorias próprias com cores personalizadas.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={openCreateCategory}
              >
                Nova Categoria
              </Button>
            </div>
          </Card>

          {isCategoriesLoading ? (
            <div className="py-12 text-center text-sm text-[#64756a]">
              Carregando categorias personalizadas...
            </div>
          ) : categories.length === 0 ? (
            <Card padding="lg" className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] text-[#b86214] flex items-center justify-center mx-auto mb-3 border border-[#ded7cb]">
                <Tags className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#1b2920]">
                Nenhuma categoria customizada cadastrada
              </h4>
              <p className="text-xs text-[#64756a] max-w-sm mx-auto mt-1 mb-4">
                Crie categorias sob medida para organizar suas receitas e despesas com maior precisão.
              </p>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={openCreateCategory}
              >
                Cadastrar Categoria
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  padding="md"
                  className="space-y-3 hover:border-[#236344]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm border border-black/10"
                        style={{ backgroundColor: cat.color || "#236344" }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-[#1b2920] tracking-tight">
                          {cat.name}
                        </h4>
                        <span className="text-[11px] font-mono text-[#8a9990]">
                          {cat.color || "#236344"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 rounded-lg text-[#64756a] hover:text-[#236344] hover:bg-[#eef7f2] transition-colors"
                        title="Editar Categoria"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setItemToDelete({
                            type: "category",
                            id: cat.id,
                            title: cat.name,
                          })
                        }
                        className="p-1.5 rounded-lg text-[#64756a] hover:text-[#b33a3a] hover:bg-[#fdf4f4] transition-colors"
                        title="Excluir Categoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#ede7dc] pt-2.5">
                    <Badge
                      variant={
                        cat.type === "income"
                          ? "income"
                          : cat.type === "expense"
                          ? "expense"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {cat.type === "income"
                        ? "Receita"
                        : cat.type === "expense"
                        ? "Despesa"
                        : "Receita e Despesa"}
                    </Badge>

                    <span className="text-[11px] text-[#8a9990]">
                      ID #{cat.id}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 3: CONTAS FINANCEIRAS */}
      {/* ========================================================================= */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          <Card padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#1b2920]">
                  Instituições e Contas Bancárias
                </h3>
                <p className="text-xs text-[#64756a] mt-0.5">
                  Cadastre suas contas correntes, carteiras de dinheiro, poupanças e cartões.
                </p>
              </div>

              {accounts.length > 0 && (
                <div className="flex items-center gap-4 text-xs font-semibold text-[#4a5850]">
                  <span>Total Inicial Cadastrado:</span>
                  <span className="text-sm font-bold text-[#152e22] tabular-nums">
                    {formatCurrency(
                      accounts.reduce((sum, a) => sum + (Number(a.initial_balance) || 0), 0)
                    )}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {isAccountsLoading ? (
            <div className="py-12 text-center text-sm text-[#64756a]">
              Carregando contas bancárias...
            </div>
          ) : accounts.length === 0 ? (
            <Card padding="lg" className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-[#eef7f2] text-[#236344] flex items-center justify-center mx-auto mb-3 border border-[#c2ded0]">
                <Landmark className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#1b2920]">
                Nenhuma conta financeira cadastrada
              </h4>
              <p className="text-xs text-[#64756a] max-w-sm mx-auto mt-1 mb-4">
                Cadastre suas contas e carteiras para manter o saldo inicial e as movimentações organizadas.
              </p>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={openCreateAccount}
              >
                Cadastrar Conta
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const config = ACCOUNT_TYPE_LABELS[acc.type] || ACCOUNT_TYPE_LABELS.checking;
                const IconComponent = config.icon;

                return (
                  <Card
                    key={acc.id}
                    padding="md"
                    className="space-y-3 hover:border-[#236344]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[#eef7f2] text-[#236344] border border-[#c2ded0]">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#1b2920] tracking-tight">
                            {acc.name}
                          </h4>
                          <span className="text-[11px] text-[#64756a]">
                            {config.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditAccount(acc)}
                          className="p-1.5 rounded-lg text-[#64756a] hover:text-[#236344] hover:bg-[#eef7f2] transition-colors"
                          title="Editar Conta"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setItemToDelete({
                              type: "account",
                              id: acc.id,
                              title: acc.name,
                            })
                          }
                          className="p-1.5 rounded-lg text-[#64756a] hover:text-[#b33a3a] hover:bg-[#fdf4f4] transition-colors"
                          title="Excluir Conta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-[#ede7dc] pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#64756a]">Saldo Inicial:</span>
                        <span className="font-bold text-[#1b2920] tabular-nums">
                          {formatCurrency(Number(acc.initial_balance) || 0)}
                        </span>
                      </div>

                      {acc.type === "credit_card" && (
                        <>
                          {acc.credit_limit !== null && acc.credit_limit !== undefined && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#64756a]">Limite:</span>
                              <span className="font-semibold text-[#4a5850] tabular-nums">
                                {formatCurrency(Number(acc.credit_limit))}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[11px] text-[#8a9990] pt-1">
                            <span>
                              Fechamento: Dia {acc.closing_day || "-"}
                            </span>
                            <span>
                              Vencimento: Dia {acc.due_day || "-"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BESPOKE: CRIAR / EDITAR CATEGORIA */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#ffffff] rounded-2xl border border-[#ded7cb] shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#ede7dc] pb-3">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-[#236344]" />
                <h3 className="text-base font-bold text-[#1b2920]">
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[#8a9990] hover:text-[#1b2920] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Cursos Online, Manutenção do Carro..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] text-sm text-[#1b2920] focus:outline-none focus:border-[#236344] focus:ring-1 focus:ring-[#236344]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                  Tipo de Aplicação
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["expense", "income", "both"] as CategoryType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCatType(type)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        catType === type
                          ? "bg-[#152e22] text-[#fbf9f4] border-[#152e22]"
                          : "bg-[#fbf9f4] text-[#64756a] border-[#ded7cb] hover:bg-[#f4efe6]"
                      }`}
                    >
                      {type === "expense"
                        ? "Despesa"
                        : type === "income"
                        ? "Receita"
                        : "Ambas"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                  Cor da Categoria
                </label>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {PRESET_COLORS.map((color) => (
                    (() => {
                      const usedBy = categories.find(
                        (category) =>
                          category.id !== editingCategory?.id &&
                          category.color?.toLowerCase() === color.toLowerCase(),
                      );
                      const isSystemColor =
                        editingCategory?.color?.toLowerCase() !== color.toLowerCase() &&
                        SYSTEM_CATEGORY_COLORS.some(
                          (systemColor) => systemColor.toLowerCase() === color.toLowerCase(),
                        );
                      return (
                        <button
                          key={color}
                          type="button"
                          disabled={Boolean(usedBy) || isSystemColor}
                          onClick={() => setCatColor(color)}
                          title={
                            usedBy
                              ? `Já usada por ${usedBy.name}`
                              : isSystemColor
                                ? "Usada automaticamente pelo sistema"
                                : "Cor disponível"
                          }
                          className={`relative h-8 rounded-xl transition-transform flex items-center justify-center border ${
                            catColor.toLowerCase() === color.toLowerCase()
                              ? "ring-2 ring-[#236344] scale-105 border-white"
                              : usedBy || isSystemColor
                                ? "border-black/10 opacity-45 cursor-not-allowed"
                                : "border-black/10 hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {catColor.toLowerCase() === color.toLowerCase() && (
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          )}
                          {(usedBy || isSystemColor) && (
                            <span className="absolute inset-0 rounded-xl bg-black/20" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })()
                  ))}
                </div>

                {(categories.some((category) => category.color) || SYSTEM_CATEGORY_COLORS.length > 0) && (
                  <div className="mb-3 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64756a] mb-2">
                      Cores já usadas ou reservadas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SYSTEM_CATEGORY_COLORS.map((color) => (
                        <span
                          key={`system-${color}`}
                          title={`${color} - usada automaticamente pelo sistema`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#ded7cb] bg-white px-2 py-1 text-[10px] font-semibold text-[#4a5850]"
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{ backgroundColor: color }}
                          />
                          Sistema
                        </span>
                      ))}
                      {categories
                        .filter((category) => category.color)
                        .map((category) => (
                          <span
                            key={category.id}
                            title={`${category.name}: ${category.color}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#ded7cb] bg-white px-2 py-1 text-[10px] font-semibold text-[#4a5850]"
                          >
                            <span
                              className="h-3 w-3 rounded-full border border-black/10"
                              style={{ backgroundColor: category.color || "#236344" }}
                            />
                            {category.name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: catColor }}
                  />
                  <input
                    type="color"
                    value={HEX_COLOR_PATTERN.test(catColor) ? catColor : "#236344"}
                    onChange={(e) => setCatColor(e.target.value.toUpperCase())}
                    title="Escolher qualquer cor"
                    aria-label="Escolher qualquer cor"
                    className="h-8 w-10 cursor-pointer rounded-lg border border-[#ded7cb] bg-white p-0.5"
                  />
                  <input
                    type="text"
                    value={catColor}
                    onChange={(e) => {
                      let val = e.target.value.trim();
                      if (!val.startsWith("#")) val = "#" + val;
                      setCatColor(val.slice(0, 7));
                    }}
                    placeholder="#236344"
                    maxLength={7}
                    className="w-full px-3 py-2 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] text-xs font-mono uppercase text-[#1b2920] focus:outline-none focus:border-[#236344]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#ede7dc]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  {editingCategory ? "Atualizar" : "Salvar Categoria"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BESPOKE: CRIAR / EDITAR CONTA FINANCEIRA */}
      {/* ========================================================================= */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#ffffff] rounded-2xl border border-[#ded7cb] shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ede7dc] pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#236344]" />
                <h3 className="text-base font-bold text-[#1b2920]">
                  {editingAccount ? "Editar Conta" : "Nova Conta Financeira"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="text-[#8a9990] hover:text-[#1b2920] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                  Nome da Conta / Instituição
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Ex: Nubank, Itaú Corrente, Carteira Física..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] text-sm text-[#1b2920] focus:outline-none focus:border-[#236344] focus:ring-1 focus:ring-[#236344]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                  Tipo de Conta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["checking", "savings", "cash", "credit_card"] as AccountType[]).map((type) => {
                    const info = ACCOUNT_TYPE_LABELS[type];
                    const IconComp = info.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAccType(type)}
                        className={`p-3 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                          accType === type
                            ? "bg-[#152e22] text-[#fbf9f4] border-[#152e22]"
                            : "bg-[#fbf9f4] text-[#64756a] border-[#ded7cb] hover:bg-[#f4efe6]"
                        }`}
                      >
                        <IconComp className={`w-4 h-4 mt-0.5 ${accType === type ? "text-[#5bc48a]" : "text-[#236344]"}`} />
                        <div>
                          <p className="text-xs font-bold leading-tight">{info.label}</p>
                          <p className={`text-[10px] mt-0.5 ${accType === type ? "text-[#c2ded0]" : "text-[#8a9990]"}`}>
                            {info.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                  Saldo Inicial
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8a9990]">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formatCurrencyInput(accInitialBalanceInput)}
                    onChange={(e) => setAccInitialBalanceInput(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] text-sm font-semibold text-[#1b2920] tabular-nums focus:outline-none focus:border-[#236344] focus:ring-1 focus:ring-[#236344]"
                  />
                </div>
              </div>

              {/* Campos Condicionais para Cartão de Crédito */}
              {accType === "credit_card" && (
                <div className="p-4 rounded-xl bg-[#f4efe6]/70 border border-[#ded7cb] space-y-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1b2920]">
                    <Sparkles className="w-3.5 h-3.5 text-[#236344]" />
                    <span>Detalhes do Cartão de Crédito</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                      Limite de Crédito
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8a9990]">
                        R$
                      </span>
                      <input
                        type="text"
                        value={formatCurrencyInput(accCreditLimitInput)}
                        onChange={(e) => setAccCreditLimitInput(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#ded7cb] bg-white text-sm font-semibold text-[#1b2920] tabular-nums focus:outline-none focus:border-[#236344]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                        Dia de Fechamento
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={accClosingDay}
                        onChange={(e) =>
                          setAccClosingDay(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="Ex: 10"
                        className="w-full px-3 py-2 rounded-xl border border-[#ded7cb] bg-white text-sm text-[#1b2920] tabular-nums focus:outline-none focus:border-[#236344]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4a5850] uppercase tracking-wider mb-1.5">
                        Dia de Vencimento
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={accDueDay}
                        onChange={(e) =>
                          setAccDueDay(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="Ex: 17"
                        className="w-full px-3 py-2 rounded-xl border border-[#ded7cb] bg-white text-sm text-[#1b2920] tabular-nums focus:outline-none focus:border-[#236344]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#ede7dc]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAccountModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  {editingAccount ? "Atualizar Conta" : "Salvar Conta"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO BESPOKE (ZERO window.confirm) */}
      {/* ========================================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#ffffff] rounded-2xl border border-[#ded7cb] shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#fdf4f4] text-[#b33a3a] border border-[#f5c6c6] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-[#1b2920]">
                Confirmar Exclusão
              </h3>
              <p className="text-xs text-[#64756a] leading-relaxed">
                Tem certeza que deseja excluir{" "}
                {itemToDelete.type === "category" ? "a categoria" : "a conta"}{" "}
                <strong className="text-[#1b2920]">"{itemToDelete.title}"</strong>? 
                Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
