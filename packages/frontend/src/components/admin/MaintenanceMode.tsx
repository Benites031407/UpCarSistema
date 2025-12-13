import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../utils/api';

interface Machine {
  id: string;
  code: string;
  location: string;
  status: string;
  currentOperatingHours: number;
  maintenanceInterval: number;
}

export const MaintenanceMode: React.FC = () => {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [machineCode, setMachineCode] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Fetch machine by code
  const { refetch: fetchMachine, isFetching } = useQuery({
    queryKey: ['machine-by-code', machineCode],
    queryFn: async () => {
      if (!machineCode || machineCode.length !== 6) return null;
      const response = await api.get(`/admin/machines?code=${machineCode}`);
      const machines = response.data as Machine[];
      return machines.find((m: Machine) => m.code === machineCode) || null;
    },
    enabled: false,
  });

  // Set machine to maintenance
  const setMaintenanceMutation = useMutation({
    mutationFn: async (machineId: string) => {
      const response = await api.put(`/admin/machines/${machineId}`, { status: 'maintenance' });
      return response.data;
    },
    onSuccess: (data) => {
      setSelectedMachine(data);
      setShowCodeInput(false);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
    },
    onError: () => {
      setError('Erro ao colocar máquina em manutenção');
    },
  });

  // Complete maintenance and set back to online
  const completeMaintenanceMutation = useMutation({
    mutationFn: async (machineId: string) => {
      const response = await api.patch(`/admin/machines/${machineId}/reset-maintenance`);
      return response.data;
    },
    onSuccess: () => {
      setSelectedMachine(null);
      setMachineCode('');
      queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
    },
    onError: () => {
      setError('Erro ao finalizar manutenção');
    },
  });

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (machineCode.length !== 6) {
      setError('O código deve ter 6 dígitos');
      return;
    }

    try {
      const result = await fetchMachine();
      const machine = result.data;

      if (!machine) {
        setError('Máquina não encontrada');
        return;
      }

      setMaintenanceMutation.mutate(machine.id);
    } catch (err) {
      setError('Erro ao buscar máquina');
    }
  };

  const handleCancel = () => {
    setSelectedMachine(null);
    setMachineCode('');
    setShowCodeInput(false);
    setError('');
  };

  const handleComplete = () => {
    if (selectedMachine) {
      completeMaintenanceMutation.mutate(selectedMachine.id);
    }
  };

  // Code Input Modal
  const codeInputModal = showCodeInput && !selectedMachine ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 sm:p-8 transform transition-all my-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Modo de Manutenção</h2>
            <p className="text-sm text-gray-600">Insira o código da máquina para iniciar</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleCodeSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Código da Máquina
            </label>
            <input
              type="text"
              value={machineCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setMachineCode(value);
                setError('');
              }}
              placeholder="000000"
              maxLength={6}
              className="block w-full px-6 py-4 text-center text-3xl sm:text-4xl font-bold tracking-widest border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              autoFocus
            />
            <p className="mt-3 text-xs sm:text-sm text-gray-500 text-center">Digite o código de 6 dígitos da máquina</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={machineCode.length !== 6 || isFetching || setMaintenanceMutation.isPending}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
            >
              {isFetching || setMaintenanceMutation.isPending ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  // Maintenance In Progress Modal
  const maintenanceModal = selectedMachine ? (() => {
    const hoursUsed = selectedMachine.currentOperatingHours;
    const maintenanceLimit = selectedMachine.maintenanceInterval;
    const percentage = (hoursUsed / maintenanceLimit) * 100;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 transform transition-all my-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-14 h-14 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Manutenção em Andamento</h2>
            <div className="inline-flex items-center px-4 py-2 bg-orange-100 rounded-full mb-2">
              <span className="text-xl sm:text-2xl font-bold text-orange-600">Máquina {selectedMachine.code}</span>
            </div>
            <p className="text-sm sm:text-base text-gray-600 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {selectedMachine.location}
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 sm:p-8 mb-6 shadow-inner">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm sm:text-base font-semibold text-gray-700">Horas de Uso</span>
                <span className="text-lg sm:text-xl font-bold text-gray-900">
                  {hoursUsed.toFixed(2)}h <span className="text-gray-400">/</span> {maintenanceLimit}h
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentage >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                    percentage >= 80 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                    'bg-gradient-to-r from-green-400 to-green-500'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs sm:text-sm text-gray-500">{percentage.toFixed(1)}% do limite</p>
                {percentage >= 100 && (
                  <span className="text-xs sm:text-sm font-semibold text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Limite excedido
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-gray-300 pt-5">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm sm:text-base text-gray-700">
                    Realize a manutenção necessária e clique em <strong className="text-green-700">Finalizar</strong> quando concluir. O contador será zerado automaticamente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={completeMaintenanceMutation.isPending}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
            >
              {completeMaintenanceMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Finalizando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Finalizar Manutenção
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  })() : null;

  // Main Button
  return (
    <>
      <button
        onClick={() => setShowCodeInput(true)}
        className="w-full flex items-center justify-center px-4 py-3 bg-gray-900 hover:bg-black rounded-lg transition-colors font-medium text-white shadow-lg"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Modo de Manutenção
      </button>
      {codeInputModal && ReactDOM.createPortal(codeInputModal, document.body)}
      {maintenanceModal && ReactDOM.createPortal(maintenanceModal, document.body)}
    </>
  );
};
