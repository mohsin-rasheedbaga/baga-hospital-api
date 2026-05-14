'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  DollarSign,
  Stethoscope,
  FlaskConical,
  UserPlus,
  ClipboardList,
  Activity,
  TrendingUp,
  Loader2,
  CalendarDays,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardStats {
  todayVisits: number;
  todayNewPatients: number;
  totalActivePatients: number;
  todayRevenue: number;
  pendingDoctorFees: number;
  pendingDoctorFeesAmount: number;
  pendingLabOrders: number;
  activeDoctors: number;
}

interface VisitRecord {
  id: number;
  visit_id: string;
  visit_type: 'opd' | 'emergency' | 'followup';
  status: 'active' | 'discharged';
  visit_date: string;
  total_fee: number;
  created_at: string;
  patient?: { id: number; patient_id: string; full_name: string; phone: string; gender: string } | null;
  doctor?: { id: number; full_name: string; specialization: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Visit type badge                                                   */
/* ------------------------------------------------------------------ */

function VisitTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    opd: 'bg-blue-50 text-blue-700 border-blue-200',
    emergency: 'bg-red-50 text-red-700 border-red-200',
    followup: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <Badge variant="outline" className={styles[type] ?? 'bg-gray-50 text-gray-600 border-gray-200'}>
      {type === 'opd' ? 'OPD' : type === 'emergency' ? 'Emergency' : 'Follow-up'}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Discharged
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard page                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hospitalId, setHospitalId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const u = localStorage.getItem('baga_user');
    if (u) {
      const user = JSON.parse(u);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading from localStorage on mount
      setHospitalId(user.hospital_id);
      setUserRole(user.role);
    }
  }, []);

  useEffect(() => {
    if (!hospitalId) return;

    async function fetchData() {
      try {
        const [statsRes, visitsRes] = await Promise.all([
          fetch(`/api/dashboard/stats?hospital_id=${hospitalId}`),
          fetch(`/api/visits?hospital_id=${hospitalId}`),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (visitsRes.ok) {
          const visitsData = await visitsRes.json();
          // Only show today's visits
          const today = new Date().toISOString().split('T')[0];
          const todayVisits = (visitsData.visits || []).filter(
            (v: VisitRecord) => v.visit_date === today
          );
          setVisits(todayVisits);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [hospitalId]);

  const canCreate = ['admin', 'reception'].includes(userRole);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-sm text-gray-400">Loading dashboard...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Today's Patients"
              value={stats?.todayVisits ?? 0}
              subtitle={`${stats?.todayNewPatients ?? 0} new registrations`}
              icon={Users}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              title="Today's Revenue"
              value={`Rs ${(stats?.todayRevenue ?? 0).toLocaleString()}`}
              subtitle={`${stats?.todayVisits ?? 0} visits today`}
              icon={DollarSign}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatCard
              title="Active Doctors"
              value={stats?.activeDoctors ?? 0}
              subtitle={`${stats?.pendingDoctorFees ?? 0} pending settlements`}
              icon={Stethoscope}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
            <StatCard
              title="Pending Lab Tests"
              value={stats?.pendingLabOrders ?? 0}
              subtitle="Awaiting results"
              icon={FlaskConical}
              iconBg="bg-orange-50"
              iconColor="text-orange-600"
            />
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Active Patients"
              value={stats?.totalActivePatients ?? 0}
              icon={Activity}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatCard
              title="Pending Doctor Fees"
              value={`Rs ${(stats?.pendingDoctorFeesAmount ?? 0).toLocaleString()}`}
              subtitle={`${stats?.pendingDoctorFees ?? 0} records`}
              icon={TrendingUp}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <StatCard
              title="Lab Orders"
              value={stats?.pendingLabOrders ?? 0}
              subtitle="Pending completion"
              icon={FlaskConical}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
            />
          </div>

          {/* Quick actions */}
          {canCreate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription>Common tasks you can perform right away</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => router.push('/dashboard/patients/new')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    New Patient
                  </Button>
                  <Button
                    onClick={() => router.push('/dashboard/visits/new')}
                    variant="outline"
                    className="gap-2"
                  >
                    <ClipboardList className="h-4 w-4" />
                    New Visit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's visits */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Today&apos;s Visits</CardTitle>
                  <CardDescription>
                    {visits.length} visit{visits.length !== 1 ? 's' : ''} today
                  </CardDescription>
                </div>
                {visits.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {visits.filter((v) => v.status === 'active').length} active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {visits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                    <ClipboardList className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No visits today</p>
                  <p className="text-xs text-gray-400 mt-1">Visits will appear here as they are created</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visit ID</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Doctor</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Fee</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visits.map((visit) => (
                        <TableRow key={visit.id} className="cursor-pointer hover:bg-emerald-50/40 transition-colors">
                          <TableCell className="font-mono text-xs text-gray-600">{visit.visit_id}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm text-gray-900">{visit.patient?.full_name ?? '—'}</p>
                              <p className="text-xs text-gray-400">{visit.patient?.phone ?? ''}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <p className="text-sm text-gray-700">{visit.doctor?.full_name ?? '—'}</p>
                            <p className="text-xs text-gray-400">{visit.doctor?.specialization ?? ''}</p>
                          </TableCell>
                          <TableCell>
                            <VisitTypeBadge type={visit.visit_type} />
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-medium text-sm text-gray-700">
                            Rs {visit.total_fee.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={visit.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
