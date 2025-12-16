import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';

interface DashboardMetrics {
  totalMachines: number;
  onlineMachines: number;
  maintenanceMachines: number;
  inUseMachines: number;
  totalRevenue: number;
  todayRevenue: number;
  activeSessions: number;
  totalCustomers?: number;
}

interface MachineStatus {
  id: string;
  code: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance' | 'in_use';
  currentOperatingHours: number;
  lastHeartbeat?: string;
}



export const MonitoringDashboard: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/metrics');
      return response.data as DashboardMetrics;
    },
    refetchInterval: refreshInterval || false,
  });

  const { data: machines, isLoading: machinesLoading } = useQuery({
    queryKey: ['machine-status'],
    queryFn: async () => {
      const response = await api.get('/admin/machines/status');
      return response.data as MachineStatus[];
    },
    refetchInterval: refreshInterval || false,
  });



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_use':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" />
          </svg>
        );
      case 'offline':
        return (
          <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" />
          </svg>
        );
      case 'in_use':
        return (
          <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" />
          </svg>
        );
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online':
        return 'Ligada';
      case 'offline':
        return 'Desligada';
      case 'maintenance':
        return 'Manutenção';
      case 'in_use':
        return 'Em Uso';
      default:
        return status;
    }
  };

  if (metricsLoading || machinesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 border-2 border-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Receita Total
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    R$ {(metrics?.totalRevenue || 0).toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 border-2 border-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Clientes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics?.totalCustomers || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 border-2 border-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Máquinas
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics?.totalMachines || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 border-2 border-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Máquinas Offline
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {(metrics?.totalMachines || 0) - (metrics?.onlineMachines || 0) - (metrics?.maintenanceMachines || 0) - (metrics?.inUseMachines || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Status Grid */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Status das Máquinas
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Atualização automática:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-sm border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value={10000}>10 segundos</option>
                <option value={30000}>30 segundos</option>
                <option value={60000}>1 minuto</option>
                <option value={120000}>2 minutos</option>
                <option value={0}>Desligado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines?.map((machine) => (
              <div
                key={machine.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {machine.code}
                    </h4>
                    <p className="text-sm text-gray-500">{machine.location}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      machine.status
                    )}`}
                  >
                    {getStatusIcon(machine.status)} {getStatusLabel(machine.status)}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Tempo Total de Uso:</span>
                    <span className="font-semibold text-gray-900">{machine.currentOperatingHours.toFixed(1)}h</span>
                  </div>
                  {machine.lastHeartbeat && (
                    <div className="flex justify-between">
                      <span>Última Atualização:</span>
                      <span>
                        {new Date(machine.lastHeartbeat).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(!machines || machines.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              Nenhuma máquina registrada ainda.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};