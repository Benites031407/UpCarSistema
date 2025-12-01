import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { formatCurrency } from '../utils/currency';
import { useRealtimeSession } from '../hooks/useRealtimeSession';

interface Machine {
  id: string;
  code: string;
  location: string;
  status: string;
  operatingHours: {
    start: string;
    end: string;
  };
  temperature?: number;
}

interface Availability {
  available: boolean;
  status: string;
  withinOperatingHours: boolean;
  operatingHours: {
    start: string;
    end: string;
  };
  maintenanceRequired: boolean;
}

export const MachineActivationPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [duration, setDuration] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'pix' | 'mixed'>('pix');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [showStopModal, setShowStopModal] = useState(false);

  // Real-time session monitoring
  const {
    sessionData: realtimeSession,
    formattedTimeRemaining,
    progress,
    isConnected: wsConnected
  } = useRealtimeSession(session?.id);

  useEffect(() => {
    if (code) {
      fetchMachineInfo();
    }
  }, [code]);

  const fetchMachineInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/machines/code/${code}`);
      setMachine(response.data.machine);
      setAvailability(response.data.availability);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Machine not found');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodChange = (method: 'balance' | 'pix' | 'mixed', data?: any) => {
    setPaymentMethod(method);
    setPaymentData(data);
  };

  const handleActivation = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!machine || !availability?.available) {
      setError('Machine is not available for activation');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      console.log('Creating session:', { machineId: machine.id, duration, paymentMethod });

      // Create session
      const sessionResponse = await api.post('/sessions/create', {
        machineId: machine.id,
        duration,
        paymentMethod,
      });

      const sessionData = sessionResponse.data.session;
      console.log('Session created:', sessionData);
      setSession(sessionData);

      // Handle payment based on method
      if (paymentMethod === 'balance') {
        // Activate immediately for balance payment
        await api.post(`/sessions/${sessionData.id}/activate`);
        setSession({ ...sessionData, status: 'active' });
      } else if (paymentMethod === 'pix') {
        // Create PIX payment
        const pixResponse = await api.post('/payments/pix', {
          amount: duration,
          description: `Machine usage - ${machine.location} (${duration} minutes)`,
          externalReference: sessionData.id,
        });

        // For demo purposes, we'll simulate payment confirmation
        // In production, this would be handled by webhooks
        setTimeout(async () => {
          try {
            await api.post(`/sessions/${sessionData.id}/confirm-payment`, {
              paymentId: pixResponse.data.data.pixPayment.id,
            });
            setSession({ ...sessionData, status: 'active' });
          } catch (error) {
            console.error('Payment confirmation failed:', error);
          }
        }, 3000);
      } else if (paymentMethod === 'mixed') {
        // Handle mixed payment
        await api.post('/payments/mixed', {
          totalAmount: duration,
          balanceAmount: paymentData.balanceAmount,
          description: `Machine usage - ${machine.location} (${duration} minutes)`,
        });

        // Activate session after mixed payment
        await api.post(`/sessions/${sessionData.id}/activate`);
        setSession({ ...sessionData, status: 'active' });
      }

    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to activate machine');
    } finally {
      setProcessing(false);
    }
  };

  const handleStopClick = () => {
    setError(''); // Clear any previous errors
    setShowStopModal(true);
  };

  const handleConfirmStop = async () => {
    if (!session) return;

    try {
      setProcessing(true);
      setError('');
      
      const response = await api.post(`/sessions/${session.id}/terminate`);
      
      if (response.data.success) {
        // Update session to completed
        setSession({ ...session, status: 'completed' });
        setShowStopModal(false);
        
        // Show success message
        console.log('Session terminated successfully:', response.data);
      } else {
        throw new Error('Failed to terminate session');
      }
    } catch (error: any) {
      console.error('Termination error:', error);
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to terminate session');
      // Keep modal open to show error
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelStop = () => {
    setShowStopModal(false);
    setError(''); // Clear any errors when cancelling
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando informações do aspirador...</p>
        </div>
      </div>
    );
  }

  if (error && !machine) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-red-900 mb-2">Aspirador Não Encontrado</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Link to="/" className="btn-primary">
              Voltar para Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 via-orange-300 to-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-orange-600 hover:text-orange-700 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            
            <img 
              src="/assets/upcar-logo.png" 
              alt="UpCar" 
              className="h-10 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            
            <div className="w-6"></div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-20">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}
        {/* Activation Form - Initial State */}
        {!session && availability?.available && user && (
          <div className="space-y-6">
            {/* Machine Info */}
            {machine && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{machine.location}</h2>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Disponível
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Código: <span className="font-mono font-bold text-gray-900">{code}</span>
                </div>
                {machine.temperature && (
                  <div className="text-sm text-gray-600 mt-1">
                    Temperatura: {machine.temperature}°C
                  </div>
                )}
              </div>
            )}

            {/* Time Selection */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Selecione o Tempo de Uso
              </h3>
              
              {/* Quick Select Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[5, 10, 15, 20].map((time) => (
                  <button
                    key={time}
                    onClick={() => setDuration(time)}
                    disabled={processing}
                    className={`
                      py-3 px-2 rounded-xl font-bold text-sm transition-all
                      ${duration === time
                        ? 'bg-orange-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${processing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {time} min
                  </button>
                ))}
              </div>

              {/* Custom Time Input */}
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Ou escolha um tempo personalizado
                </label>
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => setDuration(Math.max(1, duration - 1))}
                    disabled={processing || duration <= 1}
                    className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg font-bold text-xl text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    −
                  </button>
                  <div className="flex-1 max-w-[120px]">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={duration}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 30) {
                          setDuration(value);
                        }
                      }}
                      disabled={processing}
                      className="w-full text-center text-3xl font-bold text-orange-600 bg-white border-2 border-orange-300 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
                    />
                    <p className="text-center text-xs text-gray-500 mt-1">minutos</p>
                  </div>
                  <button
                    onClick={() => setDuration(Math.min(30, duration + 1))}
                    disabled={processing || duration >= 30}
                    className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg font-bold text-xl text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Máximo: 30 minutos
                </p>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border-2 border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-orange-800 font-medium">Tempo Selecionado</p>
                  <p className="text-2xl font-bold text-orange-900">{duration} minutos</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-orange-800 font-medium">Custo Total</p>
                  <p className="text-3xl font-bold text-orange-600">{formatCurrency(duration)}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-orange-300">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-800">Seu Saldo Atual</span>
                  <span className="font-bold text-orange-900">{formatCurrency(user?.accountBalance || 0)}</span>
                </div>
                {user && user.accountBalance >= duration && (
                  <p className="text-xs text-green-700 mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Saldo suficiente para pagamento
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
              <PaymentMethodSelector
                amount={duration}
                onPaymentMethodChange={handlePaymentMethodChange}
                disabled={processing}
              />
            </div>

            {/* Start Button */}
            <button
              onClick={handleActivation}
              disabled={processing}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </span>
              ) : (
                'Iniciar Aspirador'
              )}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Login Prompt */}
        {!user && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Entre para continuar
            </h3>
            <p className="text-gray-600 mb-6">
              Você precisa estar logado para usar o aspirador
            </p>
            <div className="space-y-3">
              <Link 
                to="/login" 
                className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
              >
                Entrar
              </Link>
              <Link 
                to="/register" 
                className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-xl transition-all"
              >
                Criar Conta
              </Link>
            </div>
          </div>
        )}

        {/* Machine Not Available */}
        {machine && !availability?.available && user && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aspirador Indisponível
            </h3>
            <p className="text-gray-600 mb-4">
              {!availability?.withinOperatingHours && 'Fora do horário de funcionamento'}
              {availability?.status === 'maintenance' && 'Em manutenção'}
              {availability?.status === 'offline' && 'Offline'}
              {availability?.status === 'in_use' && 'Em uso'}
            </p>
            {machine.operatingHours && (
              <p className="text-sm text-gray-500 mb-6">
                Horário: {machine.operatingHours.start} - {machine.operatingHours.end}
              </p>
            )}
            <Link 
              to="/" 
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Voltar ao Início
            </Link>
          </div>
        )}

        {/* Active Session View */}
        {session && (realtimeSession?.status || session.status) === 'active' && (
          <div className="space-y-6">
            {/* Machine Info */}
            {machine && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{machine.location}</h2>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Em Uso
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Código: <span className="font-mono font-bold text-gray-900">{code}</span>
                </div>
              </div>
            )}

            {/* Countdown Timer - Main Focus */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Tempo Restante
              </h3>
              <div className="text-orange-600 text-7xl font-bold tracking-wider mb-4">
                {formattedTimeRemaining || '00:00'}
              </div>
              
              {/* Progress Bar */}
              <div className="relative mb-4">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% concluído</p>
              </div>

              {/* Session Details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Duração</p>
                  <p className="text-lg font-bold text-gray-900">{duration} min</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Custo</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(duration)}</p>
                </div>
              </div>
            </div>

            {/* Stop Button */}
            <button
              onClick={handleStopClick}
              disabled={processing}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Parar Aspirador
            </button>

            {/* Connection Status */}
            {wsConnected && (
              <div className="flex items-center justify-center space-x-2 text-green-600 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Conectado em tempo real</span>
              </div>
            )}
          </div>
        )}

        {/* Pending Payment */}
        {session && (realtimeSession?.status || session.status) === 'pending' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aguardando Pagamento
            </h3>
            <p className="text-gray-600 mb-6">
              O aspirador iniciará automaticamente após a confirmação
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duração:</span>
                <span className="font-bold text-gray-900">{duration} minutos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-bold text-orange-600 text-lg">{formatCurrency(duration)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Completed Session */}
        {session && (realtimeSession?.status || session.status) === 'completed' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Sessão Concluída
            </h3>
            <p className="text-gray-600 mb-6">
              Obrigado por usar nosso serviço!
            </p>
            
            <Link 
              to="/" 
              className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
            >
              Voltar ao Início
            </Link>
          </div>
        )}

      </main>

      {/* Stop Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Parar Aspirador?
              </h3>
              <p className="text-gray-600">
                Tem certeza que deseja parar o aspirador agora? O tempo restante será perdido.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Session Info */}
            {session && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Tempo restante:</span>
                  <span className="font-bold text-gray-900">{formattedTimeRemaining || '00:00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duração total:</span>
                  <span className="font-bold text-gray-900">{duration} minutos</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleCancelStop}
                disabled={processing}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmStop}
                disabled={processing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Parando...
                  </span>
                ) : (
                  'Sim, Parar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};