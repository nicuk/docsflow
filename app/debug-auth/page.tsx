"use client";

import { useState, useEffect } from 'react';

export default function DebugAuthPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [cookies, setCookies] = useState<string>('');
  const [localStorage, setLocalStorage] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const debugAuth = async () => {
      try {
        console.log(`🔍 [DEBUG AUTH] Starting authentication debug...`);
        
        // Get session data
        console.log(`🔍 [DEBUG AUTH] Fetching session...`);
        const sessionResponse = await fetch('/api/auth/session');
        const sessionResult = await sessionResponse.json();
        setSessionData(sessionResult);
        console.log(`🔍 [DEBUG AUTH] Session result:`, sessionResult);
        
        // Get cookies
        const cookieString = document.cookie;
        setCookies(cookieString);
        console.log(`🔍 [DEBUG AUTH] Cookies:`, cookieString);
        
        // Get localStorage
        const localStorageData = {
          'tenant-id': window.localStorage.getItem('tenant-id'),
          'tenant-uuid': window.localStorage.getItem('tenant-uuid'),
          'tenant-subdomain': window.localStorage.getItem('tenant-subdomain'),
          'just-logged-in': window.sessionStorage.getItem('just-logged-in'),
        };
        setLocalStorage(localStorageData);
        console.log(`🔍 [DEBUG AUTH] LocalStorage:`, localStorageData);
        
      } catch (error) {
        console.error(`🚨 [DEBUG AUTH] Error:`, error);
      } finally {
        setLoading(false);
      }
    };

    debugAuth();
  }, []);

  if (loading) {
    return <div className="p-8">Loading debug info...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Authentication Debug</h1>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Current URL</h2>
          <p className="font-mono text-sm">{window.location.href}</p>
          <p className="font-mono text-sm">Hostname: {window.location.hostname}</p>
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Session API Response</h2>
          <pre className="font-mono text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Cookies</h2>
          <div className="font-mono text-sm space-y-1">
            {cookies.split(';').map((cookie, i) => (
              <div key={i} className="bg-gray-100 p-1 rounded">
                {cookie.trim()}
              </div>
            ))}
          </div>
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Local Storage</h2>
          <pre className="font-mono text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify(localStorage, null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Actions</h2>
          <div className="space-x-2">
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Go to Dashboard
            </button>
            <button 
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Go to Login
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
