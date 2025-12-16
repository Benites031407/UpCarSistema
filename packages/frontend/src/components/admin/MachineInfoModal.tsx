import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { formatCurrency } from '../../utils/currency';

interface MachineInfoModalProps {
  machineId: string;
  machineCode: string;
  onClose: () => void;
}

interface MachineStats {
  machine: {
    id: string;
    code: string;
    location: string;
    status: string;
    pricePerMinute: number;
    maxDurationMinutes: number;
    createdAt: string;
  };
  usage: {
    totalActivations: number;
    totalUsageMinutes: number;
    totalUsageHours: number;
    averageSessionDuration: number;
    utilizationRate: number;
  };
  revenue: {
    totalRevenue: number;
    averageRevenuePerSession: number;
  };
  maintenance: {
    currentOperatingHours: number;
    maintenanceInterval: number;
    hoursUntilMaintenance: number;
    lastCleaning: string;
    daysSinceLastCleaning: number;
    maintenanceRequired: boolean;
  };
  energy: {
    totalKwhConsumption: number;
    powerConsumptionWatts: number;
    kwhRate: number;
    totalEnergyCost: number;
  };
  maintenanceLogs: Array<{
    id: string;
    type: string;
    description?: string;
    cost?: number;
    partsReplaced?: string[];
    date: string;
  }>;
  recentSessions: Array<{
    id: string;
    userName: string;
    duration: number;
    cost: number;
    date: string;
  }>;
  usageByDay: Array<{
    day: string;
    sessions: number;
  }>;
}

export const MachineInfoModal: React.FC<MachineInfoModalProps> = ({
  machineId,
  machineCode,
  onClose,
}) => {
  const [stats, setStats] = useState<MachineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMachineStats();
  }, [machineId]);

  const fetchMachineStats = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/machines/${machineId}/stats`);
      setStats(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-2xl font-bold">Informações do Aspirador {machineCode}</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {stats && !loading && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border-2 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Total de Ativações</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.usage.totalActivations}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-full">
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border-2 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Receita Total</p>
                      <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.revenue.totalRevenue)}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-full">
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border-2 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Tempo Total de Uso</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.usage.totalUsageHours}h</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-full">
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Estatísticas de Uso
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Duração Média</p>
                    <p className="text-xl font-semibold text-gray-900">{stats.usage.averageSessionDuration} min</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Taxa de Utilização</p>
                    <p className="text-xl font-semibold text-gray-900">{stats.usage.utilizationRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Receita Média/Sessão</p>
                    <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.revenue.averageRevenuePerSession)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Preço por Minuto</p>
                    <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.machine.pricePerMinute)}</p>
                  </div>
                </div>
              </div>

              {/* Maintenance Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Informações de Manutenção
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Última Limpeza</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(stats.maintenance.lastCleaning)}</p>
                    <p className="text-xs text-gray-500">Há {stats.maintenance.daysSinceLastCleaning} dias</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tempo Total de Uso</p>
                    <p className="text-lg font-semibold text-gray-900">{stats.maintenance.currentOperatingHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Intervalo de Manutenção</p>
                    <p className="text-lg font-semibold text-gray-900">{stats.maintenance.maintenanceInterval}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Horas até Manutenção</p>
                    <p className={`text-lg font-semibold ${stats.maintenance.maintenanceRequired ? 'text-red-600' : 'text-gray-900'}`}>
                      {stats.maintenance.hoursUntilMaintenance}h
                    </p>
                    {stats.maintenance.maintenanceRequired && (
                      <p className="text-xs text-red-600 font-medium">Manutenção Necessária!</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Energy Consumption */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Consumo de Energia
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Consumo Total</p>
                    <p className="text-xl font-semibold text-gray-900">{stats.energy.totalKwhConsumption} kWh</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Potência do Aspirador</p>
                    <p className="text-xl font-semibold text-gray-900">{stats.energy.powerConsumptionWatts}W</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Custo Total de Energia</p>
                    <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.energy.totalEnergyCost)}</p>
                    <p className="text-xs text-gray-500">Tarifa: {formatCurrency(stats.energy.kwhRate)}/kWh</p>
                  </div>
                </div>
              </div>

              {/* Maintenance Logs */}
              {stats.maintenanceLogs.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Histórico de Manutenção
                  </h3>
                  <div className="space-y-3">
                    {stats.maintenanceLogs.map((log) => (
                      <div key={log.id} className="border-l-4 border-orange-500 pl-4 py-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 capitalize">{log.type.replace('_', ' ')}</p>
                            {log.description && (
                              <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                            )}
                            {log.partsReplaced && log.partsReplaced.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Peças: {log.partsReplaced.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{formatDate(log.date)}</p>
                            {log.cost && (
                              <p className="text-sm font-medium text-gray-900">{formatCurrency(log.cost)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage by Day of Week */}
              {stats.usageByDay.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Uso por Dia da Semana</h3>
                  <div className="space-y-2">
                    {stats.usageByDay.map((day) => {
                      const maxSessions = Math.max(...stats.usageByDay.map(d => d.sessions));
                      const percentage = (day.sessions / maxSessions) * 100;
                      return (
                        <div key={day.day} className="flex items-center">
                          <div className="w-24 text-sm text-gray-600">{day.day}</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-orange-600 h-6 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-xs font-medium text-white">{day.sessions}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              {stats.recentSessions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessões Recentes</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duração</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.recentSessions.map((session) => (
                          <tr key={session.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{session.userName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{session.duration} min</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(session.cost)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(session.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-md hover:from-orange-600 hover:to-orange-700 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
