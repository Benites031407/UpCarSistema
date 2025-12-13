import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../contexts/AuthContext';

interface PaymentOption {
  canUseBalance: boolean;
  balanceAmount: number;
  pixAmount: number;
  requiresPIX: boolean;
}

interface PaymentMethodSelectorProps {
  amount: number;
  onPaymentMethodChange: (method: 'balance' | 'pix' | 'mixed', data?: any) => void;
  disabled?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  amount,
  onPaymentMethodChange,
  disabled = false,
}) => {
  const { user } = useAuth();
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'balance' | 'pix' | 'mixed'>('pix');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (amount > 0) {
      fetchPaymentOptions();
    }
  }, [amount]);

  const fetchPaymentOptions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payments/options/${amount}`);
      setPaymentOptions(response.data.data);
      
      // Auto-select best payment method
      const options = response.data.data;
      if (options.canUseBalance && options.pixAmount === 0) {
        setSelectedMethod('balance');
        onPaymentMethodChange('balance');
      } else if (options.canUseBalance && options.pixAmount > 0) {
        setSelectedMethod('mixed');
        onPaymentMethodChange('mixed', {
          balanceAmount: options.balanceAmount,
          pixAmount: options.pixAmount,
        });
      } else {
        setSelectedMethod('pix');
        onPaymentMethodChange('pix');
      }
    } catch (error) {
      console.error('Failed to fetch payment options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (method: 'balance' | 'pix' | 'mixed') => {
    setSelectedMethod(method);
    
    if (method === 'mixed' && paymentOptions) {
      onPaymentMethodChange(method, {
        balanceAmount: paymentOptions.balanceAmount,
        pixAmount: paymentOptions.pixAmount,
      });
    } else {
      onPaymentMethodChange(method);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Método de Pagamento</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-gray-200 rounded-lg"></div>
          <div className="h-16 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!paymentOptions) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 text-center mb-4">Método de Pagamento</h3>
      
      <div className="space-y-3">
        {/* Account Balance Option - Highlighted when available */}
        {paymentOptions.canUseBalance && paymentOptions.pixAmount === 0 && (
          <button
            type="button"
            className={`
              w-full p-4 rounded-xl border-2 transition-all text-left
              ${selectedMethod === 'balance'
                ? 'border-green-500 bg-green-50 shadow-lg scale-[1.02]'
                : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onClick={() => !disabled && handleMethodChange('balance')}
            disabled={disabled}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedMethod === 'balance' ? 'bg-green-500' : 'bg-green-100'
                }`}>
                  <svg className={`w-6 h-6 ${selectedMethod === 'balance' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-900">
                    Saldo da Conta
                  </div>
                  <div className="text-sm text-gray-600">
                    Saldo disponível: {formatCurrency(user?.accountBalance || 0)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600 text-lg">
                  {formatCurrency(amount)}
                </div>
                <div className="text-xs text-green-600 font-medium">Instantâneo</div>
              </div>
            </div>
          </button>
        )}

        {/* Mixed Payment Option */}
        {paymentOptions.canUseBalance && paymentOptions.pixAmount > 0 && (
          <button
            type="button"
            className={`
              w-full p-4 rounded-xl border-2 transition-all text-left
              ${selectedMethod === 'mixed'
                ? 'border-orange-500 bg-orange-50 shadow-lg scale-[1.02]'
                : 'border-gray-300 bg-white hover:border-orange-400 hover:bg-orange-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onClick={() => !disabled && handleMethodChange('mixed')}
            disabled={disabled}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedMethod === 'mixed' ? 'bg-orange-500' : 'bg-orange-100'
                }`}>
                  <svg className={`w-6 h-6 ${selectedMethod === 'mixed' ? 'text-white' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-900">Créditos + PIX</div>
                  <div className="text-sm text-gray-600">
                    {formatCurrency(paymentOptions.balanceAmount)} do saldo + PIX
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-orange-600 text-lg">
                  {formatCurrency(paymentOptions.pixAmount)}
                </div>
                <div className="text-xs text-gray-500">via PIX</div>
              </div>
            </div>
          </button>
        )}

        {/* PIX Payment Option */}
        <button
          type="button"
          className={`
            w-full p-4 rounded-xl border-2 transition-all text-left
            ${selectedMethod === 'pix'
              ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]'
              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => !disabled && handleMethodChange('pix')}
          disabled={disabled}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedMethod === 'pix' ? 'bg-blue-500' : 'bg-blue-100'
              }`}>
                <svg className={`w-6 h-6 ${selectedMethod === 'pix' ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-gray-900">Pagamento PIX</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-blue-600 text-lg">
                {formatCurrency(amount)}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Payment Summary */}
      {selectedMethod === 'mixed' && paymentOptions && (
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
          <div className="text-sm font-medium text-orange-900 mb-2">Resumo do Pagamento:</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-orange-800">
              <span>Créditos da conta:</span>
              <span className="font-bold">{formatCurrency(paymentOptions.balanceAmount)}</span>
            </div>
            <div className="flex justify-between text-orange-800">
              <span>Pagamento PIX:</span>
              <span className="font-bold">{formatCurrency(paymentOptions.pixAmount)}</span>
            </div>
            <div className="pt-2 border-t border-orange-300 flex justify-between text-orange-900">
              <span className="font-bold">Total:</span>
              <span className="font-bold text-lg">{formatCurrency(amount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};