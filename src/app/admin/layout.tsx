'use client';

import { useState, useEffect, type ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for auto-login first
    const remembered = localStorage.getItem('baga_admin_remember');
    if (remembered) {
      try {
        const { username, password } = JSON.parse(remembered);
        if (username && password) {
          // Attempt auto-login
          fetch('/api/admin/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                localStorage.setItem('baga_admin_token', data.token);
                setIsAuthenticated(true);
              } else {
                // Auto-login failed, clear remembered credentials
                localStorage.removeItem('baga_admin_remember');
              }
              setLoading(false);
            })
            .catch(() => {
              localStorage.removeItem('baga_admin_remember');
              setLoading(false);
            });
          return;
        }
      } catch {
        localStorage.removeItem('baga_admin_remember');
      }
    }

    // Fallback: check for existing token
    const token = localStorage.getItem('baga_admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#64748b', fontSize: 13 }}>Signing in automatically...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return <>{children}</>;
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill from remembered credentials
  useEffect(() => {
    const remembered = localStorage.getItem('baga_admin_remember');
    if (remembered) {
      try {
        const { username: u, password: p } = JSON.parse(remembered);
        if (u && p) {
          setUsername(u);
          setPassword(p);
          setRememberMe(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('baga_admin_token', data.token);
        if (rememberMe) {
          localStorage.setItem('baga_admin_remember', JSON.stringify({ username, password }));
        } else {
          localStorage.removeItem('baga_admin_remember');
        }
        onLogin();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    }}>
      <div style={{
        width: 400,
        padding: 40,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 28,
          fontWeight: 800,
          color: 'white',
        }}>
          B
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: '#f1f5f9',
          textAlign: 'center', marginBottom: 4,
        }}>
          BAGA Admin Panel
        </h1>
        <p style={{
          fontSize: 13, color: '#64748b',
          textAlign: 'center', marginBottom: 30,
        }}>
          Hospital & License Management System
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
              color: '#f87171',
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: '#94a3b8',
              marginBottom: 6,
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: '#94a3b8',
              marginBottom: 6,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
          }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                accentColor: '#10b981',
                cursor: 'pointer',
              }}
            />
            <label
              htmlFor="rememberMe"
              style={{
                fontSize: 13,
                color: '#94a3b8',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Remember me (auto-login next time)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: loading
                ? '#065f46'
                : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          color: '#334155',
          fontSize: 11,
          textAlign: 'center',
          marginTop: 24,
        }}>
          BAGA Hospital Management System v1.0
        </p>
      </div>
    </div>
  );
}
