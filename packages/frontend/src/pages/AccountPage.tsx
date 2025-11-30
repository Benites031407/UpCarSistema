import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
}

export const AccountPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'sessions' | 'subscription' | 'settings'>('overview');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-primary-600 hover:text-primary-700">
            ← Voltar ao Início
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Minha Conta</h1>
          <button
            onClick={logout}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* User Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary-600">
                {formatCurrency(user?.accountBalance || 0)}
              </div>
              <p className="text-sm text-gray-500">Saldo da Conta</p>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-700">Assinatura:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                user?.subscriptionStatus === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user?.subscriptionStatus === 'active' ? 'Ativa' : 'Nenhuma'}
              </span>
            </div>
            {user?.subscriptionStatus !== 'active' && (
              <button
                onClick={handleSubscribe}
                className="btn-primary text-sm"
              >
                Assinar (R$ 59,90/mês)
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
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
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-600'
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
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Adicionar Crédito</h3>
                  <div className="flex space-x-4">
                    <input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="Valor (R$)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={handleAddCredit}
                      disabled={addingCredit || !creditAmount}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingCredit ? 'Processando...' : 'Adicionar Crédito'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    1 R$ = 1 minuto de uso da máquina
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(user?.accountBalance || 0)}
                    </div>
                    <p className="text-blue-800 text-sm">Saldo Disponível</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {user?.subscriptionStatus === 'active' ? 'Ativa' : 'Nenhuma'}
                    </div>
                    <p className="text-green-800 text-sm">Status da Assinatura</p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {sessions.filter(s => s.status === 'completed').length}
                    </div>
                    <p className="text-purple-800 text-sm">Total de Sessões</p>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Transações</h3>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">
                            {transaction.type === 'credit_added' && 'Crédito Adicionado'}
                            {transaction.type === 'usage_payment' && 'Uso de Máquina'}
                            {transaction.type === 'subscription_payment' && 'Assinatura'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(transaction.createdAt)} • {transaction.paymentMethod.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${
                            transaction.type === 'credit_added' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit_added' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                          <div className={`text-xs ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhuma transação ainda</p>
                )}
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Uso</h3>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">
                            {session.duration} minutos • Máquina {session.machineId.slice(-6)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(session.createdAt)} • {session.paymentMethod.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {formatCurrency(session.cost)}
                          </div>
                          <div className={`text-xs ${getStatusColor(session.status)}`}>
                            {session.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum histórico de uso ainda</p>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {message && (
                  <div className={`p-4 rounded-md ${
                    message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Informações do Perfil</h3>
                    {!isEditingProfile && (
                      <button
                        onClick={() => {
                          setIsEditingProfile(true);
                          setProfileData({
                            name: user?.name || '',
                            email: user?.email || '',
                          });
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Editar Perfil
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
                        setMessage({ type: 'success', text: 'Profile updated successfully!' });
                        setIsEditingProfile(false);
                      } catch (error: any) {
                        setMessage({ 
                          type: 'error', 
                          text: error.response?.data?.error || 'Failed to update profile' 
                        });
                      } finally {
                        setLoading(false);
                      }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nome</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">E-mail</label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Nome</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">E-mail</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Informações da Conta</h4>
                  <div className="text-sm text-yellow-800 space-y-1">
                    <p>• Saldo da Conta: {formatCurrency(user?.accountBalance || 0)}</p>
                    <p>• Assinatura: {user?.subscriptionStatus === 'active' ? 'Ativa' : 'Nenhuma'}</p>
                    <p>• Tipo de Conta: Cliente</p>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Assinatura Mensal</h3>
                  <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-6 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">Acesso Ilimitado</h4>
                        <p className="text-gray-600 mt-1">Use qualquer máquina, quantas vezes quiser por dia</p>
                        <div className="mt-4">
                          <div className="text-3xl font-bold text-primary-600">R$ 59,90</div>
                          <p className="text-sm text-gray-500">por mês</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {user?.subscriptionStatus === 'active' ? (
                          <div>
                            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              Ativa
                            </div>
                            {user.subscriptionExpiry && (
                              <p className="text-xs text-gray-500 mt-1">
                                Expira: {formatDate(user.subscriptionExpiry)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={handleSubscribe}
                            className="btn-primary"
                          >
                            Assinar Agora
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Benefícios da Assinatura:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Uso ilimitado de máquinas por dia</li>
                    <li>• Sem cobrança por minuto</li>
                    <li>• Acesso prioritário em horários de pico</li>
                    <li>• Cancele quando quiser</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};