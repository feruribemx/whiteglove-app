/**
 * Data Export Utilities (CSV generator for accounting, payroll, and billing)
 */

export function exportServicesToCSV(services, filename = 'servicios_whiteglove.csv') {
  if (!services || services.length === 0) return;

  const headers = [
    'ID', 'Fecha', 'Cliente / Unidad', 'Cleaners', 'Horas',
    'Tipo', 'Cobro Cliente', 'Pago Cleaner', 'Pago Team', 'Utilidad', 'Tip', 'Capturista'
  ];

  const rows = services.map(s => {
    const cobro = Number(s.cobro) || 0;
    const teamPay = Number(s.pagoCleaningTeam) || 0;
    const cleanerPay = s.pagosPorCleaner && Object.keys(s.pagosPorCleaner).length > 0
      ? Object.values(s.pagosPorCleaner).reduce((a, b) => a + (Number(b) || 0), 0)
      : (Number(s.pagoCleaner) || 0);
    const cost = teamPay > 0 ? teamPay : cleanerPay;
    const utilidad = s.status === 'cancelado' ? 0 : (s.cobro != null ? (cobro - cost).toFixed(2) : '');

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
