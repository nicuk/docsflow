export default function TestRoute() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>✅ Test Route Works</h1>
      <p>If you can see this page, the App Router structure is working correctly.</p>
      <p>Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'Server-side render'}</p>
      <p>Pathname: {typeof window !== 'undefined' ? window.location.pathname : '/test-route'}</p>
    </div>
  );
}
