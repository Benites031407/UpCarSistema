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