import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import { CreditCardForm } from '../components/CreditCardForm';

interface PIXPaymentData {
  id: string;
  qrCode?: string;
  qrCodeBase64?: string;
  pixCopyPaste?: string;
  amount: number;
}

export const AddCreditPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { socket, isConnected } = useWebSocket();
  const [creditAmount, setCreditAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [addingCredit, setAddingCredit] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pixPaymentData, setPixPaymentData] = useState<PIXPaymentData | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);

  const handleAddCredit = async () => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Por favor, insira um valor válido' });
      return;
    }

    try {
      setAddingCredit(true);
      setMessage(null);
      
      if (paymentMethod === 'pix') {
        // Create PIX payment for credit
        const response = await api.post('/payments/pix', {
          amount,
          description: `Crédito de conta - ${formatCurrency(amount)}`,
        });

        console.log('PIX Payment Response:', response.data);

        const pixData = response.data.data.pixPayment;
        setPixPaymentData({
          id: pixData.id,
          qrCode: pixData.qrCode,
          qrCodeBase64: pixData.qrCodeBase64,
          pixCopyPaste: pixData.pixCopyPaste,
          amount: amount
        });
        setShowPixModal(true);
      } else {
        // Credit card payment - show card form modal
        setShowCardModal(true);
      }

    } catch (error: any) {
      console.error('Failed to add credit:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || error.response?.data?.message || 'Falha ao adicionar crédito' });
    } finally {
      setAddingCredit(false);
    }
  };

  const handleCopyPixCode = () => {
    if (pixPaymentData?.pixCopyPaste) {
      navigator.clipboard.writeText(pixPaymentData.pixCopyPaste);
      setMessage({ type: 'success', text: 'Código PIX copiado!' });
    }
  };

  const handleClosePixModal = () => {
    setShowPixModal(false);
    setPixPaymentData(null);
    setCreditAmount('');
    setWaitingForPayment(false);
  };

  const handleCreditCardSuccess = async (token: string, installments: number) => {
    const amount = parseFloat(creditAmount);
    
    try {
      setAddingCredit(true);
      setMessage(null);

      const response = await api.post('/payments/credit-card', {
        amount,
        description: `Crédito de conta - ${formatCurrency(amount)}`,
        token,
        installments
      });

      console.log('Credit card payment response:', response.data);

      const payment = response.data.data.payment;

      if (payment.status === 'approved') {
        setMessage({
          type: 'success',
          text: `Pagamento aprovado! ${formatCurrency(amount)} adicionado à sua conta.`
        });
        
        // Refresh user data to show new balance
        await refreshUser();
        
        // Close modal and reset
        setTimeout(() => {
          setShowCardModal(false);
          setCreditAmount('');
          setMessage(null);
        }, 3000);
      } else if (payment.status === 'rejected') {
        setMessage({
          type: 'error',
          text: `Pagamento recusado: ${payment.statusDetail || 'Verifique os dados do cartão'}`
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Pagamento pendente. Aguarde a confirmação.'
        });
      }
    } catch (error: any) {
      console.error('Credit card payment failed:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Falha ao processar pagamento'
      });
    } finally {
      setAddingCredit(false);
    }
  };

  const handleCreditCardError = (error: string) => {
    setMessage({ type: 'error', text: error });
  };

  const handleCreditCardCancel = () => {
    setShowCardModal(false);
    setAddingCredit(false);
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
          text: `Pagamento confirmado! ${formatCurrency(data.amount)} adicionado à sua conta.` 
        });
        
        // Refresh user data to show new balance
        await refreshUser();
        
        // Close modal after a short delay
        setTimeout(() => {
          handleClosePixModal();
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

  const quickAmounts = [10, 20, 50, 100];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-400">
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

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Current Balance Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Saldo Atual</p>
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {formatCurrency(user?.accountBalance || 0)}
            </div>
            <p className="text-xs text-gray-500">1 R$ = 1 minuto de uso</p>
          </div>
        </div>

        {/* Add Credit Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Adicionar Crédito</h2>
              <p className="text-xs text-gray-600">Recarregue sua conta para usar os aspiradores</p>
            </div>
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

          {/* Quick Amount Buttons */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valores Rápidos</label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setCreditAmount(amount.toString())}
                  className={`py-3 px-2 rounded-lg font-bold text-base transition-all ${
                    creditAmount === amount.toString()
                      ? 'bg-orange-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  R$ {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ou insira um valor personalizado</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg font-bold">R$</span>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="0,00"
                min="1"
                step="0.01"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold text-xl text-center"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {creditAmount && parseFloat(creditAmount) > 0 
                ? `Você receberá ${parseFloat(creditAmount).toFixed(0)} minutos de uso`
                : 'Digite o valor que deseja adicionar'}
            </p>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod('pix')}
                className={`py-3 px-3 rounded-lg font-bold transition-all border-2 ${
                  paymentMethod === 'pix'
                    ? 'bg-green-600 text-white border-green-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span className="text-sm">PIX</span>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`py-3 px-2 rounded-lg font-bold transition-all border-2 ${
                  paymentMethod === 'card'
                    ? 'bg-orange-600 text-white border-orange-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-xs whitespace-nowrap">Cartão de Crédito</span>
                </div>
              </button>
            </div>
          </div>

          {/* Add Credit Button */}
          <button
            onClick={handleAddCredit}
            disabled={addingCredit || !creditAmount || parseFloat(creditAmount) <= 0}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {addingCredit ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {paymentMethod === 'pix' ? 'Pagar com PIX' : 'Pagar com Cartão de Crédito'}
              </span>
            )}
          </button>

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
                <li>Seu crédito será adicionado automaticamente</li>
              </ol>
            </div>

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

      {/* Credit Card Payment Modal */}
      {showCardModal && creditAmount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-3">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Pagamento com Cartão</h3>
              <p className="text-sm text-gray-600">Insira os dados do seu cartão de crédito</p>
            </div>

            {/* Amount */}
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 mb-4 text-center">
              <p className="text-xs text-orange-700 mb-1">Valor a pagar</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(parseFloat(creditAmount))}</p>
            </div>

            {/* Credit Card Form */}
            <CreditCardForm
              amount={parseFloat(creditAmount)}
              onSuccess={handleCreditCardSuccess}
              onError={handleCreditCardError}
              onCancel={handleCreditCardCancel}
              loading={addingCredit}
            />
          </div>
        </div>
      )}
    </div>
  );
};
