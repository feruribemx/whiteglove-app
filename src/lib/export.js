/**
 * Data Export Utilities (CSV & Excel Spreadsheet generator for accounting, payroll, billing, and calendar schedule)
 */

const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function getDayNameFromYMD(fechaStr) {
  if (!fechaStr) return '';
  try {
    const [y, m, d] = String(fechaStr).split('-').map(Number);
    if (!y || !m || !d) return '';
    const dt = new Date(y, m - 1, d);
    return DAY_NAMES_ES[dt.getDay()] || '';
  } catch {
    return '';
  }
}

export function exportServicesToCSV(services, filename = 'servicios_whiteglove.csv') {
  if (!services || services.length === 0) return;

  const headers = [
    'ID', 'Fecha', 'Cliente / Unidad', 'Cleaners', 'Horas',
    'Tipo', 'Cobro Cliente', 'Pago Cleaner', 'Pago Team', 'Utilidad', 'Tip', 'Estado Cobranza', 'Capturista'
  ];

  const rows = services.map(s => {
    const cobro = Number(s.cobro) || 0;
    const teamPay = Number(s.pagoCleaningTeam) || 0;
    const cleanerPay = s.pagosPorCleaner && Object.keys(s.pagosPorCleaner).length > 0
      ? Object.values(s.pagosPorCleaner).reduce((a, b) => a + (Number(b) || 0), 0)
      : (Number(s.pagoCleaner) || 0);
    const cost = teamPay > 0 ? teamPay : cleanerPay;
    const utilidad = s.status === 'cancelado' ? 0 : (s.cobro != null ? (cobro - cost).toFixed(2) : '');
    const cobranza = s.cobranzaStatus || 'pendiente';

    return [
      s.id,
      s.fecha,
      `"${(s.unidad || '').replace(/"/g, '""')}"`,
      `"${(s.cleaners || []).join(', ').replace(/"/g, '""')}"`,
      s.horas,
      `"${(s.tipo || '').replace(/"/g, '""')}"`,
      s.cobro != null ? s.cobro : '',
      s.pagoCleaner != null ? s.pagoCleaner : '',
      s.pagoCleaningTeam != null ? s.pagoCleaningTeam : '',
      utilidad,
      s.tip != null ? s.tip : '',
      `"${cobranza.toUpperCase()}"`,
      `"${(s.capturista || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportPayrollToCSV(payrollData, filename = 'nomina_cleaners_whiteglove.csv') {
  if (!payrollData || payrollData.length === 0) return;

  const headers = [
    'Cleaner',
    'Turnos Totales',
    'Turnos a Liquidar',
    'Turnos Ya Pagados Previamente',
    'Horas a Liquidar',
    'Pago Base Pendiente',
    'Tips Pendientes',
    'Monto Excluido (Ya Pagado)',
    'Total a Pagar (CAD)',
    'Estado'
  ];

  const rows = payrollData.map(p => {
    const isPaid = p.isPaid;
    const pendingH = (isPaid ? p.totalHours : (p.pendingHours ?? p.totalHours)).toFixed(2);
    const pendingB = (isPaid ? p.basePay : (p.pendingBasePay ?? p.basePay)).toFixed(2);
    const pendingT = (isPaid ? p.tips : (p.pendingTips ?? p.tips)).toFixed(2);
    const alreadyPaidAmt = (p.alreadyPaidAmount || 0).toFixed(2);
    const estado = isPaid ? 'PAGADO' : 'PENDIENTE';

    return [
      `"${(p.cleaner || '').replace(/"/g, '""')}"`,
      p.totalServices,
      p.pendingServicesCount ?? (isPaid ? 0 : p.totalServices),
      p.alreadyPaidServicesCount || 0,
      pendingH,
      pendingB,
      pendingT,
      alreadyPaidAmt,
      p.totalPay.toFixed(2),
      estado
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Formats calendar items into standardized 2D rows for both Excel download and Google Sheets sync
 */
export function buildScheduleSpreadsheetRows(calendarItems = [], getDossierFn = null) {
  const headers = [
    'Fecha',
    'Día',
    'Hora',
    'Cliente / Unidad',
    'Tipo de Servicio',
    'Cleaners Asignados',
    'Horas Estimadas',
    'Estado Turno',
    'Estado Cobranza Cliente',
    'Cobro Cliente (CAD)',
    'Pago Cleaner (CAD)',
    'Dirección',
    'Acceso / Lockbox',
    'Notas Operativas',
    'Origen',
    'ID Registro'
  ];

  const dataRows = (calendarItems || []).map((item) => {
    const svc = item.originalService || {};
    const cleanersList = Array.isArray(item.cleaners) && item.cleaners.length > 0
      ? item.cleaners.join(', ')
      : (item.cleaner || 'Sin asignar');
    const dossier = typeof getDossierFn === 'function' ? getDossierFn(item.unidad) : null;

    const estadoLabel =
      item.status === 'cancelled' || item.estado === 'cancelado'
        ? 'CANCELADO'
        : item.status === 'completed' || item.estado === 'completado'
        ? 'COMPLETADO'
        : 'PROGRAMADO';

    const cobranzaRaw = svc.cobranzaStatus || item.cobranzaStatus || '';
    const cobranzaLabel =
      cobranzaRaw === 'pagado'
        ? 'PAGADO'
        : cobranzaRaw === 'facturado'
        ? 'FACTURADO'
        : item.isRegisteredService
        ? 'PENDIENTE'
        : 'POR EJECUTAR';

    const cobro = svc.cobro != null ? Number(svc.cobro) : '';
    const pagoCleaner =
      svc.pagosPorCleaner && Object.keys(svc.pagosPorCleaner).length > 0
        ? Object.values(svc.pagosPorCleaner).reduce((a, b) => a + (Number(b) || 0), 0)
        : svc.pagoCleaner != null
        ? Number(svc.pagoCleaner)
        : '';

    const cleanNote = String(item.notas || '')
      .replace(/^\[Duración:[^\]]+\]\s*/i, '')
      .replace(/^Servicio registrado en sistema$/i, '')
      .trim();

    return [
      item.fecha || '',
      getDayNameFromYMD(item.fecha),
      item.hora || '09:00',
      item.unidad || '',
      item.tipo || 'Limpieza',
      cleanersList,
      Number(item.horas) || 2,
      estadoLabel,
      cobranzaLabel,
      cobro !== '' ? Number(cobro.toFixed(2)) : '',
      pagoCleaner !== '' ? Number(pagoCleaner.toFixed(2)) : '',
      dossier?.address || '',
      dossier?.accessCode || '',
      cleanNote,
      item.isRegisteredService ? 'Servicio Registrado' : 'Turno Agendado',
      String(item.rawId || item.id || '')
    ];
  });

  return { headers, dataRows };
}

/**
 * Exports calendar schedule items to an Excel (.xls) file with styled headers & UTF-8 support,
 * or CSV (.csv) if requested.
 */
export function exportScheduleToExcel(
  calendarItems = [],
  filename = 'calendario_whiteglove.xls',
  getDossierFn = null,
  periodLabel = 'Programación General'
) {
  if (!calendarItems || calendarItems.length === 0) return false;

  const { headers, dataRows } = buildScheduleSpreadsheetRows(calendarItems, getDossierFn);

  if (filename.toLowerCase().endsWith('.csv')) {
    const csvRows = dataRows.map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '';
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
    downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
    return true;
  }

  const escapeHtml = (val) =>
    String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const totalHours = dataRows.reduce((acc, r) => acc + (Number(r[6]) || 0), 0);
  const totalCobro = dataRows.reduce((acc, r) => acc + (Number(r[9]) || 0), 0);
  const totalPago = dataRows.reduce((acc, r) => acc + (Number(r[10]) || 0), 0);

  const htmlTable = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Calendario WhiteGlove</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #0B1D4A; color: #FFB566; font-weight: bold; border: 1px solid #1E3670; padding: 8px 10px; text-align: left; }
        td { border: 1px solid #CBD5E1; padding: 6px 10px; vertical-align: middle; }
        .title-row { background-color: #071230; color: #FFFFFF; font-size: 14pt; font-weight: bold; padding: 10px; }
        .subtitle-row { background-color: #F8FAFC; color: #334155; font-size: 10pt; font-weight: bold; padding: 6px 10px; }
        .total-row { background-color: #FEF3C7; color: #0B1D4A; font-weight: bold; border-top: 2px solid #0B1D4A; }
        .status-paid { color: #047857; font-weight: bold; }
        .status-pending { color: #B45309; font-weight: bold; }
        .status-cancelled { color: #DC2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="${headers.length}" class="title-row">WHITEGLOVE CLEANING SERVICES — CONTROL DE CALENDARIO Y PROGRAMACIÓN</td>
        </tr>
        <tr>
          <td colspan="${headers.length}" class="subtitle-row">Periodo: ${escapeHtml(periodLabel)} | Exportado: ${escapeHtml(new Date().toLocaleString('es-MX'))} | Total Registros: ${dataRows.length}</td>
        </tr>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${dataRows
            .map((row) => {
              const cobStatus = String(row[8] || '');
              const cobClass =
                cobStatus === 'PAGADO'
                  ? 'status-paid'
                  : cobStatus === 'CANCELADO'
                  ? 'status-cancelled'
                  : 'status-pending';
              return `<tr>${row
                .map((cell, idx) => {
                  const cls = idx === 8 ? ` class="${cobClass}"` : '';
                  return `<td${cls}>${escapeHtml(cell)}</td>`;
                })
                .join('')}</tr>`;
            })
            .join('')}
          <tr class="total-row">
            <td colspan="6">TOTALES DEL PERIODO (${dataRows.length} turnos)</td>
            <td>${totalHours.toFixed(2)}</td>
            <td></td>
            <td></td>
            <td>${totalCobro > 0 ? totalCobro.toFixed(2) : ''}</td>
            <td>${totalPago > 0 ? totalPago.toFixed(2) : ''}</td>
            <td colspan="5"></td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  downloadBlob('\uFEFF' + htmlTable, filename, 'application/vnd.ms-excel;charset=utf-8;');
  return true;
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
