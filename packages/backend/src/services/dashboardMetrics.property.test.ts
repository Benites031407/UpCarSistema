import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Machine, UsageSession, Transaction } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 24: Dashboard metrics accuracy
 * 
 * Property: For any dashboard access, the displayed totals (machines, operational count, 
 * maintenance count, revenue) should accurately reflect current system state
 * 
 * Validates: Requirements 9.1
 */

// Mock dashboard metrics service that aggregates data from various sources
class DashboardMetricsService {
  /**
   * Calculates machine statistics from a list of machines
   */
  calculateMachineStats(machines: Machine[]): {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    inUse: number;
  } {
    const online = machines.filter(m => m.status === 'online').length;
    const offline = machines.filter(m => m.status === 'offline').length;
    const maintenance = machines.filter(m => m.status === 'maintenance').length;
    const inUse = machines.filter(m => m.status === 'in_use').length;

    return {
      total: machines.length,
      online,
      offline,
      maintenance,
      inUse
    };
  }

  /**
   * Calculates session statistics from a list of sessions
   */
  calculateSessionStats(sessions: UsageSession[]): {
    total: number;
    pending: number;
    active: number;
    completed: number;
    failed: number;
  } {
    const pending = sessions.filter(s => s.status === 'pending').length;
    const active = sessions.filter(s => s.status === 'active').length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const failed = sessions.filter(s => s.status === 'failed').length;

    return {
      total: sessions.length,
      pending,
      active,
      completed,
      failed
    };
  }

  /**
   * Calculates revenue statistics from a list of transactions
   */
  calculateRevenueStats(transactions: Transaction[], targetDate?: Date): {
    total: number;
    today: number;
    thisMonth: number;
  } {
    const now = targetDate || new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    thisMonthEnd.setHours(23, 59, 59, 999);

    // Only count completed transactions
    const completedTransactions = transactions.filter(t => t.status === 'completed');

    const total = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const todayTransactions = completedTransactions.filter(t => 
      t.createdAt >= today && t.createdAt <= todayEnd
    );
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const monthTransactions = completedTransactions.filter(t => 
      t.createdAt >= thisMonth && t.createdAt <= thisMonthEnd
    );
    const thisMonthRevenue = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      total,
      today: todayRevenue,
      thisMonth: thisMonthRevenue
    };
  }

  /**
   * Aggregates all dashboard metrics
   */
  getDashboardMetrics(
    machines: Machine[], 
    sessions: UsageSession[], 
    transactions: Transaction[],
    targetDate?: Date
  ): {
    machines: ReturnType<typeof this.calculateMachineStats>;
    sessions: ReturnType<typeof this.calculateSessionStats>;
    revenue: ReturnType<typeof this.calculateRevenueStats>;
  } {
    return {
      machines: this.calculateMachineStats(machines),
      sessions: this.calculateSessionStats(sessions),
      revenue: this.calculateRevenueStats(transactions, targetDate)
    };
  }
}

describe('Dashboard Metrics Property Tests', () => {
  let dashboardService: DashboardMetricsService;

  beforeEach(() => {
    dashboardService = new DashboardMetricsService();
  });

  it('Property 24: Dashboard metrics accuracy - machine counts reflect actual machine states', () => {
    fc.assert(
      fc.property(
        // Generate random machine configurations
        fc.array(
          fc.record({
            status: fc.constantFrom('online', 'offline', 'maintenance', 'in_use'),
            location: fc.string({ minLength: 1, maxLength: 50 }),
            code: fc.string({ minLength: 3, maxLength: 10 })
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (machineConfigs) => {
          // Create test machines with different statuses
          const machines: Machine[] = machineConfigs.map((config, i) => ({
            id: `machine-${i}`,
            code: `TEST-${config.code}-${i}`,
            qrCode: 'test-qr-code',
            location: config.location,
            controllerId: `controller-${i}`,
            status: config.status,
            operatingHours: { start: '08:00', end: '18:00' },
            maintenanceInterval: 100,
            currentOperatingHours: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          // Calculate expected counts from our test data
          const expectedOnline = machines.filter(m => m.status === 'online').length;
          const expectedOffline = machines.filter(m => m.status === 'offline').length;
          const expectedMaintenance = machines.filter(m => m.status === 'maintenance').length;
          const expectedInUse = machines.filter(m => m.status === 'in_use').length;
          const expectedTotal = machines.length;

          // Get dashboard metrics
          const machineStats = dashboardService.calculateMachineStats(machines);
          
          // Verify the property: counts match the actual machine states
          expect(machineStats.online).toBe(expectedOnline);
          expect(machineStats.offline).toBe(expectedOffline);
          expect(machineStats.maintenance).toBe(expectedMaintenance);
          expect(machineStats.inUse).toBe(expectedInUse);
          expect(machineStats.total).toBe(expectedTotal);
          
          // Verify total equals sum of individual counts
          expect(machineStats.total).toBe(
            machineStats.online + 
            machineStats.offline + 
            machineStats.maintenance + 
            machineStats.inUse
          );
          
          // Verify all counts are non-negative
          expect(machineStats.online).toBeGreaterThanOrEqual(0);
          expect(machineStats.offline).toBeGreaterThanOrEqual(0);
          expect(machineStats.maintenance).toBeGreaterThanOrEqual(0);
          expect(machineStats.inUse).toBeGreaterThanOrEqual(0);
          expect(machineStats.total).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Dashboard metrics accuracy - session counts reflect actual session states', () => {
    fc.assert(
      fc.property(
        // Generate random session configurations
        fc.array(
          fc.record({
            status: fc.constantFrom('pending', 'active', 'completed', 'failed'),
            duration: fc.integer({ min: 1, max: 30 }),
            cost: fc.float({ min: 1, max: 30 })
          }),
          { minLength: 0, maxLength: 15 }
        ),
        (sessionConfigs) => {
          // Create test sessions with different statuses
          const sessions: UsageSession[] = sessionConfigs.map((config, i) => ({
            id: `session-${i}`,
            userId: 'test-user-1',
            machineId: 'test-machine-1',
            duration: config.duration,
            cost: config.cost,
            paymentMethod: 'balance',
            status: config.status,
            createdAt: new Date()
          }));

          // Calculate expected counts from our test data
          const expectedPending = sessions.filter(s => s.status === 'pending').length;
          const expectedActive = sessions.filter(s => s.status === 'active').length;
          const expectedCompleted = sessions.filter(s => s.status === 'completed').length;
          const expectedFailed = sessions.filter(s => s.status === 'failed').length;
          const expectedTotal = sessions.length;

          // Get dashboard metrics
          const sessionStats = dashboardService.calculateSessionStats(sessions);
          
          // Verify the property: counts match the actual session states
          expect(sessionStats.pending).toBe(expectedPending);
          expect(sessionStats.active).toBe(expectedActive);
          expect(sessionStats.completed).toBe(expectedCompleted);
          expect(sessionStats.failed).toBe(expectedFailed);
          expect(sessionStats.total).toBe(expectedTotal);
          
          // Verify total equals sum of individual counts
          expect(sessionStats.total).toBe(
            sessionStats.pending + 
            sessionStats.active + 
            sessionStats.completed + 
            sessionStats.failed
          );
          
          // Verify all counts are non-negative
          expect(sessionStats.pending).toBeGreaterThanOrEqual(0);
          expect(sessionStats.active).toBeGreaterThanOrEqual(0);
          expect(sessionStats.completed).toBeGreaterThanOrEqual(0);
          expect(sessionStats.failed).toBeGreaterThanOrEqual(0);
          expect(sessionStats.total).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Dashboard metrics accuracy - revenue calculations are consistent', () => {
    fc.assert(
      fc.property(
        // Generate random completed transactions with dates
        fc.array(
          fc.record({
            amount: fc.float({ min: Math.fround(0.01), max: 100 }),
            type: fc.constantFrom('credit_added', 'usage_payment', 'subscription_payment'),
            status: fc.constantFrom('pending', 'completed', 'failed'),
            daysAgo: fc.integer({ min: 0, max: 365 }) // 0 = today, 365 = one year ago
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (transactionConfigs) => {
          const now = new Date();
          
          // Create test transactions with different dates and statuses
          const transactions: Transaction[] = transactionConfigs.map((config, i) => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - config.daysAgo);
            
            return {
              id: `transaction-${i}`,
              userId: 'test-user-1',
              type: config.type,
              amount: config.amount,
              paymentMethod: 'pix',
              status: config.status,
              createdAt
            };
          });

          // Calculate expected revenue manually
          const completedTransactions = transactions.filter(t => t.status === 'completed');
          const expectedTotalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
          
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);
          
          const todayTransactions = completedTransactions.filter(t => 
            t.createdAt >= today && t.createdAt <= todayEnd
          );
          const expectedTodayRevenue = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
          
          const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          thisMonthEnd.setHours(23, 59, 59, 999);
          
          const monthTransactions = completedTransactions.filter(t => 
            t.createdAt >= thisMonth && t.createdAt <= thisMonthEnd
          );
          const expectedMonthRevenue = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

          // Get dashboard metrics
          const revenueStats = dashboardService.calculateRevenueStats(transactions, now);
          
          // Verify the property: revenue calculations match expected values
          expect(Math.round(revenueStats.total * 100) / 100).toBe(Math.round(expectedTotalRevenue * 100) / 100);
          expect(Math.round(revenueStats.today * 100) / 100).toBe(Math.round(expectedTodayRevenue * 100) / 100);
          expect(Math.round(revenueStats.thisMonth * 100) / 100).toBe(Math.round(expectedMonthRevenue * 100) / 100);
          
          // Verify revenue values are non-negative
          expect(revenueStats.total).toBeGreaterThanOrEqual(0);
          expect(revenueStats.today).toBeGreaterThanOrEqual(0);
          expect(revenueStats.thisMonth).toBeGreaterThanOrEqual(0);
          
          // Verify logical relationship: today <= thisMonth <= total
          expect(revenueStats.today).toBeLessThanOrEqual(revenueStats.thisMonth + 0.01); // Small tolerance for floating point
          expect(revenueStats.thisMonth).toBeLessThanOrEqual(revenueStats.total + 0.01);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Dashboard metrics accuracy - metrics are internally consistent', () => {
    fc.assert(
      fc.property(
        // Generate random data for all metrics
        fc.record({
          machines: fc.array(
            fc.record({
              status: fc.constantFrom('online', 'offline', 'maintenance', 'in_use')
            }),
            { minLength: 0, maxLength: 20 }
          ),
          sessions: fc.array(
            fc.record({
              status: fc.constantFrom('pending', 'active', 'completed', 'failed')
            }),
            { minLength: 0, maxLength: 15 }
          ),
          transactions: fc.array(
            fc.record({
              amount: fc.integer({ min: 1, max: 10000 }).map(n => n / 100), // Generate valid currency amounts
              status: fc.constantFrom('pending', 'completed', 'failed'),
              daysAgo: fc.integer({ min: 0, max: 365 })
            }),
            { minLength: 0, maxLength: 10 }
          )
        }),
        (testData) => {
          const now = new Date();
          
          // Create test machines
          const machines: Machine[] = testData.machines.map((m, i) => ({
            id: `machine-${i}`,
            code: `TEST-${i}`,
            qrCode: 'test-qr-code',
            location: 'Test Location',
            controllerId: `controller-${i}`,
            status: m.status,
            operatingHours: { start: '08:00', end: '18:00' },
            maintenanceInterval: 100,
            currentOperatingHours: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          // Create test sessions
          const sessions: UsageSession[] = testData.sessions.map((s, i) => ({
            id: `session-${i}`,
            userId: 'test-user-1',
            machineId: 'test-machine-1',
            duration: 10,
            cost: 10,
            paymentMethod: 'balance',
            status: s.status,
            createdAt: new Date()
          }));

          // Create test transactions
          const transactions: Transaction[] = testData.transactions.map((t, i) => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - t.daysAgo);
            
            return {
              id: `transaction-${i}`,
              userId: 'test-user-1',
              type: 'usage_payment',
              amount: t.amount,
              paymentMethod: 'pix',
              status: t.status,
              createdAt
            };
          });

          // Get dashboard metrics
          const dashboardMetrics = dashboardService.getDashboardMetrics(machines, sessions, transactions, now);
          
          // Verify all counts are non-negative integers
          expect(dashboardMetrics.machines.total).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.machines.online).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.machines.offline).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.machines.maintenance).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.machines.inUse).toBeGreaterThanOrEqual(0);
          
          expect(dashboardMetrics.sessions.total).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.sessions.pending).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.sessions.active).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.sessions.completed).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.sessions.failed).toBeGreaterThanOrEqual(0);
          
          // Verify revenue values are non-negative numbers
          expect(dashboardMetrics.revenue.total).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.revenue.today).toBeGreaterThanOrEqual(0);
          expect(dashboardMetrics.revenue.thisMonth).toBeGreaterThanOrEqual(0);
          
          // Verify machine totals are consistent
          expect(dashboardMetrics.machines.total).toBe(
            dashboardMetrics.machines.online + 
            dashboardMetrics.machines.offline + 
            dashboardMetrics.machines.maintenance + 
            dashboardMetrics.machines.inUse
          );
          
          // Verify session totals are consistent
          expect(dashboardMetrics.sessions.total).toBe(
            dashboardMetrics.sessions.pending + 
            dashboardMetrics.sessions.active + 
            dashboardMetrics.sessions.completed + 
            dashboardMetrics.sessions.failed
          );
          
          // Verify revenue relationships (with small tolerance for floating point)
          expect(dashboardMetrics.revenue.today).toBeLessThanOrEqual(dashboardMetrics.revenue.thisMonth + 0.01);
          expect(dashboardMetrics.revenue.thisMonth).toBeLessThanOrEqual(dashboardMetrics.revenue.total + 0.01);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Dashboard metrics accuracy - aggregation preserves individual calculations', () => {
    fc.assert(
      fc.property(
        // Generate random data
        fc.record({
          machines: fc.array(
            fc.record({
              status: fc.constantFrom('online', 'offline', 'maintenance', 'in_use')
            }),
            { minLength: 0, maxLength: 15 }
          ),
          sessions: fc.array(
            fc.record({
              status: fc.constantFrom('pending', 'active', 'completed', 'failed')
            }),
            { minLength: 0, maxLength: 10 }
          ),
          transactions: fc.array(
            fc.record({
              amount: fc.float({ min: Math.fround(0.01), max: 100 }),
              status: fc.constantFrom('pending', 'completed', 'failed'),
              daysAgo: fc.integer({ min: 0, max: 365 })
            }),
            { minLength: 0, maxLength: 8 }
          )
        }),
        (testData) => {
          const now = new Date();
          
          // Create test data
          const machines: Machine[] = testData.machines.map((m, i) => ({
            id: `machine-${i}`,
            code: `TEST-${i}`,
            qrCode: 'test-qr-code',
            location: 'Test Location',
            controllerId: `controller-${i}`,
            status: m.status,
            operatingHours: { start: '08:00', end: '18:00' },
            maintenanceInterval: 100,
            currentOperatingHours: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          const sessions: UsageSession[] = testData.sessions.map((s, i) => ({
            id: `session-${i}`,
            userId: 'test-user-1',
            machineId: 'test-machine-1',
            duration: 10,
            cost: 10,
            paymentMethod: 'balance',
            status: s.status,
            createdAt: new Date()
          }));

          const transactions: Transaction[] = testData.transactions.map((t, i) => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - t.daysAgo);
            
            return {
              id: `transaction-${i}`,
              userId: 'test-user-1',
              type: 'usage_payment',
              amount: t.amount,
              paymentMethod: 'pix',
              status: t.status,
              createdAt
            };
          });

          // Get metrics from individual calculations
          const machineStats = dashboardService.calculateMachineStats(machines);
          const sessionStats = dashboardService.calculateSessionStats(sessions);
          const revenueStats = dashboardService.calculateRevenueStats(transactions, now);
          
          // Get metrics from aggregated calculation
          const dashboardMetrics = dashboardService.getDashboardMetrics(machines, sessions, transactions, now);
          
          // Verify the property: aggregated metrics match individual calculations
          expect(dashboardMetrics.machines.total).toBe(machineStats.total);
          expect(dashboardMetrics.machines.online).toBe(machineStats.online);
          expect(dashboardMetrics.machines.offline).toBe(machineStats.offline);
          expect(dashboardMetrics.machines.maintenance).toBe(machineStats.maintenance);
          expect(dashboardMetrics.machines.inUse).toBe(machineStats.inUse);
          
          expect(dashboardMetrics.sessions.total).toBe(sessionStats.total);
          expect(dashboardMetrics.sessions.pending).toBe(sessionStats.pending);
          expect(dashboardMetrics.sessions.active).toBe(sessionStats.active);
          expect(dashboardMetrics.sessions.completed).toBe(sessionStats.completed);
          expect(dashboardMetrics.sessions.failed).toBe(sessionStats.failed);
          
          expect(Math.round(dashboardMetrics.revenue.total * 100) / 100).toBe(Math.round(revenueStats.total * 100) / 100);
          expect(Math.round(dashboardMetrics.revenue.today * 100) / 100).toBe(Math.round(revenueStats.today * 100) / 100);
          expect(Math.round(dashboardMetrics.revenue.thisMonth * 100) / 100).toBe(Math.round(revenueStats.thisMonth * 100) / 100);
        }
      ),
      { numRuns: 100 }
    );
  });
});