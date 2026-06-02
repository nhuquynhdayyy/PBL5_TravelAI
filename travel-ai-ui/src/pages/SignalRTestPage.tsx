import { useState } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { Bell, CheckCircle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

const SignalRTestPage = () => {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<string>('Disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setLogs((prev) => [`[${timestamp}] ${prefix} ${message}`, ...prev].slice(0, 50));
  };

  const getApiOrigin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:7001/api';
    return apiUrl.replace('/api', '');
  };

  const connectSignalR = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      addLog('No token found. Please login first.', 'error');
      return;
    }

    const apiOrigin = getApiOrigin();
    const hubUrl = `${apiOrigin}/hubs/notifications`;
    
    addLog(`Connecting to: ${hubUrl}`);
    addLog(`Token preview: ${token.substring(0, 20)}...`);

    const newConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    // Event handlers
    newConnection.onclose((error) => {
      setConnectionState('Disconnected');
      addLog(`Connection closed: ${error?.message || 'Unknown'}`, 'error');
    });

    newConnection.onreconnecting((error) => {
      setConnectionState('Reconnecting');
      addLog(`Reconnecting: ${error?.message || 'Unknown'}`, 'info');
    });

    newConnection.onreconnected((connectionId) => {
      setConnectionState('Connected');
      addLog(`Reconnected! ID: ${connectionId}`, 'success');
    });

    // Register notification listeners
    newConnection.on('booking_confirmed', (payload) => {
      addLog('Received: booking_confirmed', 'success');
      setNotifications((prev) => [{ type: 'booking_confirmed', payload, time: new Date() }, ...prev]);
    });

    newConnection.on('partner_booking_confirmed', (payload) => {
      addLog('Received: partner_booking_confirmed', 'success');
      setNotifications((prev) => [{ type: 'partner_booking_confirmed', payload, time: new Date() }, ...prev]);
    });

    newConnection.on('itinerary_processing', (payload) => {
      addLog('Received: itinerary_processing', 'success');
      setNotifications((prev) => [{ type: 'itinerary_processing', payload, time: new Date() }, ...prev]);
    });

    try {
      await newConnection.start();
      setConnection(newConnection);
      setConnectionState('Connected');
      addLog(`Connected successfully! ID: ${newConnection.connectionId}`, 'success');
    } catch (error: any) {
      setConnectionState('Failed');
      addLog(`Connection failed: ${error.message}`, 'error');
      console.error('SignalR Error:', error);
    }
  };

  const disconnectSignalR = async () => {
    if (connection) {
      await connection.stop();
      setConnection(null);
      setConnectionState('Disconnected');
      addLog('Disconnected manually', 'info');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared', 'info');
  };

  const clearNotifications = () => {
    setNotifications([]);
    addLog('Notifications cleared', 'info');
  };

  const getStateColor = () => {
    switch (connectionState) {
      case 'Connected': return 'text-green-600 bg-green-50';
      case 'Reconnecting': return 'text-yellow-600 bg-yellow-50';
      case 'Failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStateIcon = () => {
    switch (connectionState) {
      case 'Connected': return <Wifi className="text-green-600" size={20} />;
      case 'Reconnecting': return <Loader2 className="text-yellow-600 animate-spin" size={20} />;
      case 'Failed': return <WifiOff className="text-red-600" size={20} />;
      default: return <WifiOff className="text-gray-600" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-2">SignalR Test Page</h1>
        <p className="text-gray-600 mb-6">Debug and test SignalR notification connection</p>

        {/* Connection Status */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStateIcon()}
              <div>
                <h2 className="text-lg font-bold text-gray-900">Connection Status</h2>
                <p className={`text-sm font-semibold ${getStateColor()} px-3 py-1 rounded-full inline-block mt-1`}>
                  {connectionState}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={connectSignalR}
                disabled={connectionState === 'Connected'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                Connect
              </button>
              <button
                onClick={disconnectSignalR}
                disabled={connectionState === 'Disconnected'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold text-gray-700">API Origin:</span>
              <p className="text-gray-600 font-mono">{getApiOrigin()}</p>
            </div>
            <div>
              <span className="font-bold text-gray-700">Hub URL:</span>
              <p className="text-gray-600 font-mono">{getApiOrigin()}/hubs/notifications</p>
            </div>
            <div>
              <span className="font-bold text-gray-700">Token:</span>
              <p className="text-gray-600 font-mono">
                {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}
              </p>
            </div>
            <div>
              <span className="font-bold text-gray-700">Connection ID:</span>
              <p className="text-gray-600 font-mono">{connection?.connectionId || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Logs */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Connection Logs</h2>
              <button
                onClick={clearLogs}
                className="text-sm text-blue-600 hover:text-blue-700 font-bold"
              >
                Clear
              </button>
            </div>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet...</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Received Notifications</h2>
              <button
                onClick={clearNotifications}
                className="text-sm text-blue-600 hover:text-blue-700 font-bold"
              >
                Clear
              </button>
            </div>
            <div className="h-[500px] overflow-y-auto space-y-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Bell size={48} className="mb-2" />
                  <p>No notifications received yet</p>
                  <p className="text-xs mt-1">Use test API to send notifications</p>
                </div>
              ) : (
                notifications.map((notif, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="font-bold text-sm text-gray-900">{notif.type}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {notif.time.toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(notif.payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalRTestPage;
