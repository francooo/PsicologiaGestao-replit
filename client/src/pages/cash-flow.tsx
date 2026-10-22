import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Input } from "@/components/ui/input";
import {
  Loader2,
  FileDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  ArrowLeft,
  Calendar,
  FileText,
  DollarSign,
  Tag,
  Receipt,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { MetricCard } from "@/components/cp/MetricCard";
import { IconField, ModalHeader } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { statusOf, transactionType as txTypeStatus } from "@/components/cp/status";
import { categoryColor, chartColors } from "@/lib/chart-colors";
import { downloadCsv, expenseCategories, formatBRL, incomeCategories, parseAmount } from "@/lib/money";
import { fromDateKey, toDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

type TxType = 'income' | 'expense';

const card = "rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]";
const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-cp-ink";
const allCategories = Array.from(new Set([...incomeCategories, ...expenseCategories]));

const formatDate = (value: string) => {
  const d = fromDateKey(value);
  return d ? format(d, 'dd/MM/yyyy') : '—';
};

function byCategory(list: any[], type: TxType) {
  const map: Record<string, number> = {};
  list.filter(t => t.type === type).forEach(t => {
    const category = t.category || 'Sem categoria';
    map[category] = (map[category] || 0) + Number(t.amount);
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function CategoryPie({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div className={cn(card, "p-4 sm:p-6")}>
      <h3 className="mb-4 text-[18px] font-semibold text-cp-ink">{title}</h3>
      {data.length > 0 ? (
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={78} paddingAngle={2} dataKey="value" stroke="none">
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={categoryColor(index)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatBRL(Number(value))} contentStyle={{ borderRadius: 12, borderColor: chartColors.grid }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="max-h-44 space-y-2 overflow-y-auto">
            {data.map((entry, index) => (
              <li key={entry.name} className="flex items-center gap-2 text-[13px]">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(index) }} aria-hidden="true" />
                <span className="flex-1 truncate text-cp-ink">{entry.name}</span>
                <span className="font-semibold text-cp-ink">{formatBRL(entry.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-cp-muted">Sem dados no período</p>
      )}
    </div>
  );
}

export default function CashFlow() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ startDate: string, endDate: string }>(() => ({
    startDate: toDateKey(startOfMonth(new Date())),
    endDate: toDateKey(endOfMonth(new Date())),
  }));
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dialogType, setDialogType] = useState<TxType | null>(null);
  const emptyForm = { date: toDateKey(), description: '', category: '', amount: '' };
  const [transactionForm, setTransactionForm] = useState(emptyForm);

  const { data: transactions, isLoading } = useQuery<any[]>({
    queryKey: ['/api/transactions', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    }
  });

  // Every block (cards, charts, table, CSV) follows the same type + category filter
  const filtered = (transactions ?? []).filter(t =>
    (selectedType === "all" || t.type === selectedType) &&
    (selectedCategory === "all" || t.category === selectedCategory)
  );
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Daily buckets in local dates, with accumulated balance
  const dailyFlowData = (() => {
    const start = fromDateKey(dateRange.startDate);
    const end = fromDateKey(dateRange.endDate);
    if (!start || !end || end < start) return [];
    const days = new Map<string, { date: string; income: number; expense: number }>();
    for (let d = start; d <= end; d = addDays(d, 1)) {
      days.set(toDateKey(d), { date: toDateKey(d), income: 0, expense: 0 });
    }
    filtered.forEach(t => {
      const day = days.get(String(t.date).slice(0, 10));
      if (!day) return;
      if (t.type === 'income') day.income += Number(t.amount);
      else if (t.type === 'expense') day.expense += Number(t.amount);
    });
    let acc = 0;
    return Array.from(days.values()).map(d => {
      acc += d.income - d.expense;
      return { ...d, balance: acc, displayDate: format(fromDateKey(d.date)!, 'dd/MM') };
    });
  })();

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/transactions", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({ title: "Sucesso!", description: `${dialogType === 'income' ? 'Entrada' : 'Saída'} registrada com sucesso.` });
      setTransactionForm({ ...emptyForm, date: toDateKey() });
      setDialogType(null);
    },
    onError: (error) => {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao registrar a transação.", variant: "destructive" });
    },
  });

  const handleAddTransaction = () => {
    if (!transactionForm.description || !transactionForm.category || !transactionForm.amount || !transactionForm.date) {
      toast({ title: "Formulário incompleto", description: "Por favor, preencha todos os campos.", variant: "destructive" });
      return;
    }
    const amount = parseAmount(transactionForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor inválido", description: "Informe um valor maior que zero.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ ...transactionForm, amount, type: dialogType });
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast({ title: "Sem dados", description: "Não há transações para exportar no período selecionado", variant: "destructive" });
      return;
    }
    downloadCsv(
      `fluxo-caixa-${dateRange.startDate}-a-${dateRange.endDate}.csv`,
      ["Data", "Descrição", "Categoria", "Tipo", "Valor"],
      filtered.map(t => [
        formatDate(t.date),
        t.description,
        t.category,
        t.type === 'income' ? 'Receita' : 'Despesa',
        Number(t.amount).toFixed(2).replace('.', ','),
      ]),
    );
    toast({ title: "Sucesso", description: "Relatório CSV exportado com sucesso" });
  };

  const isIncomeDialog = dialogType === 'income';

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />

      <div className="ml-0 flex-1 overflow-y-auto overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />

        <main className="p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader
            className="mb-6"
            title="Fluxo de Caixa"
            subtitle="Análise detalhada das receitas e despesas"
            phrase
            actions={
              <>
                <button type="button" className={cpButton.secondary} onClick={() => navigate("/financial")}>
                  <ArrowLeft className="h-4 w-4" />
                  Financeiro
                </button>
                <button type="button" className={cpButton.secondary} onClick={exportCsv}>
                  <FileDown className="h-4 w-4" />
                  Exportar CSV
                </button>
                <button type="button" className={cpButton.secondary} onClick={() => setDialogType('expense')} data-testid="button-new-exit">
                  <ArrowDownCircle className="h-4 w-4 text-cp-danger" />
                  Registrar Saída
                </button>
                <button type="button" className={cpButton.primary} onClick={() => setDialogType('income')} data-testid="button-new-entry">
                  <ArrowUpCircle className="h-4 w-4" />
                  Registrar Entrada
                </button>
              </>
            }
          />

          {/* Filtros */}
          <div className={cn(card, "mb-6 p-4 sm:p-5")}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className={fieldLabel} htmlFor="cf-start">De</label>
                <IconField icon={Calendar}>
                  <Input id="cf-start" type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} />
                </IconField>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="cf-end">Até</label>
                <IconField icon={Calendar}>
                  <Input id="cf-end" type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} />
                </IconField>
              </div>
              <div>
                <span className={fieldLabel}>Tipo</span>
                <IconField icon={Receipt}>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Receitas</SelectItem>
                      <SelectItem value="expense">Despesas</SelectItem>
                    </SelectContent>
                  </Select>
                </IconField>
              </div>
              <div>
                <span className={fieldLabel}>Categoria</span>
                <IconField icon={Tag}>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger aria-label="Categoria"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </IconField>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cp-action" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard icon={<ArrowUpCircle className="h-6 w-6 text-cp-success" />} tint="bg-cp-sage-soft" label="Entradas" value={formatBRL(totalIncome)} sub="no período" />
                <MetricCard icon={<ArrowDownCircle className="h-6 w-6 text-cp-danger" />} tint="bg-cp-danger-soft" label="Saídas" value={formatBRL(totalExpense)} sub="no período" />
                <MetricCard
                  icon={<Wallet className={cn("h-6 w-6", balance >= 0 ? "text-cp-action" : "text-cp-warning")} />}
                  tint={balance >= 0 ? "bg-cp-action-soft" : "bg-cp-warning-soft"}
                  label="Saldo"
                  value={formatBRL(balance)}
                  sub={balance >= 0 ? "Saldo positivo" : "Saldo negativo"}
                />
              </div>

              {/* Fluxo diário */}
              <div className={cn(card, "p-4 sm:p-6")}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] font-semibold text-cp-ink">Fluxo de Caixa Diário</h3>
                    <p className="text-sm text-cp-muted">Receitas, despesas e saldo acumulado no período</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-cp-muted">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors.income }} />Receitas</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors.expense }} />Despesas</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors.balance }} />Saldo acumulado</span>
                  </div>
                </div>
                <div className="h-80 w-full">
                  {filtered.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                        <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartColors.axis }} />
                        <YAxis axisLine={false} tickLine={false} width={72} tick={{ fontSize: 12, fill: chartColors.axis }} tickFormatter={(value) => formatBRL(value).replace('R$', '').trim()} />
                        <Tooltip formatter={(value) => [formatBRL(Number(value)), undefined]} labelFormatter={(label) => `Data: ${label}`} contentStyle={{ borderRadius: 12, borderColor: chartColors.grid }} />
                        <Bar name="Receitas" dataKey="income" fill={chartColors.income} radius={[4, 4, 0, 0]} />
                        <Bar name="Despesas" dataKey="expense" fill={chartColors.expense} radius={[4, 4, 0, 0]} />
                        <Bar name="Saldo acumulado" dataKey="balance" fill={chartColors.balance} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-cp-muted">Sem dados para exibir</div>
                  )}
                </div>
              </div>

              {/* Por categoria */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <CategoryPie title="Receitas por Categoria" data={byCategory(filtered, 'income')} />
                <CategoryPie title="Despesas por Categoria" data={byCategory(filtered, 'expense')} />
              </div>

              {/* Transações */}
              <div className={cn(card, "p-4 sm:p-6")}>
                <h3 className="text-[20px] font-semibold text-cp-ink">Transações Detalhadas</h3>
                <p className="mb-4 text-sm text-cp-muted">Todas as transações do período e dos filtros escolhidos</p>
                {filtered.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-1 text-sm">
                      <thead>
                        <tr className="bg-cp-sand-soft text-left text-[13px] text-cp-ink [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
                          <th className="px-4 py-3 font-medium">Data</th>
                          <th className="px-4 py-3 font-medium">Descrição</th>
                          <th className="px-4 py-3 font-medium">Categoria</th>
                          <th className="px-4 py-3 font-medium">Tipo</th>
                          <th className="px-4 py-3 text-right font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((transaction) => {
                          const st = statusOf(txTypeStatus, transaction.type);
                          return (
                            <tr key={transaction.id} className="transition-colors hover:bg-cp-hover [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl">
                              <td className="whitespace-nowrap px-4 py-3 font-medium text-cp-ink">{formatDate(transaction.date)}</td>
                              <td className="px-4 py-3 text-cp-ink">{transaction.description}</td>
                              <td className="px-4 py-3 text-cp-muted">{transaction.category}</td>
                              <td className="px-4 py-3"><StatusBadge label={st.label} tone={st.tone} /></td>
                              <td className={cn("whitespace-nowrap px-4 py-3 text-right font-semibold", transaction.type === 'income' ? 'text-cp-success' : 'text-cp-danger')}>
                                {transaction.type === 'income' ? '+ ' : '− '}{formatBRL(transaction.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Receipt className="mb-3 h-10 w-10 text-cp-sage" />
                    <p className="text-sm font-medium text-cp-ink">Nenhuma transação encontrada</p>
                    <p className="mt-1 text-xs text-cp-muted">Ajuste o período ou os filtros.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Registrar entrada / saída */}
        <Dialog open={dialogType !== null} onOpenChange={(o) => { if (!o) setDialogType(null); }}>
          <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
            <ModalHeader
              icon={isIncomeDialog ? ArrowUpCircle : ArrowDownCircle}
              tone={isIncomeDialog ? "sage" : "lavender"}
              title={isIncomeDialog ? 'Registrar Nova Entrada' : 'Registrar Nova Saída'}
              description={`Preencha os dados da ${isIncomeDialog ? 'receita' : 'despesa'} abaixo.`}
            />

            <div className="mt-2 space-y-4">
              <div>
                <label className={fieldLabel} htmlFor="cf-desc">Descrição <span className="text-cp-danger">*</span></label>
                <IconField icon={FileText}>
                  <Input id="cf-desc" placeholder="Descrição da transação" value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} />
                </IconField>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor="cf-date">Data <span className="text-cp-danger">*</span></label>
                  <IconField icon={Calendar}>
                    <Input id="cf-date" type="date" value={transactionForm.date} onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })} />
                  </IconField>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="cf-amount">Valor (R$) <span className="text-cp-danger">*</span></label>
                  <IconField icon={DollarSign}>
                    <Input id="cf-amount" inputMode="decimal" placeholder="0,00" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value.replace(/[^0-9.,]/g, '') })} />
                  </IconField>
                </div>
              </div>
              <div>
                <span className={fieldLabel}>Categoria <span className="text-cp-danger">*</span></span>
                <IconField icon={Tag}>
                  <Select value={transactionForm.category} onValueChange={(value) => setTransactionForm({ ...transactionForm, category: value })}>
                    <SelectTrigger aria-label="Categoria"><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                    <SelectContent>
                      {(isIncomeDialog ? incomeCategories : expenseCategories).map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </IconField>
              </div>
            </div>

            <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
              <button type="button" className={cpButton.subtle} onClick={() => setDialogType(null)}>
                Cancelar
              </button>
              <button type="button" className={cpButton.primary} onClick={handleAddTransaction} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isIncomeDialog ? 'Registrar Entrada' : 'Registrar Saída'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
