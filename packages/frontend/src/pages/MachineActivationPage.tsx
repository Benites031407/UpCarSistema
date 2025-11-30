import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { DurationSelector } from '../components/DurationSelector';
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

  // Real-time session monitoring
  const {
    sessionData: realtimeSession,
    notifications: sessionNotifications,
    formattedTimeRemaining,
    progress,
    isConnected: wsConnected,
    clearNotifications
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

      // Create session
      const sessionResponse = await api.post('/sessions/create', {
        machineId: machine.id,
        duration,
        paymentMethod,
      });

      const sessionData = sessionResponse.data.session;
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

  const handleTerminate = async () => {
    if (!session) return;

    try {
      await api.post(`/sessions/${session.id}/terminate`);
      setSession({ ...session, status: 'completed' });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to terminate session');
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-primary-600 hover:text-primary-700">
            ← Voltar
          </Link>
          <h1 className="text-lg font-medium text-gray-900">Aspirador {code}</h1>
          <div></div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Machine Info */}
        {machine && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {machine.location}
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  availability?.available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {availability?.available ? 'Disponível' : 'Indisponível'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Horário de Funcionamento:</span>
                <span className="font-medium">
                  {machine.operatingHours.start} - {machine.operatingHours.end}
                </span>
              </div>
              
              {machine.temperature && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Temperatura:</span>
                  <span className="font-medium">{machine.temperature}°C</span>
                </div>
              )}
            </div>

            {/* Availability Status */}
            {!availability?.available && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  {!availability?.withinOperatingHours && 'Aspirador fora do horário de funcionamento. '}
                  {availability?.status === 'maintenance' && 'Aspirador em manutenção. '}
                  {availability?.status === 'offline' && 'Aspirador está offline. '}
                  {availability?.status === 'in_use' && 'Aspirador está em uso. '}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Real-time Connection Status */}
        {session && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {wsConnected ? 'Atualizações em tempo real ativas' : 'Modo offline'}
                </span>
              </div>
              {sessionNotifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Limpar ({sessionNotifications.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Session Notifications */}
        {sessionNotifications.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Atualizações Recentes</h4>
            <div className="space-y-2">
              {sessionNotifications.slice(0, 3).map((notification, index) => (
                <div
                  key={index}
                  className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800"
                >
                  {notification.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Status */}
        {session && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status da Sessão</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Duração:</span>
                <span className="font-medium">{duration} minutos</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Custo:</span>
                <span className="font-medium">{formatCurrency(duration)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  (realtimeSession?.status || session.status) === 'active' ? 'text-green-600' :
                  (realtimeSession?.status || session.status) === 'pending' ? 'text-yellow-600' :
                  (realtimeSession?.status || session.status) === 'completed' ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {(realtimeSession?.status || session.status) === 'active' && 'Aspirador em Funcionamento'}
                  {(realtimeSession?.status || session.status) === 'pending' && 'Aguardando Pagamento'}
                  {(realtimeSession?.status || session.status) === 'completed' && 'Sessão Concluída'}
                </span>
              </div>

              {/* Time Remaining for Active Sessions */}
              {(realtimeSession?.status || session.status) === 'active' && formattedTimeRemaining && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tempo Restante:</span>
                  <span className="font-medium text-green-600">{formattedTimeRemaining}</span>
                </div>
              )}

              {/* Progress Bar for Active Sessions */}
              {(realtimeSession?.status || session.status) === 'active' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progresso:</span>
                    <span className="text-gray-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {(realtimeSession?.status || session.status) === 'active' && (
              <button
                onClick={handleTerminate}
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Parar Aspirador
              </button>
            )}

            {(realtimeSession?.status || session.status) === 'pending' && paymentMethod === 'pix' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  Pagamento PIX está sendo processado. O aspirador iniciará automaticamente após a confirmação do pagamento.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Activation Form */}
        {!session && availability?.available && user && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <DurationSelector
                selectedDuration={duration}
                onDurationChange={setDuration}
                disabled={processing}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <PaymentMethodSelector
                amount={duration}
                onPaymentMethodChange={handlePaymentMethodChange}
                disabled={processing}
              />
            </div>

            <button
              onClick={handleActivation}
              disabled={processing}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processando...' : 'Iniciar Aspirador'}
            </button>
          </div>
        )}

        {/* Login Prompt */}
        {!user && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Entre para continuar
            </h3>
            <p className="text-gray-600 mb-4">
              Você precisa estar logado para usar o aspirador
            </p>
            <div className="space-y-2">
              <Link to="/login" className="block btn-primary">
                Entrar
              </Link>
              <Link to="/register" className="block btn-secondary">
                Criar Conta
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};