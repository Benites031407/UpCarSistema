import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');
      const error = searchParams.get('error');

      if (error) {
        navigate('/login?error=oauth_failed');
        return;
      }

      if (token && refreshToken) {
        try {
          localStorage.setItem('accessToken', token);
          localStorage.setItem('refreshToken', refreshToken);
          api.setAuthToken(token);
          await refreshUser();
          
          const returnTo = sessionStorage.getItem('returnTo');
          if (returnTo) {
            sessionStorage.removeItem('returnTo');
            navigate(returnTo);
          } else {
            navigate('/');
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          navigate('/login?error=oauth_failed');
        }
      } else {
        navigate('/login?error=oauth_failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completando autenticação...</p>
      </div>
    </div>
  );
};
