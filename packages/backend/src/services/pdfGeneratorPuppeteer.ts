import puppeteer from 'puppeteer';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MachineReportData {
  machine: {
    number: string;
    address: string;
    city: string;
  };
  referencePeriod: {
    startDate: string;
    endDate: string;
  };
  quotas: {
    commercialPoint: number;
    owner: number;
    operationalFees: number;
  };
  revenue: {
    caixaGross: number;
    appGross: number;
    caixaNet: number;
    appNet: number;
    totalReal: number;
  };
  repasse: {
    commercialPointValue: number;
    commercialPointCustody: number;
    commercialPointReceivePay: number;
    ownerValue: number;
    ownerCustody: number;
    ownerReceivePay: number;
  };
  usageHistory?: Array<{
    userName: string;
    date: string;
    duration: number;
    amount: number;
    paymentMethod: string;
  }>;
  totals: {
    totalLiquid: number;
    custodyValue: number;
    finalValue: number;
  };
}

export class PuppeteerPDFGenerator {
  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  private static formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private static getLogoBase64(): string {
    try {
      // Try to load the logo from the frontend public assets
      // Try multiple possible paths
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

  private static generateMachineReportHTML(data: MachineReportData): string {
    const logoBase64 = this.getLogoBase64();
    
    const usageRows = (data.usageHistory || [])
      .map(
        (item) => `
        <tr>
          <td>${item.userName}</td>
          <td>${this.formatDateTime(item.date)}</td>
          <td>${item.duration} min</td>
          <td>${this.formatCurrency(item.amount)}</td>
          <td>${item.paymentMethod === 'pix' ? 'PIX' : 'Saldo'}</td>
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
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 3px solid #FF6B35;
    }
    
    .logo {
      max-width: 200px;
      height: auto;
      margin: 0 auto 15px;
      display: block;
    }
    
    .report-title {
      font-size: 16pt;
      font-weight: bold;
      color: #333;
      margin-top: 10px;
    }
    
    .machine-info {
      margin-bottom: 15px;
      font-size: 10pt;
    }
    
    .machine-info p {
      margin: 3px 0;
    }
    
    .machine-info strong {
      font-weight: bold;
    }
    
    .separator {
      border-top: 1px solid #000;
      margin: 15px 0;
    }
    
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #FF6B35;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #FF6B35;
    }
    
    .section {
      margin-bottom: 15px;
    }
    
    .simple-list p {
      margin: 3px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
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
      font-size: 8pt;
      border-bottom: 1px solid #eee;
    }
    
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    tr:hover {
      background-color: #fff5f2;
    }
    
    .total-row {
      font-weight: bold;
      border-top: 2px solid #FF6B35;
      background-color: #fff5f2 !important;
    }
    
    .summary {
      margin-top: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border: 2px solid #FF6B35;
      border-radius: 8px;
    }
    
    .summary p {
      margin: 5px 0;
    }
    
    .summary .final-value {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 8px;
      color: #FF6B35;
    }
    
    .footer {
      margin-top: 30px;
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
    ${logoBase64 ? `<img src="${logoBase64}" alt="UpCar Logo" class="logo" />` : '<div style="font-size: 24pt; font-weight: bold; margin-bottom: 5px;">UpCar Aspiradores</div>'}
    <div class="report-title">Relatório de Repasse</div>
  </div>

  <!-- Machine Info -->
  <div class="machine-info">
    <p><strong>Código do Aspirador:</strong> ${data.machine.number}</p>
    <p><strong>Endereço:</strong> ${data.machine.address}</p>
    <p><strong>Cidade:</strong> ${data.machine.city}</p>
    <p><strong>Período de Referência:</strong> ${this.formatDate(data.referencePeriod.startDate)} a ${this.formatDate(data.referencePeriod.endDate)}</p>
  </div>

  <div class="separator"></div>

  <!-- Cotas -->
  <div class="section">
    <div class="section-title">Cotas</div>
    <div class="simple-list">
      <p>Ponto Comercial: ${(data.quotas.commercialPoint * 100).toFixed(0)}%</p>
      <p>Proprietário: ${(data.quotas.owner * 100).toFixed(0)}%</p>
      <p>Taxas Operacionais: ${(data.quotas.operationalFees * 100).toFixed(0)}%</p>
    </div>
  </div>

  <div class="separator"></div>

  <!-- Receitas -->
  <div class="section">
    <div class="section-title">Receitas</div>
    <table>
      <thead>
        <tr>
          <th>Receita</th>
          <th>Caixa</th>
          <th>App</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Bruto</td>
          <td>${this.formatCurrency(data.revenue.caixaGross)}</td>
          <td>${this.formatCurrency(data.revenue.appGross)}</td>
        </tr>
        <tr>
          <td>Líquido</td>
          <td>${this.formatCurrency(data.revenue.caixaNet)}</td>
          <td>${this.formatCurrency(data.revenue.appNet)}</td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td colspan="2">${this.formatCurrency(data.revenue.totalReal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="separator"></div>

  <!-- Cálculo de Repasse -->
  <div class="section">
    <div class="section-title">Cálculo de Repasse</div>
    <table>
      <thead>
        <tr>
          <th>Parte</th>
          <th>Valor</th>
          <th>Custódia</th>
          <th>Pagar/Receber</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Ponto Comercial</td>
          <td>${this.formatCurrency(data.repasse.commercialPointValue)}</td>
          <td>${this.formatCurrency(data.repasse.commercialPointCustody)}</td>
          <td>${this.formatCurrency(data.repasse.commercialPointReceivePay)}</td>
        </tr>
        <tr>
          <td>Proprietário</td>
          <td>${this.formatCurrency(data.repasse.ownerValue)}</td>
          <td>${this.formatCurrency(data.repasse.ownerCustody)}</td>
          <td>${this.formatCurrency(data.repasse.ownerReceivePay)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${
    data.usageHistory && data.usageHistory.length > 0
      ? `
  <div class="separator"></div>

  <!-- Histórico de Uso -->
  <div class="section">
    <div class="section-title">Histórico de Uso</div>
    <table>
      <thead>
        <tr>
          <th>Usuário</th>
          <th>Data/Hora</th>
          <th>Duração</th>
          <th>Valor</th>
          <th>Pagamento</th>
        </tr>
      </thead>
      <tbody>
        ${usageRows}
      </tbody>
    </table>
  </div>
  `
      : ''
  }

  <div class="separator"></div>

  <!-- Resumo Final -->
  <div class="summary">
    <div class="section-title">Resumo Final</div>
    <p>Total Líquido: ${this.formatCurrency(data.totals.totalLiquid)}</p>
    <p>Valor em Custódia: ${this.formatCurrency(data.totals.custodyValue)}</p>
    <p class="final-value">Valor Final (Pagar/Receber): ${this.formatCurrency(data.totals.finalValue)}</p>
  </div>

  <!-- Footer -->
  <div class="footer">
    Gerado em ${new Date().toLocaleString('pt-BR')} | UpCar Aspiradores
  </div>
</body>
</html>
    `;
  }

  static async generateMachineReport(data: MachineReportData): Promise<Buffer> {
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
      const html = this.generateMachineReportHTML(data);

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

  static async generateMachineReportStream(data: MachineReportData): Promise<Readable> {
    const buffer = await this.generateMachineReport(data);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }
}
