// Management of Cleaner Payroll Payment Status and History
const STORAGE_KEY = 'wg_payroll_payments';

/**
 * Format date for display in payroll receipts
 */
export function formatPaymentDate(dateObj = new Date()) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const day = d.getDate();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
}

/**
 * Read all payment records from localStorage
 */
export function getPayrollPayments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error reading payroll payments:', err);
    return {};
  }
}

/**
 * Save payments dictionary to localStorage
 */
export function savePayrollPayments(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving payroll payments:', err);
  }
}

/**
 * Generate a consistent unique key for a cleaner in a given period
 */
export function buildPaymentKey(cleanerName, periodKey) {
  const cleanName = (cleanerName || '').trim().toLowerCase();
  const cleanPeriod = (periodKey || 'current').trim().toLowerCase();
  return `${cleanName}__${cleanPeriod}`;
}

/**
 * Check if a cleaner's payroll is marked as paid for a specific period
 */
export function getCleanerPaymentStatus(cleanerName, periodKey) {
  const all = getPayrollPayments();
  const key = buildPaymentKey(cleanerName, periodKey);
  return all[key] || { status: 'pendiente' };
}

/**
 * Mark a cleaner's payroll as paid for a period
 */
export function markCleanerPayrollAsPaid(cleanerName, periodKey, details = {}) {
  const all = getPayrollPayments();
  const key = buildPaymentKey(cleanerName, periodKey);
  const now = new Date();

  const record = {
    id: key,
    cleaner: (cleanerName || '').trim(),
    periodKey: (periodKey || '').trim(),
    periodLabel: details.periodLabel || 'Período actual',
    periodType: details.periodType || 'Nómina',
    amount: Number(details.amount) || 0,
    hours: Number(details.hours) || 0,
    servicesCount: Number(details.servicesCount) || 0,
    status: 'pagado',
    paidAt: now.toISOString(),
    paidDateFormatted: formatPaymentDate(now),
    paymentMethod: details.paymentMethod || 'Transferencia / E-Transfer',
    reference: details.reference || '',
    notes: details.notes || '',
    markedBy: details.markedBy || 'Administrador',
  };

  all[key] = record;
  savePayrollPayments(all);
  return record;
}

/**
 * Mark a cleaner's payroll as pending (revert payment)
 */
export function markCleanerPayrollAsPending(cleanerName, periodKey) {
  const all = getPayrollPayments();
  const key = buildPaymentKey(cleanerName, periodKey);
  if (all[key]) {
    delete all[key];
    savePayrollPayments(all);
  }
  return { status: 'pendiente' };
}

/**
 * Get full history of all payments made, sorted from newest to oldest
 */
export function getAllPaymentHistory() {
  const all = getPayrollPayments();
  const list = Object.values(all).filter((r) => r && r.status === 'pagado');
  return list.sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''));
}

/**
 * Export payment history to CSV
 */
export function exportPaymentHistoryToCSV(historyList = null, filename = 'historial_pagos_nomina_whiteglove.csv') {
  const list = historyList || getAllPaymentHistory();
  if (!list.length) return;

  const headers = [
    'ID Registro',
    'Cleaner',
    'Período / Quincena / Semana',
    'Modalidad',
    'Turnos',
    'Horas',
    'Monto Pagado (CAD)',
    'Fecha de Pago',
    'Método',
    'Responsable'
  ];

  const rows = list.map((r) => [
    `"${r.id}"`,
    `"${r.cleaner}"`,
    `"${(r.periodLabel || '').replace(/"/g, '""')}"`,
    `"${r.periodType || 'Nómina'}"`,
    r.servicesCount,
    r.hours.toFixed(1),
    r.amount.toFixed(2),
    `"${r.paidDateFormatted || r.paidAt}"`,
    `"${r.paymentMethod || 'E-Transfer'}"`,
    `"${r.markedBy || 'Admin'}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
