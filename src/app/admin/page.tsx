'use client';

import { useState, useEffect, useCallback } from 'react';

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
  license_type?: string;
  created_at: string;
  user_count: number;
  admin_username: string | null;
  admin_password: string | null;
  charges: string | null;
  notes: string | null;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

type FilterType = 'all' | 'active' | 'inactive';

const ROLES_BY_LICENSE_TYPE: Record<string, string[]> = {
  hospital: ['admin', 'doctor', 'reception', 'lab', 'pharmacy', 'hr', 'xray', 'ultrasound', 'accounts'],
  clinic: ['admin', 'doctor', 'reception', 'pharmacy', 'lab'],
  pharmacy: ['admin', 'pharmacy'],
  lab: ['admin', 'lab'],
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', doctor: 'Doctor', reception: 'Reception', lab: 'Lab',
  pharmacy: 'Pharmacy', hr: 'HR', xray: 'X-Ray', ultrasound: 'Ultrasound',
  accounts: 'Accounts', staff: 'Staff',
};

const LICENSE_TYPE_CONFIG: Record<string, { label: string; description: string; color: string; bg: string }> = {
  hospital: { label: 'Hospital', description: 'Full system: all departments', color: '#1e40af', bg: '#dbeafe' },
  clinic: { label: 'Clinic', description: 'Reception, doctor, pharmacy, lab', color: '#065f46', bg: '#d1fae5' },
  pharmacy: { label: 'Pharmacy', description: 'Standalone: medicine, sales, prescriptions', color: '#92400e', bg: '#fef3c7' },
  lab: { label: 'Laboratory', description: 'Standalone: tests, reports, inventory', color: '#581c87', bg: '#f3e8ff' },
};

function getTypeFromFeatures(features: string[]): string {
  if (!features || features.length === 0) return 'hospital';
  if (features.includes('all')) return 'hospital';
  if (features.length === 1 && features[0] === 'pharmacy') return 'pharmacy';
  if (features.length === 1 && features[0] === 'lab') return 'lab';
  if (features.includes('clinic')) return 'clinic';
  return 'hospital';
}

export default function AdminPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [hospitalUsers, setHospitalUsers] = useState<User[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{
    username: string;
    password: string;
    hospital_name: string;
    license_key: string;
    expiry_date: string | null;
    license_duration: string;
    charges: string | null;
    notes: string | null;
    reception_credentials?: { username: string; password: string } | null;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [credentialsModal, setCredentialsModal] = useState<Hospital | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Add hospital form
  const [formData, setFormData] = useState({
    hospital_name: '',
    address: '',
    phone: '',
    license_duration: '1_month',
    license_type: 'hospital',
    charges: '',
    notes: '',
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

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
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

  function getFilteredHospitals(): Hospital[] {
    let filtered = hospitals;
    if (statusFilter === 'active') {
      filtered = filtered.filter(h => h.status === 'active');
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(h => h.status !== 'active');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(h => h.hospital_name.toLowerCase().includes(q));
    }
    return filtered;
  }

  function getDaysRemaining(expiryDate: string | null, duration: string): number | null {
    if (!expiryDate || duration === 'lifetime') return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function handleExport() {
    const filtered = getFilteredHospitals();
    let text = '========================================\n';
    text += '  BAGA HOSPITAL MANAGEMENT - EXPORT\n';
    text += `  Generated: ${new Date().toLocaleString()}\n`;
    text += '========================================\n\n';
    text += `Total Hospitals: ${hospitals.length}\n`;
    text += `Active: ${hospitals.filter(h => h.status === 'active').length}\n`;
    text += `Inactive: ${hospitals.filter(h => h.status !== 'active').length}\n`;
    text += `Total Users: ${hospitals.reduce((s, h) => s + h.user_count, 0)}\n\n`;
    text += '----------------------------------------\n\n';

    filtered.forEach((h, i) => {
      text += `${i + 1}. ${h.hospital_name}\n`;
      text += `   Status: ${h.status === 'active' ? 'Active' : 'Inactive'}\n`;
      text += `   License: ${h.license_key}\n`;
      text += `   Duration: ${getDurationLabel(h.license_duration)}\n`;
      if (h.expiry_date && h.license_duration !== 'lifetime') {
        const days = getDaysRemaining(h.expiry_date, h.license_duration);
        text += `   Expiry: ${new Date(h.expiry_date).toLocaleDateString()}${days !== null ? ` (${days} days remaining)` : ''}\n`;
      }
      if (h.phone) text += `   Phone: ${h.phone}\n`;
      if (h.address) text += `   Address: ${h.address}\n`;
      if (h.admin_username) text += `   Admin Username: ${h.admin_username}\n`;
      if (h.admin_password) text += `   Admin Password: ${h.admin_password}\n`;
      text += `   Users: ${h.user_count}\n`;
      text += `   Created: ${new Date(h.created_at).toLocaleDateString()}\n`;
      text += '\n';
    });

    // Download as text file
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baga-hospitals-export-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export downloaded successfully!', 'success');
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
        setFormData({ hospital_name: '', address: '', phone: '', license_duration: '1_month', license_type: 'hospital', charges: '', notes: '' });
        setNewCredentials({
          username: data.credentials?.username || '',
          password: data.credentials?.password || '',
          hospital_name: data.license?.hospital_name || '',
          license_key: data.license?.license_key || '',
          expiry_date: data.license?.expiry_date || null,
          license_duration: data.license?.license_duration || '1_month',
          charges: data.license?.charges || null,
          notes: data.license?.notes || null,
          reception_credentials: data.reception_credentials || null,
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
        const defaultRole = selectedHospital
          ? (ROLES_BY_LICENSE_TYPE[selectedHospital.license_type || getTypeFromFeatures(selectedHospital.features)] || ROLES_BY_LICENSE_TYPE.hospital)[0]
          : 'reception';
        setUserForm({ username: '', password: '', full_name: '', role: defaultRole });
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

  // Copy button component
  const CopyBtn = useCallback(({ text, field }: { text: string; field: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); copyToClipboard(text, field); }}
      title="Copy"
      style={{
        background: copiedField === field ? '#059669' : '#f1f5f9',
        border: 'none',
        borderRadius: 4,
        padding: '2px 6px',
        fontSize: 11,
        color: copiedField === field ? 'white' : '#64748b',
        cursor: 'pointer',
        marginLeft: 6,
        fontFamily: 'monospace',
      }}
    >
      {copiedField === field ? 'Copied!' : 'Copy'}
    </button>
  ), [copiedField]);

  const filteredHospitals = getFilteredHospitals();

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

      {/* Credentials Modal */}
      {credentialsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
        }} onClick={() => setCredentialsModal(null)}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 28,
            width: 440,
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Hospital Credentials</h3>
              <button
                onClick={() => setCredentialsModal(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 6,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#64748b',
                }}
              >
                &times;
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 20,
              marginBottom: 20,
            }}>
              {/* Hospital Name */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hospital Name
                </span>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {credentialsModal.hospital_name}
                </p>
              </div>

              {/* Admin Username */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Admin Username
                </span>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                    {credentialsModal.admin_username || 'N/A'}
                  </p>
                  {credentialsModal.admin_username && (
                    <CopyBtn text={credentialsModal.admin_username} field={`cred-user-${credentialsModal.id}`} />
                  )}
                </div>
              </div>

              {/* Admin Password */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Admin Password
                </span>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>
                    {credentialsModal.admin_password || 'N/A'}
                  </p>
                  {credentialsModal.admin_password && (
                    <CopyBtn text={credentialsModal.admin_password} field={`cred-pass-${credentialsModal.id}`} />
                  )}
                </div>
              </div>

              {/* License Key */}
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  License Key
                </span>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>
                    {credentialsModal.license_key}
                  </p>
                  <CopyBtn text={credentialsModal.license_key} field={`cred-license-${credentialsModal.id}`} />
                </div>
              </div>
            </div>

            <button
              onClick={() => setCredentialsModal(null)}
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
              Close
            </button>
          </div>
        </div>
      )}

      {/* New Credentials Modal (after creation) */}
      {newCredentials && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1002,
        }} onClick={() => setNewCredentials(null)}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 30,
            width: 440,
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Success Icon */}
            <div style={{
              width: 48, height: 48,
              background: '#ecfdf5',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 24,
              color: '#059669',
            }}>
              &#10003;
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>Hospital Created Successfully!</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, textAlign: 'center' }}>
              Save these credentials securely. They will not be shown again.
            </p>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
            }}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hospital
                </span>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{newCredentials.hospital_name}</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  License Key
                </span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>
                    {newCredentials.license_key}
                  </p>
                  <CopyBtn text={newCredentials.license_key} field="new-license" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Duration
                </span>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                  {getDurationLabel(newCredentials.license_duration)}
                  {newCredentials.expiry_date && newCredentials.license_duration !== 'lifetime' && (
                    <span style={{ color: '#64748b', fontWeight: 400 }}>
                      {' '} (expires {new Date(newCredentials.expiry_date).toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
              {newCredentials.charges && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Charges / Price Plan
                  </span>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{newCredentials.charges}</p>
                </div>
              )}
              {newCredentials.notes && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Notes
                  </span>
                  <p style={{ fontSize: 13, color: '#475569' }}>{newCredentials.notes}</p>
                </div>
              )}
              <div style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: 12,
                marginTop: 4,
              }}>
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Admin Login Credentials
                </span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Login ID
                </span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                    {newCredentials.username}
                  </p>
                  <CopyBtn text={newCredentials.username} field="new-user" />
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Password
                </span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>
                    {newCredentials.password}
                  </p>
                  <CopyBtn text={newCredentials.password} field="new-pass" />
                </div>
              </div>
              {newCredentials.reception_credentials && (
                <>
                  <div style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: 12,
                    marginTop: 4,
                  }}>
                    <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Reception Login Credentials
                    </span>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Login ID
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                        {newCredentials.reception_credentials.username}
                      </p>
                      <CopyBtn text={newCredentials.reception_credentials.username} field="new-reception-user" />
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Password
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>
                        {newCredentials.reception_credentials.password}
                      </p>
                      <CopyBtn text={newCredentials.reception_credentials.password} field="new-reception-pass" />
                    </div>
                  </div>
                </>
              )}
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
              I&apos;ve Saved These Credentials
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

        {/* Actions Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Hospitals & Licenses</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
              onClick={handleExport}
              style={{
                padding: '8px 16px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                color: '#166534',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Export List
            </button>
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

        {/* Search & Filter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="Search hospitals by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                background: 'white',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', padding: 3 }}>
            {(['all', 'active', 'inactive'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: '6px 14px',
                  background: statusFilter === f ? '#0f172a' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: statusFilter === f ? 'white' : '#64748b',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f === 'all' ? `All (${hospitals.length})` : `${f === 'active' ? 'Active' : 'Inactive'} (${hospitals.filter(h => f === 'active' ? h.status === 'active' : h.status !== 'active').length})`}
              </button>
            ))}
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
                    License Type
                  </label>
                  <select
                    value={formData.license_type}
                    onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
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
                    <option value="hospital">Hospital</option>
                    <option value="clinic">Clinic</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="lab">Laboratory</option>
                  </select>
                </div>
                {formData.license_type !== 'hospital' && LICENSE_TYPE_CONFIG[formData.license_type] && (
                  <div style={{
                    gridColumn: '1 / -1',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: LICENSE_TYPE_CONFIG[formData.license_type].bg,
                    border: `1px solid ${LICENSE_TYPE_CONFIG[formData.license_type].color}22`,
                    fontSize: 13,
                    color: LICENSE_TYPE_CONFIG[formData.license_type].color,
                    fontWeight: 500,
                  }}>
                    {LICENSE_TYPE_CONFIG[formData.license_type].description}
                  </div>
                )}
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
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
                    Charges / Price Plan
                  </label>
                  <input
                    type="text"
                    value={formData.charges}
                    onChange={(e) => setFormData({ ...formData, charges: e.target.value })}
                    placeholder="e.g., PKR 5,000/month"
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
                    Notes / Description
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes about this hospital"
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

        {/* Hospital Detail Panel */}
        {selectedHospital && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            border: '2px solid #10b981',
            padding: 24,
            marginBottom: 16,
            boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  {selectedHospital.hospital_name}
                </h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>
                  Detailed view and user management
                </p>
              </div>
              <button
                onClick={() => setSelectedHospital(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 6,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#64748b',
                }}
              >
                &times;
              </button>
            </div>

            {/* Hospital Info Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 20,
              padding: 16,
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </span>
                <p style={{ marginTop: 4 }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    background: selectedHospital.status === 'active' ? '#ecfdf5' : '#fef2f2',
                    color: selectedHospital.status === 'active' ? '#065f46' : '#991b1b',
                  }}>
                    {selectedHospital.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  License Key
                </span>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                    {selectedHospital.license_key}
                  </p>
                  <CopyBtn text={selectedHospital.license_key} field={`detail-license-${selectedHospital.id}`} />
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  License Duration
                </span>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginTop: 4 }}>
                  {getDurationLabel(selectedHospital.license_duration)}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Expiry Date
                </span>
                {selectedHospital.expiry_date && selectedHospital.license_duration !== 'lifetime' ? (
                  (() => {
                    const days = getDaysRemaining(selectedHospital.expiry_date, selectedHospital.license_duration);
                    const isExpired = days !== null && days < 0;
                    const isWarning = days !== null && days >= 0 && days <= 30;
                    return (
                      <div style={{ marginTop: 4 }}>
                        <p style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: isExpired ? '#dc2626' : isWarning ? '#d97706' : '#334155',
                        }}>
                          {new Date(selectedHospital.expiry_date).toLocaleDateString()}
                          {days !== null && (
                            <span style={{
                              marginLeft: 8,
                              fontSize: 12,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: isExpired ? '#fef2f2' : isWarning ? '#fffbeb' : '#ecfdf5',
                              color: isExpired ? '#dc2626' : isWarning ? '#d97706' : '#059669',
                            }}>
                              {isExpired ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#059669', marginTop: 4 }}>Lifetime</p>
                )}
              </div>
              {selectedHospital.address && (
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Address
                  </span>
                  <p style={{ fontSize: 14, color: '#334155', marginTop: 4 }}>{selectedHospital.address}</p>
                </div>
              )}
              {selectedHospital.phone && (
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Phone
                  </span>
                  <p style={{ fontSize: 14, color: '#334155', marginTop: 4 }}>{selectedHospital.phone}</p>
                </div>
              )}
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Created
                </span>
                <p style={{ fontSize: 14, color: '#334155', marginTop: 4 }}>
                  {new Date(selectedHospital.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Users
                </span>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                  {selectedHospital.user_count}
                </p>
              </div>
            </div>

            {/* Admin Credentials Section */}
            {selectedHospital.admin_username && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 10,
                padding: 16,
                marginBottom: 20,
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Admin Credentials
                </h4>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Username
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                        {selectedHospital.admin_username}
                      </span>
                      <CopyBtn text={selectedHospital.admin_username} field={`detail-user-${selectedHospital.id}`} />
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Password
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>
                        {selectedHospital.admin_password}
                      </span>
                      {selectedHospital.admin_password && (
                        <CopyBtn text={selectedHospital.admin_password} field={`detail-pass-${selectedHospital.id}`} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
                Users ({hospitalUsers.length})
              </h4>
              <button
                onClick={() => {
                  const defaultRole = selectedHospital
                    ? (ROLES_BY_LICENSE_TYPE[selectedHospital.license_type || getTypeFromFeatures(selectedHospital.features)] || ROLES_BY_LICENSE_TYPE.hospital)[0]
                    : 'reception';
                  setUserForm(prev => ({ ...prev, role: defaultRole }));
                  setShowAddUserForm(!showAddUserForm);
                }}
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
                      {(selectedHospital
                      ? (ROLES_BY_LICENSE_TYPE[selectedHospital.license_type || getTypeFromFeatures(selectedHospital.features)] || ROLES_BY_LICENSE_TYPE.hospital)
                      : ROLES_BY_LICENSE_TYPE.hospital
                    ).map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                    ))}
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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {['Username', 'Full Name', 'Role', 'Status', 'Created', 'Actions'].map(h => (
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
                            {ROLE_LABELS[user.role] || user.role}
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
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }}>
                          {new Date(user.created_at).toLocaleDateString()}
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
              </div>
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
        ) : filteredHospitals.length === 0 ? (
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
              {searchQuery || statusFilter !== 'all' ? '&#128269;' : '+'}
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>
              {searchQuery || statusFilter !== 'all' ? 'No hospitals match your filters' : 'No hospitals yet'}
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Click "Add Hospital" to create your first hospital with a license key'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredHospitals.map(hospital => {
              const daysRemaining = getDaysRemaining(hospital.expiry_date, hospital.license_duration);
              const isExpired = daysRemaining !== null && daysRemaining < 0;
              const isWarning = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;

              return (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
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
                        {(() => {
                          const resolvedType = hospital.license_type || getTypeFromFeatures(hospital.features);
                          const config = LICENSE_TYPE_CONFIG[resolvedType] || LICENSE_TYPE_CONFIG.hospital;
                          return (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: config.bg,
                              color: config.color,
                            }}>
                              {config.label}
                            </span>
                          );
                        })()}
                        {isExpired && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#fef2f2',
                            color: '#dc2626',
                          }}>
                            Expired
                          </span>
                        )}
                        {isWarning && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#fffbeb',
                            color: '#d97706',
                          }}>
                            Expiring Soon
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
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
                              color: isExpired ? '#dc2626' : '#334155',
                            }}>
                              {new Date(hospital.expiry_date).toLocaleDateString()}
                            </span>
                            {daysRemaining !== null && (
                              <span style={{
                                fontSize: 11,
                                marginLeft: 4,
                                color: isExpired ? '#dc2626' : isWarning ? '#d97706' : '#94a3b8',
                              }}>
                                ({isExpired ? `${Math.abs(daysRemaining)}d ago` : `${daysRemaining}d left`})
                              </span>
                            )}
                          </div>
                        )}
                        {hospital.license_duration === 'lifetime' && (
                          <div style={{ fontSize: 13 }}>
                            <span style={{ fontWeight: 600, color: '#059669' }}>Lifetime License</span>
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
                        {hospital.admin_username && (
                          <div style={{ fontSize: 13 }}>
                            <span style={{ color: '#94a3b8' }}>Admin: </span>
                            <span style={{ fontWeight: 600, color: '#0f766e', fontFamily: 'monospace', fontSize: 12 }}>{hospital.admin_username}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 16, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setCredentialsModal(hospital)}
                        style={{
                          padding: '5px 10px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: 6,
                          color: '#166534',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        View Credentials
                      </button>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
