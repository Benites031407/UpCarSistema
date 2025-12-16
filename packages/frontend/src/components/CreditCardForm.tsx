import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CreditCardFormProps {
  amount: number;
  onSuccess: (token: string, installments: number) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({
  amount,
  onSuccess,
  onError,
  onCancel,
  loading = false
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [installments, setInstallments] = useState(1);
  const [processing, setProcessing] = useState(false);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  // Format expiration date as MM/YY
  const formatExpirationDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const handleExpirationDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpirationDate(e.target.value);
    setExpirationDate(formatted);
  };

  const handleSecurityCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    setSecurityCode(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (processing || loading) return;

    // Validate fields
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      onError('Número do cartão inválido');
      return;
    }

    if (!cardholderName || cardholderName.length < 3) {
      onError('Nome do titular inválido');
      return;
    }

    const [month, year] = expirationDate.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      onError('Data de validade inválida');
      return;
    }

    if (securityCode.length < 3 || securityCode.length > 4) {
      onError('Código de segurança inválido');
      return;
    }

    setProcessing(true);

    try {
      // Check if Mercado Pago SDK is loaded
      if (!window.MercadoPago) {
        onError('SDK de pagamento não carregado. Recarregue a página e tente novamente.');
        setProcessing(false);
        return;
      }

      // Initialize Mercado Pago (v2 SDK)
      const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);

      // Create card token using the correct v2 API
      const cardToken = await mp.createCardToken({
        cardNumber: cleanCardNumber,
        cardholderName: cardholderName.toUpperCase(),
        cardExpirationMonth: month,
        cardExpirationYear: `20${year}`,
        securityCode: securityCode,
        identificationType: 'CPF',
        identificationNumber: '00000000000' // You should collect this from user
      });
      
      if (cardToken && cardToken.id) {
        onSuccess(cardToken.id, installments);
      } else {
        onError('Falha ao processar cartão. Verifique os dados e tente novamente.');
      }
    } catch (error: any) {
      console.error('Card tokenization error:', error);
      onError(error.message || 'Erro ao processar cartão');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card Number */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Número do Cartão
        </label>
        <input
          type="text"
          value={cardNumber}
          onChange={handleCardNumberChange}
          placeholder="0000 0000 0000 0000"
          disabled={processing || loading}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-lg disabled:bg-gray-100"
          required
        />
      </div>

      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Nome do Titular
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
          placeholder="NOME COMO NO CARTÃO"
          disabled={processing || loading}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase disabled:bg-gray-100"
          required
        />
      </div>

      {/* Expiration Date and Security Code */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Validade
          </label>
          <input
            type="text"
            value={expirationDate}
            onChange={handleExpirationDateChange}
            placeholder="MM/AA"
            disabled={processing || loading}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-lg disabled:bg-gray-100"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            CVV
          </label>
          <input
            type="text"
            value={securityCode}
            onChange={handleSecurityCodeChange}
            placeholder="000"
            disabled={processing || loading}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-lg disabled:bg-gray-100"
            required
          />
        </div>
      </div>

      {/* Installments */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Parcelas
        </label>
        <select
          value={installments}
          onChange={(e) => setInstallments(parseInt(e.target.value))}
          disabled={processing || loading}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
        >
          <option value={1}>1x de R$ {amount.toFixed(2)} sem juros</option>
          {amount >= 20 && <option value={2}>2x de R$ {(amount / 2).toFixed(2)} sem juros</option>}
          {amount >= 30 && <option value={3}>3x de R$ {(amount / 3).toFixed(2)} sem juros</option>}
          {amount >= 40 && <option value={4}>4x de R$ {(amount / 4).toFixed(2)} sem juros</option>}
          {amount >= 50 && <option value={5}>5x de R$ {(amount / 5).toFixed(2)} sem juros</option>}
          {amount >= 60 && <option value={6}>6x de R$ {(amount / 6).toFixed(2)} sem juros</option>}
        </select>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing || loading}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={processing || loading}
          className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing || loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando...
            </span>
          ) : (
            'Pagar'
          )}
        </button>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-blue-800">
            Seus dados são protegidos e criptografados. Não armazenamos informações do seu cartão.
          </p>
        </div>
      </div>
    </form>
  );
};
