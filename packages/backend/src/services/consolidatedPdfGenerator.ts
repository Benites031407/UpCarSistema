import puppeteer from 'puppeteer';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ConsolidatedReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalMachines: number;
    totalRevenue: number;
    totalSessions: number;
    totalCustomers: number;
    totalUsageHours: number;
  };
  machineBreakdown: Array<{
    code: string;
    location: string;
    revenue: number;
    sessions: number;
    usageHours: number;
  }>;
  topCustomers: Array<{
    name: string;
    email: string;
    totalSessions: number;
    totalSpent: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    sessions: number;
  }>;
}

export class ConsolidatedPDFGenerator {
  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  private static getLogoBase64(): string {
    try {
      const possiblePaths = [
        path.join(process.cwd(), 'packages', 'frontend', 'public', 'assets', 'upcar-preto-laranja.png'),
        path.join(process.cwd(), 'packages', 'frontend', 'public', 'assets', 'upcar-logo-preto.png'),
        path.join(process.cwd(), 'packages', 'frontend', 'public', 'assets', 'upcar-logo.png'),
        path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'assets', 'upcar-preto-laranja.png'),
        path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'assets', 'upcar-logo-preto.png'),
        path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'assets', 'upcar-logo.png'),
      ];
      
      let logoPath = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          logoPath = p;
          break;
        }
      }
      
      console.log('Logo path found:', logoPath);
      
      if (logoPath) {
        const logoBuffer = fs.readFileSync(logoPath);
        const base64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        console.log('Logo loaded successfully, base64 length:', base64.length);
        return base64;
      } else {
        console.log('Logo file not found at path');
      }
    } catch (error) {
      console.error('Error loading logo:', error);
    }
    return '';
  }

  private static generateHTML(data: ConsolidatedReportData): string {
    const logoBase64 = this.getLogoBase64();
    
    const machineRows = data.machineBreakdown
      .map(
        (machine) => `
        <tr>
          <td>${machine.code}</td>
          <td>${machine.location}</td>
          <td>${this.formatCurrency(machine.revenue)}</td>
          <td>${machine.sessions}</td>
          <td>${machine.usageHours.toFixed(1)}h</td>
        </tr>
      `
      )
      .join('');

    const customerRows = data.topCustomers
      .slice(0, 15)
      .map(
        (customer) => `
        <tr>
          <td>${customer.name}</td>
          <td class="email">${customer.email}</td>
          <td>${customer.totalSessions}</td>
          <td>${this.formatCurrency(customer.totalSpent)}</td>
        </tr>
      `
      )
      .join('');

    const maxRevenue = Math.max(...data.revenueByDay.map(d => d.revenue));
    const revenueChartRows = data.revenueByDay
      .map(
        (day) => {
          const percentage = (day.revenue / maxRevenue) * 100;
          return `
        <div class="chart-row">
          <div class="chart-label">${this.formatDate(day.date)}</div>
          <div class="chart-bar-container">
            <div class="chart-bar" style="width: ${percentage}%"></div>
          </div>
          <div class="chart-value">${this.formatCurrency(day.revenue)} (${day.sessions})</div>
        </div>
      `;
        }
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      padding: 30px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 3px solid #FF6B35;
    }
    
    .logo {
      max-width: 200px;
      height: auto;
      margin: 0 auto 15px;
      display: block;
    }
    
    .title {
      font-size: 22pt;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    
    .period {
      font-size: 11pt;
      color: #666;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .summary-card {
      background: #f8f9fa;
      border: 2px solid #FF6B35;
      color: #333;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    
    .summary-card .label {
      font-size: 9pt;
      color: #666;
      margin-bottom: 5px;
    }
    
    .summary-card .value {
      font-size: 18pt;
      font-weight: bold;
      color: #FF6B35;
    }
    
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #FF6B35;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #FF6B35;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th {
      background-color: #FF6B35;
      color: white;
      font-weight: bold;
      text-align: left;
      padding: 8px;
      font-size: 9pt;
    }
    
    td {
      padding: 6px 8px;
      font-size: 9pt;
      border-bottom: 1px solid #eee;
    }
    
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    tr:hover {
      background-color: #fff5f2;
    }
    
    .email {
      font-size: 8pt;
      color: #666;
    }
    
    .chart-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 8pt;
    }
    
    .chart-label {
      width: 80px;
      flex-shrink: 0;
    }
    
    .chart-bar-container {
      flex: 1;
      height: 20px;
      background-color: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      margin: 0 10px;
    }
    
    .chart-bar {
      height: 100%;
      background: linear-gradient(90deg, #FF6B35 0%, #FF8C61 100%);
      transition: width 0.3s ease;
    }
    
    .chart-value {
      width: 150px;
      text-align: right;
      flex-shrink: 0;
    }
    
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 8pt;
      color: #999;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
    
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="UpCar Logo" class="logo" />` : '<div class="title">UpCar Aspiradores</div>'}
    <div class="title">Relatório Consolidado</div>
    <div class="period">Período: ${this.formatDate(data.period.startDate)} a ${this.formatDate(data.period.endDate)}</div>
  </div>

  <!-- Summary Cards -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Total de Aspiradores</div>
      <div class="value">${data.summary.totalMachines}</div>
    </div>
    <div class="summary-card">
      <div class="label">Receita Total</div>
      <div class="value">${this.formatCurrency(data.summary.totalRevenue)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total de Sessões</div>
      <div class="value">${data.summary.totalSessions}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total de Clientes</div>
      <div class="value">${data.summary.totalCustomers}</div>
    </div>
    <div class="summary-card">
      <div class="label">Tempo Total de Uso</div>
      <div class="value">${data.summary.totalUsageHours.toFixed(1)}h</div>
    </div>
    <div class="summary-card">
      <div class="label">Média por Sessão</div>
      <div class="value">${this.formatCurrency(data.summary.totalRevenue / data.summary.totalSessions || 0)}</div>
    </div>
  </div>

  <!-- Machine Breakdown -->
  <div class="section">
    <div class="section-title">Desempenho por Aspirador</div>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Localização</th>
          <th>Receita</th>
          <th>Sessões</th>
          <th>Horas de Uso</th>
        </tr>
      </thead>
      <tbody>
        ${machineRows}
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- Top Customers -->
  <div class="section">
    <div class="section-title">Principais Clientes (Top 15)</div>
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Sessões</th>
          <th>Total Gasto</th>
        </tr>
      </thead>
      <tbody>
        ${customerRows}
      </tbody>
    </table>
  </div>

  <!-- Revenue by Day Chart -->
  ${data.revenueByDay.length > 0 ? `
  <div class="page-break"></div>
  <div class="section">
    <div class="section-title">Receita Diária</div>
    ${revenueChartRows}
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    Gerado em ${new Date().toLocaleString('pt-BR')} | UpCar Aspiradores - Relatório Consolidado
  </div>
</body>
</html>
    `;
  }

  static async generateConsolidatedReport(data: ConsolidatedReportData): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--no-first-run',
        '--no-zygote',
        '--disable-accelerated-2d-canvas',
        '--disable-web-security'
      ],
    });

    try {
      const page = await browser.newPage();
      const html = this.generateHTML(data);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  static async generateConsolidatedReportStream(data: ConsolidatedReportData): Promise<Readable> {
    const buffer = await this.generateConsolidatedReport(data);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }
}
