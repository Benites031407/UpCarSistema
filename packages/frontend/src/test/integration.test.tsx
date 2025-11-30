import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { HomePage } from '../pages/HomePage';
import { MachineActivationPage } from '../pages/MachineActivationPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { QRScanner } from '../components/QRScanner';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';

/**
 * **Feature: machine-rental-system, Frontend Integration Tests**
 * 
 * End-to-end frontend integration tests covering:
 * - Complete customer journey through UI components
 * - QR code scanning and machine activation flow
 * - Payment method selection and processing
 * - Admin dashboard functionality
 * - Real-time updates via WebSocket
 * - Error handling and user feedback
 */

// Mock API responses
const mockApiResponses = {
  machine: {
    id: 'test-machine-1',
    code: 'MACH001',
    location: 'Test Location',
    status: 'online',
    operatingHours: { start: '08:00', end: '18:00' }
  },
  user: {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    accountBalance: 25.50,
    subscriptionStatus: 'none'
  },
  session: {
    id: 'test-session-1',
    duration: 15,
    cost: 15,
    status: 'pending'
  }
};

// Mock fetch globally
global.fetch = vi.fn();

const createWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Frontend Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Mock successful API responses by default
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponses.machine
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Customer Journey - QR Scan to Machine Activation', () => {
    it('should complete full customer workflow from QR scan to payment', async () => {
      // Mock QR scanner API
      vi.mock('qr-scanner', () => ({
        default: vi.fn(),
        hasCamera: vi.fn().mockResolvedValue(true)
      }));

      // Step 1: Customer accesses home page
      render(<HomePage />, { wrapper: createWrapper });
      
      expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
      expect(screen.getByText(/enter machine code/i)).toBeInTheDocument();

      // Step 2: Customer enters machine code manually
      const machineCodeInput = screen.getByPlaceholderText(/enter machine code/i);
      await user.type(machineCodeInput, 'MACH001');
      
      const submitButton = screen.getByRole('button', { name: /check machine/i });
      await user.click(submitButton);

      // Should navigate to machine activation page
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/machines/MACH001'),
          expect.any(Object)
        );
      });
    });

    it('should handle QR code scanning workflow', async () => {
      // Mock camera permissions and QR scanner
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }]
          })
        }
      });

      render(<QRScanner onScan={vi.fn()} onError={vi.fn()} />, { wrapper: createWrapper });

      // Should request camera permission and start scanner
      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: { facingMode: 'environment' }
        });
      });
    });

    it('should display machine information and allow duration selection', async () => {
      // Mock machine data fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.machine
      });

      render(<MachineActivationPage />, { wrapper: createWrapper });

      await waitFor(() => {
        expect(screen.getByText('Test Location')).toBeInTheDocument();
        expect(screen.getByText(/online/i)).toBeInTheDocument();
      });

      // Test duration selection
      const durationSlider = screen.getByRole('slider');
      fireEvent.change(durationSlider, { target: { value: '20' } });

      await waitFor(() => {
        expect(screen.getByText(/20 minutes/i)).toBeInTheDocument();
        expect(screen.getByText(/R\$ 20/i)).toBeInTheDocument();
      });
    });

    it('should handle payment method selection', async () => {
      const mockUser = { ...mockApiResponses.user, accountBalance: 30.0 };
      
      render(
        <PaymentMethodSelector 
          cost={15} 
          userBalance={mockUser.accountBalance}
          onPaymentMethodSelect={vi.fn()}
        />, 
        { wrapper: createWrapper }
      );

      // Should show both balance and PIX options when balance is sufficient
      expect(screen.getByText(/use account balance/i)).toBeInTheDocument();
      expect(screen.getByText(/pay with pix/i)).toBeInTheDocument();
      expect(screen.getByText(/R\$ 30.00/i)).toBeInTheDocument();

      // Select balance payment
      const balanceOption = screen.getByText(/use account balance/i);
      await user.click(balanceOption);

      // Should show balance will be deducted
      expect(screen.getByText(/new balance: R\$ 15.00/i)).toBeInTheDocument();
    });

    it('should handle insufficient balance scenario', async () => {
      const mockUser = { ...mockApiResponses.user, accountBalance: 5.0 };
      
      render(
        <PaymentMethodSelector 
          cost={15} 
          userBalance={mockUser.accountBalance}
          onPaymentMethodSelect={vi.fn()}
        />, 
        { wrapper: createWrapper }
      );

      // Should show shortfall and require PIX payment
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
      expect(screen.getByText(/shortfall: R\$ 10.00/i)).toBeInTheDocument();
      expect(screen.getByText(/pay with pix/i)).toBeInTheDocument();
      
      // Balance option should be disabled
      const balanceOption = screen.getByText(/use account balance/i).closest('button');
      expect(balanceOption).toBeDisabled();
    });
  });

  describe('Admin Dashboard Integration', () => {
    beforeEach(() => {
      // Mock admin authentication
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ...mockApiResponses.user, role: 'admin' })
          });
        }
        if (url.includes('/api/admin/analytics')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              totalMachines: 10,
              operationalCount: 8,
              maintenanceCount: 2,
              totalRevenue: 1250.75,
              totalActivations: 156
            })
          });
        }
        if (url.includes('/api/machines')) {
          return Promise.resolve({
            ok: true,
            json: async () => [mockApiResponses.machine]
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });
    });

    it('should display dashboard metrics and machine status', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper });

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // Total machines
        expect(screen.getByText('8')).toBeInTheDocument();  // Operational
        expect(screen.getByText('2')).toBeInTheDocument();  // Maintenance
        expect(screen.getByText(/R\$ 1,250.75/i)).toBeInTheDocument(); // Revenue
      });

      // Should display machine list
      await waitFor(() => {
        expect(screen.getByText('MACH001')).toBeInTheDocument();
        expect(screen.getByText('Test Location')).toBeInTheDocument();
      });
    });

    it('should handle machine registration workflow', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper });

      // Click add machine button
      const addButton = screen.getByRole('button', { name: /add machine/i });
      await user.click(addButton);

      // Fill out machine registration form
      const codeInput = screen.getByPlaceholderText(/machine code/i);
      const locationInput = screen.getByPlaceholderText(/location/i);
      const controllerInput = screen.getByPlaceholderText(/controller id/i);

      await user.type(codeInput, 'MACH002');
      await user.type(locationInput, 'New Location');
      await user.type(controllerInput, 'pi-controller-2');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /register machine/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/machines'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('MACH002')
          })
        );
      });
    });

    it('should handle machine maintenance mode toggle', async () => {
      render(<AdminDashboardPage />, { wrapper: createWrapper });

      await waitFor(() => {
        expect(screen.getByText('MACH001')).toBeInTheDocument();
      });

      // Find and click maintenance toggle
      const maintenanceToggle = screen.getByRole('button', { name: /maintenance/i });
      await user.click(maintenanceToggle);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/machines/test-machine-1/maintenance'),
          expect.objectContaining({
            method: 'PUT'
          })
        );
      });
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle WebSocket machine status updates', async () => {
      // Mock WebSocket
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN
      };

      global.WebSocket = vi.fn(() => mockWebSocket) as any;

      render(<AdminDashboardPage />, { wrapper: createWrapper });

      // Simulate WebSocket message
      const statusUpdate = {
        type: 'machine_status_update',
        data: {
          machineId: 'test-machine-1',
          status: 'in_use',
          temperature: 28.5
        }
      };

      // Find the message handler and call it
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (messageHandler) {
        messageHandler({ data: JSON.stringify(statusUpdate) });
      }

      // Should update machine status in UI
      await waitFor(() => {
        expect(screen.getByText(/in use/i)).toBeInTheDocument();
        expect(screen.getByText(/28.5°C/i)).toBeInTheDocument();
      });
    });

    it('should handle real-time dashboard metrics updates', async () => {
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN
      };

      global.WebSocket = vi.fn(() => mockWebSocket) as any;

      render(<AdminDashboardPage />, { wrapper: createWrapper });

      // Simulate metrics update
      const metricsUpdate = {
        type: 'dashboard_metrics_update',
        data: {
          totalMachines: 12,
          operationalCount: 10,
          maintenanceCount: 2,
          totalRevenue: 1350.25
        }
      };

      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (messageHandler) {
        messageHandler({ data: JSON.stringify(metricsUpdate) });
      }

      // Should update metrics in real-time
      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument(); // Updated total
        expect(screen.getByText(/R\$ 1,350.25/i)).toBeInTheDocument(); // Updated revenue
      });
    });
  });

  describe('Error Handling and User Feedback', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<HomePage />, { wrapper: createWrapper });

      const machineCodeInput = screen.getByPlaceholderText(/enter machine code/i);
      await user.type(machineCodeInput, 'INVALID');
      
      const submitButton = screen.getByRole('button', { name: /check machine/i });
      await user.click(submitButton);

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should handle machine not found scenario', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Machine not found' })
      });

      render(<HomePage />, { wrapper: createWrapper });

      const machineCodeInput = screen.getByPlaceholderText(/enter machine code/i);
      await user.type(machineCodeInput, 'NOTFOUND');
      
      const submitButton = screen.getByRole('button', { name: /check machine/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/machine not found/i)).toBeInTheDocument();
      });
    });

    it('should handle offline machine status', async () => {
      const offlineMachine = { ...mockApiResponses.machine, status: 'offline' };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => offlineMachine
      });

      render(<MachineActivationPage />, { wrapper: createWrapper });

      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
        expect(screen.getByText(/machine is currently unavailable/i)).toBeInTheDocument();
      });

      // Activation button should be disabled
      const activateButton = screen.getByRole('button', { name: /activate/i });
      expect(activateButton).toBeDisabled();
    });

    it('should handle payment processing errors', async () => {
      render(<MachineActivationPage />, { wrapper: createWrapper });

      // Mock payment failure
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Payment processing failed' })
      });

      // Simulate payment attempt
      const payButton = screen.getByRole('button', { name: /pay and activate/i });
      await user.click(payButton);

      await waitFor(() => {
        expect(screen.getByText(/payment processing failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Integration', () => {
    it('should handle login workflow', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockApiResponses.user,
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token'
        })
      });

      render(<LoginPage />, { wrapper: createWrapper });

      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test@example.com')
          })
        );
      });
    });

    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' })
      });

      render(<LoginPage />, { wrapper: createWrapper });

      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should redirect unauthenticated users to login', async () => {
      // Mock unauthenticated state
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });

      render(<AdminDashboardPage />, { wrapper: createWrapper });

      // Should redirect to login or show login prompt
      await waitFor(() => {
        expect(screen.getByText(/sign in/i) || screen.getByText(/login/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should adapt layout for mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<HomePage />, { wrapper: createWrapper });

      // Should display mobile-optimized layout
      const container = screen.getByRole('main') || screen.getByTestId('main-container');
      expect(container).toHaveClass('max-w-md');
    });

    it('should handle touch interactions on mobile', async () => {
      render(<QRScanner onScan={vi.fn()} onError={vi.fn()} />, { wrapper: createWrapper });

      // Should handle touch events for camera controls
      const cameraButton = screen.getByRole('button', { name: /camera/i });
      
      // Simulate touch event
      fireEvent.touchStart(cameraButton);
      fireEvent.touchEnd(cameraButton);

      // Should respond to touch interactions
      expect(cameraButton).toHaveAttribute('aria-pressed');
    });
  });
});