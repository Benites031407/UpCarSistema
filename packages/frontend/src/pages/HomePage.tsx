import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRScanner } from '../components/QRScanner';
import { useAuth } from '../contexts/AuthContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [machineCode, setMachineCode] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [error, setError] = useState('');

  const handleQRScan = (result: string) => {
    // Extract machine code from QR code URL
    const match = result.match(/\/machine\/([A-Z0-9]{6})/);
    if (match) {
      const code = match[1];
      navigate(`/machine/${code}`);
    } else {
      setError('Formato de código QR inválido');
    }
    setScannerActive(false);
  };

  const handleManualEntry = () => {
    if (machineCode.length === 6) {
      navigate(`/machine/${machineCode.toUpperCase()}`);
    } else {
      setError('O código do aspirador deve ter 6 caracteres');
    }
  };

  const handleScannerError = (errorMessage: string) => {
    setError(errorMessage);
    setScannerActive(false);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">UpCar Aspiradores</h1>
          <div className="flex space-x-2">
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors text-sm font-medium"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => navigate('/account')}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors text-sm font-medium"
            >
              Conta
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acesse Seu Aspirador
          </h2>
          <p className="text-gray-600">
            Escaneie o código QR ou digite o código do aspirador para começar
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-600 text-xs underline mt-1"
            >
              Dispensar
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* QR Scanner Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Escanear Código QR
            </h3>
            
            {scannerActive ? (
              <div className="space-y-4">
                <QRScanner
                  onScan={handleQRScan}
                  onError={handleScannerError}
                  isActive={scannerActive}
                />
                <button
                  onClick={() => setScannerActive(false)}
                  className="w-full btn-secondary"
                >
                  Parar Scanner
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setError('');
                  setScannerActive(true);
                }}
                className="w-full btn-primary"
              >
                Iniciar Câmera
              </button>
            )}
          </div>

          {/* Manual Entry Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Digite o Código do Aspirador
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="machine-code" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de 6 Caracteres
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
                  placeholder="ABC123"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center text-lg font-mono tracking-wider"
                  maxLength={6}
                />
              </div>
              
              <button
                onClick={handleManualEntry}
                disabled={machineCode.length !== 6}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Acessar Aspirador
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Escaneie o código QR no aspirador ou digite o código manualmente</li>
            <li>• Selecione a duração de uso (1-30 minutos)</li>
            <li>• Escolha seu método de pagamento</li>
            <li>• Comece a usar o aspirador imediatamente</li>
          </ul>
        </div>
      </main>
    </div>
  );
};