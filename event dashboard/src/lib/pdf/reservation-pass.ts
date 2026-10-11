import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export interface ReservationPassInput {
  bookingId: string;
  pin: string;
  guestName: string;
  eventName: string;
  eventDate: string;
  eventTime?: string | null;
  guestCount: number;
  tableSummary?: string | null;
  amountDueAtVenue: number;
  qrValue: string;
}

const PAGE_W = 420;
const PAGE_H = 595;

function formatINR(amount: number): string {
  return `Rs ${Math.round(amount * 100) / 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export async function generateReservationPassPdf(input: ReservationPassInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.98, 0.96, 0.93) });
  page.drawRectangle({ x: 24, y: 24, width: PAGE_W - 48, height: PAGE_H - 48, color: rgb(1, 1, 1), borderColor: rgb(0.9, 0.87, 0.82), borderWidth: 1 });

  page.drawText('Akan Reservation Pass', { x: 36, y: PAGE_H - 56, size: 20, font: bold, color: rgb(0.11, 0.07, 0.05) });
  page.drawText(`Booking ID: ${input.bookingId}`, { x: 36, y: PAGE_H - 82, size: 11, font, color: rgb(0.45, 0.36, 0.28) });

  const qrBytes = await QRCode.toBuffer(input.qrValue, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  const qr = await pdf.embedPng(qrBytes);
  page.drawImage(qr, { x: 110, y: 250, width: 200, height: 200 });

  page.drawText(`PIN: ${input.pin}`, {
    x: 36,
    y: 224,
    size: 16,
    font: bold,
    color: rgb(0.76, 0.33, 0.1),
  });
  page.drawText('Show this QR at entry. Keep the PIN handy for support/reference.', {
    x: 36,
    y: 205,
    size: 10,
    font,
    color: rgb(0.45, 0.36, 0.28),
  });

  const rows: Array<[string, string]> = [
    ['Guest', input.guestName],
    ['Event', input.eventName],
    ['Date', input.eventDate],
    ['Time', input.eventTime || 'TBA'],
    ['Guests', String(input.guestCount)],
    ['Table', input.tableSummary || 'Not specified'],
    ['Payable at venue', formatINR(input.amountDueAtVenue)],
  ];

  let y = 172;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 36, y, size: 10, font, color: rgb(0.55, 0.46, 0.38) });
    page.drawText(value, { x: 160, y, size: 11, font: bold, color: rgb(0.11, 0.07, 0.05) });
    y -= 20;
  }

  page.drawText('Please present this pass at the venue entrance.', {
    x: 36,
    y: 42,
    size: 10,
    font,
    color: rgb(0.45, 0.36, 0.28),
  });

  return pdf.save();
}
