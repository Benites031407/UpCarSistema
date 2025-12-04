import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../utils/api';
import { MachineInfoModal } from './MachineInfoModal';

interface Machine {
  id: string;
  code: string;
  qrCode: string;
  location: string;
  controllerId: string;
  status: 'online' | 'offline' | 'maintenance' | 'in_use';
  operatingHours: {
    start: string;
    end: string;
  };
  maintenanceInterval: number;
  currentOperatingHours: number;
  pricePerMinute: number;
  maxDurationMinutes: number;
  powerConsumptionWatts: number;
  kwhRate: number;
  temperature?: number;
  lastHeartbeat?: string;
  createdAt: string;
  updatedAt: string;
}

interface MachineFormData {
  code: string;
  location: string;
  controllerId: string;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  maintenanceInterval: number;
  pricePerMinute: number;
  maxDurationMinutes: number;
  powerConsumptionWatts: number;
  kwhRate: number;
}

export const MachineRegistryComponent: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [selectedMachineForInfo, setSelectedMachineForInfo] = useState<Machine | null>(null);
  const [selectedMachineForQR, setSelectedMachineForQR] = useState<Machine | null>(null);
  const [formData, setFormData] = useState<MachineFormData>({
    code: '',
    location: '',
    controllerId: '',
    operatingHoursStart: '08:00',
    operatingHoursEnd: '18:00',
    maintenanceInterval: 100,
    pricePerMinute: 1.00,
    maxDurationMinutes: 30,
    powerConsumptionWatts: 1200,
    kwhRate: 0.65,
  });
  const formRef = React.useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const { data: machines, isLoading, error } = useQuery({
    queryKey: ['admin-machines'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/machines');
        return response.data as Machine[];
      } catch (error: any) {
        console.error('Failed to fetch machines:', error);
        throw error;
      }
    },
    retry: 1,
  });

  const createMachineMutation = useMutation({
    mutationFn: async (data: MachineFormData) => {
      const payload = {
        code: data.code,
        location: data.location,
        controllerId: data.controllerId,
        operatingHours: {
          start: data.operatingHoursStart,
          end: data.operatingHoursEnd,
        },
        maintenanceInterval: data.maintenanceInterval,
        pricePerMinute: data.pricePerMinute,
        maxDurationMinutes: data.maxDurationMinutes,
        powerConsumptionWatts: data.powerConsumptionWatts,
        kwhRate: data.kwhRate,
      };
      const response = await api.post('/admin/machines', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
      resetForm();
    },
  });

  const updateMachineMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MachineFormData> }) => {
      const payload: any = {};
      if (data.location !== undefined) payload.location = data.location;
      if (data.operatingHoursStart !== undefined && data.operatingHoursEnd !== undefined) {
        // Strip seconds from time format (HH:MM:SS -> HH:MM)
        payload.operatingHours = {
          start: data.operatingHoursStart.substring(0, 5),
          end: data.operatingHoursEnd.substring(0, 5),
        };
      }
      if (data.maintenanceInterval !== undefined) payload.maintenanceInterval = data.maintenanceInterval;
      if (data.pricePerMinute !== undefined) payload.pricePerMinute = data.pricePerMinute;
      if (data.maxDurationMinutes !== undefined) payload.maxDurationMinutes = data.maxDurationMinutes;
      if (data.powerConsumptionWatts !== undefined) payload.powerConsumptionWatts = data.powerConsumptionWatts;
      if (data.kwhRate !== undefined) payload.kwhRate = data.kwhRate;
      
      const response = await api.put(`/admin/machines/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
      resetForm();
    },
  });

  const updateMachineStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.put(`/admin/machines/${id}`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
    },
  });

  const deleteMachineMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/machines/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
    },
  });

  const handleDelete = (machine: Machine) => {
    if (window.confirm(`Tem certeza que deseja excluir o aspirador ${machine.code} (${machine.location})?\n\nEsta ação não pode ser desfeita.`)) {
      deleteMachineMutation.mutate(machine.id);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      location: '',
      controllerId: '',
      operatingHoursStart: '08:00',
      operatingHoursEnd: '18:00',
      maintenanceInterval: 100,
      pricePerMinute: 1.00,
      maxDurationMinutes: 30,
      powerConsumptionWatts: 1200,
      kwhRate: 0.65,
    });
    setShowForm(false);
    setEditingMachine(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMachine) {
      updateMachineMutation.mutate({ id: editingMachine.id, data: formData });
    } else {
      createMachineMutation.mutate(formData);
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({
      code: machine.code,
      location: machine.location,
      controllerId: machine.controllerId,
      operatingHoursStart: machine.operatingHours.start,
      operatingHoursEnd: machine.operatingHours.end,
      maintenanceInterval: machine.maintenanceInterval,
      pricePerMinute: machine.pricePerMinute,
      maxDurationMinutes: machine.maxDurationMinutes,
      powerConsumptionWatts: machine.powerConsumptionWatts || 1200,
      kwhRate: machine.kwhRate || 0.65,
    });
    setShowForm(true);
    
    // Scroll to form on mobile to show it
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleStatusChange = (machineId: string, newStatus: string) => {
    updateMachineStatusMutation.mutate({ id: machineId, status: newStatus });
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar máquinas</p>
          <p className="text-sm text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium shadow-lg transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="hidden lg:block text-2xl font-bold text-gray-900">Registro de Máquinas</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 text-white px-5 py-3 rounded-lg hover:bg-orange-700 text-sm lg:text-base font-medium shadow-lg transition-all"
          >
            <span className="hidden lg:inline">Adicionar Nova Máquina</span>
            <span className="lg:hidden">+ Nova Máquina</span>
          </button>
        )}
      </div>

      {/* Registration Form */}
      {showForm && (
        <div ref={formRef} className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingMachine ? 'Editar Máquina' : 'Registrar Nova Máquina'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Código da Máquina
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!editingMachine}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Localização
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ID do Controlador
                </label>
                <input
                  type="text"
                  value={formData.controllerId}
                  onChange={(e) => setFormData({ ...formData, controllerId: e.target.value })}
                  disabled={!!editingMachine}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Intervalo de Manutenção (horas)
                </label>
                <input
                  type="number"
                  value={formData.maintenanceInterval}
                  onChange={(e) => setFormData({ ...formData, maintenanceInterval: Number(e.target.value) })}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Horário de Início
                </label>
                <input
                  type="time"
                  value={formData.operatingHoursStart}
                  onChange={(e) => setFormData({ ...formData, operatingHoursStart: e.target.value })}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Horário de Término
                </label>
                <input
                  type="time"
                  value={formData.operatingHoursEnd}
                  onChange={(e) => setFormData({ ...formData, operatingHoursEnd: e.target.value })}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Preço por Minuto (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={formData.pricePerMinute}
                  onChange={(e) => setFormData({ ...formData, pricePerMinute: Number(e.target.value) })}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Valor cobrado por minuto de uso</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Duração Máxima (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.maxDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, maxDurationMinutes: Number(e.target.value) })}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Tempo máximo de uso permitido (1-120 minutos)</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Consumo de Energia (Watts)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.powerConsumptionWatts}
                  onChange={(e) => setFormData({ ...formData, powerConsumptionWatts: Number(e.target.value) })}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Potência do aspirador em watts (ex: 1200W)</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tarifa de Energia (R$/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10"
                  value={formData.kwhRate}
                  onChange={(e) => setFormData({ ...formData, kwhRate: Number(e.target.value) })}
                  className="block w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Custo por kWh de energia elétrica</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMachineMutation.isPending || updateMachineMutation.isPending}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
              >
                {editingMachine ? 'Atualizar' : 'Registrar'} Máquina
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Machines List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Máquinas Registradas
          </h3>
          
          {machines && machines.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-4">
                {machines.map((machine) => (
                  <div key={machine.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{machine.code}</h3>
                        <p className="text-sm text-gray-600">{machine.location}</p>
                      </div>
                      <select
                        value={machine.status}
                        onChange={(e) => handleStatusChange(machine.id, e.target.value)}
                        className={`text-xs font-medium rounded-full px-3 py-1 ${getStatusColor(machine.status)}`}
                      >
                        <option value="online">Ligada</option>
                        <option value="offline">Desligada</option>
                        <option value="maintenance">Manutenção</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Horário:</span>
                        <span className="font-medium">{machine.operatingHours.start} - {machine.operatingHours.end}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Manutenção:</span>
                        <span className="font-medium">{machine.currentOperatingHours}h / {machine.maintenanceInterval}h</span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => setSelectedMachineForInfo(machine)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                        title="Ver informações"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(machine)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedMachineForQR(machine)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="QR Code"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(machine)}
                        disabled={deleteMachineMutation.isPending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horário de Operação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manutenção
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {machines.map((machine) => (
                    <tr key={machine.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {machine.code}
                          </div>
                          <div className="text-sm text-gray-500">
                            {machine.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={machine.status}
                          onChange={(e) => handleStatusChange(machine.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2 py-1 ${getStatusColor(machine.status)}`}
                        >
                          <option value="online">Ligada</option>
                          <option value="offline">Desligada</option>
                          <option value="maintenance">Manutenção</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {machine.operatingHours.start} - {machine.operatingHours.end}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {machine.currentOperatingHours}h / {machine.maintenanceInterval}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setSelectedMachineForInfo(machine)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                            title="Ver informações"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(machine)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setSelectedMachineForQR(machine)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="QR Code"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(machine)}
                            disabled={deleteMachineMutation.isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                            title="Excluir"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhuma máquina registrada ainda.
            </div>
          )}
        </div>
      </div>

      {/* Machine Info Modal */}
      {selectedMachineForInfo && (
        <MachineInfoModal
          machineId={selectedMachineForInfo.id}
          machineCode={selectedMachineForInfo.code}
          onClose={() => setSelectedMachineForInfo(null)}
        />
      )}

      {/* QR Code Modal */}
      {selectedMachineForQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                QR Code - {selectedMachineForQR.code}
              </h2>
              <button
                onClick={() => setSelectedMachineForQR(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">{selectedMachineForQR.location}</p>
              
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img
                  src={`data:image/svg+xml;base64,${selectedMachineForQR.qrCode}`}
                  alt={`QR Code for ${selectedMachineForQR.code}`}
                  className="w-64 h-64"
                />
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                Escaneie este código para acessar o aspirador
              </p>
              
              <div className="mt-6 space-y-2">
                <a
                  href={`data:image/svg+xml;base64,${selectedMachineForQR.qrCode}`}
                  download={`qrcode-${selectedMachineForQR.code}.svg`}
                  className="block w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Baixar QR Code (SVG)
                </a>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Imprimir QR Code
                </button>
                <button
                  onClick={() => setSelectedMachineForQR(null)}
                  className="block w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};