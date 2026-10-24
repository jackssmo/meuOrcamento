import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { Header } from "../components/Header";
import { formatCurrency, formatCurrencyInput } from "../utils/formatters";
import type { CardItem } from "../types/Transaction";

export function Profile() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [cards, setCards] = useState<CardItem[]>([]);
  const [newCard, setNewCard] = useState("");
  const [newCardLimit, setNewCardLimit] = useState("");
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editingCardName, setEditingCardName] = useState("");
  const [editingCardLimit, setEditingCardLimit] = useState("");

  useEffect(() => {
    api.get("/auth/profile")
      .then((response) => {
        setName(response.data.name || "");
        setEmail(response.data.email || "");
      })
      .catch(() => toast.error("Não foi possível carregar seus dados."))
      .finally(() => setIsLoading(false));

    loadCards();
  }, []);

  function loadCards() {
    api.get("/financial/cards")
      .then((response) => setCards(response.data))
      .catch(() => toast.error("Não foi possível carregar seus cartões."));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await api.put("/auth/profile", {
        name,
        email,
        currentPassword,
        newPassword: newPassword || undefined,
      });
      setName(response.data.name);
      setEmail(response.data.email);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Dados atualizados com sucesso.");
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.error : undefined;
      toast.error(message || "Não foi possível atualizar seus dados.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addCard(event: FormEvent) {
    event.preventDefault();
    if (!newCard.trim()) return;
    try {
      const rawLimit = newCardLimit.replace(/\D/g, "");
      const numericLimit = rawLimit ? Number(rawLimit) / 100 : 0;
      const response = await api.post("/financial/cards", {
        name: newCard.trim(),
        credit_limit: numericLimit,
      });
      setCards((current) => [response.data, ...current]);
      setNewCard("");
      setNewCardLimit("");
      toast.success("Cartão cadastrado com sucesso!");
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.error : undefined;
      toast.error(message || "Não foi possível cadastrar o cartão.");
    }
  }

  async function removeCard(id: number) {
    if (!window.confirm("Excluir este cartão da sua lista? As despesas antigas serão mantidas.")) return;
    try {
      await api.delete(`/financial/cards/${id}`);
      setCards((current) => current.filter((card) => card.id !== id));
      toast.success("Cartão removido.");
    } catch {
      toast.error("Não foi possível remover o cartão.");
    }
  }

  function startEditingCard(card: CardItem) {
    setEditingCardId(card.id);
    setEditingCardName(card.name);
    setEditingCardLimit(card.credit_limit ? (card.credit_limit * 100).toFixed(0) : "");
  }

  async function saveCard(event: FormEvent, id: number) {
    event.preventDefault();
    const normalizedName = editingCardName.trim();
    if (normalizedName.length < 2) return;

    try {
      const rawLimit = editingCardLimit.replace(/\D/g, "");
      const numericLimit = rawLimit ? Number(rawLimit) / 100 : 0;
      const response = await api.patch(`/financial/cards/${id}`, {
        name: normalizedName,
        credit_limit: numericLimit,
      });
      setCards((current) => current.map((card) => card.id === id ? response.data : card));
      setEditingCardId(null);
      setEditingCardName("");
      setEditingCardLimit("");
      toast.success("Cartão atualizado.");
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.error : undefined;
      toast.error(message || "Não foi possível atualizar o cartão.");
    }
  }

  return (
    <div className="app-layout">
      <Header userName={name} />
      <main className="app-content">
        <div className="page-heading">
          <div>
            <h1>Minha conta</h1>
            <p>Atualize suas informações pessoais e limites de cartões.</p>
          </div>
        </div>

        <section className="surface max-w-3xl p-6 sm:p-8">
          {isLoading ? (
            <p className="text-sm text-[#77817e]">Carregando seus dados...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#202b3c]">Dados pessoais</h2>
                <p className="mt-1 text-sm text-[#7b8798]">Essas informações aparecem apenas na sua conta.</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#7b8798]">Nome</span>
                <input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-[#dfe3eb] px-4 py-3 outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#7b8798]">E-mail</span>
                <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-[#dfe3eb] px-4 py-3 outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]" />
              </label>
              <div className="border-t border-[#e2e3de] pt-5">
                <h2 className="text-lg font-semibold text-[#243238]">Alterar senha</h2>
                <p className="mt-1 text-sm text-[#7b8798]">Deixe em branco para manter a senha atual.</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#7b8798]">Senha atual</span>
                <input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-lg border border-[#dfe3eb] px-4 py-3 outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#7b8798]">Nova senha (opcional)</span>
                <input minLength={6} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-lg border border-[#dfe3eb] px-4 py-3 outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]" />
              </label>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => navigate("/dashboard")} className="rounded-lg border border-[#dfe3eb] px-5 py-3 text-sm font-semibold text-[#52627a] hover:bg-[#f5f7fa]">Cancelar</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-[#2454a6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1c4386] disabled:opacity-60">{isSaving ? "Salvando..." : "Salvar alterações"}</button>
              </div>
            </form>
          )}
        </section>

        <section className="surface mt-6 max-w-3xl p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold text-[#202b3c]">Meus cartões e limites</h2>
            <p className="mt-1 text-sm text-[#7b8798]">
              Cadastre seus cartões com o limite de crédito total. O sistema calcula automaticamente quanto limite já foi utilizado pelas despesas não pagas. Quando você marcar uma despesa como paga, o limite é liberado (abatido)!
            </p>
          </div>

          <form onSubmit={addCard} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <input
                required
                minLength={2}
                maxLength={120}
                value={newCard}
                onChange={(event) => setNewCard(event.target.value)}
                placeholder="Nome do cartão (ex.: Nubank Black)"
                className="w-full rounded-lg border border-[#dfe3eb] px-4 py-3 text-sm outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                value={newCardLimit ? formatCurrencyInput(newCardLimit) : ""}
                onChange={(event) => setNewCardLimit(event.target.value)}
                placeholder="Limite total R$ (ex: 5.000,00)"
                className="w-full rounded-lg border border-[#dfe3eb] px-4 py-3 text-sm outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full rounded-lg bg-[#2454a6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c4386] transition"
              >
                Adicionar
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {cards.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">Nenhum cartão cadastrado.</p>
            ) : (
              cards.map((card) => {
                const limit = Number(card.credit_limit) || 0;
                const used = Number(card.used_limit) || 0;
                const available = Number(card.available_limit) || (limit - used);
                const usagePercentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
                const isOverLimit = limit > 0 && used > limit;

                return (
                  <div
                    key={card.id}
                    className="rounded-xl border border-[#e4e9f0] bg-white p-4 shadow-sm hover:border-[#ccd7e6] transition"
                  >
                    {editingCardId === card.id ? (
                      <form onSubmit={(event) => void saveCard(event, card.id)} className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                              Nome do cartão
                            </label>
                            <input
                              required
                              minLength={2}
                              maxLength={120}
                              value={editingCardName}
                              onChange={(event) => setEditingCardName(event.target.value)}
                              className="w-full rounded-lg border border-[#dfe3eb] px-3 py-2 text-sm outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                              Limite de crédito (R$)
                            </label>
                            <input
                              value={editingCardLimit ? formatCurrencyInput(editingCardLimit) : ""}
                              onChange={(event) => setEditingCardLimit(event.target.value)}
                              placeholder="0,00"
                              className="w-full rounded-lg border border-[#dfe3eb] px-3 py-2 text-sm outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingCardId(null)}
                            className="rounded-lg border border-[#dfe3eb] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="rounded-lg bg-[#2454a6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1c4386]"
                          >
                            Salvar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">💳</span>
                            <span className="font-semibold text-[#243238] text-base">{card.name}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingCard(card)}
                              className="text-xs font-semibold text-[#2454a6] hover:text-[#1c4386] px-2 py-1 rounded hover:bg-blue-50 transition"
                            >
                              Editar limite
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeCard(card.id)}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>

                        {/* Indicadores de Limite */}
                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center sm:text-left">
                          <div>
                            <span className="block text-[11px] font-medium text-slate-500 uppercase">
                              Limite total
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {limit > 0 ? formatCurrency(limit) : "Não definido"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] font-medium text-slate-500 uppercase">
                              Limite usado
                            </span>
                            <span className={`text-sm font-bold ${isOverLimit ? "text-red-600" : "text-amber-600"}`}>
                              {formatCurrency(used)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] font-medium text-slate-500 uppercase">
                              Disponível
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                available < 0 ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {formatCurrency(available)}
                            </span>
                          </div>
                        </div>

                        {/* Barra de progresso de uso */}
                        {limit > 0 && (
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-slate-500">
                              <span>Uso do limite</span>
                              <span className={isOverLimit ? "font-bold text-red-600" : ""}>
                                {usagePercentage}% {isOverLimit && "(Limite estourado!)"}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isOverLimit
                                    ? "bg-red-600"
                                    : usagePercentage >= 80
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, usagePercentage)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
