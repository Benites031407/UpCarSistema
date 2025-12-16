import puppeteer from 'puppeteer';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SubscribersReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSubscribers: number;
    activeSubscribers: number;
    expiredSubscribers: number;
    totalRevenue: number;
    totalPayments: number;
    averageRevenuePerSubscriber: number;
  };
  subscribers: Array<{
    name: string;
    email: string;
    status: string;
    expiryDate: string | null;
    lastDailyUse: string | null;
    totalSessions: number;
    daysUsed: number;
    usageValue: number;
    memberSince: string;
  }>;
}

export class SubscribersPDFGenerator {
  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private static formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  private static getLogoBase64(): string {
    try {
      const possiblePaths = [
        path.join(process.cwd(), 'packages', 'frontend', 'public', 'assets', 'upcar-preto-laranja.png'),
        path.join(process.cwd(), 'packages', 'frontend', 'public', 'assets', 'upcar-logo-preto.png'),
        path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'assets', 'upcar-preto-laranja.png'),
      ];
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const logoBuffer = fs.readFileSync(p);
          return `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
      }
    } catch (error) {
      console.error('Error loading logo:', error);
    }
    return '';
  }

  private static generateHTML(data: SubscribersReportData): string {
    const logoBase64 = this.getLogoBase64();
    
    const subscriberRows = data.subscribers
      .map(
        (sub) => `
        <tr>
          <td>${sub.name}</td>
          <td class="email">${sub.email}</td>
          <td><span class="status-badge status-${sub.status}">${sub.status === 'active' ? 'Ativo' : 'Expirado'}</span></td>
          <td>${this.formatDate(sub.expiryDate)}</td>
          <td>${this.formatDate(sub.lastDailyUse)}</td>
          <td>${sub.totalSessions}</td>
          <td>${sub.daysUsed}</td>
          <td>${this.formatCurrency(sub.usageValue)}</td>
        </tr>
      `
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
      font-size: 8pt;
    }
    
    th {
      background-color: #FF6B35;
      color: white;
      font-weight: bold;
      text-align: left;
      padding: 8px 6px;
      font-size: 8pt;
    }
    
    td {
      padding: 6px;
      border-bottom: 1px solid #eee;
    }
    
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    tr:hover {
      background-color: #fff5f2;
    }
    
    .email {
      font-size: 7pt;
      color: #666;
    }
    
    .status-badge {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 7pt;
      font-weight: bold;
      display: inline-block;
    }
    
    .status-active {
      background-color: #d4edda;
      color: #155724;
    }
    
    .status-expired {
      background-color: #f8d7da;
      color: #721c24;
    }
    
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 8pt;
      color: #999;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="UpCar Logo" class="logo" />` : '<div class="title">UpCar Aspiradores</div>'}
    <div class="title">Relatório de Mensalistas</div>
    <div class="period">Período: ${this.formatDate(data.period.startDate)} a ${this.formatDate(data.period.endDate)}</div>
  </div>

  <!-- Summary Cards -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Total de Mensalistas</div>
      <div class="value">${data.summary.totalSubscribers}</div>
    </div>
    <div class="summary-card">
      <div class="label">Mensalistas Ativos</div>
      <div class="value">${data.summary.activeSubscribers}</div>
    </div>
    <div class="summary-card">
      <div class="label">Mensalistas Expirados</div>
      <div class="value">${data.summary.expiredSubscribers}</div>
    </div>
    <div class="summary-card">
      <div class="label">Receita Total</div>
      <div class="value">${this.formatCurrency(data.summary.totalRevenue)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total de Pagamentos</div>
      <div class="value">${data.summary.totalPayments}</div>
    </div>
    <div class="summary-card">
      <div class="label">Média por Mensalista</div>
      <div class="value">${this.formatCurrency(data.summary.averageRevenuePerSubscriber)}</div>
    </div>
  </div>

  <!-- Subscribers Table -->
  <div class="section">
    <div class="section-title">Lista de Mensalistas</div>
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Status</th>
          <th>Vencimento</th>
          <th>Último Uso</th>
          <th>Sessões</th>
          <th>Dias Usados</th>
          <th>Valor Usado</th>
        </tr>
      </thead>
      <tbody>
        ${subscriberRows}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    Gerado em ${new Date().toLocaleString('pt-BR')} | UpCar Aspiradores - Relatório de Mensalistas
  </div>
</body>
</html>
    `;
  }

  static async generateSubscribersReport(data: SubscribersReportData): Promise<Buffer> {
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
        landscape: true, // Landscape for better table viewing
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  static async generateSubscribersReportStream(data: SubscribersReportData): Promise<Readable> {
    const buffer = await this.generateSubscribersReport(data);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }
}
