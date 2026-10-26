/**
 * WhiteGlove Executive Voucher & Payroll PDF Generator
 * Opens an isolated, print-optimized document ready for instant PDF saving or printing.
 */

export function generateCleanerVoucherHTML(cleanerData, periodLabel, paymentRecord = null) {
  const isPaid = Boolean(paymentRecord || cleanerData.isPaid);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const voucherId = paymentRecord?.id || `REC-${cleanerData.cleaner.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  const totalAmount = paymentRecord?.amount != null ? paymentRecord.amount : (cleanerData.totalPay || 0);
  const totalHours = paymentRecord?.hours != null ? paymentRecord.hours : (cleanerData.totalHours || 0);
  const totalServices = paymentRecord?.servicesCount != null ? paymentRecord.servicesCount : (cleanerData.totalServices || 0);

  const servicesRows = (cleanerData.servicesList || []).map((s, idx) => {
    const isCancelled = s.status === 'cancelado';
    const isAlreadyPaid = Boolean(s.isAlreadyPaid);

    let statusBadge = '<span style="color: #059669; font-weight: 700;">✓ Computable</span>';
    if (isCancelled) {
      statusBadge = '<span style="color: #e11d48; font-weight: 700; text-decoration: line-through;">Cancelado</span>';
    } else if (isAlreadyPaid) {
      statusBadge = '<span style="color: #2563eb; font-weight: 600;">Liquidado Previo</span>';
    }

    const rowStyle = isCancelled
      ? 'background: #fff1f2; color: #94a3b8; text-decoration: line-through;'
      : isAlreadyPaid
      ? 'background: #f0fdf4;'
      : (idx % 2 === 0 ? 'background: #ffffff;' : 'background: #f8fafc;');

    return `
      <tr style="${rowStyle} border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 9px 12px; font-weight: 600;">${s.fecha || '—'}</td>
        <td style="padding: 9px 12px; font-weight: 700; color: #0B1D4A;">${s.unidad || 'General'}</td>
        <td style="padding: 9px 12px;">${s.tipo || 'Limpieza'}</td>
        <td style="padding: 9px 12px; text-align: center; font-weight: 600;">${(Number(s.horas) || 0).toFixed(1)} hrs</td>
        <td style="padding: 9px 12px; text-align: right;">$${s.rate != null ? Number(s.rate).toFixed(2) : '18.00'}</td>
        <td style="padding: 9px 12px; text-align: right; font-weight: 600;">$${(Number(s.cleanerPay) || Number(s.subtotal) || 0).toFixed(2)}</td>
        <td style="padding: 9px 12px; text-align: right; color: #b45309; font-weight: 600;">+$${(Number(s.tip) || 0).toFixed(2)}</td>
        <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #0B1D4A;">$${(Number(s.subtotal) || 0).toFixed(2)} CAD</td>
        <td style="padding: 9px 12px; text-align: center;">${statusBadge}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Recibo de Nómina WhiteGlove - ${cleanerData.cleaner} - ${periodLabel}</title>
        <style>
          @page {
            size: letter portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .toolbar {
            background: #0B1D4A;
            color: #ffffff;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .toolbar button {
            background: #FFB566;
            color: #0B1D4A;
            border: none;
            padding: 8px 18px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            transition: all 0.15s ease;
          }
          .toolbar button:hover {
            background: #E89A45;
          }
          .document-container {
            max-width: 800px;
            margin: 20px auto;
            padding: 32px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
          }
          .header-table {
            width: 100%;
            border-bottom: 2px solid #0B1D4A;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-family: Georgia, serif;
            font-size: 24px;
            font-weight: 700;
            color: #0B1D4A;
            margin: 0;
            line-height: 1.1;
          }
          .brand-subtitle {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #d97706;
            font-weight: 700;
            margin-top: 4px;
          }
          .badge-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .badge-paid {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
          }
          .badge-pending {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 18px 0;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            text-align: center;
          }
          .kpi-title {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            font-weight: 700;
          }
          .kpi-value {
            font-size: 18px;
            font-weight: 800;
            color: #0B1D4A;
            margin-top: 4px;
          }
          .highlight-card {
            background: #0B1D4A;
            color: #ffffff;
            border: 1px solid #1e3a8a;
          }
          .highlight-card .kpi-title {
            color: #cbd5e1;
          }
          .highlight-card .kpi-value {
            color: #FFB566;
            font-size: 22px;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
          }
          table.data-table th {
            background: #0B1D4A;
            color: #ffffff;
            padding: 10px 12px;
            font-size: 11px;
            font-weight: 700;
            text-align: left;
          }
          .signatures-zone {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px dashed #cbd5e1;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #475569;
            height: 45px;
            margin-bottom: 8px;
          }
          .signature-label {
            font-size: 11px;
            color: #475569;
            font-weight: 600;
          }
          .footer-note {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 28px;
          }
          @media print {
            .toolbar { display: none !important; }
            .document-container {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div style="font-size: 13px; font-weight: 600;">
            WhiteGlove Suite · Vista Oficial de Impresión / Guardado en PDF
          </div>
          <button onclick="window.print()">
            🖨️ Imprimir / Guardar en PDF
          </button>
        </div>

        <div class="document-container">
          <!-- Top Header -->
          <table class="header-table">
            <tr>
              <td style="vertical-align: middle;">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <img
                    src="${window.location.origin}/logo.webp"
                    alt="WhiteGlove"
                    style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid #FFB566; object-fit: contain;"
                    onerror="this.style.display='none'"
                  />
                  <div>
                    <h1 class="brand-title">WhiteGlove Professional Services</h1>
                    <div class="brand-subtitle">Comprobante Oficial de Nómina & Liquidación</div>
                  </div>
                </div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <div style="font-size: 12px; color: #64748b; font-weight: 500;">Folio Recibo:</div>
                <div style="font-size: 13px; font-family: monospace; font-weight: 800; color: #0B1D4A;">#${voucherId}</div>
                <div style="margin-top: 4px;">
                  <span class="badge-status ${isPaid ? 'badge-paid' : 'badge-pending'}">
                    ${isPaid ? '✓ PAGADO / LIQUIDADO' : '⏳ PENDIENTE DE TRANSFERENCIA'}
                  </span>
                </div>
              </td>
            </tr>
          </table>

          <!-- Cleaner & Period Meta Info -->
          <table style="width: 100%; margin-bottom: 12px; font-size: 12px;">
            <tr>
              <td style="width: 50%; padding: 4px 0;">
                <strong style="color: #64748b;">Especialista / Cleaner:</strong>
                <span style="font-size: 14px; font-weight: 800; color: #0B1D4A; margin-left: 6px;">${cleanerData.cleaner}</span>
              </td>
              <td style="width: 50%; padding: 4px 0; text-align: right;">
                <strong style="color: #64748b;">Período Laboral:</strong>
                <span style="font-weight: 700; color: #0B1D4A; margin-left: 6px;">${periodLabel}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">
                <strong style="color: #64748b;">Fecha de Emisión:</strong>
                <span style="color: #334155; margin-left: 6px;">${dateFormatted}</span>
              </td>
              <td style="padding: 4px 0; text-align: right;">
                <strong style="color: #64748b;">Método de Pago:</strong>
                <span style="color: #334155; margin-left: 6px;">${paymentRecord?.paymentMethod || 'E-Transfer Bancario'}</span>
                ${paymentRecord?.reference ? `<span style="font-family: monospace; font-weight: 700; margin-left: 4px;">(${paymentRecord.reference})</span>` : ''}
              </td>
            </tr>
          </table>

          <!-- KPI Summary Cards -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Turnos Realizados</div>
              <div class="kpi-value">${totalServices}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Horas Trabajadas</div>
              <div class="kpi-value">${totalHours.toFixed(1)} h</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Propinas Ganadas</div>
              <div class="kpi-value" style="color: #b45309;">+$${(cleanerData.tips || 0).toFixed(2)}</div>
            </div>
            <div class="kpi-card highlight-card">
              <div class="kpi-title">Total Neto a Cobrar</div>
              <div class="kpi-value">$${totalAmount.toFixed(2)} <span style="font-size: 13px; font-weight: 600;">CAD</span></div>
            </div>
          </div>

          ${cleanerData.manualAdjustment && cleanerData.manualAdjustment !== 0 ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; font-size: 11px; margin-bottom: 12px; color: #92400e;">
              <strong>Ajuste / Bono Especial Aplicado:</strong> ${cleanerData.manualAdjustment > 0 ? '+' : ''}$${cleanerData.manualAdjustment.toFixed(2)} CAD
            </div>
          ` : ''}

          <!-- Detailed Services Breakdown Table -->
          <div style="font-size: 13px; font-weight: 700; color: #0B1D4A; margin-top: 14px; margin-bottom: 6px;">
            Desglose Detallado de Turnos y Servicios Computados:
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Propiedad / Cliente</th>
                <th>Servicio</th>
                <th style="text-align: center;">Duración</th>
                <th style="text-align: right;">Tarifa</th>
                <th style="text-align: right;">Base</th>
                <th style="text-align: right;">Propina</th>
                <th style="text-align: right;">Total</th>
                <th style="text-align: center;">Estatus</th>
              </tr>
            </thead>
            <tbody>
              ${servicesRows || '<tr><td colspan="9" style="text-align:center; padding: 16px;">Sin turnos registrados en este período.</td></tr>'}
            </tbody>
          </table>

          <!-- Signatures Zone -->
          <div class="signatures-zone">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Elaborado y Aprobado por:</div>
              <div style="font-size: 12px; font-weight: 700; color: #0B1D4A;">WhiteGlove Operations & Payroll</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Recibido y Conforme por el Especialista:</div>
              <div style="font-size: 12px; font-weight: 700; color: #0B1D4A;">${cleanerData.cleaner}</div>
            </div>
          </div>

          <!-- Footer Legal -->
          <div class="footer-note">
            WhiteGlove Professional Services · Operaciones Canadá, Estados Unidos y México · Soporte: operations@whitegloveps.com
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Directly opens the printable voucher document in a new window and triggers print dialog
 */
export function openPrintableVoucher(cleanerData, periodLabel, paymentRecord = null) {
  const html = generateCleanerVoucherHTML(cleanerData, periodLabel, paymentRecord);
  const win = window.open('', '_blank', 'width=900,height=1000,menubar=no,toolbar=no,location=no,status=no');
  if (!win) {
    // If popup blocked, create hidden iframe and print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 400);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}
