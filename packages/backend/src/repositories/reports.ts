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
      // Get machine info
      const machineResult = await client.query(
        'SELECT id, code, location FROM machines WHERE id = $1',
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

      // Define quotas (these should come from machine configuration in production)
      const quotas = {
        commercialPoint: 0.50,  // 50%
        owner: 0.50,            // 50%
        operationalFees: 0.10,  // 10%
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

      // Calculate repasse values
      const commercialPointValue = netRevenue * quotas.commercialPoint;
      const ownerValue = netRevenue * quotas.owner;

      // TODO: Implement custody tracking - for now set to 0
      const commercialPointCustody = 0;
      const ownerCustody = 0;

      // Calculate receive/pay amounts
      const commercialPointReceivePay = commercialPointValue - commercialPointCustody;
      const ownerReceivePay = ownerValue - ownerCustody;

      // TODO: Implement receipts history tracking
      const receiptsHistory: any[] = [];

      // Calculate totals
      const totalLiquid = netRevenue;
      const custodyValue = commercialPointCustody + ownerCustody;
      const finalValue = commercialPointReceivePay + ownerReceivePay;

      return {
        machine: {
          number: machine.code,
          address: machine.location,
          city: 'N/A', // TODO: Add city field to machines table
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
        receiptsHistory,
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
}
