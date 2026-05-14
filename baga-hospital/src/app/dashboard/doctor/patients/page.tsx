'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Users,
  Clock,
  Stethoscope,
  Activity,
} from 'lucide-react';

interface TodayVisit {
  id: number;
  visit_id: string;
  visit_type: string;
  consultation_fee: number;
  emergency_fee: number;
  total_fee: number;
  hospital_charges: number;
  status: string;
  visit_date: string;
  created_at: string;
  notes?: string;
  doctor_id?: number;
  patient: {
    id: number;
    patient_id: string;
    full_name: string;
    phone?: string;
    gender?: string;
    age?: number;
  } | null;
  doctor: {
    id: number;
    user_id?: number;
    full_name: string;
    specialization?: string;
  } | null;
}

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

const visitTypeColor: Record<string, string> = {
  opd: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  emergency: 'bg-red-50 text-red-700 border-red-200',
  followup: 'bg-blue-50 text-blue-700 border-blue-200',
};

const visitTypeLabel: Record<string, string> = {
  opd: 'OPD',
  emergency: 'Emergency',
  followup: 'Follow-up',
};

export default function DoctorPatientsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<TodayVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const userData = typeof window !== 'undefined' ? getUserData() : {};
  const hospitalId = userData.hospital_id;
  const userId = userData.id;
  const userRole = userData.role;
  const isDoctor = userRole === 'doctor';

  useEffect(() => {
    const fetchTodayVisits = async () => {
      if (!hospitalId) return;
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(
          `/api/visits?hospital_id=${hospitalId}&date=${today}&status=active`
        );
        const data = await res.json();
        if (res.ok) {
          let filtered = data.visits || [];
          if (isDoctor) {
            filtered = filtered.filter(
              (v: TodayVisit) => v.doctor?.user_id === userId
            );
          }
          setVisits(filtered);
        } else {
          toast.error(data.error || 'Failed to fetch visits');
        }
      } catch {
        toast.error("Failed to fetch today's visits");
      } finally {
        setLoading(false);
      }
    };
    fetchTodayVisits();
  }, [hospitalId, userId, isDoctor]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const opdCount = visits.filter((v) => v.visit_type === 'opd').length;
  const emergencyCount = visits.filter((v) => v.visit_type === 'emergency').length;
  const totalFees = visits.reduce((sum, v) => sum + v.total_fee, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isDoctor ? "Today's Patients" : "Today's All Visits"}
          </h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? (
                  <Skeleton className="h-7 w-6 inline-block" />
                ) : (
                  visits.length
                )}
              </p>
              <p className="text-xs text-gray-500">Total Patients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? (
                  <Skeleton className="h-7 w-6 inline-block" />
                ) : (
                  opdCount
                )}
              </p>
              <p className="text-xs text-gray-500">OPD</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <Activity className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? (
                  <Skeleton className="h-7 w-6 inline-block" />
                ) : (
                  emergencyCount
                )}
              </p>
              <p className="text-xs text-gray-500">Emergency</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? (
                  <Skeleton className="h-7 w-10 inline-block" />
                ) : (
                  totalFees.toLocaleString()
                )}
              </p>
              <p className="text-xs text-gray-500">Total Fees (Rs.)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-px w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Users className="h-12 w-12 mb-4 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">No patients today</p>
            <p className="text-xs text-gray-400 mt-1">
              New visits will appear here as patients are registered
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visits.map((visit) => (
            <Card
              key={visit.id}
              className="cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all hover:shadow-md"
              onClick={() =>
                router.push(`/dashboard/doctor/prescribe/${visit.id}`)
              }
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {visit.patient?.full_name || 'Unknown'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {visit.patient?.patient_id || ''}
                      {visit.patient?.age
                        ? ` | ${visit.patient.age} yrs`
                        : ''}
                      {visit.patient?.gender
                        ? ` | ${visit.patient.gender}`
                        : ''}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      visitTypeColor[visit.visit_type] ||
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }
                  >
                    {visitTypeLabel[visit.visit_type] || visit.visit_type}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-mono">
                    Visit: {visit.visit_id}
                  </span>
                  <span>
                    {new Date(visit.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {visit.doctor?.full_name || 'No Doctor'}
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    Rs. {visit.total_fee.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
