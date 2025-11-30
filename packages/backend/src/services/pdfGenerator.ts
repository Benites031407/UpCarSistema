import PDFDocument from 'pdfkit';
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
    commercialPoint: number;    // 0.50
    owner: number;              // 0.50
    operationalFees: number;    // 0.10
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
  receiptsHistory: Array<{
    user: string;
    date: string;
    value: number;
    addedBy: string;
  }>;
  totals: {
    totalLiquid: number;
    custodyValue: number;
    finalValue: number;
  };
}

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

export class PDFGenerator {
  /**
   * Generate individual machine report PDF (Repasse format)
   */
  static generateMachineReport(data: MachineReportData): Readable {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    // --- HEADER PROFISSIONAL ---
    this.addRepasseHeader(doc);

    // SECTION: Dados do Aspirador
    this.sectionTitle(doc, 'Informações do Aspirador');
    this.kv(doc, 'Número do Aspirador', data.machine.number);
    this.kv(doc, 'Endereço', data.machine.address);
    this.kv(doc, 'Cidade', data.machine.city);
    this.kv(
      doc,
      'Período de Referência',
      `${this.formatDate(data.referencePeriod.startDate)} a ${this.formatDate(data.referencePeriod.endDate)}`
    );
    doc.moveDown(1.2);

    // SECTION: Cotas
    this.sectionTitle(doc, 'Cotas');
    this.kv(doc, 'Ponto Comercial', `${(data.quotas.commercialPoint * 100).toFixed(0)}%`);
    this.kv(doc, 'Proprietário', `${(data.quotas.owner * 100).toFixed(0)}%`);
    this.kv(doc, 'Taxas Operacionais', `${(data.quotas.operationalFees * 100).toFixed(0)}%`);
    doc.moveDown(1.2);

    // SECTION: Receita
    this.sectionTitle(doc, 'Receita');
    this.kv(doc, 'Caixa (Bruto)', `R$ ${data.revenue.caixaGross.toFixed(2)}`);
    this.kv(doc, 'APP (Bruto)', `R$ ${data.revenue.appGross.toFixed(2)}`);
    doc.moveDown(0.4);
    this.kv(doc, 'Caixa (Líquido)', `R$ ${data.revenue.caixaNet.toFixed(2)}`);
    this.kv(doc, 'APP (Líquido)', `R$ ${data.revenue.appNet.toFixed(2)}`);
    doc.moveDown(0.5);
    this.kv(doc, 'Faturamento Total (Real)', `R$ ${data.revenue.totalReal.toFixed(2)}`);
    doc.moveDown(1.2);

    // SECTION: Repasse
    this.sectionTitle(doc, 'Cálculo de Repasse Financeiro');
    this.kv(doc, 'Ponto Comercial – Valor', `R$ ${data.repasse.commercialPointValue.toFixed(2)}`);
    this.kv(doc, 'Ponto Comercial – Custódia', `R$ ${data.repasse.commercialPointCustody.toFixed(2)}`);
    this.kv(
      doc,
      'Ponto Comercial – A Pagar/Receber',
      `R$ ${data.repasse.commercialPointReceivePay.toFixed(2)}`
    );
    doc.moveDown(0.5);
    this.kv(doc, 'Proprietário – Valor', `R$ ${data.repasse.ownerValue.toFixed(2)}`);
    this.kv(doc, 'Proprietário – Custódia', `R$ ${data.repasse.ownerCustody.toFixed(2)}`);
    this.kv(
      doc,
      'Proprietário – A Pagar/Receber',
      `R$ ${data.repasse.ownerReceivePay.toFixed(2)}`
    );
    doc.moveDown(1.2);

    // SECTION: Histórico de Recebimentos
    if (data.receiptsHistory.length > 0) {
      doc.addPage();
      this.sectionTitle(doc, 'Histórico de Recebimentos');
      this.tableHeader(doc, ['Usuário', 'Data', 'Valor', 'Adicionado por'], [150, 120, 80, 120]);

      doc.fontSize(9).font('Helvetica');
      data.receiptsHistory.forEach((item) => {
        const y = doc.y;
        doc.text(item.user, 40, y, { width: 150 });
        doc.text(this.formatDateTime(item.date), 190, y, { width: 120 });
        doc.text(`R$ ${item.value.toFixed(2)}`, 310, y, { width: 80 });
        doc.text(item.addedBy, 390, y, { width: 120 });
        doc.moveDown(0.8);
      });
    }

    // SECTION: Totais Finais
    doc.addPage();
    this.sectionTitle(doc, 'Resumo Final');
    this.kv(doc, 'Total Líquido', `R$ ${data.totals.totalLiquid.toFixed(2)}`);
    this.kv(doc, 'Valor em Custódia', `R$ ${data.totals.custodyValue.toFixed(2)}`);
    this.kv(doc, 'Valor Final (Pagar/Receber)', `R$ ${data.totals.finalValue.toFixed(2)}`);

    this.addFooter(doc);

    doc.end();
    return doc;
  }

  /**
   * Generate consolidated report PDF
   */
  static generateConsolidatedReport(data: ConsolidatedReportData): Readable {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Header
    this.addHeader(doc, 'Relatório Consolidado - UpCar Aspiradores');
    
    // Period
    doc.fontSize(12);
    doc.text(`Período: ${this.formatDate(data.period.startDate)} a ${this.formatDate(data.period.endDate)}`);
    doc.moveDown(1.5);

    // Summary Section
    doc.fontSize(16).text('Resumo Geral', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total de Aspiradores: ${data.summary.totalMachines}`);
    doc.text(`Receita Total: R$ ${data.summary.totalRevenue.toFixed(2)}`);
    doc.text(`Total de Sessões: ${data.summary.totalSessions}`);
    doc.text(`Total de Clientes: ${data.summary.totalCustomers}`);
    doc.text(`Tempo Total de Uso: ${data.summary.totalUsageHours.toFixed(2)} horas`);
    doc.moveDown(1.5);

    // Machine Breakdown
    doc.fontSize(16).text('Desempenho por Aspirador', { underline: true });
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    const colWidths = [80, 150, 90, 80, 80];
    const headers = ['Código', 'Localização', 'Receita', 'Sessões', 'Horas'];
    
    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });
    
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(530, doc.y).stroke();
    doc.moveDown(0.3);

    // Table rows
    doc.font('Helvetica').fontSize(9);
    data.machineBreakdown.forEach((machine) => {
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
      }
      const rowY = doc.y;
      doc.text(machine.code, 50, rowY, { width: colWidths[0] });
      doc.text(machine.location, 130, rowY, { width: colWidths[1] });
      doc.text(`R$ ${machine.revenue.toFixed(2)}`, 280, rowY, { width: colWidths[2] });
      doc.text(machine.sessions.toString(), 370, rowY, { width: colWidths[3] });
      doc.text(`${machine.usageHours.toFixed(1)}h`, 450, rowY, { width: colWidths[4] });
      doc.moveDown(0.8);
    });

    // Top Customers
    doc.addPage();
    doc.fontSize(16).text('Principais Clientes', { underline: true });
    doc.moveDown(0.5);
    
    const custTableTop = doc.y;
    const custColWidths = [150, 180, 80, 90];
    const custHeaders = ['Nome', 'Email', 'Sessões', 'Total Gasto'];
    
    doc.fontSize(10).font('Helvetica-Bold');
    xPos = 50;
    custHeaders.forEach((header, i) => {
      doc.text(header, xPos, custTableTop, { width: custColWidths[i], align: 'left' });
      xPos += custColWidths[i];
    });
    
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(9);
    data.topCustomers.slice(0, 15).forEach((customer) => {
      const rowY = doc.y;
      doc.text(customer.name, 50, rowY, { width: custColWidths[0] });
      doc.text(customer.email, 200, rowY, { width: custColWidths[1] });
      doc.text(customer.totalSessions.toString(), 380, rowY, { width: custColWidths[2] });
      doc.text(`R$ ${customer.totalSpent.toFixed(2)}`, 460, rowY, { width: custColWidths[3] });
      doc.moveDown(0.8);
    });

    // Revenue by Day Chart (text-based)
    if (data.revenueByDay.length > 0) {
      doc.addPage();
      doc.fontSize(16).text('Receita Diária', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(9).font('Helvetica');
      data.revenueByDay.forEach((day) => {
        const barWidth = (day.revenue / data.summary.totalRevenue) * 400;
        doc.text(`${this.formatDate(day.date)}`, 50, doc.y);
        doc.rect(150, doc.y - 10, barWidth, 12).fill('#FF6B35');
        doc.fillColor('black');
        doc.text(`R$ ${day.revenue.toFixed(2)} (${day.sessions} sessões)`, 560, doc.y - 12, { align: 'right' });
        doc.moveDown(0.8);
      });
    }

    // Footer
    this.addFooter(doc);

    doc.end();
    return doc;
  }

  private static addHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('UpCar Aspiradores', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
  }

  private static addRepasseHeader(doc: PDFKit.PDFDocument): void {
    // Try to add logo, fallback to text if not available
    const logoPath = 'packages/frontend/public/assets/upcar-logo.png';
    try {
      doc.image(logoPath, 40, 30, { width: 140 });
    } catch {
      doc.fontSize(18).text('UpCar Aspiradores', 40, 40);
    }
    doc.moveTo(40, 90).lineTo(550, 90).strokeColor('#000000').lineWidth(1).stroke();
    doc.moveDown(2);
  }

  private static addFooter(doc: PDFKit.PDFDocument): void {
    const y = doc.page.height - 50;
    doc.fontSize(9).fillColor('#444444').text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} | UpCar Aspiradores`,
      40,
      y,
      { align: 'center' }
    );
  }

  private static sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
    doc.moveDown(0.6);
    doc.fontSize(15).fillColor('#000000').font('Helvetica-Bold').text(title);
    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#d0d0d0').lineWidth(1).stroke();
    doc.moveDown(0.6);
  }

  private static kv(doc: PDFKit.PDFDocument, key: string, value: string): void {
    doc.fontSize(12).font('Helvetica-Bold').text(`${key}:`, { continued: true });
    doc.font('Helvetica').text(` ${value}`);
  }

  private static tableHeader(
    doc: PDFKit.PDFDocument,
    headers: string[],
    widths: number[]
  ): void {
    doc.font('Helvetica-Bold').fontSize(10);
    let x = 40;
    const y = doc.y;
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: widths[i], align: 'left' });
      x += widths[i];
    });
    doc.moveTo(40, y + 14).lineTo(550, y + 14).stroke();
    doc.moveDown(1);
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

  private static translateStatus(status: string): string {
    const translations: { [key: string]: string } = {
      online: 'Ligada',
      offline: 'Desligada',
      maintenance: 'Manutenção',
      in_use: 'Em Uso',
    };
    return translations[status] || status;
  }
}
