import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/currency';

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

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<UsageSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions/my-sessions?limit=100');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
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
        return 'text-green-600';
      case 'active':
        return 'text-blue-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓ Concluído';
      case 'active':
        return '⏳ Em Uso';
      case 'pending':
        return '⏳ Pendente';
      default:
        return status;
    }
  };

  // Calculate stats
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalSpent = sessions.reduce((sum, s) => sum + s.cost, 0);

  // Pagination
  const totalPages = Math.ceil(sessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSessions = sessions.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-400 relative overflow-hidden">
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
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Histórico de Uso</h2>
              <p className="text-sm text-gray-600">Veja todas as suas sessões de aspiração</p>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center border-2 border-gray-200">
              <p className="text-2xl font-bold text-gray-900 mb-1">{totalSessions}</p>
              <p className="text-xs text-gray-600">Total de Sessões</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center border-2 border-gray-200">
              <p className="text-2xl font-bold text-gray-900 mb-1">{completedSessions}</p>
              <p className="text-xs text-gray-600">Concluídas</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center border-2 border-gray-200">
              <p className="text-2xl font-bold text-gray-900 mb-1">{totalMinutes}</p>
              <p className="text-xs text-gray-600">Total de Minutos</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center border-2 border-gray-200">
              <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-gray-600">Total Gasto</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-6"></div>

          {/* Sessions List */}
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando histórico...</p>
              </div>
            ) : sessions.length > 0 ? (
              <>
                <div className="space-y-3">
                  {currentSessions.map((session) => (
                    <div key={session.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-all hover:shadow-md">
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center space-x-2">
                          <span>{session.duration} minutos</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-orange-600">Aspirador #{session.machineCode || session.machineId.slice(-6)}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-2 mt-1 flex-wrap">
                          <span>{formatDate(session.createdAt)}</span>
                          {session.machineLocation && (
                            <>
                              <span>•</span>
                              <span>{session.machineLocation}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-gray-900">
                          {formatCurrency(session.cost)}
                        </div>
                        <div className={`text-xs font-semibold ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-orange-700 font-semibold text-lg">Nenhum histórico de uso ainda</p>
                <p className="text-orange-600 text-sm mt-2">Use um aspirador para ver seu histórico aqui</p>
                <Link 
                  to="/" 
                  className="inline-block mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
                >
                  Usar Aspirador Agora
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
