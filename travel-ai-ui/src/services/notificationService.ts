import * as signalR from '@microsoft/signalr';

const apiBaseUrl = 'http://localhost:5134/api';
const hubUrl = apiBaseUrl.replace(/\/api\/?$/, '/hubs/notifications');

export const createNotificationConnection = (token: string) =>
  new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token,
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

export const notificationEventNames = {
  userBookingConfirmed: 'booking_confirmed',
  partnerBookingConfirmed: 'partner_booking_confirmed',
  legacyReceive: 'ReceiveNotification',
  legacyEnvelope: 'notification'
} as const;
