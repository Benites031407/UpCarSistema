import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [machineCode, setMachineCode] = useState('');
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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
                  navigate('/account');
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium">Meu Saldo</span>
              </button>

              <button
                onClick={() => {
                  navigate('/account');
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
                  navigate('/account', { state: { tab: 'sessions' } });
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
                  navigate('/account');
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

              <div className="border-t border-gray-200 my-4"></div>

              <button
                onClick={() => {
                  // TODO: Add support page
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-medium">Suporte</span>
              </button>

              <button
                onClick={() => {
                  // TODO: Add terms page
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
                  // TODO: Add privacy page
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
                logout();
                setSidebarOpen(false);
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

      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
            
            <div className="w-10"></div>
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