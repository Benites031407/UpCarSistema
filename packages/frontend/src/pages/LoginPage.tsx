import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      const params = new URLSearchParams(location.search);
      const returnTo = params.get('returnTo');
      
      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate, location]);

  // Check for OAuth error in URL params
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('error');
    if (oauthError === 'oauth_failed') {
      setError('Autenticação com Google falhou. Por favor, tente novamente.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const params = new URLSearchParams(location.search);
    const returnTo = params.get('returnTo');
    const googleAuthUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/google`;
    
    if (returnTo) {
      sessionStorage.setItem('returnTo', returnTo);
    }
    
    window.location.href = googleAuthUrl;
  };


  // Show email/password form
  if (showEmailLogin) {
    return (
      <div className="min-h-screen bg-orange-500 flex items-center justify-center px-4 py-8 relative overflow-hidden">
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
            />
          </div>

          {/* Login Form */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Entrar com E-mail
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Senha
                  </label>
                  <Link to="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                    Esqueci minha senha
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <button
                onClick={() => setShowEmailLogin(false)}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                ← Voltar para opções de login
              </button>
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-orange-600 hover:text-orange-700 font-medium">
                  Registrar
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show main login options (Google or Email)
  return (
    <div className="min-h-screen bg-orange-500 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-white/20 rounded-full -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-64 h-64 bg-white/10 rounded-full top-1/4 -right-32 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute w-80 h-80 bg-orange-600/10 rounded-full bottom-0 left-1/4 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-fade-in">
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

        {/* Title */}
        <h2 className="text-white text-center text-lg font-semibold mb-8 uppercase tracking-wide drop-shadow-md">
          Utilize uma das opções abaixo para acessar
        </h2>

        {/* Google Login */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <p className="text-white text-center mb-3 font-semibold drop-shadow">Conta Google:</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Fazer Login com o Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-white/40"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-orange-400 text-white font-semibold uppercase tracking-wider rounded-full py-1">ou</span>
          </div>
        </div>

        {/* Email/Password Login */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-white text-center mb-3 font-semibold drop-shadow">Conta UpCar:</p>
          <button
            onClick={() => setShowEmailLogin(true)}
            className="w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl border-2 border-white transition-all uppercase tracking-wide shadow-xl hover:shadow-2xl hover:scale-105 transform"
          >
            Acessar com E-mail e Senha
          </button>
        </div>

        {/* Register Link */}
        <div className="text-center mb-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-white/90 text-sm mb-3">
            Não tem uma conta?
          </p>
          <Link 
            to="/register" 
            className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 transform uppercase tracking-wide"
          >
            Criar Conta
          </Link>
        </div>

        {/* Terms */}
        <p className="text-center text-white text-xs mb-6 animate-fade-in drop-shadow-sm" style={{ animationDelay: '0.5s' }}>
          Ao continuar, você aceita nossos{' '}
          <a href="#" className="underline hover:text-white/80 font-medium">Termos e Condições</a>
          {' '}e a{' '}
          <a href="#" className="underline hover:text-white/80 font-medium">Política de Privacidade</a>
        </p>


      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};
