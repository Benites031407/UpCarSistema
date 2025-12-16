# PDF Export System - UpCar Aspiradores

## Overview
Implemented a comprehensive PDF report generation system for the UpCar Aspiradores admin dashboard.

## Features Implemented

### 1. Consolidated Report (Relatório Consolidado)
**Button**: Orange "Relatório Consolidado" button
**Purpose**: Generate a single PDF with all business data
**Contents**:
- Summary statistics (total machines, revenue, sessions, customers, usage hours)
- Performance breakdown by machine (code, location, revenue, sessions, hours)
- Top customers list (name, email, sessions, total spent)
- Daily revenue chart with visual bars

### 2. Individual Machine Reports (ZIP)
**Button**: Blue "Todos os Aspiradores (ZIP)" button
**Purpose**: Generate individual PDF reports for each machine, packaged in a ZIP file
**Use Case**: Send individual reports to commercial point owners
**Contents per machine**:
- Machine information (code, location, status)
- Usage statistics (sessions, total hours, average duration)
- Revenue data (total, average per session)
- Energy consumption (kWh, cost)
- Recent sessions table (date, user, duration, cost)

### 3. Individual Machine Report (Single)
**Endpoint**: `/api/admin/reports/export?type=consolidated&machineId=xxx&startDate=xxx&endDate=xxx`
**Purpose**: Generate a single machine report
**Use Case**: Quick export for a specific machine

## Technical Implementation

### Backend Components

#### 1. PDF Generator Service (`packages/backend/src/services/pdfGenerator.ts`)
- Uses `pdfkit` library for PDF generation
- Two main methods:
  - `generateMachineReport()` - Individual machine reports
  - `generateConsolidatedReport()` - Consolidated business report
- Professional formatting with:
  - UpCar branding
  - Tables with proper alignment
  - Visual charts (text-based bars)
  - Headers and footers
  - Portuguese translations

#### 2. Reports Repository (`packages/backend/src/repositories/reports.ts`)
- Fetches data from PostgreSQL database
- Three main methods:
  - `getMachineReportData()` - Data for single machine
  - `getConsolidatedReportData()` - Data for all machines
  - `getAllMachineIds()` - List of all machine IDs
- Calculates:
  - Usage statistics
  - Revenue metrics
  - Energy consumption
  - Customer analytics

#### 3. API Endpoints (`packages/backend/src/routes/admin.ts`)
- `GET /api/admin/reports/export` - Generate single report (machine or consolidated)
- `GET /api/admin/reports/export-all-machines` - Generate ZIP with all machine reports

### Frontend Components

#### Analytics Component Updates (`packages/frontend/src/components/admin/AnalyticsComponent.tsx`)
- Replaced 3 separate export buttons with 2 main buttons:
  1. **Relatório Consolidado** (Orange) - Main business report
  2. **Todos os Aspiradores (ZIP)** (Blue) - All machine reports
- Both buttons respect the selected date range filter

## Usage

### For Administrators:
1. Go to "Análises" tab in admin dashboard
2. Select date range using the date filters
3. Click desired export button:
   - **Relatório Consolidado**: Download comprehensive business report
   - **Todos os Aspiradores (ZIP)**: Download all machine reports in ZIP

### For Commercial Point Owners:
- Administrators can extract individual machine PDFs from the ZIP file
- Each PDF is named: `relatorio-{MACHINE_CODE}.pdf`
- Send the specific PDF to the corresponding commercial point owner

## PDF Report Structure

### Individual Machine Report
```
┌─────────────────────────────────────┐
│ Relatório de Aspirador              │
│ UpCar Aspiradores                   │
├─────────────────────────────────────┤
│ Informações do Aspirador            │
│ - Código                            │
│ - Localização                       │
│ - Status                            │
│                                     │
│ Estatísticas de Uso                 │
│ - Total de Sessões                  │
│ - Tempo Total de Uso                │
│ - Duração Média por Sessão          │
│                                     │
│ Receita                             │
│ - Receita Total                     │
│ - Receita Média por Sessão          │
│                                     │
│ Consumo de Energia                  │
│ - Consumo Total (kWh)               │
│ - Custo de Energia                  │
│                                     │
│ Sessões Recentes (Table)            │
│ Date | User | Duration | Cost       │
└─────────────────────────────────────┘
```

### Consolidated Report
```
┌─────────────────────────────────────┐
│ Relatório Consolidado               │
│ UpCar Aspiradores                   │
├─────────────────────────────────────┤
│ Resumo Geral                        │
│ - Total de Aspiradores              │
│ - Receita Total                     │
│ - Total de Sessões                  │
│ - Total de Clientes                 │
│ - Tempo Total de Uso                │
│                                     │
│ Desempenho por Aspirador (Table)    │
│ Code | Location | Revenue | ...     │
│                                     │
│ Principais Clientes (Table)         │
│ Name | Email | Sessions | Spent     │
│                                     │
│ Receita Diária (Chart)              │
│ Date ████████ R$ XXX.XX             │
└─────────────────────────────────────┘
```

## Dependencies Added
- `pdfkit` - PDF generation library
- `@types/pdfkit` - TypeScript types
- `archiver` - ZIP file creation
- `@types/archiver` - TypeScript types

## Next Steps (Optional Enhancements)
1. Add company logo to PDF header
2. Add email functionality to send reports automatically
3. Add scheduling for automatic monthly reports
4. Add more chart types (pie charts, line graphs)
5. Add custom branding per commercial point
6. Add digital signatures for official reports

## Testing
1. Restart backend server to load new dependencies
2. Navigate to Analytics page
3. Select a date range
4. Click "Relatório Consolidado" - should download PDF
5. Click "Todos os Aspiradores (ZIP)" - should download ZIP with multiple PDFs
