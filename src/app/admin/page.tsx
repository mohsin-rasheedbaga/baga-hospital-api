'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Hospital {
  id: number;
  hospital_name: string;
  address: string;
  phone: string;
  email: string | null;
  mobile: string | null;
  logo_url: string | null;
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

const LICENSE_TYPE_CONFIG: Record<string, { label: string; description: string; modules: string; color: string; bg: string; border: string; icon: string }> = {
  hospital: { label: 'Hospital', description: 'Complete HMS with all departments', modules: 'Reception, Doctor, Lab, Pharmacy, HR, X-Ray, Ultrasound, Accounts', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', icon: '🏥' },
  clinic: { label: 'Clinic', description: 'Outpatient clinic management', modules: 'Reception, Doctor, Pharmacy, Lab', color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0', icon: '🩺' },
  pharmacy: { label: 'Pharmacy', description: 'Standalone pharmacy system', modules: 'Medicine, Sales, Prescriptions', color: '#92400e', bg: '#fffbeb', border: '#fde68a', icon: '💊' },
  lab: { label: 'Laboratory', description: 'Standalone lab management', modules: 'Tests, Reports, Inventory', color: '#581c87', bg: '#faf5ff', border: '#d8b4fe', icon: '🔬' },
};

function getTypeFromFeatures(features: string[]): string {
  if (!features || features.length === 0) return 'hospital';
  if (features.includes('all')) return 'hospital';
  if (features.length === 1 && features[0] === 'pharmacy') return 'pharmacy';
  if (features.length === 1 && features[0] === 'lab') return 'lab';
  if (features.includes('clinic')) return 'clinic';
  return 'hospital';
}

// Reusable styles
const S = {
  card: {
    background: 'white',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    background: 'white',
    color: '#0f172a',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputFocus: {
    borderColor: '#10b981',
    boxShadow: '0 0 0 3px rgba(16,185,129,0.1)',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  btnPrimary: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    borderRadius: 10,
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
    transition: 'all 0.2s',
  },
  btnSecondary: {
    padding: '10px 24px',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    color: '#475569',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  sectionTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
};

export default function AdminPage() {
  function authHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('baga_admin_token') : null;
    return token ? { 'Authorization': `Bearer ${token}`, 'X-Admin-Token': token } : {};
  }

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    hospital_name: '',
    address: '',
    phone: '',
    email: '',
    mobile: '',
    license_duration: '1_month',
    license_type: 'hospital',
    charges: '',
    notes: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formStep, setFormStep] = useState<1 | 2>(1);

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
      const res = await fetch('/api/admin/hospitals', { headers: authHeaders() });
      if (res.status === 401) {
        localStorage.removeItem('baga_admin_token');
        localStorage.removeItem('baga_admin_remember');
        window.location.reload();
        return;
      }
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
    if (statusFilter === 'active') filtered = filtered.filter(h => h.status === 'active');
    else if (statusFilter === 'inactive') filtered = filtered.filter(h => h.status !== 'active');
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
      if (h.email) text += `   Email: ${h.email}\n`;
      if (h.mobile) text += `   Mobile: ${h.mobile}\n`;
      if (h.address) text += `   Address: ${h.address}\n`;
      if (h.admin_username) text += `   Admin Username: ${h.admin_username}\n`;
      if (h.admin_password) text += `   Admin Password: ${h.admin_password}\n`;
      text += `   Users: ${h.user_count}\n`;
      text += `   Created: ${new Date(h.created_at).toLocaleDateString()}\n`;
      text += '\n';
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baga-hospitals-export-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export downloaded successfully!', 'success');
  }

  async function handleLogoUpload(file: File): Promise<string | null> {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('hospital_name', formData.hospital_name || 'logo');

    try {
      const res = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        headers: authHeaders(),
        body: formDataUpload,
      });
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
      console.error('Logo upload failed:', data.error);
      return null;
    } catch (err) {
      console.error('Logo upload error:', err);
      return null;
    }
  }

  async function handleAddHospital(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.hospital_name.trim()) return;
    setActionLoading(true);

    try {
      // Upload logo if selected
      let logo_url = null;
      if (logoFile) {
        logo_url = await handleLogoUpload(logoFile);
      }

      const res = await fetch('/api/admin/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...formData, logo_url }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('License generated successfully!', 'success');
        setShowAddForm(false);
        setFormStep(1);
        setFormData({ hospital_name: '', address: '', phone: '', email: '', mobile: '', license_duration: '1_month', license_type: 'hospital', charges: '', notes: '' });
        setLogoPreview(null);
        setLogoFile(null);
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE "${hospital.hospital_name}"?\n\nThis will delete the hospital, its license, and ALL associated users.\nThis action CANNOT be undone!`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/hospitals/${hospital.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`"${hospital.hospital_name}" deleted permanently`, 'success');
        if (selectedHospital?.id === hospital.id) {
          setSelectedHospital(null);
          setHospitalUsers([]);
        }
        fetchHospitals();
      } else {
        showToast(data.error || 'Failed to delete hospital', 'error');
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
      const res = await fetch(`/api/admin/hospitals/${hospital.id}/users`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setHospitalUsers(data.users);
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
        const usersRes = await fetch(`/api/admin/hospitals/${selectedHospital.id}/users`, { headers: authHeaders() });
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User ${user.is_active ? 'deactivated' : 'activated'}`, 'success');
        const usersRes = await fetch(`/api/admin/hospitals/${selectedHospital!.id}/users`, { headers: authHeaders() });
        const usersData = await usersRes.json();
        if (usersData.success) setHospitalUsers(usersData.users);
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteUser(user: User) {
    if (!confirm(`Are you sure you want to permanently delete user "${user.full_name}" (${user.username})?\n\nThis action cannot be undone.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/hospitals/${selectedHospital!.id}/users/${user.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User "${user.username}" deleted permanently`, 'success');
        const usersRes = await fetch(`/api/admin/hospitals/${selectedHospital!.id}/users`, { headers: authHeaders() });
        const usersData = await usersRes.json();
        if (usersData.success) setHospitalUsers(usersData.users);
        fetchHospitals();
      } else {
        showToast(data.error || 'Failed to delete user', 'error');
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
      '1_month': '1 Month', '3_months': '3 Months', '6_months': '6 Months',
      '1_year': '1 Year', 'lifetime': 'Lifetime',
    };
    return map[d] || d;
  }

  const CopyBtn = useCallback(({ text, field }: { text: string; field: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); copyToClipboard(text, field); }}
      title="Copy"
      style={{
        background: copiedField === field ? '#059669' : '#f1f5f9',
        border: 'none',
        borderRadius: 6,
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 600,
        color: copiedField === field ? 'white' : '#64748b',
        cursor: 'pointer',
        marginLeft: 6,
        transition: 'all 0.2s',
      }}
    >
      {copiedField === field ? '✓ Copied' : 'Copy'}
    </button>
  ), [copiedField]);

  const filteredHospitals = getFilteredHospitals();

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Logo file must be less than 2MB', 'error');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 1000,
          padding: '14px 22px', borderRadius: 12,
          background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: toast.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: 14, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.3s ease',
        }}>
          {toast.message}
          <style>{`@keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
      )}

      {/* Credentials Modal */}
      {credentialsModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
        }} onClick={() => setCredentialsModal(null)}>
          <div style={{
            background: 'white', borderRadius: 18, padding: 32, width: 460, maxWidth: '90vw',
            boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Login Credentials</h3>
              <button onClick={() => setCredentialsModal(null)} style={{
                background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: '#64748b',
              }}>&times;</button>
            </div>
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
              {credentialsModal.logo_url && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <img src={credentialsModal.logo_url} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                </div>
              )}
              {[
                { label: 'Hospital Name', value: credentialsModal.hospital_name, color: '#0f172a', mono: false },
                { label: 'Admin Username', value: credentialsModal.admin_username, color: '#0f766e', mono: true, copyKey: `cred-user-${credentialsModal.id}` },
                { label: 'Admin Password', value: credentialsModal.admin_password, color: '#b45309', mono: true, copyKey: `cred-pass-${credentialsModal.id}` },
                { label: 'License Key', value: credentialsModal.license_key, color: '#334155', mono: true, copyKey: `cred-license-${credentialsModal.id}` },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 3 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: item.color, fontFamily: item.mono ? 'monospace' : 'inherit' }}>
                      {item.value || 'N/A'}
                    </p>
                    {item.copyKey && item.value && <CopyBtn text={item.value} field={item.copyKey} />}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setCredentialsModal(null)} style={{
              width: '100%', padding: 12, marginTop: 20, background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Close</button>
          </div>
        </div>
      )}

      {/* New Credentials Modal (after creation) */}
      {newCredentials && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002,
        }} onClick={() => setNewCredentials(null)}>
          <div style={{
            background: 'white', borderRadius: 18, padding: 32, width: 460, maxWidth: '90vw',
            boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: 56, height: 56, background: '#ecfdf5', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 28, color: '#059669',
            }}>&#10003;</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>License Generated Successfully!</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, textAlign: 'center' }}>
              Save these credentials securely. They will not be shown again.
            </p>
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ ...S.sectionTitle }}>Hospital</span>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{newCredentials.hospital_name}</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ ...S.sectionTitle }}>License Key</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>{newCredentials.license_key}</p>
                  <CopyBtn text={newCredentials.license_key} field="new-license" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ ...S.sectionTitle }}>Duration</span>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                  {getDurationLabel(newCredentials.license_duration)}
                  {newCredentials.expiry_date && newCredentials.license_duration !== 'lifetime' && (
                    <span style={{ color: '#64748b', fontWeight: 400 }}>
                      {' '}(expires {new Date(newCredentials.expiry_date).toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
              {newCredentials.charges && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ ...S.sectionTitle }}>Charges / Price Plan</span>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{newCredentials.charges}</p>
                </div>
              )}
              {newCredentials.notes && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ ...S.sectionTitle }}>Notes</span>
                  <p style={{ fontSize: 13, color: '#475569' }}>{newCredentials.notes}</p>
                </div>
              )}
              <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: 14, marginTop: 6 }}>
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Admin Login Credentials
                </span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ ...S.sectionTitle }}>Login ID</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>{newCredentials.username}</p>
                  <CopyBtn text={newCredentials.username} field="new-user" />
                </div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ ...S.sectionTitle }}>Password</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>{newCredentials.password}</p>
                  <CopyBtn text={newCredentials.password} field="new-pass" />
                </div>
              </div>
              {newCredentials.reception_credentials && (
                <>
                  <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: 14, marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Reception Login Credentials
                    </span>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ ...S.sectionTitle }}>Login ID</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>{newCredentials.reception_credentials.username}</p>
                      <CopyBtn text={newCredentials.reception_credentials.username} field="new-reception-user" />
                    </div>
                  </div>
                  <div>
                    <span style={{ ...S.sectionTitle }}>Password</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>{newCredentials.reception_credentials.password}</p>
                      <CopyBtn text={newCredentials.reception_credentials.password} field="new-reception-pass" />
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setNewCredentials(null)} style={{
              width: '100%', padding: 12, marginTop: 20, background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              I&apos;ve Saved These Credentials
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '0 32px', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 18, boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
          }}>B</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>BAGA Admin Panel</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Hospital & License Management</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          padding: '8px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 10, color: '#fca5a5', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}>
          Sign Out
        </button>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 28px 80px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Hospitals', value: hospitals.length, color: '#0f172a', icon: '🏛', bg: 'white' },
            { label: 'Active Licenses', value: hospitals.filter(h => h.status === 'active').length, color: '#059669', icon: '✓', bg: '#f0fdf4' },
            { label: 'Inactive', value: hospitals.filter(h => h.status !== 'active').length, color: '#94a3b8', icon: '○', bg: '#f8fafc' },
            { label: 'Total Users', value: hospitals.reduce((sum, h) => sum + h.user_count, 0), color: '#2563eb', icon: '👤', bg: '#eff6ff' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: stat.bg, borderRadius: 14, padding: 22,
              border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{stat.label}</div>
                <span style={{ fontSize: 22 }}>{stat.icon}</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Actions Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>License Management</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {selectedHospital && (
              <button onClick={() => setSelectedHospital(null)} style={{
                padding: '9px 18px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10,
                color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                ← All Hospitals
              </button>
            )}
            <button onClick={handleExport} style={{
              padding: '9px 18px', background: 'white', border: '1.5px solid #bbf7d0', borderRadius: 10,
              color: '#166534', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Export List
            </button>
            <button onClick={() => { setShowAddForm(!showAddForm); setFormStep(1); }} style={{
              padding: '10px 22px', background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 18 }}>+</span> Generate License
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <input
              type="text"
              placeholder="Search by hospital name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...S.input }}
            />
          </div>
          <div style={{ display: 'flex', gap: 2, background: 'white', borderRadius: 10, border: '1.5px solid #e2e8f0', padding: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {(['all', 'active', 'inactive'] as FilterType[]).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{
                padding: '7px 16px', background: statusFilter === f ? '#0f172a' : 'transparent',
                border: 'none', borderRadius: 8, color: statusFilter === f ? 'white' : '#64748b',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s',
              }}>
                {f === 'all' ? `All (${hospitals.length})` : `${f === 'active' ? 'Active' : 'Inactive'} (${hospitals.filter(h => f === 'active' ? h.status === 'active' : h.status !== 'active').length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Generate License Form */}
        {showAddForm && (
          <div style={{
            background: 'white', borderRadius: 18, border: '2px solid #10b981',
            padding: 32, marginBottom: 24,
            boxShadow: '0 4px 24px rgba(16,185,129,0.1)',
          }}>
            {/* Form Steps */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: formStep >= 1 ? 'linear-gradient(135deg, #10b981, #059669)' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: formStep >= 1 ? 'white' : '#94a3b8', fontWeight: 700, fontSize: 14,
              }}>1</div>
              <div style={{ height: 2, width: 40, background: formStep >= 2 ? '#10b981' : '#e2e8f0', borderRadius: 1 }} />
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: formStep >= 2 ? 'linear-gradient(135deg, #10b981, #059669)' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: formStep >= 2 ? 'white' : '#94a3b8', fontWeight: 700, fontSize: 14,
              }}>2</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginLeft: 8 }}>
                {formStep === 1 ? 'Step 1: Hospital Information' : 'Step 2: License Configuration'}
              </span>
            </div>

            <form onSubmit={formStep === 1 ? (e) => { e.preventDefault(); if (formData.hospital_name.trim()) setFormStep(2); } : handleAddHospital}>
              {formStep === 1 ? (
                /* Step 1: Hospital Info */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
                    <div>
                      <label style={{ ...S.label }}>Hospital Name *</label>
                      <input
                        type="text" value={formData.hospital_name}
                        onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                        placeholder="e.g., City General Hospital" required style={{ ...S.input }}
                      />
                    </div>
                    <div>
                      <label style={{ ...S.label }}>Phone</label>
                      <input
                        type="text" value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g., 0300-1234567" style={{ ...S.input }}
                      />
                    </div>
                    <div>
                      <label style={{ ...S.label }}>Mobile</label>
                      <input
                        type="text" value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        placeholder="e.g., 0311-9876543" style={{ ...S.input }}
                      />
                    </div>
                    <div>
                      <label style={{ ...S.label }}>Email</label>
                      <input
                        type="email" value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g., info@hospital.com" style={{ ...S.input }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ ...S.label }}>Address</label>
                      <input
                        type="text" value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g., Main Road, City, Pakistan" style={{ ...S.input }}
                      />
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div style={{ marginTop: 20, marginBottom: 8 }}>
                    <label style={{ ...S.label }}>Hospital Logo</label>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: 20, borderRadius: 12, border: '2px dashed #d1d5db', background: '#fafbfc',
                    }}>
                      {logoPreview ? (
                        <div style={{ position: 'relative' }}>
                          <img src={logoPreview} alt="Logo preview" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                          <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            style={{
                              position: 'absolute', top: -6, right: -6, width: 22, height: 22,
                              background: '#ef4444', border: '2px solid white', borderRadius: '50%',
                              color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                            }}
                          >&times;</button>
                        </div>
                      ) : (
                        <div style={{
                          width: 80, height: 80, borderRadius: 12, background: '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 28, color: '#94a3b8',
                        }}>+</div>
                      )}
                      <div>
                        <button type="button" onClick={() => fileInputRef.current?.click()} style={{
                          padding: '8px 16px', background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                          borderRadius: 8, color: '#166534', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>
                          {logoPreview ? 'Change Logo' : 'Upload Logo'}
                        </button>
                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, maxWidth: 300 }}>
                          Upload hospital logo (PNG, JPG). Max 2MB. This logo will appear on all prints in the software.
                        </p>
                      </div>
                      <input
                        ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleLogoSelect} style={{ display: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button type="button" onClick={() => { setShowAddForm(false); setFormStep(1); }} style={{ ...S.btnSecondary }}>Cancel</button>
                    <button type="submit" disabled={!formData.hospital_name.trim()} style={{
                      ...S.btnPrimary, opacity: formData.hospital_name.trim() ? 1 : 0.5,
                    }}>
                      Next: License Settings →
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: License Config */
                <div>
                  {/* License Type Selection - Visual Cards */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ ...S.label, marginBottom: 12 }}>License Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      {Object.entries(LICENSE_TYPE_CONFIG).map(([key, config]) => (
                        <div
                          key={key}
                          onClick={() => setFormData({ ...formData, license_type: key })}
                          style={{
                            padding: 16, borderRadius: 12, cursor: 'pointer',
                            border: formData.license_type === key ? `2.5px solid ${config.color}` : `1.5px solid ${config.border}`,
                            background: formData.license_type === key ? config.bg : 'white',
                            transition: 'all 0.2s',
                            boxShadow: formData.license_type === key ? `0 0 0 1px ${config.color}33` : 'none',
                          }}
                        >
                          <div style={{ fontSize: 28, marginBottom: 8 }}>{config.icon}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: config.color, marginBottom: 4 }}>{config.label}</div>
                          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{config.description}</div>
                        </div>
                      ))}
                    </div>
                    {formData.license_type !== 'hospital' && (
                      <div style={{
                        marginTop: 10, padding: '10px 16px', borderRadius: 10,
                        background: LICENSE_TYPE_CONFIG[formData.license_type].bg,
                        border: `1.5px solid ${LICENSE_TYPE_CONFIG[formData.license_type].border}`,
                        fontSize: 13, color: LICENSE_TYPE_CONFIG[formData.license_type].color, fontWeight: 500,
                      }}>
                        Modules included: {LICENSE_TYPE_CONFIG[formData.license_type].modules}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                    <div>
                      <label style={{ ...S.label }}>License Duration</label>
                      <select
                        value={formData.license_duration}
                        onChange={(e) => setFormData({ ...formData, license_duration: e.target.value })}
                        style={{ ...S.input }}
                      >
                        <option value="1_month">1 Month</option>
                        <option value="3_months">3 Months</option>
                        <option value="6_months">6 Months</option>
                        <option value="1_year">1 Year</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ ...S.label }}>Charges / Price Plan</label>
                      <input
                        type="text" value={formData.charges}
                        onChange={(e) => setFormData({ ...formData, charges: e.target.value })}
                        placeholder="e.g., PKR 5,000/month" style={{ ...S.input }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ ...S.label }}>Notes / Description</label>
                      <input
                        type="text" value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Optional notes about this license" style={{ ...S.input }}
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{
                    marginTop: 20, padding: 16, borderRadius: 12, background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0', fontSize: 13, color: '#166534',
                  }}>
                    <strong>Summary:</strong> Generating{' '}
                    <strong>{LICENSE_TYPE_CONFIG[formData.license_type]?.label}</strong> license for{' '}
                    <strong>{formData.hospital_name}</strong> with{' '}
                    <strong>{getDurationLabel(formData.license_duration)}</strong> duration.
                    {formData.license_type === 'hospital' && ' Admin + Reception accounts will be auto-created.'}
                    {formData.license_type !== 'hospital' && ' Admin account will be auto-created.'}
                  </div>

                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <button type="button" onClick={() => setFormStep(1)} style={{ ...S.btnSecondary }}>
                      ← Back to Hospital Info
                    </button>
                    <button type="submit" disabled={actionLoading} style={{
                      ...S.btnPrimary, opacity: actionLoading ? 0.7 : 1,
                    }}>
                      {actionLoading ? '⏳ Generating License...' : '🚀 Generate License'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Hospital Detail Panel */}
        {selectedHospital && (
          <div style={{
            background: 'white', borderRadius: 18, border: '2px solid #10b981',
            padding: 28, marginBottom: 24,
            boxShadow: '0 4px 24px rgba(16,185,129,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {selectedHospital.logo_url && (
                  <img src={selectedHospital.logo_url} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                )}
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selectedHospital.hospital_name}</h3>
                  <p style={{ fontSize: 13, color: '#64748b' }}>Detailed view and user management</p>
                </div>
              </div>
              <button onClick={() => setSelectedHospital(null)} style={{
                background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: '#64748b',
              }}>&times;</button>
            </div>

            {/* Hospital Info Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16, marginBottom: 24, padding: 20, background: '#f8fafc',
              borderRadius: 14, border: '1px solid #e2e8f0',
            }}>
              {[
                { label: 'Status', value: (
                  <span style={{
                    padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: selectedHospital.status === 'active' ? '#ecfdf5' : '#fef2f2',
                    color: selectedHospital.status === 'active' ? '#065f46' : '#991b1b',
                  }}>{selectedHospital.status === 'active' ? '● Active' : '● Inactive'}</span>
                )},
                { label: 'License Key', value: (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>{selectedHospital.license_key}</span>
                    <CopyBtn text={selectedHospital.license_key} field={`detail-license-${selectedHospital.id}`} />
                  </div>
                )},
                { label: 'License Type', value: (() => {
                  const t = selectedHospital.license_type || getTypeFromFeatures(selectedHospital.features);
                  const c = LICENSE_TYPE_CONFIG[t] || LICENSE_TYPE_CONFIG.hospital;
                  return <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{c.icon} {c.label}</span>;
                })()},
                { label: 'Duration', value: <span style={{ fontWeight: 600, color: '#334155' }}>{getDurationLabel(selectedHospital.license_duration)}</span> },
                { label: 'Expiry Date', value: selectedHospital.expiry_date && selectedHospital.license_duration !== 'lifetime' ? (() => {
                  const days = getDaysRemaining(selectedHospital.expiry_date, selectedHospital.license_duration);
                  const isExpired = days !== null && days < 0;
                  const isWarning = days !== null && days >= 0 && days <= 30;
                  return (
                    <span style={{ fontWeight: 600, color: isExpired ? '#dc2626' : isWarning ? '#d97706' : '#334155' }}>
                      {new Date(selectedHospital.expiry_date).toLocaleDateString()}
                      {days !== null && <span style={{
                        marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 6,
                        background: isExpired ? '#fef2f2' : isWarning ? '#fffbeb' : '#ecfdf5',
                        color: isExpired ? '#dc2626' : isWarning ? '#d97706' : '#059669',
                      }}>{isExpired ? `${Math.abs(days)}d overdue` : `${days}d remaining`}</span>}
                    </span>
                  );
                })() : <span style={{ fontWeight: 600, color: '#059669' }}>Lifetime</span> },
                ...(selectedHospital.phone ? [{ label: 'Phone', value: selectedHospital.phone }] : []),
                ...(selectedHospital.email ? [{ label: 'Email', value: selectedHospital.email }] : []),
                ...(selectedHospital.mobile ? [{ label: 'Mobile', value: selectedHospital.mobile }] : []),
                ...(selectedHospital.address ? [{ label: 'Address', value: selectedHospital.address }] : []),
                { label: 'Created', value: new Date(selectedHospital.created_at).toLocaleDateString() },
                { label: 'Total Users', value: <span style={{ fontWeight: 700, color: '#2563eb', fontSize: 18 }}>{selectedHospital.user_count}</span> },
              ].map(item => (
                <div key={item.label}>
                  <span style={{ ...S.sectionTitle }}>{item.label}</span>
                  <div style={{ marginTop: 4 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              <button onClick={() => setCredentialsModal(selectedHospital)} style={{
                padding: '9px 18px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10,
                color: '#166534', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>View Credentials</button>
              <button onClick={() => handleToggleStatus(selectedHospital)} style={{
                padding: '9px 18px', background: selectedHospital.status === 'active' ? '#fef2f2' : '#ecfdf5',
                border: 'none', borderRadius: 10,
                color: selectedHospital.status === 'active' ? '#dc2626' : '#059669',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{selectedHospital.status === 'active' ? '⏸ Deactivate' : '▶ Activate'}</button>
              <button onClick={() => handleRegenerateLicense(selectedHospital)} style={{
                padding: '9px 18px', background: '#eff6ff', border: 'none', borderRadius: 10,
                color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>🔄 Regenerate License</button>
              <button onClick={() => { if (confirm('Delete permanently?')) handleDeleteHospital(selectedHospital); }} style={{
                padding: '9px 18px', background: '#fef2f2', border: 'none', borderRadius: 10,
                color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>🗑 Delete</button>
            </div>

            {/* Users Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Users ({hospitalUsers.length})</h4>
                <button onClick={() => setShowAddUserForm(!showAddUserForm)} style={{
                  padding: '8px 16px', background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>+ Add User</button>
              </div>

              {showAddUserForm && (
                <form onSubmit={handleAddUser} style={{
                  background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e2e8f0',
                  padding: 20, marginBottom: 16,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                    <div>
                      <label style={{ ...S.label, fontSize: 12 }}>Username</label>
                      <input type="text" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                        placeholder="username" required style={{ ...S.input, padding: '8px 12px', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ ...S.label, fontSize: 12 }}>Password</label>
                      <input type="text" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder="password" required style={{ ...S.input, padding: '8px 12px', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ ...S.label, fontSize: 12 }}>Full Name</label>
                      <input type="text" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                        placeholder="e.g., Dr. Ahmad" required style={{ ...S.input, padding: '8px 12px', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ ...S.label, fontSize: 12 }}>Role</label>
                      <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        style={{ ...S.input, padding: '8px 12px', fontSize: 13 }}>
                        {(ROLES_BY_LICENSE_TYPE[selectedHospital.license_type || getTypeFromFeatures(selectedHospital.features)] || ROLES_BY_LICENSE_TYPE.hospital).map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="submit" disabled={actionLoading} style={{
                        padding: '8px 16px', background: '#059669', border: 'none', borderRadius: 8,
                        color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>{actionLoading ? '...' : 'Create'}</button>
                      <button type="button" onClick={() => setShowAddUserForm(false)} style={{
                        padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: 8,
                        color: '#475569', fontSize: 13, cursor: 'pointer',
                      }}>Cancel</button>
                    </div>
                  </div>
                </form>
              )}

              {/* Users Table */}
              {hospitalUsers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  No users yet. Click &quot;Add User&quot; to create one.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Username', 'Full Name', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 12 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hospitalUsers.map(user => (
                        <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0f766e' }}>{user.username}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1e293b' }}>{user.full_name}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: '#eff6ff', color: '#2563eb',
                            }}>{ROLE_LABELS[user.role] || user.role}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: user.is_active ? '#ecfdf5' : '#fef2f2',
                              color: user.is_active ? '#065f46' : '#991b1b',
                            }}>{user.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleToggleUser(user)} style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                                background: user.is_active ? '#fef2f2' : '#ecfdf5', color: user.is_active ? '#dc2626' : '#059669',
                              }}>{user.is_active ? 'Disable' : 'Enable'}</button>
                              <button onClick={() => handleDeleteUser(user)} style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                                background: '#fef2f2', color: '#dc2626',
                              }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hospital List */}
        {filteredHospitals.length === 0 ? (
          <div style={{ ...S.card, padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 60, height: 60, background: '#f1f5f9', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
              {searchQuery || statusFilter !== 'all' ? '🔍' : '🏥'}
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>
              {searchQuery || statusFilter !== 'all' ? 'No hospitals match your filters' : 'No hospitals yet'}
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Click "Generate License" to create your first hospital license'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredHospitals.map(hospital => {
              const daysRemaining = getDaysRemaining(hospital.expiry_date, hospital.license_duration);
              const isExpired = daysRemaining !== null && daysRemaining < 0;
              const isWarning = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;
              const resolvedType = hospital.license_type || getTypeFromFeatures(hospital.features);
              const typeConfig = LICENSE_TYPE_CONFIG[resolvedType] || LICENSE_TYPE_CONFIG.hospital;

              return (
                <div key={hospital.id} style={{
                  ...S.card, padding: 22, cursor: 'pointer',
                  border: `1.5px solid ${selectedHospital?.id === hospital.id ? '#10b981' : '#e2e8f0'}`,
                  transition: 'all 0.2s',
                  ...(selectedHospital?.id === hospital.id ? { boxShadow: '0 0 0 1px rgba(16,185,129,0.1)' } : {}),
                }} onClick={() => handleViewHospital(hospital)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, display: 'flex', gap: 14 }}>
                      {/* Hospital Logo or Icon */}
                      {hospital.logo_url ? (
                        <img src={hospital.logo_url} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0', flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 52, height: 52, borderRadius: 12,
                          background: `linear-gradient(135deg, ${typeConfig.bg}, ${typeConfig.border})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 24, flexShrink: 0, border: `1px solid ${typeConfig.border}`,
                        }}>{typeConfig.icon}</div>
                      )}

                      <div style={{ flex: 1 }}>
                        {/* Name + Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{hospital.hospital_name}</h3>
                          <span style={{
                            padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: hospital.status === 'active' ? '#ecfdf5' : '#fef2f2',
                            color: hospital.status === 'active' ? '#065f46' : '#991b1b',
                          }}>{hospital.status === 'active' ? '● Active' : '○ Inactive'}</span>
                          <span style={{
                            padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: typeConfig.bg, color: typeConfig.color, border: `1px solid ${typeConfig.border}`,
                          }}>{typeConfig.icon} {typeConfig.label}</span>
                          {isExpired && <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#fef2f2', color: '#dc2626' }}>⚠ Expired</span>}
                          {isWarning && <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#fffbeb', color: '#d97706' }}>⏰ Expiring Soon</span>}
                        </div>
                        {/* Details */}
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ fontSize: 13 }}>
                            <span style={{ color: '#94a3b8' }}>License: </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f766e', fontSize: 13 }}>{hospital.license_key}</span>
                          </div>
                          <div style={{ fontSize: 13 }}>
                            <span style={{ color: '#94a3b8' }}>Duration: </span>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{getDurationLabel(hospital.license_duration)}</span>
                          </div>
                          {hospital.expiry_date && hospital.license_duration !== 'lifetime' && (
                            <div style={{ fontSize: 13 }}>
                              <span style={{ color: '#94a3b8' }}>Expires: </span>
                              <span style={{ fontWeight: 600, color: isExpired ? '#dc2626' : '#334155' }}>
                                {new Date(hospital.expiry_date).toLocaleDateString()}
                              </span>
                              {daysRemaining !== null && (
                                <span style={{ fontSize: 11, marginLeft: 4, color: isExpired ? '#dc2626' : isWarning ? '#d97706' : '#94a3b8' }}>
                                  ({isExpired ? `${Math.abs(daysRemaining)}d ago` : `${daysRemaining}d left`})
                                </span>
                              )}
                            </div>
                          )}
                          {hospital.license_duration === 'lifetime' && (
                            <div style={{ fontSize: 13 }}><span style={{ fontWeight: 600, color: '#059669' }}>Lifetime License</span></div>
                          )}
                          {hospital.phone && (
                            <div style={{ fontSize: 13 }}>
                              <span style={{ color: '#94a3b8' }}>Phone: </span>
                              <span style={{ color: '#334155' }}>{hospital.phone}</span>
                            </div>
                          )}
                          <div style={{ fontSize: 13 }}>
                            <span style={{ color: '#94a3b8' }}>Users: </span>
                            <span style={{ fontWeight: 700, color: '#2563eb' }}>{hospital.user_count}</span>
                          </div>
                          {hospital.admin_username && (
                            <div style={{ fontSize: 13 }}>
                              <span style={{ color: '#94a3b8' }}>Admin: </span>
                              <span style={{ fontWeight: 600, color: '#0f766e', fontFamily: 'monospace', fontSize: 12 }}>{hospital.admin_username}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 6, marginLeft: 16, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setCredentialsModal(hospital)} style={{
                        padding: '6px 12px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8,
                        color: '#166534', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>Credentials</button>
                      <button onClick={() => handleToggleStatus(hospital)} style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                        background: hospital.status === 'active' ? '#fef2f2' : '#ecfdf5',
                        color: hospital.status === 'active' ? '#dc2626' : '#059669',
                      }}>{hospital.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => handleRegenerateLicense(hospital)} style={{
                        padding: '6px 12px', background: '#eff6ff', border: 'none', borderRadius: 8,
                        color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>Regenerate</button>
                      <button onClick={() => { if (confirm('Delete permanently?')) handleDeleteHospital(hospital); }} style={{
                        padding: '6px 12px', background: '#fef2f2', border: 'none', borderRadius: 8,
                        color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>Delete</button>
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
