import axiosClient from './axiosClient';

export type PublicTicket = {
  ticketCode: string;
  bookingId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  quantity: number;
  useDate: string;
  status: string;
  qrCodeUrl: string;
};

export async function getPublicTicket(ticketCode: string) {
  const response = await axiosClient.get<PublicTicket>(`/tickets/public/${encodeURIComponent(ticketCode)}`);
  return response.data;
}
