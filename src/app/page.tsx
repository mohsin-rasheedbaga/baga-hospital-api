'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarGroup,
  SidebarGroupLabel, SidebarInset, SidebarTrigger
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, ClipboardList, Users, Stethoscope, Pill, Microscope,
  ScanLine, Activity, Wallet, Settings, LogOut, Search, Plus, Edit, Eye,
  Phone, AlertCircle, CheckCircle2, Clock, RefreshCw, UserPlus, Shield
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import {
  INIT_PATIENTS, INIT_DOCTORS, INIT_MEDICINES, INIT_LAB_TESTS,
  INIT_VISITS, INIT_PAYMENTS, INIT_XRAY, INIT_ULTRASOUND,
  type Patient, type Doctor, type LabTest, type XRayOrder, type UltrasoundOrder
} from '@/lib/hospital-data';

type View = 'dashboard' | 'reception' | 'patients' | 'doctors' | 'pharmacy' | 'lab' | 'xray' | 'ultrasound' | 'accounts' | 'settings';
type Role = 'admin' | 'reception' | 'doctor' | 'pharmacy' | 'lab' | 'xray' | 'ultrasound';

const ROLE_VIEWS: Record<Role, View[]> = {
  admin: ['dashboard','reception','patients','doctors','pharmacy','lab','xray','ultrasound','accounts','settings'],
  reception: ['dashboard','reception','patients','accounts'],
  doctor: ['dashboard','reception','patients'],
  pharmacy: ['dashboard','pharmacy'],
  lab: ['dashboard','lab'],
  xray: ['dashboard','xray'],
  ultrasound: ['dashboard','ultrasound'],
};

const NAV: { key: View; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'reception', label: 'Reception', icon: <ClipboardList className="w-4 h-4" /> },
  { key: 'patients', label: 'Patients', icon: <Users className="w-4 h-4" /> },
  { key: 'doctors', label: 'Doctors', icon: <Stethoscope className="w-4 h-4" /> },
  { key: 'pharmacy', label: 'Pharmacy', icon: <Pill className="w-4 h-4" /> },
  { key: 'lab', label: 'Lab', icon: <Microscope className="w-4 h-4" /> },
  { key: 'xray', label: 'X-Ray', icon: <ScanLine className="w-4 h-4" /> },
  { key: 'ultrasound', label: 'Ultrasound', icon: <Activity className="w-4 h-4" /> },
  { key: 'accounts', label: 'Accounts', icon: <Wallet className="w-4 h-4" /> },
  { key: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

const ROLE_BUTTONS: { role: Role; label: string; color: string; bg: string; desc: string; icon: React.ReactNode }[] = [
  { role: 'admin', label: 'Admin', color: 'text-emerald-700', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200', desc: 'Full access', icon: <Shield className="w-8 h-8" /> },
  { role: 'reception', label: 'Reception', color: 'text-blue-700', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200', desc: 'Registration', icon: <ClipboardList className="w-8 h-8" /> },
  { role: 'doctor', label: 'Doctor', color: 'text-purple-700', bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200', desc: 'Diagnosis', icon: <Stethoscope className="w-8 h-8" /> },
  { role: 'pharmacy', label: 'Pharmacy', color: 'text-amber-700', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200', desc: 'Medicines', icon: <Pill className="w-8 h-8" /> },
  { role: 'lab', label: 'Lab', color: 'text-teal-700', bg: 'bg-teal-50 hover:bg-teal-100 border-teal-200', desc: 'Lab tests', icon: <Microscope className="w-8 h-8" /> },
  { role: 'xray', label: 'X-Ray', color: 'text-rose-700', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200', desc: 'X-Ray imaging', icon: <ScanLine className="w-8 h-8" /> },
  { role: 'ultrasound', label: 'Ultrasound', color: 'text-indigo-700', bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200', desc: 'Ultrasound', icon: <Activity className="w-8 h-8" /> },
];

export default function HospitalApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>('admin');
  const [view, setView] = useState<View>('dashboard');
  const [patients, setPatients] = useState<Patient[]>(INIT_PATIENTS);
  const [labTests, setLabTests] = useState<LabTest[]>(INIT_LAB_TESTS);
  const [xrayOrders, setXrayOrders] = useState<XRayOrder[]>(INIT_XRAY);
  const [ultraOrders, setUltraOrders] = useState<UltrasoundOrder[]>(INIT_ULTRASOUND);

  // Reception state
  const [regForm, setRegForm] = useState({ name:'', fatherName:'', relation:'S/O' as 'S/O'|'W/O'|'D/O', mobile:'', age:'', gender:'Male', address:'' });
  const [searchMobile, setSearchMobile] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [rxTab, setRxTab] = useState('register');
  const [editPatient, setEditPatient] = useState<Patient|null>(null);
  const [editForm, setEditForm] = useState({ name:'', fatherName:'', mobile:'', age:'', address:'' });
  const [renewPatient, setRenewPatient] = useState<Patient|null>(null);
  const [visitPatient, setVisitPatient] = useState<Patient|null>(null);

  // Lab/Xray/Ultrasound dialog
  const [reportOrder, setReportOrder] = useState<any>(null);
  const [reportText, setReportText] = useState('');

  // Pharmacy
  const [issueMed, setIssueMed] = useState<any>(null);
  const [medSearch, setMedSearch] = useState('');

  // Patients
  const [ptSearch, setPtSearch] = useState('');
  const [viewPt, setViewPt] = useState<Patient|null>(null);

  const allowedViews = ROLE_VIEWS[role];

  const handleLogin = (r: Role) => { setRole(r); setLoggedIn(true); setView('dashboard'); toast.success('Login successful!'); };
  const handleLogout = () => { setLoggedIn(false); setView('dashboard'); };

  const genPatientNo = () => {
    const max = patients.reduce((m, p) => { const n = parseInt(p.patientNo.replace('BAGA-','')); return n > m ? n : m; }, 0);
    return `BAGA-${String(max+1).padStart(4,'0')}`;
  };

  const handleRegister = () => {
    if (!regForm.name.trim()) { toast.error('Name is required'); return; }
    if (!regForm.mobile.trim() || regForm.mobile.length < 11) { toast.error('Valid mobile is required'); return; }
    if (!regForm.age.trim()) { toast.error('Age is required'); return; }
    if (!regForm.address.trim()) { toast.error('Address is required'); return; }
    const np: Patient = {
      id: String(Date.now()), patientNo: genPatientNo(), name: regForm.name, fatherName: regForm.fatherName,
      relation: regForm.relation, mobile: regForm.mobile, age: parseInt(regForm.age), gender: regForm.gender,
      address: regForm.address, status: 'active', createdAt: new Date().toISOString().split('T')[0],
      lastVisit: new Date().toISOString().split('T')[0], totalVisits: 1,
    };
    setPatients([np, ...patients]);
    setRegForm({ name:'', fatherName:'', relation:'S/O', mobile:'', age:'', gender:'Male', address:'' });
    toast.success(`Registered - ${np.patientNo}`);
  };

  const handleSearch = () => {
    if (!searchMobile.trim()) { toast.error('Enter mobile number'); return; }
    const r = patients.filter(p => p.mobile.includes(searchMobile));
    setSearchResults(r);
    if (r.length === 0) toast.error('No patient found');
    else setRxTab('search');
  };

  const handleEditSave = () => {
    if (!editPatient) return;
    setPatients(patients.map(p => p.id === editPatient.id ? { ...p, name: editForm.name||p.name, fatherName: editForm.fatherName||p.fatherName, mobile: editForm.mobile||p.mobile, age: parseInt(editForm.age)||p.age, address: editForm.address||p.address } : p));
    setEditPatient(null);
    toast.success('Patient updated');
  };

  const handleRenew = () => { if (!renewPatient) return; setPatients(patients.map(p => p.id === renewPatient.id ? { ...p, status:'active', lastVisit:new Date().toISOString().split('T')[0], totalVisits:p.totalVisits+1 } : p)); setRenewPatient(null); toast.success('Card renewed'); };
  const handleNewVisit = () => { if (!visitPatient) return; setPatients(patients.map(p => p.id === visitPatient.id ? { ...p, lastVisit:new Date().toISOString().split('T')[0], totalVisits:p.totalVisits+1 } : p)); setVisitPatient(null); toast.success('New visit created'); };

  const handleReportSave = (type: 'lab'|'xray'|'ultrasound') => {
    if (!reportOrder || !reportText.trim()) { toast.error('Enter report'); return; }
    if (type === 'lab') setLabTests(labTests.map(t => t.id === reportOrder.id ? { ...t, result: reportText, status:'completed' } : t));
    else if (type === 'xray') setXrayOrders(xrayOrders.map(o => o.id === reportOrder.id ? { ...o, result: reportText, status:'completed' } : o));
    else setUltraOrders(ultraOrders.map(o => o.id === reportOrder.id ? { ...o, result: reportText, status:'completed' } : o));
    setReportOrder(null); setReportText(''); toast.success('Report saved');
  };

  // ===== LOGIN SCREEN =====
  if (!loggedIn) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="text-center mb-8">
        <div className="mx-auto w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg"><Activity className="w-10 h-10 text-white" /></div>
        <h1 className="text-3xl font-extrabold text-gray-800">BAGA</h1>
        <p className="text-lg text-emerald-600 font-semibold">Hospital Management System</p>
        <p className="text-sm text-gray-500 mt-1">Demo Mode - Select a role to continue</p>
      </div>
      <Card className="w-full max-w-2xl border-0 shadow-xl">
        <CardHeader className="text-center pb-2"><CardTitle className="text-xl text-gray-700">Select Your Role</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ROLE_BUTTONS.map(b => (
              <Button key={b.role} onClick={() => handleLogin(b.role)} className={`h-auto p-4 flex flex-col items-center gap-2 rounded-xl border-2 transition-all ${b.bg}`} variant="ghost">
                <div className={b.color}>{b.icon}</div>
                <p className={`font-bold text-sm ${b.color}`}>{b.label}</p>
                <p className="text-[10px] text-gray-400">{b.desc}</p>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400 mt-6">BAGA Hospital Management System v1.0 - Demo</p>
      <Toaster position="top-center" />
    </div>
  );

  // ===== MAIN APP WITH SIDEBAR =====
  const filteredNav = NAV.filter(n => allowedViews.includes(n.key));

  return (
    <SidebarProvider>
      <Sidebar className="border-r-emerald-200 bg-white">
        <SidebarHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0"><Activity className="w-5 h-5 text-white" /></div>
            <div><h2 className="font-bold text-gray-800 text-sm">BAGA</h2><p className="text-[10px] text-gray-500">Hospital Management</p></div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-gray-400 px-2">Navigation</SidebarGroupLabel>
            <SidebarMenu>
              {filteredNav.map(n => (
                <SidebarMenuItem key={n.key}>
                  <SidebarMenuButton isActive={view === n.key} onClick={() => setView(n.key)} className="cursor-pointer">{n.icon}<span>{n.label}</span></SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center"><Shield className="w-4 h-4 text-emerald-600" /></div>
            <div><p className="text-xs font-semibold text-gray-700 capitalize">{role}</p><Badge variant="outline" className="text-[9px] px-1.5 py-0">{role}</Badge></div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-red-600 hover:bg-red-50 mt-1" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Logout</Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="h-14 border-b bg-white sticky top-0 z-50 flex items-center px-4 gap-3 shadow-sm">
          <SidebarTrigger /><Separator orientation="vertical" className="h-6" />
          <h1 className="text-sm font-semibold text-gray-700 capitalize">{view}</h1>
          <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50 ml-auto">{role}</Badge>
        </header>

        <main className="flex-1 p-4 md:p-6 bg-gray-50 min-h-[calc(100vh-3.5rem)]">
          {view === 'dashboard' && <DashboardView patients={patients} />}
          {view === 'reception' && (
            <ReceptionView patients={patients} setPatients={setPatients} regForm={regForm} setRegForm={setRegForm} handleRegister={handleRegister} genPatientNo={genPatientNo} searchMobile={searchMobile} setSearchMobile={setSearchMobile} searchResults={searchResults} handleSearch={handleSearch} setSearchResults={setSearchResults} rxTab={rxTab} setRxTab={setRxTab} editPatient={editPatient} setEditPatient={p=>{setEditPatient(p);if(p)setEditForm({name:p.name,fatherName:p.fatherName,mobile:p.mobile,age:String(p.age),address:p.address});}} editForm={editForm} setEditForm={setEditForm} handleEditSave={handleEditSave} renewPatient={renewPatient} setRenewPatient={setRenewPatient} handleRenew={handleRenew} visitPatient={visitPatient} setVisitPatient={setVisitPatient} handleNewVisit={handleNewVisit} />
          )}
          {view === 'patients' && <PatientsView patients={patients} ptSearch={ptSearch} setPtSearch={setPtSearch} viewPt={viewPt} setViewPt={setViewPt} />}
          {view === 'doctors' && <DoctorsView />}
          {view === 'pharmacy' && <PharmacyView medSearch={medSearch} setMedSearch={setMedSearch} issueMed={issueMed} setIssueMed={setIssueMed} />}
          {view === 'lab' && <LabView tests={labTests} setTests={setLabTests} reportOrder={reportOrder} setReportOrder={o=>{setReportOrder(o);setReportText(o?.result||'');}} reportText={reportText} setReportText={setReportText} handleReportSave={()=>handleReportSave('lab')} />}
          {view === 'xray' && <ServiceOrdersView title="X-Ray" icon={<ScanLine className="w-5 h-5 text-rose-600" />} orders={xrayOrders} reportOrder={reportOrder} setReportOrder={o=>{setReportOrder(o);setReportText(o?.result||'');}} reportText={reportText} setReportText={setReportText} handleReportSave={()=>handleReportSave('xray')} />}
          {view === 'ultrasound' && <ServiceOrdersView title="Ultrasound" icon={<Activity className="w-5 h-5 text-indigo-600" />} orders={ultraOrders} reportOrder={reportOrder} setReportOrder={o=>{setReportOrder(o);setReportText(o?.result||'');}} reportText={reportText} setReportText={setReportText} handleReportSave={()=>handleReportSave('ultrasound')} />}
          {view === 'accounts' && <AccountsView />}
          {view === 'settings' && <SettingsView />}
        </main>
      </SidebarInset>
      <Toaster position="top-center" />
    </SidebarProvider>
  );
}

// ===== DASHBOARD =====
function DashboardView({ patients }: { patients: Patient[] }) {
  const todayVisits = INIT_VISITS.filter(v => v.date === '2025-05-14');
  const pendingLab = INIT_LAB_TESTS.filter(t => t.status !== 'completed').length;
  const revenue = INIT_PAYMENTS.filter(p => p.date === '2025-05-14' && p.status === 'paid').reduce((s,p) => s+p.amount, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-100', val: patients.length, label: 'Total Patients' },
          { icon: <Activity className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100', val: todayVisits.length, label: "Today's Visits" },
          { icon: <Wallet className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-100', val: `Rs. ${revenue.toLocaleString()}`, label: "Today's Revenue" },
          { icon: <Microscope className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-100', val: pendingLab, label: 'Pending Lab Tests' },
        ].map((s,i) => (
          <Card key={i} className="border-emerald-200"><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>{s.icon}</div><div><p className="text-2xl font-bold text-gray-800">{s.val}</p><p className="text-xs text-gray-500">{s.label}</p></div></div></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" />Today&apos;s Visits</CardTitle></CardHeader><CardContent><div className="space-y-3">{todayVisits.map(v=>(<div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><p className="text-sm font-semibold">{v.patientName}</p><p className="text-xs text-gray-500">{v.doctorName} - {v.diagnosis}</p></div><Badge className={v.status==='completed'?'bg-emerald-600':''} variant={v.status==='completed'?'default':'outline'}>{v.status}</Badge></div>))}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Stethoscope className="w-4 h-4 text-emerald-600" />Doctors On Duty</CardTitle></CardHeader><CardContent><div className="space-y-3">{INIT_DOCTORS.filter(d=>d.status!=='off-duty').map(d=>(<div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center"><span className="text-xs font-bold text-emerald-700">{d.name.charAt(0)}</span></div><div><p className="text-sm font-semibold">{d.name}</p><p className="text-xs text-gray-500">{d.specialty}</p></div></div><div className="text-right"><Badge className={d.status==='available'?'bg-emerald-600':d.status==='busy'?'bg-amber-500':''} variant={d.status==='available'?'default':'secondary'}>{d.status}</Badge><p className="text-[10px] text-gray-400 mt-1">{d.patientsToday} today</p></div></div>))}</div></CardContent></Card>
      </div>
    </div>
  );
}

// ===== RECEPTION =====
function ReceptionView({ patients, setPatients, regForm, setRegForm, handleRegister, genPatientNo, searchMobile, setSearchMobile, searchResults, handleSearch, setSearchResults, rxTab, setRxTab, editPatient, setEditPatient, editForm, setEditForm, handleEditSave, renewPatient, setRenewPatient, handleRenew, visitPatient, setVisitPatient, handleNewVisit }: any) {
  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex-1 relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" /><Input placeholder="Search by mobile number..." value={searchMobile} onChange={e=>setSearchMobile(e.target.value)} className="pl-10 bg-white" dir="ltr" onKeyDown={e=>e.key==='Enter'&&handleSearch()} /></div><Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700"><Search className="w-4 h-4 mr-1" />Search</Button></div></CardContent></Card>

      <Tabs value={rxTab} onValueChange={setRxTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="register"><UserPlus className="w-3.5 h-3.5 mr-1" />Register</TabsTrigger>
          <TabsTrigger value="search"><Search className="w-3.5 h-3.5 mr-1" />Results ({searchResults.length})</TabsTrigger>
          <TabsTrigger value="list"><Eye className="w-3.5 h-3.5 mr-1" />All Patients</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" />New Patient Registration</CardTitle></CardHeader><CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Name *</Label><Input placeholder="Patient name" value={regForm.name} onChange={e=>setRegForm({...regForm,name:e.target.value})} /></div>
              <div><Label>Father/Husband Name *</Label><Input placeholder="Name" value={regForm.fatherName} onChange={e=>setRegForm({...regForm,fatherName:e.target.value})} /></div>
              <div><Label>Relation *</Label><Select value={regForm.relation} onValueChange={v=>setRegForm({...regForm,relation:v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="S/O">S/O (Son)</SelectItem><SelectItem value="W/O">W/O (Wife)</SelectItem><SelectItem value="D/O">D/O (Daughter)</SelectItem></SelectContent></Select></div>
              <div><Label>Mobile *</Label><Input placeholder="03XXXXXXXXX" value={regForm.mobile} onChange={e=>setRegForm({...regForm,mobile:e.target.value})} dir="ltr" maxLength={11} /></div>
              <div><Label>Age *</Label><Input type="number" placeholder="Age" value={regForm.age} onChange={e=>setRegForm({...regForm,age:e.target.value})} dir="ltr" /></div>
              <div><Label>Gender</Label><Select value={regForm.gender} onValueChange={v=>setRegForm({...regForm,gender:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
              <div><Label>Address *</Label><Input placeholder="Full address" value={regForm.address} onChange={e=>setRegForm({...regForm,address:e.target.value})} /></div>
            </div>
            <div className="flex items-center gap-3 mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg"><AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" /><p className="text-xs text-amber-700">* Required fields. Patient number will be auto-generated.</p></div>
            <Button onClick={handleRegister} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 h-11"><CheckCircle2 className="w-4 h-4 mr-2" />Register</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="search">
          <Card><CardHeader><CardTitle className="text-lg">Search Results ({searchResults.length})</CardTitle></CardHeader><CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Phone className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Search by mobile number</p></div>
            ) : (
              <div className="space-y-3">
                {searchResults.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div><p className="font-semibold text-sm">{p.name}</p><p className="text-xs text-gray-500">{p.relation} {p.fatherName} | {p.mobile}</p></div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">{p.patientNo}</Badge>
                      <Button size="sm" variant="outline" onClick={() => setEditPatient(p)}><Edit className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => setVisitPatient(p)}><UserPlus className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => setRenewPatient(p)}><RefreshCw className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="list">
          <Card><CardHeader><CardTitle className="text-lg">All Patients ({patients.length})</CardTitle></CardHeader><CardContent>
            <div className="space-y-2">{patients.map(p=>(<div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center"><span className="text-xs font-bold text-emerald-700">{p.name.charAt(0)}</span></div><div><p className="font-semibold text-sm">{p.name}</p><p className="text-xs text-gray-500">{p.relation} {p.fatherName} | {p.mobile} | Age: {p.age}</p></div></div><div className="flex gap-2"><Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">{p.patientNo}</Badge><Button size="sm" variant="outline" onClick={()=>setEditPatient(p)}><Edit className="w-3 h-3" /></Button></div></div>))}</div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editPatient} onOpenChange={()=>setEditPatient(null)}><DialogContent><DialogHeader><DialogTitle>Edit Patient</DialogTitle></DialogHeader><div className="space-y-3 py-2"><div><Label>Name</Label><Input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} /></div><div><Label>Father/Husband</Label><Input value={editForm.fatherName} onChange={e=>setEditForm({...editForm,fatherName:e.target.value})} /></div><div><Label>Mobile</Label><Input value={editForm.mobile} onChange={e=>setEditForm({...editForm,mobile:e.target.value})} dir="ltr" /></div><div><Label>Age</Label><Input value={editForm.age} onChange={e=>setEditForm({...editForm,age:e.target.value})} dir="ltr" type="number" /></div><div><Label>Address</Label><Input value={editForm.address} onChange={e=>setEditForm({...editForm,address:e.target.value})} /></div></div><DialogFooter><Button variant="outline" onClick={()=>setEditPatient(null)}>Cancel</Button><Button onClick={handleEditSave} className="bg-emerald-600">Save</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={!!renewPatient} onOpenChange={()=>setRenewPatient(null)}><DialogContent><DialogHeader><DialogTitle>Card Renewal</DialogTitle></DialogHeader><div className="py-4 text-center"><CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" /><p className="text-lg font-semibold">{renewPatient?.name}</p><p className="text-sm text-gray-500">{renewPatient?.patientNo} | {renewPatient?.mobile}</p><p className="text-sm text-gray-500 mt-2">Confirm card renewal?</p></div><DialogFooter><Button variant="outline" onClick={()=>setRenewPatient(null)}>No</Button><Button onClick={handleRenew} className="bg-emerald-600">Yes, Renew</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={!!visitPatient} onOpenChange={()=>setVisitPatient(null)}><DialogContent><DialogHeader><DialogTitle>New Visit</DialogTitle></DialogHeader><div className="py-4 text-center"><UserPlus className="w-16 h-16 text-blue-500 mx-auto mb-3" /><p className="text-lg font-semibold">{visitPatient?.name}</p><p className="text-sm text-gray-500">{visitPatient?.patientNo} | {visitPatient?.mobile}</p><p className="text-sm text-gray-500 mt-2">Create new visit?</p></div><DialogFooter><Button variant="outline" onClick={()=>setVisitPatient(null)}>No</Button><Button onClick={handleNewVisit} className="bg-blue-600">Yes, New Visit</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

// ===== PATIENTS =====
function PatientsView({ patients, ptSearch, setPtSearch, viewPt, setViewPt }: any) {
  const filtered = patients.filter(p => p.name.includes(ptSearch) || p.mobile.includes(ptSearch) || p.patientNo.toLowerCase().includes(ptSearch.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search by name, number, or patient ID..." value={ptSearch} onChange={e=>setPtSearch(e.target.value)} className="pl-10" /></div>
      <Card><CardHeader><CardTitle className="text-lg">Patients ({filtered.length})</CardTitle></CardHeader><CardContent>
        <div className="space-y-2">{filtered.map(p=>(<div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><span className="text-sm font-bold text-emerald-700">{p.name.charAt(0)}</span></div><div><p className="font-semibold text-sm">{p.name}</p><p className="text-xs text-gray-500">{p.relation} {p.fatherName} | {p.mobile} | Age: {p.age}</p></div></div><div className="flex items-center gap-2"><Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">{p.patientNo}</Badge><Badge variant={p.status==='active'?'default':'secondary'} className={p.status==='active'?'bg-emerald-600':''}>{p.status}</Badge><Button size="sm" variant="outline" onClick={()=>setViewPt(p)}><Eye className="w-3 h-3 mr-1" />Details</Button></div></div>))}</div>
      </CardContent></Card>
      <Dialog open={!!viewPt} onOpenChange={()=>setViewPt(null)}><DialogContent><DialogHeader><DialogTitle>Patient Details</DialogTitle></DialogHeader>{viewPt&&(<div className="grid grid-cols-2 gap-3 py-2"><div><Label className="text-xs text-gray-500">Patient No</Label><p className="font-semibold">{viewPt.patientNo}</p></div><div><Label className="text-xs text-gray-500">Name</Label><p className="font-semibold">{viewPt.name}</p></div><div><Label className="text-xs text-gray-500">Father/Husband</Label><p className="font-semibold">{viewPt.relation} {viewPt.fatherName}</p></div><div><Label className="text-xs text-gray-500">Mobile</Label><p className="font-semibold" dir="ltr">{viewPt.mobile}</p></div><div><Label className="text-xs text-gray-500">Age</Label><p className="font-semibold">{viewPt.age} years</p></div><div><Label className="text-xs text-gray-500">Gender</Label><p className="font-semibold">{viewPt.gender}</p></div><div className="col-span-2"><Label className="text-xs text-gray-500">Address</Label><p className="font-semibold">{viewPt.address}</p></div><div><Label className="text-xs text-gray-500">Registered</Label><p className="font-semibold">{viewPt.createdAt}</p></div><div><Label className="text-xs text-gray-500">Last Visit</Label><p className="font-semibold">{viewPt.lastVisit}</p></div><div><Label className="text-xs text-gray-500">Total Visits</Label><p className="font-semibold">{viewPt.totalVisits}</p></div></div>)}<DialogFooter><Button variant="outline" onClick={()=>setViewPt(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

// ===== DOCTORS =====
function DoctorsView() {
  return (<div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{INIT_DOCTORS.map(d=>(<Card key={d.id} className="border-l-4 border-l-emerald-400"><CardContent className="p-4"><div className="flex items-center gap-3 mb-3"><div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center"><Stethoscope className="w-6 h-6 text-emerald-600" /></div><div><p className="font-bold">{d.name}</p><p className="text-xs text-gray-500">{d.specialty}</p></div></div><div className="space-y-2 text-sm"><div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /><span dir="ltr">{d.phone}</span></div><div className="flex items-center justify-between"><span className="text-gray-500">Status:</span><Badge variant={d.status==='available'?'default':d.status==='busy'?'secondary':'outline'} className={d.status==='available'?'bg-emerald-600':d.status==='busy'?'bg-amber-500':''}>{d.status}</Badge></div><div className="flex items-center justify-between"><span className="text-gray-500">Today:</span><span className="font-semibold">{d.patientsToday} patients</span></div></div></CardContent></Card>))}</div></div>);
}

// ===== PHARMACY =====
function PharmacyView({ medSearch, setMedSearch, issueMed, setIssueMed }: any) {
  const filtered = INIT_MEDICINES.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase()) || m.category.toLowerCase().includes(medSearch.toLowerCase()));
  const lowStock = INIT_MEDICINES.filter(m => m.stock < 50);
  return (
    <div className="space-y-4">
      {lowStock.length > 0 && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-3 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-amber-600" /><p className="text-sm text-amber-700 font-medium">{lowStock.length} items low stock!</p></CardContent></Card>}
      <div className="flex items-center gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search medicine..." value={medSearch} onChange={e=>setMedSearch(e.target.value)} className="pl-10" /></div><Badge variant="outline" className="border-emerald-300 text-emerald-700">{filtered.length}</Badge></div>
      <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Pill className="w-5 h-5 text-emerald-600" />Medicine Inventory</CardTitle></CardHeader><CardContent>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-gray-50"><th className="text-left p-2 font-medium text-gray-600">#</th><th className="text-left p-2 font-medium text-gray-600">Name</th><th className="text-left p-2 font-medium text-gray-600">Category</th><th className="text-right p-2 font-medium text-gray-600">Price</th><th className="text-right p-2 font-medium text-gray-600">Stock</th><th className="text-center p-2 font-medium text-gray-600">Action</th></tr></thead><tbody>{filtered.map((m,i)=>(<tr key={m.id} className="border-b hover:bg-gray-50"><td className="p-2 text-gray-500">{i+1}</td><td className="p-2"><p className="font-medium">{m.name}</p><p className="text-xs text-gray-400">{m.genericName}</p></td><td className="p-2"><Badge variant="outline" className="text-xs">{m.category}</Badge></td><td className="p-2 text-right font-medium" dir="ltr">Rs. {m.price}</td><td className="p-2 text-right"><span className={m.stock<50?'text-red-600 font-bold':'text-gray-800'}>{m.stock}</span></td><td className="p-2 text-center"><Button size="sm" variant="outline" onClick={()=>setIssueMed(m)}>Issue</Button></td></tr>))}</tbody></table></div>
      </CardContent></Card>
      <Dialog open={!!issueMed} onOpenChange={()=>setIssueMed(null)}><DialogContent><DialogHeader><DialogTitle>Issue Medicine</DialogTitle></DialogHeader>{issueMed&&(<div className="space-y-3 py-2"><p className="font-semibold">{issueMed.name}</p><p className="text-sm text-gray-500">Rs. {issueMed.price} | Stock: {issueMed.stock}</p><div><Label>Patient Name</Label><Input placeholder="Enter patient name" /></div><div><Label>Quantity</Label><Input type="number" defaultValue={1} min={1} max={issueMed.stock} /></div></div>)}<DialogFooter><Button variant="outline" onClick={()=>setIssueMed(null)}>Cancel</Button><Button onClick={()=>{setIssueMed(null);toast.success('Medicine issued');}} className="bg-emerald-600">Issue</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

// ===== LAB =====
function LabView({ tests, setTests, reportOrder, setReportOrder, reportText, setReportText, handleReportSave }: any) {
  const pending = tests.filter(t=>t.status==='pending').length;
  const inProg = tests.filter(t=>t.status==='in-progress').length;
  const done = tests.filter(t=>t.status==='completed').length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-200"><CardContent className="p-4 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-amber-600" /><div><p className="text-xl font-bold text-amber-700">{pending}</p><p className="text-xs text-gray-500">Pending</p></div></CardContent></Card>
        <Card className="border-blue-200"><CardContent className="p-4 flex items-center gap-3"><Clock className="w-5 h-5 text-blue-600" /><div><p className="text-xl font-bold text-blue-700">{inProg}</p><p className="text-xs text-gray-500">In Progress</p></div></CardContent></Card>
        <Card className="border-emerald-200"><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-600" /><div><p className="text-xl font-bold text-emerald-700">{done}</p><p className="text-xs text-gray-500">Completed</p></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Microscope className="w-5 h-5 text-teal-600" />Lab Tests</CardTitle></CardHeader><CardContent>
        <div className="space-y-2">{tests.map(t=>(<div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"><div><div className="flex items-center gap-2"><p className="font-semibold text-sm">{t.patientName}</p><Badge variant="outline">{t.testType}</Badge></div><p className="text-xs text-gray-500">{t.doctor} | {t.orderedAt}</p>{t.result&&<p className="text-xs text-emerald-600 mt-1">{t.result}</p>}</div><div className="flex items-center gap-2"><Badge variant={t.status==='completed'?'default':t.status==='in-progress'?'secondary':'outline'} className={t.status==='completed'?'bg-emerald-600':t.status==='in-progress'?'bg-blue-500':''}>{t.status}</Badge>{t.status!=='completed'&&<Button size="sm" variant="outline" onClick={()=>setReportOrder(t)}>Report</Button>}{t.status==='pending'&&<Button size="sm" variant="outline" onClick={()=>{setTests(tests.map(x=>x.id===t.id?{...x,status:'in-progress'}:x));toast.success('Started')}}>Start</Button>}</div></div>))}</div>
      </CardContent></Card>
      <Dialog open={!!reportOrder} onOpenChange={()=>setReportOrder(null)}><DialogContent><DialogHeader><DialogTitle>Test Results</DialogTitle></DialogHeader>{reportOrder&&(<div className="space-y-3 py-2"><p className="font-semibold">{reportOrder.patientName} - {reportOrder.testType}</p><div><Label>Results</Label><Textarea value={reportText} onChange={e=>setReportText(e.target.value)} placeholder="Enter test results..." rows={4} /></div></div>)}<DialogFooter><Button variant="outline" onClick={()=>setReportOrder(null)}>Cancel</Button><Button onClick={handleReportSave} className="bg-emerald-600">Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

// ===== XRAY / ULTRASOUND =====
function ServiceOrdersView({ title, icon, orders, reportOrder, setReportOrder, reportText, setReportText, handleReportSave }: any) {
  const pending = orders.filter(o=>o.status==='pending').length;
  const inProg = orders.filter(o=>o.status==='in-progress').length;
  const done = orders.filter(o=>o.status==='completed').length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-200"><CardContent className="p-4 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-amber-600" /><div><p className="text-xl font-bold text-amber-700">{pending}</p><p className="text-xs text-gray-500">Pending</p></div></CardContent></Card>
        <Card className="border-blue-200"><CardContent className="p-4 flex items-center gap-3"><Clock className="w-5 h-5 text-blue-600" /><div><p className="text-xl font-bold text-blue-700">{inProg}</p><p className="text-xs text-gray-500">In Progress</p></div></CardContent></Card>
        <Card className="border-emerald-200"><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-600" /><div><p className="text-xl font-bold text-emerald-700">{done}</p><p className="text-xs text-gray-500">Completed</p></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2">{icon} {title} Orders</CardTitle></CardHeader><CardContent>
        <div className="space-y-2">{orders.map(o=>(<div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"><div><div className="flex items-center gap-2"><p className="font-semibold text-sm">{o.patientName}</p><Badge variant="outline">{o.testType}</Badge></div><p className="text-xs text-gray-500">{o.doctor} | {o.orderedAt}</p>{o.result&&<p className="text-xs text-emerald-600 mt-1">{o.result}</p>}</div><div className="flex items-center gap-2"><Badge variant={o.status==='completed'?'default':o.status==='in-progress'?'secondary':'outline'} className={o.status==='completed'?'bg-emerald-600':o.status==='in-progress'?'bg-blue-500':''}>{o.status}</Badge>{o.status!=='completed'&&<Button size="sm" variant="outline" onClick={()=>setReportOrder(o)}>Report</Button>}</div></div>))}</div>
      </CardContent></Card>
      <Dialog open={!!reportOrder} onOpenChange={()=>setReportOrder(null)}><DialogContent><DialogHeader><DialogTitle>{title} Report</DialogTitle></DialogHeader>{reportOrder&&(<div className="space-y-3 py-2"><p className="font-semibold">{reportOrder.patientName} - {reportOrder.testType}</p><div><Label>Report</Label><Textarea value={reportText} onChange={e=>setReportText(e.target.value)} placeholder={`Enter ${title.toLowerCase()} report...`} rows={4} /></div></div>)}<DialogFooter><Button variant="outline" onClick={()=>setReportOrder(null)}>Cancel</Button><Button onClick={handleReportSave} className="bg-emerald-600">Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

// ===== ACCOUNTS =====
function AccountsView() {
  const paid = INIT_PAYMENTS.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);
  const pending = INIT_PAYMENTS.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0);
  const partial = INIT_PAYMENTS.filter(p=>p.status==='partial').reduce((s,p)=>s+p.amount,0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200"><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xl font-bold text-emerald-700">Rs. {paid.toLocaleString()}</p><p className="text-xs text-gray-500">Paid</p></div></CardContent></Card>
        <Card className="border-amber-200"><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Wallet className="w-5 h-5 text-amber-600" /></div><div><p className="text-xl font-bold text-amber-700">Rs. {pending.toLocaleString()}</p><p className="text-xs text-gray-500">Pending</p></div></CardContent></Card>
        <Card className="border-blue-200"><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-blue-600" /></div><div><p className="text-xl font-bold text-blue-700">Rs. {partial.toLocaleString()}</p><p className="text-xs text-gray-500">Partial</p></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-600" />Payment Records</CardTitle></CardHeader><CardContent>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-gray-50"><th className="text-left p-2">Patient</th><th className="text-right p-2">Amount</th><th className="text-left p-2">Type</th><th className="text-left p-2">Date</th><th className="text-center p-2">Status</th></tr></thead><tbody>{INIT_PAYMENTS.map(p=>(<tr key={p.id} className="border-b hover:bg-gray-50"><td className="p-2 font-medium">{p.patientName}</td><td className="p-2 text-right font-semibold" dir="ltr">Rs. {p.amount.toLocaleString()}</td><td className="p-2"><Badge variant="outline" className="text-xs">{p.type}</Badge></td><td className="p-2 text-gray-600">{p.date}</td><td className="p-2 text-center"><Badge variant={p.status==='paid'?'default':p.status==='partial'?'secondary':'outline'} className={p.status==='paid'?'bg-emerald-600':p.status==='partial'?'bg-amber-500':'text-red-600'}>{p.status}</Badge></td></tr>))}</tbody></table></div>
      </CardContent></Card>
    </div>
  );
}

// ===== SETTINGS =====
function SettingsView() {
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" />System Settings</CardTitle></CardHeader><CardContent className="space-y-4">
        {[{l:'Hospital Name',v:'BAGA Hospital'},{l:'Address',v:'Lahore, Pakistan'},{l:'Contact',v:'0300-1234567'}].map((s,i)=>(<div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><p className="font-medium text-sm">{s.l}</p><p className="text-xs text-gray-500">{s.v}</p></div><Button size="sm" variant="outline">Change</Button></div>))}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-blue-600" />Notifications</CardTitle></CardHeader><CardContent className="space-y-3">
        {[{l:'New Patient Notification',d:true},{l:'Lab Test Notification',d:true},{l:'Payment Notification',d:false}].map((n,i)=>(<div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><Label className="text-sm">{n.l}</Label><Switch defaultChecked={n.d} /></div>))}
      </CardContent></Card>
    </div>
  );
}
