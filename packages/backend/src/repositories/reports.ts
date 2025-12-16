import { db } from '../database/connection.js';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  machineId?: string;
}

export class ReportsRepository {
  /**
   * Get machine report data (Repasse format)
   */
  static async getMachineReportData(machineId: string, filters: ReportFilters) {
    const client = await db.getClient();
    try {
      // Get machine info including quotas
      const machineResult = await client.query(
        'SELECT id, code, location, city, location_owner_quota, operational_cost_quota FROM machines WHERE id = $1',
        [machineId]
      );

      if (machineResult.rows.length === 0) {
        throw new Error('Machine not found');
      }

      const machine = machineResult.rows[0];

      // Get usage statistics
      const usageResult = await client.query(
        `SELECT 
          COUNT(*) as total_sessions,
          COALESCE(SUM(duration), 0) as total_usage_minutes,
          COALESCE(AVG(duration), 0) as average_session_duration
        FROM usage_sessions
        WHERE machine_id = $1
          AND created_at >= $2
          AND created_at <= $3
          AND status = 'completed'`,
        [machineId, filters.startDate, filters.endDate]
      );

      const usage = usageResult.rows[0];

      // Get revenue
      const revenueResult = await client.query(
        `SELECT 
          COALESCE(SUM(cost), 0) as total_revenue,
          COALESCE(AVG(cost), 0) as average_revenue_per_session
        FROM usage_sessions
        WHERE machine_id = $1
          AND created_at >= $2
          AND created_at <= $3
          AND status = 'completed'`,
        [machineId, filters.startDate, filters.endDate]
      );

      const revenue = revenueResult.rows[0];

      // Get quotas from machine configuration (percentages 0-100)
      const locationOwnerQuotaPercent = parseFloat(machine.location_owner_quota) || 50.00;
      const operationalCostQuotaPercent = parseFloat(machine.operational_cost_quota) || 10.00;
      
      const locationOwnerQuota = locationOwnerQuotaPercent / 100; // Convert to decimal (0-1)
      const operationalFeesQuota = operationalCostQuotaPercent / 100; // Convert to decimal (0-1)
      const commercialPointQuota = 1 - locationOwnerQuota; // Remaining goes to commercial point
      
      const quotas = {
        commercialPoint: commercialPointQuota,
        owner: locationOwnerQuota,
        operationalFees: operationalFeesQuota,
      };

      // Calculate revenue breakdown
      const totalRevenue = parseFloat(revenue.total_revenue);
      
      // For now, assume all revenue is APP (you can split this based on payment_method if needed)
      const appGross = totalRevenue;
      const caixaGross = 0; // TODO: Implement cash revenue tracking
      
      // Calculate net after operational fees
      const operationalFeeAmount = totalRevenue * quotas.operationalFees;
      const netRevenue = totalRevenue - operationalFeeAmount;
      
      const appNet = appGross - operationalFeeAmount;
      const caixaNet = caixaGross;

      // Calculate repasse values based on machine's quota
      const ownerValue = netRevenue * quotas.owner;
      const commercialPointValue = netRevenue * quotas.commercialPoint;

      // TODO: Implement custody tracking - for now set to 0
      const commercialPointCustody = 0;
      const ownerCustody = 0;

      // Calculate receive/pay amounts
      const commercialPointReceivePay = commercialPointValue - commercialPointCustody;
      const ownerReceivePay = ownerValue - ownerCustody;

      // Get usage history
      const usageHistoryResult = await client.query(
        `SELECT 
          u.name as user_name,
          s.created_at,
          s.duration,
          s.cost,
          s.payment_method
        FROM usage_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.machine_id = $1
          AND s.created_at >= $2
          AND s.created_at <= $3
          AND s.status = 'completed'
        ORDER BY s.created_at DESC`,
        [machineId, filters.startDate, filters.endDate]
      );

      const usageHistory = usageHistoryResult.rows.map(row => ({
        userName: row.user_name,
        date: row.created_at,
        duration: parseInt(row.duration),
        amount: parseFloat(row.cost),
        paymentMethod: row.payment_method,
      }));

      // Calculate totals
      const totalLiquid = netRevenue;
      const custodyValue = commercialPointCustody + ownerCustody;
      const finalValue = commercialPointReceivePay + ownerReceivePay;

      return {
        machine: {
          number: machine.code,
          address: machine.location,
          city: machine.city || 'N/A',
        },
        referencePeriod: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        quotas,
        revenue: {
          caixaGross,
          appGross,
          caixaNet,
          appNet,
          totalReal: totalRevenue,
        },
        repasse: {
          commercialPointValue,
          commercialPointCustody,
          commercialPointReceivePay,
          ownerValue,
          ownerCustody,
          ownerReceivePay,
        },
        usageHistory,
        totals: {
          totalLiquid,
          custodyValue,
          finalValue,
        },
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get consolidated report data
   */
  static async getConsolidatedReportData(filters: ReportFilters) {
    const client = await db.getClient();
    try {
      // Summary statistics
      const summaryResult = await client.query(
        `SELECT 
          (SELECT COUNT(*) FROM machines) as total_machines,
          COALESCE(SUM(s.cost), 0) as total_revenue,
          COUNT(s.id) as total_sessions,
          COUNT(DISTINCT s.user_id) as total_customers,
          COALESCE(SUM(s.duration), 0) as total_usage_minutes
        FROM usage_sessions s
        WHERE s.created_at >= $1
          AND s.created_at <= $2
          AND s.status = 'completed'`,
        [filters.startDate, filters.endDate]
      );

      const summary = summaryResult.rows[0];

      // Machine breakdown
      const machineBreakdownResult = await client.query(
        `SELECT 
          m.code,
          m.location,
          COALESCE(SUM(s.cost), 0) as revenue,
          COUNT(s.id) as sessions,
          COALESCE(SUM(s.duration), 0) / 60.0 as usage_hours
        FROM machines m
        LEFT JOIN usage_sessions s ON m.id = s.machine_id
          AND s.created_at >= $1
          AND s.created_at <= $2
          AND s.status = 'completed'
        GROUP BY m.id, m.code, m.location
        ORDER BY revenue DESC`,
        [filters.startDate, filters.endDate]
      );

      // Top customers
      const topCustomersResult = await client.query(
        `SELECT 
          u.name,
          u.email,
          COUNT(s.id) as total_sessions,
          COALESCE(SUM(s.cost), 0) as total_spent
        FROM users u
        JOIN usage_sessions s ON u.id = s.user_id
        WHERE s.created_at >= $1
          AND s.created_at <= $2
          AND s.status = 'completed'
        GROUP BY u.id, u.name, u.email
        ORDER BY total_spent DESC
        LIMIT 20`,
        [filters.startDate, filters.endDate]
      );

      // Revenue by day
      const revenueByDayResult = await client.query(
        `SELECT 
          DATE(s.created_at) as date,
          COALESCE(SUM(s.cost), 0) as revenue,
          COUNT(s.id) as sessions
        FROM usage_sessions s
        WHERE s.created_at >= $1
          AND s.created_at <= $2
          AND s.status = 'completed'
        GROUP BY DATE(s.created_at)
        ORDER BY date ASC`,
        [filters.startDate, filters.endDate]
      );

      return {
        period: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        summary: {
          totalMachines: parseInt(summary.total_machines),
          totalRevenue: parseFloat(summary.total_revenue),
          totalSessions: parseInt(summary.total_sessions),
          totalCustomers: parseInt(summary.total_customers),
          totalUsageHours: parseFloat(summary.total_usage_minutes) / 60,
        },
        machineBreakdown: machineBreakdownResult.rows.map(row => ({
          code: row.code,
          location: row.location,
          revenue: parseFloat(row.revenue),
          sessions: parseInt(row.sessions),
          usageHours: parseFloat(row.usage_hours),
        })),
        topCustomers: topCustomersResult.rows.map(row => ({
          name: row.name,
          email: row.email,
          totalSessions: parseInt(row.total_sessions),
          totalSpent: parseFloat(row.total_spent),
        })),
        revenueByDay: revenueByDayResult.rows.map(row => ({
          date: row.date,
          revenue: parseFloat(row.revenue),
          sessions: parseInt(row.sessions),
        })),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all machines for individual reports
   */
  static async getAllMachineIds() {
    const client = await db.getClient();
    try {
      const result = await client.query('SELECT id FROM machines ORDER BY code');
      return result.rows.map(row => row.id);
    } finally {
      client.release();
    }
  }

  /**
   * Get subscribers report data
   */
  static async getSubscribersReportData(filters: ReportFilters) {
    const client = await db.getClient();
    try {
      // Get all subscribers (active and expired)
      const subscribersResult = await client.query(
        `SELECT 
          u.id,
          u.name,
          u.email,
          u.subscription_status,
          u.subscription_expiry,
          u.last_daily_use,
          u.created_at,
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(DISTINCT DATE(s.created_at)) as days_used,
          COALESCE(SUM(CASE WHEN s.payment_method = 'balance' THEN s.cost ELSE 0 END), 0) as subscription_usage_value
        FROM users u
        LEFT JOIN usage_sessions s ON u.id = s.user_id 
          AND s.created_at >= $1
          AND s.created_at <= $2
          AND s.status = 'completed'
          AND s.payment_method = 'balance'
        WHERE u.subscription_status IN ('active', 'expired')
        GROUP BY u.id, u.name, u.email, u.subscription_status, u.subscription_expiry, u.last_daily_use, u.created_at
        ORDER BY u.subscription_status DESC, u.name ASC`,
        [filters.startDate, filters.endDate]
      );

      // Get subscription revenue (payments for subscriptions)
      const revenueResult = await client.query(
        `SELECT 
          COUNT(*) as total_subscription_payments,
          COALESCE(SUM(amount), 0) as total_subscription_revenue
        FROM transactions
        WHERE type = 'subscription_payment'
          AND created_at >= $1
          AND created_at <= $2`,
        [filters.startDate, filters.endDate]
      );

      const revenue = revenueResult.rows[0];
      const subscribers = subscribersResult.rows;

      const activeSubscribers = subscribers.filter(s => s.subscription_status === 'active');
      const expiredSubscribers = subscribers.filter(s => s.subscription_status === 'expired');

      return {
        period: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        summary: {
          totalSubscribers: subscribers.length,
          activeSubscribers: activeSubscribers.length,
          expiredSubscribers: expiredSubscribers.length,
          totalRevenue: parseFloat(revenue.total_subscription_revenue),
          totalPayments: parseInt(revenue.total_subscription_payments),
          averageRevenuePerSubscriber: subscribers.length > 0 
            ? parseFloat(revenue.total_subscription_revenue) / subscribers.length 
            : 0,
        },
        subscribers: subscribers.map(sub => ({
          name: sub.name,
          email: sub.email,
          status: sub.subscription_status,
          expiryDate: sub.subscription_expiry,
          lastDailyUse: sub.last_daily_use,
          totalSessions: parseInt(sub.total_sessions),
          daysUsed: parseInt(sub.days_used),
          usageValue: parseFloat(sub.subscription_usage_value),
          memberSince: sub.created_at,
        })),
      };
    } finally {
      client.release();
    }
  }
}
