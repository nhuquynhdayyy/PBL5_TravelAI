import jsPDF from 'jspdf';
import type { ItineraryViewModel } from './itineraryTypes';
import { formatCurrency } from './itineraryUtils';

const stripVietnamese = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

export const exportItineraryPdf = (itinerary: ItineraryViewModel) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = 20;

  const addPageIfNeeded = (height = 20) => {
    if (y + height < pageHeight - margin) return;
    doc.addPage();
    y = 20;
  };

  doc.setFillColor(0, 97, 255);
  doc.roundedRect(margin, 14, pageWidth - margin * 2, 34, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(stripVietnamese(itinerary.tripTitle), margin + 6, 28);
  doc.setFontSize(10);
  doc.text(stripVietnamese(`${itinerary.destination} · Tong chi phi: ${formatCurrency(itinerary.totalEstimatedCost)}`), margin + 6, 38);

  y = 62;
  doc.setTextColor(15, 23, 42);

  itinerary.days.forEach((day) => {
    addPageIfNeeded(26);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y - 8, pageWidth - margin * 2, 12, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(stripVietnamese(`Ngay ${day.day}${day.dateLabel ? ` - ${day.dateLabel}` : ''}`), margin + 4, y);
    y += 12;

    day.activities.forEach((activity) => {
      addPageIfNeeded(38);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 32, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 97, 255);
      doc.text(`${activity.startTime} - ${activity.endTime}`, margin + 4, y + 2);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(stripVietnamese(activity.title), margin + 4, y + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(stripVietnamese(activity.location), margin + 4, y + 17);
      doc.text(stripVietnamese(`Chi phi: ${formatCurrency(activity.estimatedCost)}`), margin + 4, y + 24);

      y += 40;
    });

    y += 4;
  });

  doc.save(`${stripVietnamese(itinerary.tripTitle).replace(/\s+/g, '-').toLowerCase()}.pdf`);
};
