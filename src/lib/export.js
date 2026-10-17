/**
 * Data Export Utilities (CSV generator for accounting, payroll, and billing)
 */

export function exportServicesToCSV(services, filename = 'servicios_whiteglove.csv') {
  if (!services || services.length === 0) return;

  const headers = [
    'ID', 'Fecha', 'Cliente / Unidad', 'Cleaners', 'Horas',
    'Tipo', 'Cobro Cliente', 'Pago Cleaner', 'Pago Team', 'Tip', 'Capturista'
  ];

  const rows = services.map(s => [
    s.id,
    s.fecha,
    `"${(s.unidad || '').replace(/"/g, '""')}"`,
    `"${(s.cleaners || []).join(', ').replace(/"/g, '""')}"`,
    s.horas,
    `"${(s.tipo || '').replace(/"/g, '""')}"`,
    s.cobro != null ? s.cobro : '',
    s.pagoCleaner != null ? s.pagoCleaner : '',
    s.pagoCleaningTeam != null ? s.pagoCleaningTeam : '',
    s.tip != null ? s.tip : '',
    `"${(s.capturista || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportPayrollToCSV(payrollData, filename = 'nomina_cleaners_whiteglove.csv') {
  if (!payrollData || payrollData.length === 0) return;

  const headers = [
    'Cleaner', 'Total Servicios', 'Total Horas', 'Pago Base', 'Tips', 'Total a Pagar'
  ];

  const rows = payrollData.map(p => [
    `"${(p.cleaner || '').replace(/"/g, '""')}"`,
    p.totalServices,
    p.totalHours.toFixed(2),
    p.basePay.toFixed(2),
    p.tips.toFixed(2),
    p.totalPay.toFixed(2),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
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
