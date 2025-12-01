import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [machineCode, setMachineCode] = useState('');
  const [error, setError] = useState('');

  const handleManualEntry = () => {
    if (machineCode.length === 6) {
      navigate(`/machine/${machineCode.toUpperCase()}`);
    } else {
      setError('O código deve ter 6 caracteres');
    }
  };

  // If user is not logged in, redirect to login page
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  // If user is logged in, show machine access page
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 via-orange-300 to-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img 
                src="/assets/upcar-logo.png" 
                alt="UpCar" 
                className="h-10 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Olá, {user.name?.split(' ')[0]}!</h1>
                <p className="text-xs text-gray-600">Saldo: {formatCurrency(user.accountBalance || 0)}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {user.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  title="Admin"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => navigate('/account')}
                className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                title="Minha Conta"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Welcome Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Acessar Aspirador
            </h2>
            <p className="text-gray-600 text-sm">
              Digite o código de 6 caracteres do aspirador
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <div className="flex items-center justify-between">
                <p className="text-red-700 text-sm font-medium">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Code Input */}
          <div className="space-y-4">
            <div>
              <label htmlFor="machine-code" className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                Código do Aspirador
              </label>
              <input
                id="machine-code"
                type="text"
                value={machineCode}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  if (value.length <= 6) {
                    setMachineCode(value);
                    setError('');
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && machineCode.length === 6) {
                    handleManualEntry();
                  }
                }}
                placeholder="ABC123"
                className="block w-full px-6 py-4 border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center text-2xl font-bold tracking-widest uppercase"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center mt-2">
                {machineCode.length}/6 caracteres
              </p>
            </div>
            
            <button
              onClick={handleManualEntry}
              disabled={machineCode.length !== 6}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg text-lg"
            >
              {machineCode.length === 6 ? 'Acessar Aspirador →' : 'Digite o código completo'}
            </button>
          </div>
        </div>

        {/* Instructions Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border-2 border-orange-200">
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-orange-900 mb-3 text-lg">Como usar:</h4>
              <ol className="text-sm text-orange-800 space-y-2">
                <li className="flex items-start">
                  <span className="font-bold mr-2 flex-shrink-0">1.</span>
                  <span>Encontre o código de 6 caracteres no aspirador</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2 flex-shrink-0">2.</span>
                  <span>Digite o código no campo acima</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2 flex-shrink-0">3.</span>
                  <span>Escolha o tempo de uso e método de pagamento</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2 flex-shrink-0">4.</span>
                  <span>Comece a usar o aspirador imediatamente!</span>
                </li>
              </ol>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-orange-300">
            <p className="text-xs text-orange-700 text-center">
              💡 <strong>Dica:</strong> O código está localizado na parte frontal do aspirador
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {user.subscriptionStatus === 'active' && (
          <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-semibold">Assinatura Ativa - Uso Ilimitado!</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};