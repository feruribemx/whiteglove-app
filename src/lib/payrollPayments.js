// Management of Cleaner Payroll Payment Status and History
// Supports both Period-level and Service-level tracking so services already paid
// are never counted or duplicated again in overlapping or subsequent payroll ranges (e.g. 1-16 vs 16-31).

const PAYMENTS_STORAGE_KEY = 'wg_payroll_payments';
const PAID_SERVICES_STORAGE_KEY = 'wg_payroll_paid_services';

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
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error reading payroll payments:', err);
    return {};
  }
}

import { fetchPayrollSetting, savePayrollSetting } from './supabase';
import { saveSettingToFirestore } from './firebase';

/**
 * Save payments dictionary to localStorage and cloud
 */
export function savePayrollPayments(records) {
  try {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(records));
    savePayrollSetting('payroll_payments', records).catch(() => {});
    saveSettingToFirestore('payroll_payments', records).catch(() => {});
  } catch (err) {
    console.error('Error saving payroll payments:', err);
  }
}

/**
 * Read all individually paid service records from localStorage
 */
export function getPaidServices() {
  try {
    const raw = localStorage.getItem(PAID_SERVICES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error reading paid services:', err);
    return {};
  }
}

/**
 * Save paid services dictionary to localStorage and cloud
 */
export function savePaidServices(records) {
  try {
    localStorage.setItem(PAID_SERVICES_STORAGE_KEY, JSON.stringify(records));
    savePayrollSetting('payroll_paid_services', records).catch(() => {});
    saveSettingToFirestore('payroll_paid_services', records).catch(() => {});
  } catch (err) {
    console.error('Error saving paid services:', err);
  }
}

/**
 * Sync payroll payments and paid services with cloud
 */
export async function syncPayrollCloud() {
  try {
    const [cloudPayments, cloudPaidServices] = await Promise.all([
      fetchPayrollSetting('payroll_payments'),
      fetchPayrollSetting('payroll_paid_services'),
    ]);

    const localPayments = getPayrollPayments();
    const localPaidServices = getPaidServices();

    const mergedPayments = { ...(cloudPayments || {}), ...localPayments };
    const mergedPaidServices = { ...(cloudPaidServices || {}), ...localPaidServices };

    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(mergedPayments));
    localStorage.setItem(PAID_SERVICES_STORAGE_KEY, JSON.stringify(mergedPaidServices));

    return { payments: mergedPayments, paidServices: mergedPaidServices };
  } catch (err) {
    return { payments: getPayrollPayments(), paidServices: getPaidServices() };
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
 * Generate a primary key for a service assigned to a cleaner
 */
export function buildServiceCleanerKey(serviceId, cleanerName) {
  const sId = serviceId != null ? String(serviceId).trim() : '';
  const cName = (cleanerName || '').trim().toLowerCase();
  return `${sId}__${cName}`;
}

/**
 * Generate a fallback composite key based on date + unit + cleaner
 */
export function buildServiceDateUnitCleanerKey(fecha, unidad, cleanerName) {
  const dateStr = (fecha || '').trim();
  const uName = (unidad || '').trim().toLowerCase();
  const cName = (cleanerName || '').trim().toLowerCase();
  return `${dateStr}__${uName}__${cName}`;
}

/**
 * Check if a specific service has already been paid to a cleaner
 * Returns the paidRecord object if already paid, or null if pending.
 */
export function isServicePaidForCleaner(service, cleanerName, paidServicesMap = null) {
  if (!service || !cleanerName) return null;
  const map = paidServicesMap || getPaidServices();

  // 1. Primary check by serviceId + cleaner
  if (service.id != null) {
    const primaryKey = buildServiceCleanerKey(service.id, cleanerName);
    if (map[primaryKey]) return map[primaryKey];
  }

  // 2. Fallback check by fecha + unidad + cleaner
  if (service.fecha && service.unidad) {
    const backupKey = buildServiceDateUnitCleanerKey(service.fecha, service.unidad, cleanerName);
    if (map[backupKey]) return map[backupKey];
  }

  return null;
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
 * Mark a cleaner's payroll as paid for a period.
 * Crucially, it registers each specific service included in this payment so that
 * if another overlapping or adjacent range (e.g. 16-31 after 1-16) is chosen,
 * any service from day 16 (or any previously paid day) is NEVER summed again!
 */
export function markCleanerPayrollAsPaid(cleanerName, periodKey, details = {}) {
  const allPayments = getPayrollPayments();
  const allPaidServices = getPaidServices();
  const key = buildPaymentKey(cleanerName, periodKey);
  const now = new Date();

  const servicesToPay = Array.isArray(details.servicesToPay) ? details.servicesToPay : [];
  const paidServiceKeys = [];

  // Register each service as paid for this cleaner
  servicesToPay.forEach((svc) => {
    const subtotal = Number(svc.subtotal || svc.pagoBase || 0);
    const paidInfo = {
      serviceId: svc.id,
      serviceDate: svc.fecha,
      unit: svc.unidad,
      cleaner: (cleanerName || '').trim(),
      paymentId: key,
      periodKey: (periodKey || '').trim(),
      periodLabel: details.periodLabel || 'Período actual',
      periodType: details.periodType || 'Nómina',
      amountPaid: subtotal,
      paidAt: now.toISOString(),
      paidDateFormatted: formatPaymentDate(now),
    };

    if (svc.id != null) {
      const pKey = buildServiceCleanerKey(svc.id, cleanerName);
      allPaidServices[pKey] = paidInfo;
      paidServiceKeys.push(pKey);
    }
    if (svc.fecha && svc.unidad) {
      const bKey = buildServiceDateUnitCleanerKey(svc.fecha, svc.unidad, cleanerName);
      allPaidServices[bKey] = paidInfo;
    }
  });

  const record = {
    id: key,
    cleaner: (cleanerName || '').trim(),
    periodKey: (periodKey || '').trim(),
    periodLabel: details.periodLabel || 'Período actual',
    periodType: details.periodType || 'Nómina',
    amount: Number(details.amount) || 0,
    hours: Number(details.hours) || 0,
    servicesCount: Number(details.servicesCount) || 0,
    serviceIds: servicesToPay.map((s) => s.id).filter((id) => id != null),
    paidServiceKeys,
    status: 'pagado',
    paidAt: now.toISOString(),
    paidDateFormatted: formatPaymentDate(now),
    paymentMethod: details.paymentMethod || 'Transferencia / E-Transfer',
    reference: details.reference || '',
    notes: details.notes || '',
    markedBy: details.markedBy || 'Administrador',
  };

  allPayments[key] = record;
  savePayrollPayments(allPayments);
  savePaidServices(allPaidServices);
  return record;
}

/**
 * Mark a cleaner's payroll as pending (revert payment)
 * Also unlocks all individual services that were marked paid in this specific payment.
 */
export function markCleanerPayrollAsPending(cleanerName, periodKey) {
  const allPayments = getPayrollPayments();
  const allPaidServices = getPaidServices();
  const key = buildPaymentKey(cleanerName, periodKey);
  const paymentRecord = allPayments[key];

  if (paymentRecord) {
    // Remove all service records tagged with this paymentId
    Object.keys(allPaidServices).forEach((k) => {
      if (allPaidServices[k]?.paymentId === key) {
        delete allPaidServices[k];
      }
    });

    delete allPayments[key];
    savePayrollPayments(allPayments);
    savePaidServices(allPaidServices);
  }
  return { status: 'pendiente' };
}

/**
 * Allow manually toggling an individual service's payment status for a cleaner
 */
export function toggleServicePaidStatus(service, cleanerName, shouldBePaid, details = {}) {
  const allPaidServices = getPaidServices();
  const now = new Date();
  const primaryKey = buildServiceCleanerKey(service.id, cleanerName);
  const backupKey = buildServiceDateUnitCleanerKey(service.fecha, service.unidad, cleanerName);

  if (shouldBePaid) {
    const record = {
      serviceId: service.id,
      serviceDate: service.fecha,
      unit: service.unidad,
      cleaner: (cleanerName || '').trim(),
      paymentId: details.paymentId || `manual_${cleanerName}_${service.id || Date.now()}`,
      periodLabel: details.periodLabel || 'Ajuste Manual',
      periodType: 'Manual',
      amountPaid: Number(service.subtotal || service.pagoBase || 0),
      paidAt: now.toISOString(),
      paidDateFormatted: formatPaymentDate(now),
    };
    allPaidServices[primaryKey] = record;
    if (service.fecha && service.unidad) allPaidServices[backupKey] = record;
  } else {
    delete allPaidServices[primaryKey];
    delete allPaidServices[backupKey];
  }

  savePaidServices(allPaidServices);
  return allPaidServices;
}

/**
 * Reconciles historical payments from previous sessions if they did not yet populate
 * the individual paid services map. This guarantees existing paid periods immediately protect
 * services from overlapping duplicates.
 */
export function syncPaidServicesFromExistingPayments(allServices = []) {
  if (!allServices || !allServices.length) return;
  const allPayments = getPayrollPayments();
  const allPaidServices = getPaidServices();
  let changed = false;

  Object.values(allPayments).forEach((payment) => {
    if (!payment || payment.status !== 'pagado') return;
    const cleanerLower = (payment.cleaner || '').toLowerCase().trim();
    if (!cleanerLower) return;

    // Check if periodKey has start and end dates (e.g. week_2026-10-01_2026-10-07 or custom_2026-10-01_2026-10-16)
    const parts = (payment.periodKey || '').split('_');
    let startDate = '';
    let endDate = '';

    if (parts.length >= 3 && parts[1].length === 10 && parts[2].length === 10) {
      startDate = parts[1];
      endDate = parts[2];
    } else if (parts[0] === 'month' && parts[1]?.length === 7) {
      startDate = `${parts[1]}-01`;
      endDate = `${parts[1]}-31`;
    }

    if (!startDate || !endDate) return;

    // Find services in this range for this cleaner
    allServices.forEach((svc) => {
      if (!svc || !svc.fecha || svc.fecha < startDate || svc.fecha > endDate) return;
      const svcCleaners = svc.cleaners?.length ? svc.cleaners : (svc.cleaner ? [svc.cleaner] : []);
      const matchesCleaner = svcCleaners.some((c) => (c || '').toLowerCase().trim() === cleanerLower);
      if (!matchesCleaner) return;

      const primaryKey = buildServiceCleanerKey(svc.id, payment.cleaner);
      const backupKey = buildServiceDateUnitCleanerKey(svc.fecha, svc.unidad, payment.cleaner);

      if (!allPaidServices[primaryKey] && !allPaidServices[backupKey]) {
        const record = {
          serviceId: svc.id,
          serviceDate: svc.fecha,
          unit: svc.unidad,
          cleaner: payment.cleaner,
          paymentId: payment.id,
          periodKey: payment.periodKey,
          periodLabel: payment.periodLabel,
          periodType: payment.periodType,
          amountPaid: Number(svc.pagoCleaner || 0),
          paidAt: payment.paidAt,
          paidDateFormatted: payment.paidDateFormatted,
        };
        allPaidServices[primaryKey] = record;
        allPaidServices[backupKey] = record;
        changed = true;
      }
    });
  });

  if (changed) {
    savePaidServices(allPaidServices);
  }
  return allPaidServices;
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
