import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTransactionSchema } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent
} from "@/components/ui/card";
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
  ArrowUp, 
  ArrowDown, 
  Filter, 
  Calendar, 
  CreditCard, 
  User, 
  DollarSign,
  BarChart3
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

// Transaction form schema
const transactionFormSchema = insertTransactionSchema.extend({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório").refine(val => !isNaN(parseFloat(val)), {
    message: "Valor deve ser um número válido"
  }),
  date: z.string().min(1, "Data é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNewIncomeDialogOpen, setIsNewIncomeDialogOpen] = useState(false);
  const [isNewExpenseDialogOpen, setIsNewExpenseDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{startDate: string, endDate: string}>(() => {
    const today = new Date();
    const startDate = startOfMonth(today);
    const endDate = endOfMonth(today);
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  });
  const [chartPeriod, setChartPeriod] = useState<'1M' | '3M' | '6M' | '1A'>('3M');

  // Income categories
  const incomeCategories = [
    'Consulta',
    'Avaliação',
    'Sessão em Grupo',
    'Workshop',
    'Outro'
  ];

  // Expense categories
  const expenseCategories = [
    'Aluguel',
    'Água',
    'Luz',
    'Internet',
    'Material de Escritório',
    'Limpeza',
    'Manutenção',
    'Salários',
    'Marketing',
    'Impostos',
    'Outro'
  ];

  // Fetch transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/transactions', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    }
  });

  // Fetch users for responsible dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      } catch (error) {
        // If this endpoint doesn't exist, use the current user
        return [user];
      }
    }
  });

  // Income form
  const incomeForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      description: "",
      amount: "",
      type: "income",
      category: "",
      date: new Date().toISOString().split('T')[0],
      responsibleId: user?.id || 0,
      relatedAppointmentId: undefined
    }
  });

  // Expense form
  const expenseForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      description: "",
      amount: "",
      type: "expense",
      category: "",
      date: new Date().toISOString().split('T')[0],
      responsibleId: user?.id || 0,
      relatedAppointmentId: undefined
    }
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      const response = await apiRequest("POST", "/api/transactions", {
        ...data,
        amount: parseFloat(data.amount),
        responsibleId: Number(data.responsibleId)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "Transação criada",
        description: "A transação foi registrada com sucesso.",
        variant: "default",
      });
      setIsNewIncomeDialogOpen(false);
      setIsNewExpenseDialogOpen(false);
      incomeForm.reset();
      expenseForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao registrar transação: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle income form submission
  const onIncomeSubmit = (data: TransactionFormValues) => {
    createTransactionMutation.mutate(data);
  };

  // Handle expense form submission
  const onExpenseSubmit = (data: TransactionFormValues) => {
    createTransactionMutation.mutate(data);
  };

  // Calculate financial summary
  const calculateFinancialSummary = () => {
    if (!transactions || transactions.length === 0) {
      return {
        income: 0,
        expenses: 0,
        profit: 0,
        formattedIncome: 'R$ 0,00',
        formattedExpenses: 'R$ 0,00',
        formattedProfit: 'R$ 0,00',
        incomeChange: 0,
        expenseChange: 0,
        profitChange: 0
      };
    }
    
    // Calculate totals for current period
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const profit = income - expenses;
    
    // Format for display
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    
    // Simulate month-over-month change for demo purposes
    // In a real app, this would be calculated from historical data
    const incomeChange = 8;
    const expenseChange = -3;
    const profitChange = 12;
    
    return {
      income,
      expenses,
      profit,
      formattedIncome: formatter.format(income),
      formattedExpenses: formatter.format(expenses),
      formattedProfit: formatter.format(profit),
      incomeChange,
      expenseChange,
      profitChange
    };
  };

  // Prepare chart data
  const prepareChartData = () => {
    // Define the number of months back to include in the chart
    let monthsBack = 3;
    switch (chartPeriod) {
      case '1M': monthsBack = 1; break;
      case '3M': monthsBack = 3; break;
      case '6M': monthsBack = 6; break;
      case '1A': monthsBack = 12; break;
    }
    
    // Generate data for the past few months
    const chartData = [];
    const today = new Date();
    
    // Para cada mês no período selecionado
    for (let i = monthsBack - 1; i >= 0; i--) {
      const month = subMonths(today, i);
      const monthName = format(month, 'MMM', { locale: ptBR });
      
      // Inicializa valores zerados
      let income = 0;
      let expenses = 0;
      
      // Se temos transações, calcular totais por mês
      if (transactions && transactions.length > 0) {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        
        // Filtra transações por mês
        const monthTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.date);
          return transactionDate >= monthStart && transactionDate <= monthEnd;
        });
        
        // Calcula receitas e despesas
        income = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0);
          
        expenses = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);
      }
      
      chartData.push({
        month: monthName,
        income,
        expenses
      });
    }
    
    return chartData;
  };

  // Calculate financial summary and chart data
  const financialSummary = calculateFinancialSummary();
  const chartData = prepareChartData();

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  // Loading state
  const isPageLoading = isLoading || isLoadingUsers;

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      
      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {/* Financial Header */}
          <div className="flex flex-col mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-neutral-darkest">Financeiro</h1>
                <p className="text-neutral-dark">Gestão financeira do consultório</p>
              </div>
            </div>
            
            {/* Ações separadas em linha própria */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/cash-flow'}
                className="h-9 text-xs"
              >
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                Fluxo de Caixa
              </Button>
              
              <Dialog open={isNewIncomeDialogOpen} onOpenChange={setIsNewIncomeDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 h-9 text-xs"
                    size="sm"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Nova Receita
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-lg w-full overflow-y-auto sm:max-w-md"
                  style={{ paddingBottom: '1.5rem' }}>
                  <DialogHeader>
                    <DialogTitle>Nova Receita</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes para registrar uma nova receita.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...incomeForm}>
                    <form onSubmit={incomeForm.handleSubmit(onIncomeSubmit)} className="space-y-4 mt-4">
                      <FormField
                        control={incomeForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Consulta - João da Silva" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={incomeForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor</FormLabel>
                              <FormControl>
                                <Input type="text" placeholder="Ex: 200.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={incomeForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={incomeForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categoria</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma categoria" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {incomeCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={incomeForm.control}
                          name="responsibleId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Responsável</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(parseInt(value))} 
                                defaultValue={user?.id?.toString() || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um responsável" />
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <DialogFooter className="mt-6 pt-4 border-t">
                        <Button 
                          type="submit" 
                          className="bg-green-600 hover:bg-green-700 w-full"
                          disabled={createTransactionMutation.isPending}
                          size="lg"
                        >
                          {createTransactionMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            "Salvar Receita"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isNewExpenseDialogOpen} onOpenChange={setIsNewExpenseDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-red-600 hover:bg-red-700 h-9 text-xs"
                    size="sm"
                  >
                    <Minus className="mr-1.5 h-3.5 w-3.5" />
                    Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-lg w-full overflow-y-auto sm:max-w-md"
                  style={{ paddingBottom: '1.5rem' }}>
                  <DialogHeader>
                    <DialogTitle>Nova Despesa</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes para registrar uma nova despesa.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...expenseForm}>
                    <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4 mt-4">
                      <FormField
                        control={expenseForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Pagamento Aluguel" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={expenseForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor</FormLabel>
                              <FormControl>
                                <Input type="text" placeholder="Ex: 3500.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={expenseForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={expenseForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categoria</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma categoria" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {expenseCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={expenseForm.control}
                          name="responsibleId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Responsável</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(parseInt(value))} 
                                defaultValue={user?.id?.toString() || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um responsável" />
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <DialogFooter className="mt-6 pt-4 border-t">
                        <Button 
                          type="submit" 
                          className="bg-red-600 hover:bg-red-700 w-full"
                          disabled={createTransactionMutation.isPending}
                          size="lg"
                        >
                          {createTransactionMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            "Salvar Despesa"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {isPageLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Resumo Financeiro */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {/* Receitas */}
                <Card className="border-l-4 border-success">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-neutral-dark text-sm">Receitas do Mês</p>
                        <h3 className="text-2xl font-bold text-neutral-darkest">
                          {financialSummary.formattedIncome}
                        </h3>
                      </div>
                      <div className="rounded-full bg-success/10 p-3">
                        <ArrowUp className="text-xl text-success" />
                      </div>
                    </div>
                    <div className="mt-4 text-xs flex items-center text-success">
                      <ArrowUp className="mr-1 h-3 w-3" />
                      <span>{financialSummary.incomeChange}% acima do mês anterior</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Despesas */}
                <Card className="border-l-4 border-error">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-neutral-dark text-sm">Despesas do Mês</p>
                        <h3 className="text-2xl font-bold text-neutral-darkest">
                          {financialSummary.formattedExpenses}
                        </h3>
                      </div>
                      <div className="rounded-full bg-error/10 p-3">
                        <ArrowDown className="text-xl text-error" />
                      </div>
                    </div>
                    <div className="mt-4 text-xs flex items-center text-success">
                      <ArrowDown className="mr-1 h-3 w-3" />
                      <span>{Math.abs(financialSummary.expenseChange)}% abaixo do mês anterior</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Lucro */}
                <Card className="border-l-4 border-primary">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-neutral-dark text-sm">Lucro do Mês</p>
                        <h3 className="text-2xl font-bold text-neutral-darkest">
                          {financialSummary.formattedProfit}
                        </h3>
                      </div>
                      <div className="rounded-full bg-primary/10 p-3">
                        <DollarSign className="text-xl text-primary" />
                      </div>
                    </div>
                    <div className="mt-4 text-xs flex items-center text-success">
                      <ArrowUp className="mr-1 h-3 w-3" />
                      <span>{financialSummary.profitChange}% acima do mês anterior</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Gráfico de Evolução Financeira */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-neutral-darkest">Evolução Financeira</h3>
                  <div className="flex space-x-2">
                    <button 
                      className={`px-3 py-1 border rounded-md text-sm ${
                        chartPeriod === '1M' 
                          ? 'border-primary text-primary bg-primary bg-opacity-5' 
                          : 'border-neutral-light text-neutral-dark hover:bg-neutral-lightest'
                      }`}
                      onClick={() => setChartPeriod('1M')}
                    >
                      1M
                    </button>
                    <button 
                      className={`px-3 py-1 border rounded-md text-sm ${
                        chartPeriod === '3M' 
                          ? 'border-primary text-primary bg-primary bg-opacity-5' 
                          : 'border-neutral-light text-neutral-dark hover:bg-neutral-lightest'
                      }`}
                      onClick={() => setChartPeriod('3M')}
                    >
                      3M
                    </button>
                    <button 
                      className={`px-3 py-1 border rounded-md text-sm ${
                        chartPeriod === '6M' 
                          ? 'border-primary text-primary bg-primary bg-opacity-5' 
                          : 'border-neutral-light text-neutral-dark hover:bg-neutral-lightest'
                      }`}
                      onClick={() => setChartPeriod('6M')}
                    >
                      6M
                    </button>
                    <button 
                      className={`px-3 py-1 border rounded-md text-sm ${
                        chartPeriod === '1A' 
                          ? 'border-primary text-primary bg-primary bg-opacity-5' 
                          : 'border-neutral-light text-neutral-dark hover:bg-neutral-lightest'
                      }`}
                      onClick={() => setChartPeriod('1A')}
                    >
                      1A
                    </button>
                  </div>
                </div>
                
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F44336" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#F44336" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                      />
                      <Tooltip
                        formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, undefined]}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stroke="#4CAF50" 
                        fillOpacity={1} 
                        fill="url(#colorIncome)" 
                        name="Receitas"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="#F44336" 
                        fillOpacity={1} 
                        fill="url(#colorExpenses)" 
                        name="Despesas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Transações Recentes */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-neutral-darkest">Transações Recentes</h3>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-neutral-dark">De:</label>
                      <input 
                        type="date" 
                        className="border border-neutral-light rounded-md p-2 text-sm"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-neutral-dark">Até:</label>
                      <input 
                        type="date" 
                        className="border border-neutral-light rounded-md p-2 text-sm"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-neutral-light">
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Data</th>
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Descrição</th>
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Categoria</th>
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Responsável</th>
                        <th className="py-3 text-right text-xs font-semibold text-neutral-dark">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions && transactions.length > 0 ? (
                        transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b border-neutral-light hover:bg-neutral-lightest">
                            <td className="py-3 text-sm font-medium text-neutral-darkest">
                              {formatDate(transaction.date)}
                            </td>
                            <td className="py-3 text-sm text-neutral-darkest">
                              {transaction.description}
                            </td>
                            <td className="py-3 text-sm text-neutral-darkest">
                              {transaction.category}
                            </td>
                            <td className="py-3 text-sm text-neutral-darkest">
                              {transaction.responsible?.fullName || "Admin"}
                            </td>
                            <td className={`py-3 text-sm font-medium text-right ${
                              transaction.type === 'income' ? 'text-success' : 'text-error'
                            }`}>
                              {transaction.type === 'income' ? '+ ' : '- '}
                              {formatCurrency(parseFloat(transaction.amount.toString()))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-neutral-dark">
                            Nenhuma transação encontrada no período selecionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
