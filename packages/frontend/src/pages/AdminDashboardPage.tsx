import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { MachineRegistryComponent } from '../components/admin/MachineRegistryComponent';
import { MonitoringDashboard } from '../components/admin/MonitoringDashboard';
import { CustomerManagement } from '../components/admin/CustomerManagement';
import { AnalyticsComponent } from '../components/admin/AnalyticsComponent';
import { MaintenanceMode } from '../components/admin/MaintenanceMode';

type TabType = 'monitoring' | 'machines' | 'customers' | 'analytics';

export const AdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('monitoring');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set page title for admin
  useEffect(() => {
    document.title = 'UpCar Administrador';
    return () => {
      document.title = 'UpCar Aspiradores';
    };
  }, []);

  // Redirect non-admin users
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const tabs = [
    { 
      id: 'monitoring' as TabType, 
      label: 'Monitoramento', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      id: 'machines' as TabType, 
      label: 'Máquinas', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    { 
      id: 'customers' as TabType, 
      label: 'Clientes', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    { 
      id: 'analytics' as TabType, 
      label: 'Relatórios', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'monitoring':
        return <MonitoringDashboard />;
      case 'machines':
        return <MachineRegistryComponent />;
      case 'customers':
        return <CustomerManagement />;
      case 'analytics':
        return <AnalyticsComponent />;
      default:
        return <MonitoringDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-orange-50 lg:bg-gray-100">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`
        bg-gradient-to-b from-orange-600 to-orange-500 text-white 
        w-64 flex flex-col shadow-xl
        fixed lg:static inset-y-0 left-0 z-30
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo/Brand */}
        <div className="py-6 px-4 border-b border-orange-400">
          <img 
            src="/assets/upcar-logo-preto.png" 
            alt="UpCar Aspiradores" 
            className="h-16 mx-auto drop-shadow-lg"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false); // Close sidebar on mobile after selection
              }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-700 shadow-lg'
                  : 'hover:bg-orange-500'
              }`}
            >
              <div className="flex-shrink-0">{tab.icon}</div>
              <span className="ml-3 font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Maintenance Mode Button */}
        <div className="px-4 pb-4">
          <MaintenanceMode />
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-orange-400">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 px-2">
              <div className="w-10 h-10 rounded-full bg-orange-700 flex items-center justify-center font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-orange-200 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-orange-600 to-orange-500 lg:bg-white shadow-lg lg:shadow-sm border-b border-orange-400 lg:border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button & Logo */}
            <div className="flex items-center space-x-3 lg:space-x-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-orange-500 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Mobile Logo */}
              <img 
                src="/assets/upcar-logo-preto.png" 
                alt="UpCar" 
                className="h-8 lg:hidden"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Desktop Date */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="text-sm text-white">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            {/* User Avatar on Mobile */}
            <div className="lg:hidden w-10 h-10 rounded-full bg-orange-700 flex items-center justify-center font-bold text-white shadow-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};