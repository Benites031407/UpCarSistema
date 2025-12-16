import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';

interface AnalyticsData {
  totalRevenue: number;
  totalSessions: number;
  totalCustomers: number;
  averageSessionDuration: number;
  revenueByMachine: Array<{
    machineCode: string;
    location: string;
    revenue: number;
    sessions: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    sessions: number;
  }>;
  peakUsageHours: Array<{
    hour: number;
    sessions: number;
  }>;
  customerActivity: Array<{
    customerId: string;
    customerName: string;
    totalSessions: number;
    totalSpent: number;
    lastActivity: string;
  }>;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

export const AnalyticsComponent: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    };
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const response = await api.get(`/admin/analytics?${params}`);
      return response.data as AnalyticsData;
    },
  });

  const handleExportReport = async (type: 'revenue' | 'usage' | 'customers' | 'consolidated' | 'subscribers') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        type,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      
      const response = await api.get(`/admin/reports/export?${params}`, {
        responseType: 'blob',
      });

      // Create a download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Format dates for filename (DD-MM-YYYY)
      const formattedStartDate = new Date(dateRange.startDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
      const formattedEndDate = new Date(dateRange.endDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
      
      // Use backend's filename from Content-Disposition header if available, otherwise use default
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          link.download = filenameMatch[1].replace(/['"]/g, '');
        } else {
          link.download = type === 'consolidated' 
            ? `Relatorio-Geral-${formattedStartDate}-${formattedEndDate}.pdf`
            : `relatorio-${type}-${dateRange.startDate}-${dateRange.endDate}.pdf`;
        }
      } else {
        link.download = type === 'consolidated' 
          ? `Relatorio-Geral-${formattedStartDate}-${formattedEndDate}.pdf`
          : type === 'subscribers'
          ? `Relatorio-Mensalistas-${formattedStartDate}-${formattedEndDate}.pdf`
          : `relatorio-${type}-${dateRange.startDate}-${dateRange.endDate}.pdf`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Erro ao baixar relatório. Por favor, tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="hidden lg:block text-2xl font-bold text-gray-900">Relatórios</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <button
            onClick={() => handleExportReport('consolidated')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center font-medium text-sm lg:text-base shadow-lg"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Relatório Geral</span>
            <span className="sm:hidden">Geral</span>
          </button>
          <button
            onClick={() => handleExportReport('subscribers')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center font-medium text-sm lg:text-base shadow-lg"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="hidden sm:inline">Relatório de Mensalistas</span>
            <span className="sm:hidden">Mensalistas</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white shadow-lg rounded-xl p-4 lg:p-6 border border-gray-200">
        <div className="flex items-center mb-4">
          <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-base lg:text-lg font-medium text-gray-900">Período</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="p-4 lg:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 lg:w-12 lg:h-12 border-2 border-orange-500 rounded-lg flex items-center justify-center">
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
                    {formatCurrency(analytics?.totalRevenue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="p-4 lg:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 lg:w-12 lg:h-12 border-2 border-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Sessões
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {analytics?.totalSessions || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="p-4 lg:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 lg:w-12 lg:h-12 border-2 border-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Clientes Ativos
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {analytics?.totalCustomers || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="p-4 lg:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 lg:w-12 lg:h-12 border-2 border-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Duração Média da Sessão
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Math.round(analytics?.averageSessionDuration || 0)} min
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Machine */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">
            Receita por Máquina
          </h3>
          {analytics?.revenueByMachine && analytics.revenueByMachine.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {analytics.revenueByMachine.map((machine) => (
                  <div key={machine.machineCode} className="bg-white rounded-lg p-4 border border-gray-200 shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900">{machine.machineCode}</h4>
                        <p className="text-sm text-gray-600">{machine.location}</p>
                      </div>
                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrency(machine.revenue)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-gray-600">Sessões:</span>
                        <span className="font-bold ml-1">{machine.sessions}</span>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-gray-600">Média:</span>
                        <span className="font-bold ml-1">
                          {formatCurrency(machine.sessions > 0 ? machine.revenue / machine.sessions : 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Máquina
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receita
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessões
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Média por Sessão
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.revenueByMachine.map((machine) => (
                    <tr key={machine.machineCode}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {machine.machineCode}
                          </div>
                          <div className="text-sm text-gray-500">
                            {machine.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(machine.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {machine.sessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(machine.sessions > 0 ? machine.revenue / machine.sessions : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhum dado de receita disponível para o período selecionado.
            </div>
          )}
        </div>
      </div>



      {/* Peak Usage Hours */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Horários de Pico
          </h3>
          {analytics?.peakUsageHours && analytics.peakUsageHours.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {analytics.peakUsageHours.map((hour) => (
                <div key={hour.hour} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-medium text-gray-900">
                    {hour.hour}:00
                  </div>
                  <div className="text-sm text-gray-500">
                    {hour.sessions} sessões
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhum dado de horário de uso disponível para o período selecionado.
            </div>
          )}
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">
            Principais Clientes
          </h3>
          {analytics?.customerActivity && analytics.customerActivity.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {analytics.customerActivity.slice(0, 10).map((customer, index) => (
                  <div key={customer.customerId} className="bg-white rounded-lg p-4 border border-gray-200 shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <span className="bg-gray-800 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3 text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-gray-900">{customer.customerName}</h4>
                          <p className="text-xs text-gray-500">{formatDate(customer.lastActivity)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-gray-600">Sessões:</span>
                        <span className="font-bold ml-1">{customer.totalSessions}</span>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-bold ml-1">
                          {formatCurrency(customer.totalSpent)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessões
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Gasto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Atividade
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.customerActivity.slice(0, 10).map((customer) => (
                    <tr key={customer.customerId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.totalSessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(customer.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhum dado de atividade de clientes disponível para o período selecionado.
            </div>
          )}
        </div>
      </div>

      {/* Loading Modal */}
      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gerando Relatórios</h3>
              <p className="text-sm text-gray-600 text-center">
                Por favor, aguarde enquanto os relatórios são gerados...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};