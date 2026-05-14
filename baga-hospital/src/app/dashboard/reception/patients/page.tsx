'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Search, Users, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Patient {
  id: number;
  patient_id: string;
  full_name: string;
  age?: number;
  gender?: string;
  phone?: string;
  blood_group?: string;
  created_at: string;
}

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

export default function PatientListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;
  const hospitalId = typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    let cancelled = false;
    if (!hospitalId) return;

    // Schedule loading state asynchronously to satisfy react-hooks/set-state-in-effect
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    const params = new URLSearchParams({
      hospital_id: String(hospitalId),
      page: String(page),
      limit: String(limit),
    });
    if (search.trim()) params.set('search', search.trim());

    fetch(`/api/patients?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.patients) setPatients(data.patients);
        if (data.total !== undefined) setTotal(data.total);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to fetch patients');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hospitalId, page, search]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon-sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
            <p className="text-sm text-gray-500">{total} total patients</p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, ID, phone..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No patients found</p>
              <p className="text-xs">Try adjusting your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Age</TableHead>
                    <TableHead className="hidden md:table-cell">Gender</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Blood Group</TableHead>
                    <TableHead className="hidden md:table-cell">Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.patient_id}</TableCell>
                      <TableCell>
                        <button
                          className="text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                          onClick={() => router.push(`/dashboard/doctor/history/${p.id}`)}
                        >
                          {p.full_name}
                        </button>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{p.age || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {p.gender && (
                          <Badge variant="outline" className="text-xs">
                            {p.gender}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{p.phone || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {p.blood_group && (
                          <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
                            {p.blood_group}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} records)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">{page}</span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
