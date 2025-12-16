import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      
      if (response.data.userExists) {
        // Email exists - show success message and redirect to login
        setMessage({
          type: 'success',
          text: 'E-mail de redefinição enviado! Verifique sua caixa de entrada ou spam. Redirecionando...'
        });
        setEmail('');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        // Email doesn't exist - show message and redirect to register
        setMessage({
          type: 'error',
          text: 'E-mail não encontrado. Você precisa criar uma conta primeiro. Redirecionando...'
        });
        
        setTimeout(() => {
          navigate('/register');
        }, 3000);
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Erro ao processar solicitação. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 via-orange-400 via-30% via-orange-300 via-60% to-orange-100 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-white/20 rounded-full -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-64 h-64 bg-white/10 rounded-full top-1/4 -right-32 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute w-80 h-80 bg-orange-600/10 rounded-full bottom-0 left-1/4 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/assets/upcar-logo-preto.png" 
            alt="UpCar Aspiradores" 
            className="h-24 mx-auto mb-4 drop-shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Esqueci minha senha
          </h2>
          <p className="text-gray-600 text-sm text-center mb-6">
            Digite seu e-mail e enviaremos instruções para redefinir sua senha
          </p>

          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="seu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <Link
              to="/login"
              className="text-orange-600 hover:text-orange-700 text-sm font-medium block"
            >
              ← Voltar para login
            </Link>
            <p className="text-sm text-gray-600">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-orange-600 hover:text-orange-700 font-medium">
                Registrar
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs uppercase tracking-wider mt-6 drop-shadow-sm">
          Desenvolvido por: Cube³ Tecnologia
        </p>
      </div>
    </div>
  );
};
