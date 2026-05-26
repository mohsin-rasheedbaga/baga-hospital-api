export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #059669, #047857)',
      color: 'white',
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{
          width: 80,
          height: 80,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2.5rem',
        }}>
          🏥
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          BAGA Hospital API
        </h1>
        <p style={{ opacity: 0.85, marginBottom: '1.5rem' }}>
          Backend API Server - Running
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '1rem 1.5rem',
          display: 'inline-block',
          textAlign: 'left',
          fontSize: '0.9rem',
        }}>
          <p>✅ POST /api/license/check</p>
          <p>✅ POST /api/auth/login</p>
          <p>✅ GET /api/health</p>
        </div>
      </div>
    </div>
  );
}
