import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
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

interface PIXPaymentData {
  id: string;
  qrCode?: string;
  qrCodeBase64?: string;
  pixCopyPaste?: string;
  amount: number;
}

export const MachineActivationPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { socket, isConnected } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const [pixPaymentData, setPixPaymentData] = useState<PIXPaymentData | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);

  // Real-time session monitoring
  const {
    sessionData: realtimeSession,
    formattedTimeRemaining: wsTimeRemaining,
    progress: wsProgress,
    isConnected: wsConnected
  } = useRealtimeSession(session?.id);

  // Local countdown timer (fallback if WebSocket doesn't work)
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number>(0);
  const [localProgress, setLocalProgress] = useState<number>(0);

  useEffect(() => {
    if (session && session.status === 'active') {
      // Use startTime if available, otherwise use current time (just activated)
      const startTime = session.startTime 
        ? new Date(session.startTime).getTime() 
        : Date.now();
      const durationMs = duration * 60 * 1000;
      
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, durationMs - elapsed);
        const progressPercent = Math.min(100, (elapsed / durationMs) * 100);
        
        setLocalTimeRemaining(Math.ceil(remaining / 1000)); // seconds
        setLocalProgress(progressPercent);
        
        if (remaining <= 0) {
          clearInterval(interval);
          setSession({ ...session, status: 'completed' });
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [session, duration]);

  // Use WebSocket data if available, otherwise use local countdown
  const formattedTimeRemaining = wsTimeRemaining || formatTime(localTimeRemaining);
  const progress = wsProgress || localProgress;

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  useEffect(() => {
    if (code) {
      fetchMachineInfo();
    }
  }, [code]);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate(`/login?returnTo=/machine/${code}`, { replace: true });
    }
  }, [user, loading, code, navigate]);

  // Listen for payment confirmation via WebSocket
  useEffect(() => {
    if (!socket || !isConnected || !showPixModal) return;

    const handlePaymentConfirmed = async (data: any) => {
      console.log('Payment confirmed via WebSocket:', data);
      
      setWaitingForPayment(false);
      setMessage({ 
        type: 'success', 
        text: 'Pagamento confirmado! Ativando máquina...' 
      });
      
      // Refresh user balance
      await refreshUser();
      
      // Close modal
      setShowPixModal(false);
      
      // Confirm payment and activate session
      if (session && pixPaymentData) {
        try {
          await api.post(`/sessions/${session.id}/confirm-payment`, {
            paymentId: pixPaymentData.id,
          });
          
          // Refresh session data
          const sessionResponse = await api.get(`/sessions/${session.id}`);
          setSession(sessionResponse.data);
          setMessage({ type: 'success', text: 'Máquina ativada com sucesso!' });
        } catch (error: any) {
          console.error('Error activating session:', error);
          setMessage({ type: 'error', text: error.response?.data?.error || 'Erro ao ativar máquina' });
        }
      }
    };

    const handlePaymentFailed = (data: any) => {
      console.log('Payment failed via WebSocket:', data);
      
      setWaitingForPayment(false);
      setMessage({ 
        type: 'error', 
        text: 'Pagamento não foi aprovado. Por favor, tente novamente.' 
      });
    };

    socket.on('payment-confirmed', handlePaymentConfirmed);
    socket.on('payment-failed', handlePaymentFailed);

    return () => {
      socket.off('payment-confirmed', handlePaymentConfirmed);
      socket.off('payment-failed', handlePaymentFailed);
    };
  }, [socket, isConnected, showPixModal, session, pixPaymentData, refreshUser]);

  // Set waiting state when PIX modal opens
  useEffect(() => {
    if (showPixModal && pixPaymentData) {
      setWaitingForPayment(true);
    }
  }, [showPixModal, pixPaymentData]);

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

    // Check if user has insufficient balance when using balance payment
    if (paymentMethod === 'balance' && user && user.accountBalance < duration) {
      setShowInsufficientBalanceModal(true);
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
        const activateResponse = await api.post(`/sessions/${sessionData.id}/activate`);
        setSession(activateResponse.data.session);
      } else if (paymentMethod === 'pix') {
        // PIX payment was already created by the backend during session creation
        const pixData = sessionResponse.data.paymentRequired?.pixPayment;
        
        console.log('PIX Payment Response:', pixData);

        if (pixData) {
          setPixPaymentData({
            id: pixData.id,
            qrCode: pixData.qrCode,
            qrCodeBase64: pixData.qrCodeBase64,
            pixCopyPaste: pixData.pixCopyPaste,
            amount: duration
          });
          setShowPixModal(true);
        }

        // Note: In production, payment confirmation would be handled by Mercado Pago webhooks
        // The session will activate automatically when the webhook confirms the payment
      } else if (paymentMethod === 'mixed') {
        // Handle mixed payment
        await api.post('/payments/mixed', {
          totalAmount: duration,
          balanceAmount: paymentData.balanceAmount,
          description: `Machine usage - ${machine.location} (${duration} minutes)`,
        });

        // Activate session after mixed payment
        const activateResponse = await api.post(`/sessions/${sessionData.id}/activate`);
        setSession(activateResponse.data.session);
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

  const handleCopyPixCode = () => {
    if (pixPaymentData?.pixCopyPaste) {
      navigator.clipboard.writeText(pixPaymentData.pixCopyPaste);
      setMessage({ type: 'success', text: 'Código PIX copiado!' });
    }
  };

  const handleClosePixModal = () => {
    setShowPixModal(false);
    // Keep pixPaymentData so user can check payment status
  };

  // Note: Automatic polling disabled to avoid Mercado Pago rate limits
  // In production, use Mercado Pago webhooks for automatic payment confirmation

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
      <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-400 flex flex-col justify-center py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Aspirador Não Encontrado</h2>
              <p className="text-gray-600 text-sm mb-6">
                O código digitado não corresponde a nenhum aspirador cadastrado no sistema.
              </p>
            </div>
            <Link 
              to="/" 
              className="inline-block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Voltar para Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-400 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-white/20 rounded-full -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-64 h-64 bg-white/10 rounded-full top-1/4 -right-32 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute w-80 h-80 bg-orange-600/10 rounded-full bottom-0 left-1/4 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && user && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {user && (
        <aside className={`
          fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-xl">{user.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{user.name?.split(' ')[0]}</h3>
                    <p className="text-orange-100 text-sm">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-white hover:bg-orange-700 p-2 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <p className="text-orange-100 text-xs mb-1">Saldo Disponível</p>
                <p className="text-white text-2xl font-bold">{formatCurrency(user.accountBalance || 0)}</p>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                <button
                  onClick={() => {
                    navigate('/adicionar-credito');
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium">Adicionar Crédito</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/historico');
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Histórico</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/configuracoes');
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">Configurações da Conta</span>
                </button>

                {/* Temporarily hidden until subscription feature is fully working */}
                {/* <div className="border-t border-gray-200 my-4"></div>

                <button
                  onClick={() => {
                    navigate('/assinatura');
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 rounded-lg transition-colors shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Assinatura Mensal</span>
                </button> */}

                <div className="border-t border-gray-200 my-4"></div>

                <a
                  href="https://wa.me/5511948580070"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="font-medium">Suporte</span>
                </a>

                <button
                  onClick={() => {
                    navigate('/termos-e-condicoes');
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">Termos e Condições</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/politica-de-privacidade');
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-medium">Política de Privacidade</span>
                </button>

                {user.role === 'admin' && (
                  <>
                    <div className="border-t border-gray-200 my-4"></div>
                    <button
                      onClick={() => {
                        navigate('/admin');
                        setSidebarOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">Painel Admin</span>
                    </button>
                  </>
                )}
              </div>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  // Close any open modals
                  setShowPixModal(false);
                  setShowStopModal(false);
                  setSidebarOpen(false);
                  // Logout and redirect to home
                  logout();
                  navigate('/');
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sair</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg sticky top-0 z-30 relative">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {user ? (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            ) : (
              <Link to="/" className="p-2 hover:bg-orange-700 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
            )}
            
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
            
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-20 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}
        {/* Activation Form - Initial State */}
        {!session && availability?.available && user && (
          <div className="space-y-6">


            {/* 1. Time Selection */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Selecione o Tempo
              </h3>
              
              {/* Quick Select Buttons */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[5, 10, 15, 20].map((time) => (
                  <button
                    key={time}
                    onClick={() => setDuration(time)}
                    disabled={processing}
                    className={`
                      py-4 px-2 rounded-xl font-bold text-base transition-all
                      ${duration === time
                        ? 'bg-orange-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${processing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {time}min
                  </button>
                ))}
              </div>

              {/* Custom Time with +/- buttons */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => setDuration(Math.max(1, duration - 1))}
                    disabled={processing || duration <= 1}
                    className="w-12 h-12 bg-white border-2 border-gray-300 rounded-full font-bold text-2xl text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-orange-600">{duration}</div>
                    <p className="text-sm text-gray-500 mt-1">minutos</p>
                  </div>
                  <button
                    onClick={() => setDuration(Math.min(30, duration + 1))}
                    disabled={processing || duration >= 30}
                    className="w-12 h-12 bg-white border-2 border-gray-300 rounded-full font-bold text-2xl text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Initiate Button */}
            <button
              onClick={handleActivation}
              disabled={processing}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-6 px-6 rounded-2xl transition-all shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed text-xl"
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Iniciar Aspirador
                </span>
              )}
            </button>

            {/* Payment Method */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
              <PaymentMethodSelector
                amount={duration}
                onPaymentMethodChange={handlePaymentMethodChange}
                disabled={processing}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Redirecting to login - no UI needed as redirect happens automatically */}

        {/* Machine Not Available */}
        {machine && !availability?.available && user && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              availability?.status === 'offline' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <svg className={`w-8 h-8 ${
                availability?.status === 'offline' ? 'text-red-600' : 'text-yellow-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {availability?.status === 'offline' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                )}
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aspirador Indisponível
            </h3>
            <p className="text-gray-600 mb-4">
              {!availability?.withinOperatingHours && 'Fora do horário de funcionamento'}
              {availability?.status === 'maintenance' && 'Este aspirador está em manutenção'}
              {availability?.status === 'in_use' && 'Este aspirador está sendo usado no momento'}
            </p>
            {availability?.status === 'offline' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">
                  Por favor, tente novamente após 5 minutos
                </p>
              </div>
            )}
            {machine.operatingHours && !availability?.withinOperatingHours && (
              <p className="text-sm text-gray-500 mb-6">
                Horário de funcionamento: {machine.operatingHours.start} - {machine.operatingHours.end}
              </p>
            )}
            <Link 
              to="/" 
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
            >
              Voltar ao Início
            </Link>
          </div>
        )}

        {/* Active Session View */}
        {session && (realtimeSession?.status || session.status) === 'active' && (
          <div className="space-y-6">
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
            <p className="text-gray-600 mb-4">
              Após pagar, clique no botão abaixo para verificar o pagamento
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duração:</span>
                <span className="font-bold text-gray-900">{duration} minutos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-bold text-orange-600 text-lg">{formatCurrency(duration)}</span>
              </div>
            </div>

            {/* Waiting for payment confirmation */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-semibold text-blue-700">Aguardando confirmação do pagamento...</span>
              </div>
              <p className="text-xs text-blue-600">
                Assim que o pagamento for confirmado, a máquina será ativada automaticamente
              </p>
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

      {/* PIX Payment Modal */}
      {showPixModal && pixPaymentData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Pagamento PIX</h3>
              <p className="text-sm text-gray-600">Copie o código e cole no app do seu banco</p>
            </div>

            {/* Message */}
            {message && (
              <div className={`mb-4 p-3 rounded-lg flex justify-between items-center ${
                message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <span className="text-sm font-medium">{message.text}</span>
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

            {/* Amount */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 mb-4 text-center">
              <p className="text-xs text-green-700 mb-1">Valor a pagar</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(pixPaymentData.amount)}</p>
            </div>

            {/* PIX Copy Paste Code */}
            {pixPaymentData.pixCopyPaste && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Código PIX Copia e Cola</label>
                <div className="relative">
                  <input
                    type="text"
                    value={pixPaymentData.pixCopyPaste}
                    readOnly
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-xs font-mono pr-20"
                  />
                  <button
                    onClick={handleCopyPixCode}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800 font-semibold mb-2">Como pagar:</p>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Abra o app do seu banco</li>
                <li>Escolha pagar com PIX</li>
                <li>Cole o código copiado</li>
                <li>Confirme o pagamento</li>
                <li>O aspirador iniciará automaticamente</li>
              </ol>
            </div>

            {/* Waiting for payment */}
            {waitingForPayment && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <svg className="animate-spin h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-semibold text-yellow-700">Aguardando confirmação do pagamento...</span>
                </div>
                <p className="text-xs text-yellow-600">
                  Assim que o pagamento for confirmado, a máquina será ativada automaticamente
                </p>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={handleClosePixModal}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Insufficient Balance Modal */}
      {showInsufficientBalanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-3">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Saldo Insuficiente</h3>
              <p className="text-sm text-gray-600 mb-4">
                Você não possui créditos suficientes para esta aspiração.
              </p>
              
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Saldo atual:</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(user?.accountBalance || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Valor necessário:</span>
                  <span className="text-lg font-bold text-orange-600">{formatCurrency(duration)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Add Credits Button */}
              <button
                onClick={() => navigate('/add-credit')}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Adicionar Créditos
              </button>

              {/* Use PIX Instead Button */}
              <button
                onClick={() => {
                  setShowInsufficientBalanceModal(false);
                  setPaymentMethod('pix');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Pagar com PIX
              </button>

              {/* Close Button */}
              <button
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};