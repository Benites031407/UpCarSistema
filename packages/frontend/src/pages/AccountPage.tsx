import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/currency';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface UsageSession {
  id: string;
  machineId: string;
  duration: number;
  cost: number;
  paymentMethod: string;
  status: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  machineCode?: string;
  machineLocation?: string;
}

export const AccountPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'sessions' | 'subscription' | 'settings'>(() => {
    // Check if there's a tab specified in the location state
    const state = location.state as { tab?: string } | null;
    return (state?.tab as any) || 'overview';
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sessions, setSessions] = useState<UsageSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [addingCredit, setAddingCredit] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/history?limit=20');
      setTransactions(response.data.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions/my-sessions?limit=20');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredit = async () => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) return;

    try {
      setAddingCredit(true);
      
      // Create PIX payment for credit
      const response = await api.post('/payments/pix', {
        amount,
        description: `Account credit - ${formatCurrency(amount)}`,
      });

      // For demo purposes, simulate payment confirmation
      setTimeout(async () => {
        try {
          await api.post(`/payments/confirm/${response.data.data.pixPayment.id}`);
          await refreshUser();
          setCreditAmount('');
          if (activeTab === 'transactions') {
            fetchTransactions();
          }
        } catch (error) {
          console.error('Payment confirmation failed:', error);
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to add credit:', error);
    } finally {
      setAddingCredit(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      await api.post('/payments/subscription');
      
      // For demo purposes, simulate payment confirmation
      setTimeout(async () => {
        await refreshUser();
      }, 2000);

    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 via-orange-300 to-white relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-white/20 rounded-full -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-64 h-64 bg-white/10 rounded-full top-1/4 -right-32 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute w-80 h-80 bg-orange-600/10 rounded-full bottom-0 left-1/4 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="p-2 hover:bg-orange-700 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            
            <div className="flex items-center">
              <img 
                src="/assets/upcar-logo-preto.png" 
                alt="UpCar Aspiradores" 
                className="h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="text-white text-center"><h1 class="text-xl font-bold">UpCar</h1><p class="text-xs text-orange-100">Aspiradores</p></div>';
                  }
                }}
              />
            </div>
            
            <button
              onClick={logout}
              className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
              title="Sair"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* User Info Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 border-2 border-orange-200 animate-slide-up">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg ring-4 ring-orange-100">
                <span className="text-white font-bold text-3xl">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{user?.name}</h2>
                <p className="text-gray-600 text-sm">{user?.email}</p>
                <div className="flex items-center mt-2 space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">Conta Ativa</span>
                </div>
              </div>
            </div>
            <div className="text-right bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200">
              <p className="text-xs text-orange-700 font-semibold uppercase tracking-wide mb-1">Saldo Disponível</p>
              <div className="text-4xl font-bold text-orange-600">
                {formatCurrency(user?.accountBalance || 0)}
              </div>
              <p className="text-xs text-orange-600 mt-1">1 R$ = 1 minuto</p>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200 mt-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                user?.subscriptionStatus === 'active' 
                  ? 'bg-green-100'
                  : 'bg-gray-100'
              }`}>
                <svg className={`w-6 h-6 ${
                  user?.subscriptionStatus === 'active' 
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-700 block">Status da Assinatura</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block mt-1 ${
                  user?.subscriptionStatus === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user?.subscriptionStatus === 'active' ? '✓ Ativa - Uso Ilimitado' : 'Nenhuma Assinatura'}
                </span>
              </div>
            </div>
            {user?.subscriptionStatus !== 'active' && (
              <button
                onClick={handleSubscribe}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 transform"
              >
                Assinar Agora
                <span className="block text-xs font-normal mt-1">R$ 59,90/mês</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl mb-6 border-2 border-orange-200">
          <div className="border-b border-orange-200">
            <nav className="flex overflow-x-auto px-4 lg:px-6">
              {[
                { key: 'overview', label: 'Visão Geral' },
                { key: 'transactions', label: 'Transações' },
                { key: 'sessions', label: 'Histórico de Uso' },
                { key: 'subscription', label: 'Assinatura' },
                { key: 'settings', label: 'Configurações' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Add Credit Section */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Adicionar Crédito</h3>
                      <p className="text-sm text-orange-700">Recarregue sua conta para usar os aspiradores</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="Valor (R$)"
                      className="flex-1 px-4 py-3 border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-semibold text-lg"
                    />
                    <button
                      onClick={handleAddCredit}
                      disabled={addingCredit || !creditAmount}
                      className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transform"
                    >
                      {addingCredit ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processando...
                        </span>
                      ) : 'Adicionar Crédito'}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center text-sm text-orange-700">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">1 R$ = 1 minuto de uso do aspirador</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {formatCurrency(user?.accountBalance || 0)}
                    </div>
                    <p className="text-blue-800 text-sm font-semibold">Saldo Disponível</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {user?.subscriptionStatus === 'active' ? 'Ativa' : 'Nenhuma'}
                    </div>
                    <p className="text-green-800 text-sm font-semibold">Status da Assinatura</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {sessions.filter(s => s.status === 'completed').length}
                    </div>
                    <p className="text-purple-800 text-sm font-semibold">Total de Sessões</p>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Histórico de Transações</h3>
                </div>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Carregando transações...</p>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-all hover:shadow-md">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'credit_added' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <svg className={`w-5 h-5 ${
                              transaction.type === 'credit_added' ? 'text-green-600' : 'text-red-600'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {transaction.type === 'credit_added' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              )}
                            </svg>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {transaction.type === 'credit_added' && 'Crédito Adicionado'}
                              {transaction.type === 'usage_payment' && 'Uso de Aspirador'}
                              {transaction.type === 'subscription_payment' && 'Pagamento de Assinatura'}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2">
                              <span>{formatDate(transaction.createdAt)}</span>
                              <span>•</span>
                              <span className="font-medium">{transaction.paymentMethod.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-lg ${
                            transaction.type === 'credit_added' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit_added' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                          <div className={`text-xs font-semibold ${getStatusColor(transaction.status)}`}>
                            {transaction.status === 'completed' && '✓ Concluído'}
                            {transaction.status === 'pending' && '⏳ Pendente'}
                            {transaction.status === 'failed' && '✗ Falhou'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200">
                    <svg className="w-16 h-16 text-orange-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-orange-700 font-semibold">Nenhuma transação ainda</p>
                    <p className="text-orange-600 text-sm mt-2">Suas transações aparecerão aqui</p>
                  </div>
                )}
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Histórico de Uso</h3>
                </div>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Carregando histórico...</p>
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-all hover:shadow-md">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center space-x-2">
                              <span>{session.duration} minutos</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-orange-600">Aspirador #{session.machineCode || session.machineId.slice(-6)}</span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2 mt-1">
                              <span>{formatDate(session.createdAt)}</span>
                              {session.machineLocation && (
                                <>
                                  <span>•</span>
                                  <span>{session.machineLocation}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-medium">{session.paymentMethod.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-gray-900">
                            {formatCurrency(session.cost)}
                          </div>
                          <div className={`text-xs font-semibold ${getStatusColor(session.status)}`}>
                            {session.status === 'completed' && '✓ Concluído'}
                            {session.status === 'active' && '⏳ Em Uso'}
                            {session.status === 'pending' && '⏳ Pendente'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200">
                    <svg className="w-16 h-16 text-orange-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-orange-700 font-semibold">Nenhum histórico de uso ainda</p>
                    <p className="text-orange-600 text-sm mt-2">Use um aspirador para ver seu histórico aqui</p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {message && (
                  <div className={`p-4 rounded-md flex justify-between items-center ${
                    message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <span>{message.text}</span>
                    <button
                      onClick={() => setMessage(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Profile Information Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Informações do Perfil</h3>
                      <p className="text-sm text-gray-500 mt-1">Atualize suas informações pessoais</p>
                    </div>
                    {!isEditingProfile && (
                      <button
                        onClick={() => {
                          setIsEditingProfile(true);
                          setProfileData({
                            name: user?.name || '',
                            email: user?.email || '',
                          });
                          setMessage(null);
                        }}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                    )}
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        setLoading(true);
                        await api.put('/auth/me', profileData);
                        await refreshUser();
                        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
                        setIsEditingProfile(false);
                      } catch (error: any) {
                        setMessage({ 
                          type: 'error', 
                          text: error.response?.data?.error || 'Falha ao atualizar perfil' 
                        });
                      } finally {
                        setLoading(false);
                      }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>

                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingProfile(false);
                            setMessage(null);
                          }}
                          className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Nome</label>
                          <p className="text-base text-gray-900 font-medium">{user?.name}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">E-mail</label>
                          <p className="text-base text-gray-900 font-medium">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Change Password Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Alterar Senha</h3>
                      <p className="text-sm text-gray-500 mt-1">Mantenha sua conta segura</p>
                    </div>
                    {!isChangingPassword && (
                      <button
                        onClick={() => {
                          setIsChangingPassword(true);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: '',
                          });
                          setMessage(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Alterar Senha
                      </button>
                    )}
                  </div>

                  {isChangingPassword ? (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      
                      if (passwordData.newPassword !== passwordData.confirmPassword) {
                        setMessage({ type: 'error', text: 'As senhas não coincidem' });
                        return;
                      }

                      if (passwordData.newPassword.length < 6) {
                        setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' });
                        return;
                      }

                      try {
                        setLoading(true);
                        await api.put('/auth/password', {
                          currentPassword: passwordData.currentPassword,
                          newPassword: passwordData.newPassword,
                        });
                        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
                        setIsChangingPassword(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: '',
                        });
                      } catch (error: any) {
                        setMessage({ 
                          type: 'error', 
                          text: error.response?.data?.error || 'Falha ao alterar senha' 
                        });
                      } finally {
                        setLoading(false);
                      }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          minLength={6}
                        />
                      </div>

                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPassword(false);
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: '',
                            });
                            setMessage(null);
                          }}
                          className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Alterando...' : 'Alterar Senha'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center text-gray-600">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-sm">Sua senha está protegida</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Information */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-6">
                  <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Informações da Conta
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white/70 p-3 rounded-lg">
                      <p className="text-xs text-orange-700 font-medium">Saldo</p>
                      <p className="text-lg font-bold text-orange-900">{formatCurrency(user?.accountBalance || 0)}</p>
                    </div>
                    <div className="bg-white/70 p-3 rounded-lg">
                      <p className="text-xs text-orange-700 font-medium">Assinatura</p>
                      <p className="text-lg font-bold text-orange-900">
                        {user?.subscriptionStatus === 'active' ? 'Ativa' : 'Nenhuma'}
                      </p>
                    </div>
                    <div className="bg-white/70 p-3 rounded-lg">
                      <p className="text-xs text-orange-700 font-medium">Tipo</p>
                      <p className="text-lg font-bold text-orange-900">Cliente</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Assinatura Mensal</h3>
                </div>

                {/* Subscription Card */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-2xl shadow-2xl text-white relative overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute w-64 h-64 bg-white rounded-full -top-32 -right-32"></div>
                    <div className="absolute w-48 h-48 bg-white rounded-full -bottom-24 -left-24"></div>
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wide mb-3">
                          Plano Premium
                        </div>
                        <h4 className="text-3xl font-bold mb-2">Acesso Ilimitado</h4>
                        <p className="text-orange-100 text-sm">Use qualquer aspirador, quantas vezes quiser por dia</p>
                      </div>
                      <div className="text-right">
                        {user?.subscriptionStatus === 'active' ? (
                          <div>
                            <div className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-lg">
                              ✓ Ativa
                            </div>
                            {user.subscriptionExpiry && (
                              <p className="text-xs text-orange-100 mt-2">
                                Expira: {formatDate(user.subscriptionExpiry)}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    
                    <div className="flex items-baseline mb-6">
                      <span className="text-5xl font-bold">R$ 59,90</span>
                      <span className="text-orange-100 ml-2">/mês</span>
                    </div>

                    {user?.subscriptionStatus !== 'active' && (
                      <button
                        onClick={handleSubscribe}
                        className="w-full bg-white text-orange-600 font-bold py-4 px-6 rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 transform"
                      >
                        Assinar Agora
                      </button>
                    )}
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6">
                  <h4 className="font-bold text-orange-900 mb-4 flex items-center text-lg">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Benefícios da Assinatura
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex items-start text-orange-800">
                      <svg className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span><strong>Uso ilimitado</strong> de aspiradores por dia</span>
                    </li>
                    <li className="flex items-start text-orange-800">
                      <svg className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span><strong>Sem cobrança</strong> por minuto de uso</span>
                    </li>
                    <li className="flex items-start text-orange-800">
                      <svg className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span><strong>Acesso prioritário</strong> em horários de pico</span>
                    </li>
                    <li className="flex items-start text-orange-800">
                      <svg className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span><strong>Cancele quando quiser</strong>, sem multas</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add custom animations */}
      <style>{`
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};