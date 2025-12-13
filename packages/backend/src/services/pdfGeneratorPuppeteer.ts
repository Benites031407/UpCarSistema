import puppeteer from 'puppeteer';
import { Readable } from 'stream';

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

  private static generateMachineReportHTML(data: MachineReportData): string {
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
      padding-bottom: 10px;
      border-bottom: 2px solid #000;
    }
    
    .logo {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 5px;
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
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 8px;
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
      background-color: #f5f5f5;
      font-weight: bold;
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid #000;
      font-size: 9pt;
    }
    
    td {
      padding: 4px 8px;
      font-size: 8pt;
    }
    
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    
    .total-row {
      font-weight: bold;
      border-top: 1px solid #000;
    }
    
    .summary {
      margin-top: 20px;
      padding: 10px;
      background-color: #f5f5f5;
      border: 1px solid #000;
    }
    
    .summary p {
      margin: 5px 0;
    }
    
    .summary .final-value {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 8px;
    }
    
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 8pt;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo">UpCar Aspiradores</div>
    <div style="font-size: 9pt; color: #666;">Relatório de Repasse</div>
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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
