import type { ChangeEvent, FormEvent } from "react";

function capitalizeWords(value: string): string {
  return value.replace(/(^|\s)(\S)/gu, (_, separator: string, character: string) =>
    `${separator}${character.toLocaleUpperCase("pt-BR")}`,
  );
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  editingId: number | null;
  type: "income" | "expense";
  setType: (type: "income" | "expense") => void;
  description: string;
  setDescription: (desc: string) => void;
  amount: string;
  onAmountChange: (e: ChangeEvent<HTMLInputElement>) => void;
  date: string;
  setDate: (date: string) => void;
  category: string;
  setCategory: (cat: string) => void;
  card: string;
  setCard: (card: string) => void;
  cards: string[];
  isFixed: boolean;
  setIsFixed: (value: boolean) => void;
  installments: string;
  setInstallments: (value: string) => void;
  isPaid: boolean;
  setIsPaid: (value: boolean) => void;
  categories?: string[];
}

export function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  editingId,
  type,
  setType,
  description,
  setDescription,
  amount,
  onAmountChange,
  date,
  setDate,
  category,
  setCategory,
  card,
  setCard,
  cards,
  isFixed,
  setIsFixed,
  installments,
  setInstallments,
  isPaid,
  setIsPaid,
  categories = [],
}: TransactionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="transaction-modal bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {editingId ? "Editar Transação" : "Nova Transação"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Tipo (Receita / Despesa) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-2 rounded-lg font-medium text-sm transition ${
                  type === "income"
                    ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-500"
                    : "bg-gray-100 text-gray-500 border-2 border-transparent"
                }`}
              >
                Receita
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-2 rounded-lg font-medium text-sm transition ${
                  type === "expense"
                    ? "bg-red-100 text-red-700 border-2 border-red-500"
                    : "bg-gray-100 text-gray-500 border-2 border-transparent"
                }`}
              >
                Despesa
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(capitalizeWords(e.target.value))}
              placeholder="Ex: Supermercado, Salário..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === "expense" && !editingId ? "Valor da parcela (R$)" : "Valor (R$)"}
              </label>
              <input
                type="text"
                required
                value={amount}
                onChange={onAmountChange}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="" disabled>Selecione...</option>
              <option value="alimentacao">Alimentação</option>
              <option value="moradia">Moradia</option>
              <option value="transporte">Transporte</option>
              <option value="salario">Salário</option>
              <option value="lazer">Lazer</option>
              <option value="saude">Saúde</option>
              <option value="educacao">Educação</option>
              <option value="assinaturas">Assinaturas</option>
              <option value="compras">Compras</option>
              <option value="viagens">Viagens</option>
              <option value="impostos">Impostos e taxas</option>
              <option value="investimentos">Investimentos</option>
              <option value="dividas">Dívidas</option>
              <option value="outros">Outros</option>
              {categories.filter((item) => !["alimentacao", "moradia", "transporte", "salario", "lazer", "saude", "educacao", "assinaturas", "compras", "viagens", "impostos", "investimentos", "dividas", "outros"].includes(item)).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          {type === "expense" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cartão de Crédito</label>
              <select
                value={card}
                onChange={(e) => setCard(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Nenhum (ou selecione um cartão)...</option>
                {cards.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          )}

          {/* Status de Pagamento (apenas para despesas) */}
          {type === "expense" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label htmlFor="isPaid" className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#2454a6] focus:ring-[#2454a6]"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">
                    Despesa já foi paga?
                  </span>
                  <span className="text-xs text-gray-500">
                    Despesas pagas não comprometem o limite do cartão (o valor é abatido).
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Renda Fixa (Apenas para Receitas e se não estiver editando) */}
          {!editingId && type === "income" && (
            <div className="flex items-center pt-2">
              <input
                type="checkbox"
                id="isFixed"
                checked={isFixed}
                onChange={(e) => setIsFixed(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isFixed" className="ml-2 block text-sm text-gray-700">
                Renda Fixa (Repetir mensalmente)
              </label>
            </div>
          )}

          {/* Parcelas (Apenas para Despesas e se não estiver editando) */}
          {!editingId && type === "expense" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de parcelas (o valor acima será aplicado a cada parcela)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {/* Botão de Salvar */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#2454a6] hover:bg-[#1c4386] text-white py-3 rounded-lg font-semibold transition mt-4 disabled:opacity-70"
          >
            {isSubmitting ? "Salvando..." : editingId ? "Atualizar Transação" : "Salvar Transação"}
          </button>
        </form>
      </div>
    </div>
  );
}
