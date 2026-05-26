'use client';

import { useState, useEffect } from 'react';

interface Hospital {
  id: number;
  hospital_name: string;
  address: string;
  phone: string;
  license_key: string;
  status: string;
  license_duration: string;
  expiry_date: string | null;
  features: string[];
  created_at: string;
  user_count: number;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [hospitalUsers, setHospitalUsers] = useState<User[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ username: string; password: string; hospital_name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Add hospital form
  const [formData, setFormData] = useState({
    hospital_name: '',
    address: '',
    phone: '',
    license_duration: '1_month',
  });

  // Add user form
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'reception',
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function fetchHospitals() {
    try {
      const res = await fetch('/api/admin/hospitals');
      const data = await res.json();
      if (data.success) {
        setHospitals(data.hospitals);
      }
    } catch (err) {
      console.error('Failed to fetch hospitals:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddHospital(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.hospital_name.trim()) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        showToast('Hospital added successfully!', 'success');
        setShowAddForm(false);
        setFormData({ hospital_name: '', address: '', phone: '', license_duration: '1_month' });
        setNewCredentials({
          username: data.credentials?.username || '',
          password: data.credentials?.password || '',
          hospital_name: data.license?.hospital_name || '',
        });
        fetchHospitals();
      } else {
        showToast(data.error || 'Failed to add hospital', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(hospital: Hospital) {
    setActionLoading(true);
    try {
      const newStatus = hospital.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(`/api/admin/hospitals/${hospital.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Hospital ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
        fetchHospitals();
      } else {
        showToast(data.error || 'Failed to update', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRegenerateLicense(hospital: Hospital) {
    if (!confirm(`Are you sure you want to regenerate license for "${hospital.hospital_name}"?\n\nThe old license key will be replaced.`)) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/hospitals/${hospital.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_license' }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`New license: ${data.license_key}`, 'success');
        fetchHospitals();
      } else {
        showToast(data.error || 'Failed to regenerate', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteHospital(hospital: Hospital) {
    if (!confirm(`Are you sure you want to deactivate "${hospital.hospital_name}"?\n\nThis will deactivate all associated users.`)) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/hospitals/${hospital.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        showToast('Hospital deactivated', 'success');
        if (selectedHospital?.id === hospital.id) {
          setSelectedHospital(null);
        }
        fetchHospitals();
      } else {
        showToast(data.error || 'Failed to deactivate', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleViewHospital(hospital: Hospital) {
    setSelectedHospital(hospital);
    setShowAddUserForm(false);
    try {
      const res = await fetch(`/api/admin/hospitals/${hospital.id}/users`);
      const data = await res.json();
      if (data.success) {
        setHospitalUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHospital || !userForm.username.trim()) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/hospitals/${selectedHospital.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`User "${data.user.username}" created`, 'success');
        setShowAddUserForm(false);
        setUserForm({ username: '', password: '', full_name: '', role: 'reception' });
        // Refresh users
        const usersRes = await fetch(`/api/admin/hospitals/${selectedHospital.id}/users`);
        const usersData = await usersRes.json();
        if (usersData.success) setHospitalUsers(usersData.users);
        fetchHospitals();
      } else {
        showToast(data.error || 'Failed to add user', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleUser(user: User) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/hospitals/${selectedHospital!.id}/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`User ${user.is_active ? 'deactivated' : 'activated'}`, 'success');
        const usersRes = await fetch(`/api/admin/hospitals/${selectedHospital!.id}/users`);
        const usersData = await usersRes.json();
        if (usersData.success) setHospitalUsers(usersData.users);
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('baga_admin_token');
    window.location.reload();
  }

  function getDurationLabel(d: string) {
    const map: Record<string, string> = {
      '1_month': '1 Month',
      '3_months': '3 Months',
      '6_months': '6 Months',
      '1_year': '1 Year',
      'lifetime': 'Lifetime',
    };
    return map[d] || d;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          padding: '12px 20px',
          borderRadius: 10,
          background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: toast.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease',
        }}>
          {toast.message}
          <style>{`@keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
      )}

      {/* New Credentials Modal */}
      {newCredentials && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }} onClick={() => setNewCredentials(null)}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 30,
            width: 420,
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Hospital Created!</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Save these credentials for the hospital:
            </p>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hospital
                </span>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{newCredentials.hospital_name}</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Login ID
                </span>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                  {newCredentials.username}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Password
                </span>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>
                  {newCredentials.password}
                </p>
              </div>
            </div>
            <button
              onClick={() => setNewCredentials(null)}
              style={{
                width: '100%',
                padding: 10,
                background: '#0f766e',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: 16,
          }}>B</div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>BAGA Admin Panel</span>
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>Hospital & License Management</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            background: '#fee2e2',
            border: 'none',
            borderRadius: 8,
            color: '#dc2626',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 60px' }}>
        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Total Hospitals</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{hospitals.length}</div>
          </div>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Active Licenses</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>
              {hospitals.filter(h => h.status === 'active').length}
            </div>
          </div>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Inactive</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#94a3b8' }}>
              {hospitals.filter(h => h.status !== 'active').length}
            </div>
          </div>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Total Users</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>
              {hospitals.reduce((sum, h) => sum + h.user_count, 0)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Hospitals & Licenses</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedHospital && (
              <button
                onClick={() => setSelectedHospital(null)}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                All Hospitals
              </button>
            )}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                padding: '8px 16px',
                background: '#059669',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Add Hospital
            </button>
          </div>
        </div>

        {/* Add Hospital Form */}
        {showAddForm && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: 24,
            marginBottom: 16,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add New Hospital</h3>
            <form onSubmit={handleAddHospital}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    value={formData.hospital_name}
                    onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                    placeholder="e.g., City Hospital"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., 0300-1234567"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., Main Road, City"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
                    License Duration
                  </label>
                  <select
                    value={formData.license_duration}
                    onChange={(e) => setFormData({ ...formData, license_duration: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                      background: 'white',
                    }}
                  >
                    <option value="1_month">1 Month</option>
                    <option value="3_months">3 Months</option>
                    <option value="6_months">6 Months</option>
                    <option value="1_year">1 Year</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '8px 20px',
                    background: actionLoading ? '#065f46' : '#059669',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Creating...' : 'Create Hospital & License'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '8px 20px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    color: '#475569',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Hospital Detail / Users Panel */}
        {selectedHospital && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: 24,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                  {selectedHospital.hospital_name} - Users
                </h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>
                  Manage login credentials for this hospital
                </p>
              </div>
              <button
                onClick={() => setShowAddUserForm(!showAddUserForm)}
                style={{
                  padding: '6px 14px',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add User
              </button>
            </div>

            {/* Add User Form */}
            {showAddUserForm && (
              <form onSubmit={handleAddUser} style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                border: '1px solid #e2e8f0',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 120px',
                  gap: 12,
                  alignItems: 'end',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Username *</label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      placeholder="e.g., doctor1"
                      required
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Password *</label>
                    <input
                      type="text"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="Password"
                      required
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Full Name</label>
                    <input
                      type="text"
                      value={userForm.full_name}
                      onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                      placeholder="Full name"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 13,
                        outline: 'none',
                        background: 'white',
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="doctor">Doctor</option>
                      <option value="reception">Reception</option>
                      <option value="lab">Lab</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{
                      padding: '6px 16px',
                      background: '#2563eb',
                      border: 'none',
                      borderRadius: 6,
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {actionLoading ? 'Creating...' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddUserForm(false)}
                    style={{
                      padding: '6px 16px',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      color: '#475569',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Users Table */}
            {hospitalUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                No users found for this hospital
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {['Username', 'Full Name', 'Role', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hospitalUsers.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: '#0f766e' }}>
                        {user.username}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: '#334155' }}>
                        {user.full_name}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background: '#f1f5f9',
                          color: '#475569',
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background: user.is_active ? '#ecfdf5' : '#fef2f2',
                          color: user.is_active ? '#065f46' : '#991b1b',
                        }}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => handleToggleUser(user)}
                          style={{
                            padding: '4px 10px',
                            background: user.is_active ? '#fef2f2' : '#ecfdf5',
                            border: 'none',
                            borderRadius: 4,
                            color: user.is_active ? '#dc2626' : '#059669',
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Hospitals List */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: '#94a3b8',
          }}>
            <div style={{
              width: 32, height: 32,
              border: '3px solid #e2e8f0',
              borderTopColor: '#10b981',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            Loading hospitals...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : hospitals.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: 60,
            textAlign: 'center',
            color: '#94a3b8',
          }}>
            <div style={{
              width: 56, height: 56,
              background: '#f1f5f9',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 24,
            }}>
              +
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>No hospitals yet</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              Click &quot;Add Hospital&quot; to create your first hospital with a license key
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {hospitals.map(hospital => (
              <div
                key={hospital.id}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  border: `1px solid ${selectedHospital?.id === hospital.id ? '#10b981' : '#e2e8f0'}`,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => handleViewHospital(hospital)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                        {hospital.hospital_name}
                      </h3>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: hospital.status === 'active' ? '#ecfdf5' : '#fef2f2',
                        color: hospital.status === 'active' ? '#065f46' : '#991b1b',
                      }}>
                        {hospital.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: '#94a3b8' }}>License: </span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f766e', fontSize: 13 }}>
                          {hospital.license_key}
                        </span>
                      </div>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: '#94a3b8' }}>Duration: </span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{getDurationLabel(hospital.license_duration)}</span>
                      </div>
                      {hospital.expiry_date && hospital.license_duration !== 'lifetime' && (
                        <div style={{ fontSize: 13 }}>
                          <span style={{ color: '#94a3b8' }}>Expires: </span>
                          <span style={{
                            fontWeight: 600,
                            color: new Date(hospital.expiry_date) < new Date() ? '#dc2626' : '#334155',
                          }}>
                            {new Date(hospital.expiry_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {hospital.phone && (
                        <div style={{ fontSize: 13 }}>
                          <span style={{ color: '#94a3b8' }}>Phone: </span>
                          <span style={{ color: '#334155' }}>{hospital.phone}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: '#94a3b8' }}>Users: </span>
                        <span style={{ fontWeight: 600, color: '#2563eb' }}>{hospital.user_count}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 16 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleStatus(hospital)}
                      style={{
                        padding: '5px 10px',
                        background: hospital.status === 'active' ? '#fef2f2' : '#ecfdf5',
                        border: 'none',
                        borderRadius: 6,
                        color: hospital.status === 'active' ? '#dc2626' : '#059669',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {hospital.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleRegenerateLicense(hospital)}
                      style={{
                        padding: '5px 10px',
                        background: '#eff6ff',
                        border: 'none',
                        borderRadius: 6,
                        color: '#2563eb',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      New License
                    </button>
                    <button
                      onClick={() => handleDeleteHospital(hospital)}
                      style={{
                        padding: '5px 10px',
                        background: '#fef2f2',
                        border: 'none',
                        borderRadius: 6,
                        color: '#dc2626',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
