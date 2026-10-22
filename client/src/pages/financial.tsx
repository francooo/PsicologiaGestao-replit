import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTransactionSchema } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Loader2,
  Plus,
  Minus,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  BarChart3,
  Calendar,
  FileText,
  DollarSign,
  Tag,
  User,
  Check,
  X,
  Receipt,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { MetricCard } from "@/components/cp/MetricCard";
import { IconField, ModalHeader } from "@/components/cp/fields";
import { chartColors } from "@/lib/chart-colors";
import { expenseCategories, formatBRL, incomeCategories, parseAmount } from "@/lib/money";
import { fromDateKey, toDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

// Transaction form schema
const transactionFormSchema = insertTransactionSchema.extend({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório").refine(val => !isNaN(parseAmount(val)), {
    message: "Valor deve ser um número válido"
  }),
  date: z.string().min(1, "Data é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;
type TxType = "income" | "expense";

const card = "rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]";
const fieldLabel = "text-[13px] font-semibold text-cp-ink";
const CHART_MONTHS = { "1M": 1, "3M": 3, "6M": 6, "1A": 12 } as const;
type ChartPeriod = keyof typeof CHART_MONTHS;

function useTransactions(startDate: string, endDate: string) {
  return useQuery<any[]>({
    queryKey: ['/api/transactions', { startDate, endDate }],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    }
  });
}

function totals(list: any[] | undefined) {
  const income = (list ?? []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = (list ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  return { income, expenses, profit: income - expenses };
}

/** "↑ 12% vs. mês anterior"; null when there is nothing to compare against. */
function Change({ current, previous, lowerIsBetter = false }: { current: number; previous: number; lowerIsBetter?: boolean }) {
  if (!previous) return <span className="text-cp-subtle">Sem dados do mês anterior</span>;
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const up = pct >= 0;
  const good = lowerIsBetter ? !up : up;
  return (
    <span className={good ? "text-cp-success" : "text-cp-danger"}>
      {up ? "↑" : "↓"} {Math.abs(pct)}% vs. mês anterior
    </span>
  );
}

const formatDate = (value: string) => {
  const d = fromDateKey(value);
  return d ? format(d, 'dd/MM/yyyy') : '—';
};

// ─── CategorySelectWithAdd ─────────────────────────────────────────────────────
function CategorySelectWithAdd({
  baseCategories,
  value,
  onChange,
}: {
  baseCategories: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCat, setNewCat] = useState('');

  const allCategories = [...baseCategories, ...extraCategories];

  const handleValueChange = (v: string) => {
    if (v === '__new__') {
      setIsAdding(true);
    } else {
      onChange(v);
    }
  };

  const handleConfirm = () => {
    const trimmed = newCat.trim();
    if (trimmed) {
      if (!allCategories.includes(trimmed)) {
        setExtraCategories(prev => [...prev, trimmed]);
      }
      onChange(trimmed);
    }
    setNewCat('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-2">
      <IconField icon={Tag}>
        <Select onValueChange={handleValueChange} value={isAdding ? '' : (value || '')}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {allCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
            <SelectItem value="__new__">
              <span className="flex items-center gap-1.5 font-medium text-cp-action">
                <Plus className="h-3.5 w-3.5" />
                Nova categoria...
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </IconField>
      {isAdding && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Nome da nova categoria"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
              if (e.key === 'Escape') { setIsAdding(false); setNewCat(''); }
            }}
            className="h-9 rounded-xl border-cp-border text-sm focus-visible:ring-cp-action"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleConfirm}
            className="h-9 w-9 shrink-0 rounded-xl border-cp-border p-0"
            data-testid="button-confirm-new-category"
            aria-label="Confirmar categoria"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => { setIsAdding(false); setNewCat(''); }}
            className="h-9 w-9 shrink-0 p-0"
            aria-label="Cancelar nova categoria"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Nova Receita / Nova Despesa ───────────────────────────────────────────────
function TransactionDialog({
  type,
  open,
  onOpenChange,
  users,
}: {
  type: TxType;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: any[] | undefined;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isIncome = type === "income";

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      description: "",
      amount: "",
      type,
      category: "",
      date: toDateKey(),
      responsibleId: user?.id || 0,
      relatedAppointmentId: undefined
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      const response = await apiRequest("POST", "/api/transactions", {
        ...data,
        amount: parseAmount(data.amount),
        responsibleId: Number(data.responsibleId)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({ title: "Transação criada", description: "A transação foi registrada com sucesso." });
      onOpenChange(false);
      form.reset({ ...form.formState.defaultValues, date: toDateKey() });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Falha ao registrar transação: ${error.message}`, variant: "destructive" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl">
        <ModalHeader
          icon={isIncome ? ArrowUpCircle : ArrowDownCircle}
          tone={isIncome ? "sage" : "lavender"}
          title={isIncome ? "Nova Receita" : "Nova Despesa"}
          description={`Preencha os detalhes para registrar uma nova ${isIncome ? "receita" : "despesa"}.`}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="mt-2 space-y-4">
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>Descrição <span className="text-cp-danger">*</span></FormLabel>
                <IconField icon={FileText}>
                  <FormControl>
                    <Input placeholder={isIncome ? "Ex: Consulta - João da Silva" : "Ex: Pagamento Aluguel"} {...field} />
                  </FormControl>
                </IconField>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabel}>Valor (R$) <span className="text-cp-danger">*</span></FormLabel>
                  <IconField icon={DollarSign}>
                    <FormControl>
                      <Input inputMode="decimal" placeholder={isIncome ? "Ex: 200,00" : "Ex: 3500,00"} {...field} />
                    </FormControl>
                  </IconField>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabel}>Data <span className="text-cp-danger">*</span></FormLabel>
                  <IconField icon={Calendar}>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </IconField>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabel}>Categoria <span className="text-cp-danger">*</span></FormLabel>
                  <CategorySelectWithAdd
                    baseCategories={isIncome ? incomeCategories : expenseCategories}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="responsibleId" render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabel}>Responsável</FormLabel>
                  {user?.role === 'psychologist' ? (
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-cp-border bg-cp-hover px-3">
                      <User className="h-4 w-4 text-cp-muted" />
                      <span className="text-sm text-cp-ink">{user.fullName}</span>
                    </div>
                  ) : (
                    <IconField icon={User}>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={user?.id?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map((u) => (
                            <SelectItem key={u.id} value={u.id.toString()}>
                              {u.fullName}
                            </SelectItem>
                          )) || (
                            <SelectItem value={user?.id?.toString() || ""}>
                              {user?.fullName || "Usuário atual"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </IconField>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
              <button type="button" className={cpButton.subtle} onClick={() => onOpenChange(false)}>
                Cancelar
              </button>
              <button type="submit" className={cpButton.primary} disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isIncome ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                {mutation.isPending ? "Salvando..." : isIncome ? "Salvar Receita" : "Salvar Despesa"}
              </button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Financial() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [openDialog, setOpenDialog] = useState<TxType | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: string, endDate: string }>(() => ({
    startDate: toDateKey(startOfMonth(new Date())),
    endDate: toDateKey(endOfMonth(new Date())),
  }));
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('3M');

  const today = new Date();
  const lastMonth = subMonths(today, 1);
  const chartStart = startOfMonth(subMonths(today, CHART_MONTHS[chartPeriod] - 1));

  // Table, current month, previous month and chart period are separate ranges
  const { data: transactions, isLoading } = useTransactions(dateRange.startDate, dateRange.endDate);
  const { data: monthTx, isLoading: isLoadingMonth } = useTransactions(toDateKey(startOfMonth(today)), toDateKey(endOfMonth(today)));
  const { data: prevTx } = useTransactions(toDateKey(startOfMonth(lastMonth)), toDateKey(endOfMonth(lastMonth)));
  const { data: chartTx } = useTransactions(toDateKey(chartStart), toDateKey(endOfMonth(today)));

  // Fetch users for responsible dropdown
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      } catch (error) {
        // If this endpoint isn't available for this role, use the current user
        return [user];
      }
    }
  });

  const current = totals(monthTx);
  const previous = totals(prevTx);

  const chartData = Array.from({ length: CHART_MONTHS[chartPeriod] }, (_, idx) => {
    const month = subMonths(today, CHART_MONTHS[chartPeriod] - 1 - idx);
    const key = format(month, 'yyyy-MM');
    const t = totals(chartTx?.filter(tx => String(tx.date).slice(0, 7) === key));
    return { month: format(month, 'MMM', { locale: ptBR }), income: t.income, expenses: t.expenses };
  });

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />

      <div className="ml-0 flex-1 overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />

        <main className="p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader
            className="mb-6"
            title="Financeiro"
            subtitle="Gestão financeira do consultório"
            phrase
            actions={
              <>
                <button type="button" className={cpButton.secondary} onClick={() => setLocation('/cash-flow')}>
                  <BarChart3 className="h-4 w-4" />
                  Fluxo de Caixa
                </button>
                <button type="button" className={cpButton.secondary} onClick={() => setOpenDialog('expense')} data-testid="button-new-expense">
                  <Minus className="h-4 w-4 text-cp-danger" />
                  Nova Despesa
                </button>
                <button type="button" className={cpButton.primary} onClick={() => setOpenDialog('income')} data-testid="button-new-income">
                  <Plus className="h-4 w-4" />
                  Nova Receita
                </button>
              </>
            }
          />

          <TransactionDialog type="income" open={openDialog === 'income'} onOpenChange={(v) => setOpenDialog(v ? 'income' : null)} users={users} />
          <TransactionDialog type="expense" open={openDialog === 'expense'} onOpenChange={(v) => setOpenDialog(v ? 'expense' : null)} users={users} />

          {/* Resumo do mês */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard
              icon={<ArrowUpCircle className="h-6 w-6 text-cp-success" />}
              tint="bg-cp-sage-soft"
              label="Receitas do mês"
              value={isLoadingMonth ? "…" : formatBRL(current.income)}
              sub={<Change current={current.income} previous={previous.income} />}
            />
            <MetricCard
              icon={<ArrowDownCircle className="h-6 w-6 text-cp-danger" />}
              tint="bg-cp-danger-soft"
              label="Despesas do mês"
              value={isLoadingMonth ? "…" : formatBRL(current.expenses)}
              sub={<Change current={current.expenses} previous={previous.expenses} lowerIsBetter />}
            />
            <MetricCard
              icon={<Wallet className="h-6 w-6 text-cp-action" />}
              tint="bg-cp-action-soft"
              label="Lucro do mês"
              value={isLoadingMonth ? "…" : formatBRL(current.profit)}
              sub={<Change current={current.profit} previous={previous.profit} />}
            />
          </div>

          {/* Gráfico de Evolução Financeira */}
          <div className={cn(card, "mb-6 p-4 sm:p-6")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[20px] font-semibold text-cp-ink">Evolução Financeira</h3>
                <div className="mt-1 flex items-center gap-4 text-xs text-cp-muted">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors.income }} />Receitas</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors.expense }} />Despesas</span>
                </div>
              </div>
              <div className="flex gap-1.5" role="group" aria-label="Período do gráfico">
                {(Object.keys(CHART_MONTHS) as ChartPeriod[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setChartPeriod(p)}
                    aria-pressed={chartPeriod === p}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
                      chartPeriod === p ? "bg-cp-action text-white" : "border border-cp-border bg-white text-cp-muted hover:text-cp-ink",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.income} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={chartColors.income} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.expense} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColors.expense} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartColors.axis, fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={80}
                    tick={{ fill: chartColors.axis, fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                  />
                  <Tooltip
                    formatter={(value) => [formatBRL(Number(value)), undefined]}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{ borderRadius: 12, borderColor: chartColors.grid }}
                  />
                  <Area type="monotone" dataKey="income" stroke={chartColors.income} strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Receitas" />
                  <Area type="monotone" dataKey="expenses" stroke={chartColors.expense} strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" name="Despesas" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transações */}
          <div className={cn(card, "p-4 sm:p-6")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[20px] font-semibold text-cp-ink">Transações</h3>
              <div className="flex flex-wrap items-center gap-2">
                {([["De", "startDate"], ["Até", "endDate"]] as const).map(([label, key]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-cp-muted">
                    {label}:
                    <input
                      type="date"
                      className="h-10 rounded-xl border border-cp-border bg-white px-3 text-sm text-cp-ink focus:outline-none focus:ring-2 focus:ring-cp-action"
                      value={dateRange[key]}
                      onChange={(e) => setDateRange({ ...dateRange, [key]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-cp-action" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-1 text-sm">
                  <thead>
                    <tr className="bg-cp-sand-soft text-left text-[13px] text-cp-ink [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                      <th className="px-4 py-3 font-medium">Categoria</th>
                      <th className="px-4 py-3 font-medium">Responsável</th>
                      <th className="px-4 py-3 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="transition-colors hover:bg-cp-hover [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-cp-ink">{formatDate(transaction.date)}</td>
                        <td className="px-4 py-3 text-cp-ink">{transaction.description}</td>
                        <td className="px-4 py-3 text-cp-muted">{transaction.category}</td>
                        <td className="px-4 py-3 text-cp-muted">{transaction.responsible?.fullName || "—"}</td>
                        <td className={cn("whitespace-nowrap px-4 py-3 text-right font-semibold", transaction.type === 'income' ? 'text-cp-success' : 'text-cp-danger')}>
                          {transaction.type === 'income' ? '+ ' : '− '}
                          {formatBRL(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <Receipt className="mb-3 h-10 w-10 text-cp-sage" />
                <p className="text-sm font-medium text-cp-ink">Nenhuma transação no período selecionado</p>
                <p className="mt-1 text-xs text-cp-muted">Ajuste as datas ou registre uma nova receita ou despesa.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
