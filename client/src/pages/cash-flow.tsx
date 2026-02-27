import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  FileDown, 
  Filter, 
  ArrowUp, 
  ArrowDown, 
  Calendar, 
  Plus,
  BarChart3,
  X
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CashFlow() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{startDate: string, endDate: string}>(() => {
    const today = new Date();
    const startDate = startOfMonth(today);
    const endDate = endOfMonth(today);
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState<boolean>(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [transactionForm, setTransactionForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    category: '',
    amount: '',
  });

  // Fetch transactions with date range
  const { 
    data: transactions, 
    isLoading,
    isError
  } = useQuery({
    queryKey: ['/api/transactions', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    }
  });

  // Define income and expense categories for filtering
  const incomeCategories = [
    'Consulta',
    'Avaliação',
    'Sessão em Grupo',
    'Workshop',
    'Outro'
  ];

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

  // Combined categories for filtering
  const allCategories = [...incomeCategories, ...expenseCategories];

  // Calculate financial summary
  const calculateSummary = () => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        formattedIncome: 'R$ 0,00',
        formattedExpense: 'R$ 0,00',
        formattedBalance: 'R$ 0,00',
        incomeByCategory: {},
        expenseByCategory: {},
        incomeByCategoryArray: [],
        expenseByCategoryArray: []
      };
    }

    // Filter transactions based on selected type
    const filteredTransactions = transactions.filter(t => {
      if (selectedType === "all") return true;
      return t.type === selectedType;
    });

    // Calculate totals
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const balance = totalIncome - totalExpense;

    // Format for display
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // Calculate income by category
    const incomeByCategory: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        const category = t.category || 'Sem categoria';
        incomeByCategory[category] = (incomeByCategory[category] || 0) + Number(t.amount);
      });

    // Calculate expense by category
    const expenseByCategory: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const category = t.category || 'Sem categoria';
        expenseByCategory[category] = (expenseByCategory[category] || 0) + Number(t.amount);
      });

    // Transform to array for charts
    const incomeByCategoryArray = Object.entries(incomeByCategory).map(([name, value]) => ({
      name,
      value
    }));

    const expenseByCategoryArray = Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value
    }));

    return {
      totalIncome,
      totalExpense,
      balance,
      formattedIncome: formatter.format(totalIncome),
      formattedExpense: formatter.format(totalExpense),
      formattedBalance: formatter.format(balance),
      incomeByCategory,
      expenseByCategory,
      incomeByCategoryArray,
      expenseByCategoryArray
    };
  };

  // Process data for daily cash flow chart
  const prepareDailyFlowData = () => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Get all unique dates within range
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    const dateMap = new Map();
    
    // Initialize all dates in range with zero values
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      dateMap.set(dateStr, { date: dateStr, income: 0, expense: 0, balance: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Fill in actual transaction data
    transactions.forEach(transaction => {
      const transactionDate = format(new Date(transaction.date), 'yyyy-MM-dd');
      
      if (dateMap.has(transactionDate)) {
        const existingData = dateMap.get(transactionDate);
        
        if (transaction.type === 'income') {
          existingData.income += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
          existingData.expense += Number(transaction.amount);
        }
        
        existingData.balance = existingData.income - existingData.expense;
        dateMap.set(transactionDate, existingData);
      }
    });
    
    // Convert map to array and sort by date
    const dailyData = Array.from(dateMap.values());
    dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calcular saldo acumulado (cumulativo)
    let accumulatedBalance = 0;
    const dataWithAccumulatedBalance = dailyData.map(item => {
      accumulatedBalance += item.balance;
      return {
        ...item,
        displayDate: format(new Date(item.date), 'dd/MM'),
        // Substituir o saldo diário pelo saldo acumulado
        balance: accumulatedBalance
      };
    });
    
    return dataWithAccumulatedBalance;
  };

  // Filter transactions based on selected categories and type
  const getFilteredTransactions = () => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      // Apply type filter
      if (selectedType !== "all" && transaction.type !== selectedType) {
        return false;
      }
      
      // Apply category filter if any categories are selected
      if (selectedCategories.length > 0 && !selectedCategories.includes(transaction.category)) {
        return false;
      }
      
      return true;
    });
  };

  // Calculate data for summary
  const summary = calculateSummary();
  const dailyFlowData = prepareDailyFlowData();
  const filteredTransactions = getFilteredTransactions();

  // Formatting helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  // Handler functions for transaction form
  const handleTransactionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTransactionForm({
      ...transactionForm,
      [name]: name === 'amount' ? value.replace(/[^0-9.,]/g, '') : value,
    });
  };

  const handleAddTransaction = async () => {
    // Validação básica
    if (!transactionForm.description || !transactionForm.category || !transactionForm.amount || !transactionForm.date) {
      console.log('Formulário incompleto:', transactionForm);
      toast({
        title: "Formulário incompleto",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Prepare payload (convertendo para o formato correto)
      const amount = parseFloat(transactionForm.amount.replace(',', '.'));
      
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Valor inválido",
          description: "Por favor, informe um valor válido maior que zero.",
          variant: "destructive"
        });
        return;
      }
      
      const payload = {
        ...transactionForm,
        amount,
        type: transactionType,
      };

      console.log('Enviando payload:', payload);

      // Enviar para API
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Resposta da API:', res.status, res.statusText);

      if (res.ok) {
        const responseData = await res.json();
        console.log('Transação criada:', responseData);
        
        // Atualiza a lista de transações
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        
        // Resetar form e fechar modal
        setTransactionForm({
          date: format(new Date(), 'yyyy-MM-dd'),
          description: '',
          category: '',
          amount: '',
        });
        setIsAddTransactionOpen(false);
        
        toast({
          title: "Sucesso!",
          description: `${transactionType === 'income' ? 'Receita' : 'Despesa'} registrada com sucesso.`,
          variant: "default"
        });
      } else {
        const errorData = await res.json();
        console.error('Erro da API:', errorData);
        throw new Error(errorData.message || "Falha ao registrar transação");
      }
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao registrar a transação. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  // For category pie charts
  // Mapeamento de cores por categoria para melhor consistência visual
  const categoryColors: Record<string, string> = {
    // Receitas
    'Consulta': '#4CAF50',
    'Avaliação': '#8BC34A',
    'Sessão em Grupo': '#CDDC39',
    'Workshop': '#FFC107',
    'Outro': '#FF9800',
    
    // Despesas
    'Aluguel': '#F44336',
    'Água': '#2196F3',
    'Luz': '#FFEB3B',
    'Internet': '#9C27B0',
    'Material de Escritório': '#FF5722',
    'Limpeza': '#00BCD4',
    'Manutenção': '#795548',
    'Salários': '#E91E63',
    'Marketing': '#673AB7',
    'Impostos': '#607D8B'
  };
  
  // Cores padrão para categorias que não estejam no mapeamento
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', 
    '#5DADE2', '#45B39D', '#F4D03F', '#EB984E', '#EC7063'
  ];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral-lightest">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
          <MobileNav />
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      
      <div className="flex-1 overflow-x-hidden overflow-y-auto ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {/* Header com título */}
          <div className="flex flex-col mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-neutral-darkest">Fluxo de Caixa</h1>
                <p className="text-neutral-dark">Análise detalhada das receitas e despesas</p>
              </div>
              <div className="hidden md:flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/financial")} className="h-8 px-3">
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                  <span className="text-xs">Voltar</span>
                </Button>
              </div>
            </div>
            
            {/* Ações separadas em linha própria */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <Button 
                variant="default" 
                size="sm"
                className="bg-green-600 hover:bg-green-700 h-9 text-xs" 
                onClick={() => {
                  setIsAddTransactionOpen(true);
                  setTransactionType('income');
                }}
              >
                <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
                Registrar Entrada
              </Button>
              
              <Button 
                variant="default" 
                size="sm"
                className="bg-red-600 hover:bg-red-700 h-9 text-xs" 
                onClick={() => {
                  setIsAddTransactionOpen(true);
                  setTransactionType('expense');
                }}
              >
                <ArrowUp className="mr-1.5 h-3.5 w-3.5" />
                Registrar Saída
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 text-xs"
                onClick={() => {
                  // Preparar os dados para exportação
                  if (filteredTransactions.length === 0) {
                    toast({
                      title: "Sem dados",
                      description: "Não há transações para exportar no período selecionado",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  // Preparar cabeçalho e linhas para CSV
                  const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor"];
                  const csvData = filteredTransactions.map(t => [
                    formatDate(t.date),
                    t.description,
                    t.category,
                    t.type === 'income' ? 'Receita' : 'Despesa',
                    formatCurrency(Number(t.amount))
                  ]);
                  
                  // Juntar tudo em uma string CSV
                  const csvContent = [
                    headers.join(','),
                    ...csvData.map(row => row.join(','))
                  ].join('\n');
                  
                  // Criar blob e link para download
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  
                  // Configurar e clicar no link para iniciar o download
                  link.setAttribute('href', url);
                  link.setAttribute('download', `fluxo-caixa-${dateRange.startDate}-a-${dateRange.endDate}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
                  toast({
                    title: "Sucesso",
                    description: "Relatório CSV exportado com sucesso",
                    variant: "default"
                  });
                }}
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
                Exportar CSV
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/transactions/generate-sample-data', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    if (res.ok) {
                      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
                      toast({
                        title: "Sucesso",
                        description: "Dados de exemplo criados com sucesso",
                        variant: "default"
                      });
                      
                      // Recarrega a página para mostrar os novos dados
                      setTimeout(() => window.location.reload(), 1000);
                    } else {
                      toast({
                        title: "Erro",
                        description: "Falha ao criar dados de exemplo",
                        variant: "destructive"
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Erro",
                      description: "Falha ao criar dados de exemplo",
                      variant: "destructive"
                    });
                  }
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Gerar Exemplos
              </Button>
            </div>
            
            {/* Botão de voltar apenas para mobile */}
            <div className="flex md:hidden items-center mb-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/financial")} className="w-full h-8">
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                <span className="text-xs">Voltar ao Financeiro</span>
              </Button>
            </div>
          </div>
          
          {/* Filter Controls */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Filtros</CardTitle>
              <CardDescription>Selecione o período e categorias para análise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-dark mb-1">De:</span>
                    <Input 
                      type="date" 
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      className="w-36"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-dark mb-1">Até:</span>
                    <Input 
                      type="date" 
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      className="w-36"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex flex-col w-full md:w-40">
                    <span className="text-sm text-neutral-dark mb-1">Tipo:</span>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="income">Receitas</SelectItem>
                        <SelectItem value="expense">Despesas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button variant="outline" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Mais Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <ArrowDown className="h-5 w-5 mr-2 text-blue-500" />
                  Entradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{summary.formattedIncome}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <ArrowUp className="h-5 w-5 mr-2 text-red-500" />
                  Saídas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{summary.formattedExpense}</p>
              </CardContent>
            </Card>
            
            <Card className={`
              ${summary.balance >= 0 
                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' 
                : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'}
            `}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className={`h-5 w-5 mr-2 ${summary.balance >= 0 ? 'text-green-500' : 'text-orange-500'}`} />
                  {summary.balance >= 0 ? 'Saldo Positivo' : 'Saldo Negativo'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {summary.formattedBalance}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="space-y-6">
            {/* Daily Cash Flow Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fluxo de Caixa Diário</CardTitle>
                <CardDescription>Evolução de receitas, despesas e saldo acumulado no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  {dailyFlowData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dailyFlowData}
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="displayDate"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => formatCurrency(value).replace('R$', '').trim()}
                        />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), '']}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Legend />
                        <Bar 
                          name="Receitas" 
                          dataKey="income" 
                          fill="#4CAF50" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          name="Despesas" 
                          dataKey="expense" 
                          fill="#F44336" 
                          radius={[4, 4, 0, 0]} 
                        />
                        <Bar 
                          name="Saldo Acumulado" 
                          dataKey="balance" 
                          fill="#673AB7" 
                          radius={[4, 4, 0, 0]} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-neutral-dark">Sem dados para exibir</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Category Distribution Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Income by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Receitas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-40 w-full">
                      {summary.incomeByCategoryArray.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={summary.incomeByCategoryArray}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {summary.incomeByCategoryArray.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={categoryColors[entry.name] || COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-neutral-dark">Sem dados para exibir</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col justify-center">
                      {summary.incomeByCategoryArray.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {summary.incomeByCategoryArray.map((entry, index) => (
                            <div key={`legend-${index}`} className="flex items-center">
                              <div 
                                className="w-3 h-3 mr-2 rounded-sm" 
                                style={{ backgroundColor: categoryColors[entry.name] || COLORS[index % COLORS.length] }}
                              />
                              <span className="text-xs flex-1">{entry.name}</span>
                              <span className="text-xs font-semibold">{formatCurrency(Number(entry.value))}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-neutral-dark text-xs">Sem categorias para exibir</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Expense by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-40 w-full">
                      {summary.expenseByCategoryArray.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={summary.expenseByCategoryArray}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {summary.expenseByCategoryArray.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={categoryColors[entry.name] || COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-neutral-dark">Sem dados para exibir</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col justify-center">
                      {summary.expenseByCategoryArray.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {summary.expenseByCategoryArray.map((entry, index) => (
                            <div key={`legend-${index}`} className="flex items-center">
                              <div 
                                className="w-3 h-3 mr-2 rounded-sm" 
                                style={{ backgroundColor: categoryColors[entry.name] || COLORS[index % COLORS.length] }}
                              />
                              <span className="text-xs flex-1">{entry.name}</span>
                              <span className="text-xs font-semibold">{formatCurrency(Number(entry.value))}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-neutral-dark text-xs">Sem categorias para exibir</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transações Detalhadas</CardTitle>
              <CardDescription>Lista completa de todas as transações no período</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{transaction.category}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              transaction.type === 'income' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                            </span>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(Number(transaction.amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-neutral-dark">Nenhuma transação encontrada no período selecionado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Modal para adicionar nova transação */}
        <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {transactionType === 'income' 
                  ? 'Registrar Nova Entrada' 
                  : 'Registrar Nova Saída'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da {transactionType === 'income' ? 'receita' : 'despesa'} abaixo.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Data
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={transactionForm.date}
                  onChange={handleTransactionFormChange}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descrição
                </Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Descrição da transação"
                  value={transactionForm.description}
                  onChange={handleTransactionFormChange}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Categoria
                </Label>
                <Select 
                  name="category" 
                  value={transactionForm.category}
                  onValueChange={(value) => setTransactionForm({...transactionForm, category: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionType === 'income' ? (
                      incomeCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))
                    ) : (
                      expenseCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Valor (R$)
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  placeholder="0,00"
                  value={transactionForm.amount}
                  onChange={handleTransactionFormChange}
                  className="col-span-3"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddTransaction}
                className={transactionType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {transactionType === 'income' ? 'Registrar Entrada' : 'Registrar Saída'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}