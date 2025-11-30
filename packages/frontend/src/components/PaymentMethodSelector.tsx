import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../contexts/AuthContext';

interface PaymentOption {
  canUseBalance: boolean;
  balanceAmount: number;
  shortfall: number;
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
      if (options.canUseBalance && options.shortfall === 0) {
        setSelectedMethod('balance');
        onPaymentMethodChange('balance');
      } else if (options.canUseBalance && options.shortfall > 0) {
        setSelectedMethod('mixed');
        onPaymentMethodChange('mixed', {
          balanceAmount: options.balanceAmount,
          pixAmount: options.shortfall,
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
        pixAmount: paymentOptions.shortfall,
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
      <h3 className="text-lg font-medium text-gray-900">Método de Pagamento</h3>
      
      <div className="space-y-3">
        {/* Account Balance Option */}
        {paymentOptions.canUseBalance && paymentOptions.shortfall === 0 && (
          <div
            className={`
              p-4 rounded-lg border-2 cursor-pointer transition-all
              ${selectedMethod === 'balance'
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => !disabled && handleMethodChange('balance')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Saldo da Conta</div>
                <div className="text-sm text-gray-500">
                  Saldo atual: {formatCurrency(user?.accountBalance || 0)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">
                  {formatCurrency(amount)}
                </div>
                <div className="text-xs text-gray-500">Instantâneo</div>
              </div>
            </div>
          </div>
        )}

        {/* Mixed Payment Option */}
        {paymentOptions.canUseBalance && paymentOptions.shortfall > 0 && (
          <div
            className={`
              p-4 rounded-lg border-2 cursor-pointer transition-all
              ${selectedMethod === 'mixed'
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => !disabled && handleMethodChange('mixed')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Saldo + PIX</div>
                <div className="text-sm text-gray-500">
                  Usar {formatCurrency(paymentOptions.balanceAmount)} do saldo
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-orange-600">
                  {formatCurrency(paymentOptions.shortfall)} via PIX
                </div>
                <div className="text-xs text-gray-500">Requer pagamento</div>
              </div>
            </div>
          </div>
        )}

        {/* PIX Payment Option */}
        <div
          className={`
            p-4 rounded-lg border-2 cursor-pointer transition-all
            ${selectedMethod === 'pix'
              ? 'border-primary-600 bg-primary-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !disabled && handleMethodChange('pix')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Pagamento PIX</div>
              <div className="text-sm text-gray-500">
                Pagar valor total via PIX
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-blue-600">
                {formatCurrency(amount)}
              </div>
              <div className="text-xs text-gray-500">Pagamento instantâneo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Custo Total:</span>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(amount)}
          </span>
        </div>
        
        {selectedMethod === 'mixed' && paymentOptions && (
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Do saldo:</span>
              <span>{formatCurrency(paymentOptions.balanceAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Via PIX:</span>
              <span>{formatCurrency(paymentOptions.shortfall)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};