import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/currency';

interface PIXPaymentData {
  id: string;
  pixCopyPaste?: string;
  amount: number;
}

export const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { socket, isConnected } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pixPaymentData, setPixPaymentData] = useState<PIXPaymentData | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [waitingForPayment, setWaitingForPayment] = useState(false);

  const subscriptionPrice = 59.90;
  const isSubscribed = user?.subscriptionStatus === 'active' && user?.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.post('/payments/subscription');
      
      const pixData = response.data.data.pixPayment;
      setPixPaymentData({
        id: pixData.id,
        pixCopyPaste: pixData.pixCopyPaste,
        amount: subscriptionPrice
      });
      setShowPixModal(true);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Falha ao processar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPixCode = () => {
    if (pixPaymentData?.pixCopyPaste) {
      navigator.clipboard.writeText(pixPaymentData.pixCopyPaste);
      setMessage({ type: 'success', text: 'Código PIX copiado!' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCheckPayment = async () => {
    if (!pixPaymentData) return;

    try {
      setLoading(true);
      const statusResponse = await api.get(`/payments/status/${pixPaymentData.id}`);
      
      if (statusResponse.data.data.status === 'approved') {
        setMessage({ type: 'success', text: 'Pagamento confirmado! Sua assinatura está ativa.' });
        setShowPixModal(false);
        await refreshUser();
      } else {
        setMessage({ type: 'error', text: 'Pagamento ainda não confirmado. Aguarde alguns segundos e tente novamente.' });
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Falha ao verificar pagamento');
    } finally {
      setLoading(false);
    }
  };

  // WebSocket listener for payment confirmation
  useEffect(() => {
    if (!socket || !isConnected || !pixPaymentData) return;

    const handlePaymentConfirmed = async (data: any) => {
      console.log('Payment confirmed via WebSocket:', data);
      
      // Check if this is the payment we're waiting for
      if (data.paymentId === pixPaymentData.id) {
        setWaitingForPayment(false);
        setMessage({ 
          type: 'success', 
          text: 'Pagamento confirmado! Sua assinatura está ativa.' 
        });
        
        // Refresh user data to show new subscription status
        await refreshUser();
        
        // Close modal after a short delay
        setTimeout(() => {
          setShowPixModal(false);
        }, 2000);
      }
    };

    const handlePaymentFailed = (data: any) => {
      console.log('Payment failed via WebSocket:', data);
      
      if (data.paymentId === pixPaymentData.id) {
        setWaitingForPayment(false);
        setMessage({ 
          type: 'error', 
          text: 'Pagamento não foi aprovado. Por favor, tente novamente.' 
        });
      }
    };

    // Listen for payment events
    socket.on('payment-confirmed', handlePaymentConfirmed);
    socket.on('payment-failed', handlePaymentFailed);

    // Set waiting state when modal opens
    if (showPixModal) {
      setWaitingForPayment(true);
    }

    // Cleanup listeners
    return () => {
      socket.off('payment-confirmed', handlePaymentConfirmed);
      socket.off('payment-failed', handlePaymentFailed);
    };
  }, [socket, isConnected, pixPaymentData, showPixModal, refreshUser]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-400">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <h1 className="text-white text-xl font-bold">Assinatura Mensal</h1>
            
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className={`mb-4 p-4 border-l-4 rounded-r-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-500' 
              : 'bg-red-50 border-red-500'
          }`}>
            <p className={`text-sm font-medium ${
              message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>{message.text}</p>
          </div>
        )}

        {/* Current Status */}
        {isSubscribed && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-center text-lg font-bold text-green-900 mb-2">Assinatura Ativa</h3>
            <p className="text-center text-green-700 text-sm">
              Válida até: {user?.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString('pt-BR') : '-'}
            </p>
          </div>
        )}

        {/* Subscription Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Plano Mensal</h2>
            <div className="text-orange-600 text-4xl font-bold mb-1">{formatCurrency(subscriptionPrice)}</div>
            <p className="text-gray-600 text-sm">por mês</p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-gray-700">Use qualquer aspirador <strong>1 vez por dia</strong></p>
            </div>
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-gray-700">Acesso a <strong>todas as máquinas</strong></p>
            </div>
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-gray-700">Sem necessidade de adicionar créditos</p>
            </div>
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-gray-700">Renovação automática mensal</p>
            </div>
          </div>

          {/* Subscribe Button */}
          {!isSubscribed && (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : 'Assinar Agora'}
            </button>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm">
            <strong>Como funciona:</strong> Após o pagamento, você poderá usar qualquer aspirador uma vez por dia. 
            A assinatura é renovada automaticamente todo mês.
          </p>
        </div>
      </main>

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
              <div className={`mb-4 p-3 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            {/* Amount */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 mb-4 text-center">
              <p className="text-xs text-green-700 mb-1">Valor da Assinatura</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(pixPaymentData.amount)}</p>
            </div>

            {/* PIX Code */}
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

            {/* Waiting for Payment Indicator */}
            {waitingForPayment && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center">
                <svg className="animate-spin h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-xs text-yellow-800 font-semibold">
                  Aguardando confirmação do pagamento...
                </p>
              </div>
            )}

            {/* Check Payment Button */}
            <button
              onClick={handleCheckPayment}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {loading ? 'Verificando...' : 'Já Paguei - Verificar Pagamento'}
            </button>

            {/* Close Button */}
            <button
              onClick={() => setShowPixModal(false)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
