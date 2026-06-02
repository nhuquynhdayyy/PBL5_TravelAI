// SignalR Debug Utility
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

export const testSignalRConnection = async () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:7001/api';
  const apiOrigin = apiUrl.replace('/api', '');
  const hubUrl = `${apiOrigin}/hubs/notifications`;
  const token = localStorage.getItem('token');

  console.log('🔍 SignalR Debug Info:');
  console.log('  API Origin:', apiOrigin);
  console.log('  Hub URL:', hubUrl);
  console.log('  Token exists:', !!token);
  console.log('  Token preview:', token ? token.substring(0, 20) + '...' : 'null');

  if (!token) {
    console.error('❌ No token found. Please login first.');
    return;
  }

  console.log('\n🔌 Attempting to connect to SignalR...');

  const connection = new HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Debug) // Use Debug level for testing
    .build();

  connection.onclose((error) => {
    console.error('❌ SignalR connection closed:', error);
  });

  connection.onreconnecting((error) => {
    console.warn('⚠️ SignalR reconnecting:', error);
  });

  connection.onreconnected((connectionId) => {
    console.log('✅ SignalR reconnected:', connectionId);
  });

  try {
    await connection.start();
    console.log('✅ SignalR connected successfully!');
    console.log('  Connection ID:', connection.connectionId);
    console.log('  Connection State:', connection.state);
    
    // Test receiving notifications
    connection.on('booking_confirmed', (payload) => {
      console.log('📦 Received booking_confirmed:', payload);
    });

    connection.on('partner_booking_confirmed', (payload) => {
      console.log('🏢 Received partner_booking_confirmed:', payload);
    });

    connection.on('itinerary_processing', (payload) => {
      console.log('🗓️ Received itinerary_processing:', payload);
    });

    console.log('\n✅ All event listeners registered. Waiting for notifications...');
    
    return connection;
  } catch (error: any) {
    console.error('❌ SignalR connection failed:');
    console.error('  Error:', error.message);
    console.error('  Stack:', error.stack);
    
    // Additional debugging
    if (error.message.includes('Failed to complete negotiation')) {
      console.error('\n💡 Negotiation failed. Possible causes:');
      console.error('  1. Backend not running at:', apiOrigin);
      console.error('  2. CORS not configured properly');
      console.error('  3. Hub endpoint incorrect (should be /hubs/notifications)');
      console.error('  4. SSL certificate issue');
    }
    
    if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.error('\n💡 Connection refused. Possible causes:');
      console.error('  1. Backend not running');
      console.error('  2. Wrong port (check .env VITE_API_URL)');
      console.error('  3. Firewall blocking connection');
    }

    throw error;
  }
};

// Run this in browser console:
// import { testSignalRConnection } from './utils/signalrDebug';
// testSignalRConnection();
