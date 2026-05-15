'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Search,
  ClipboardList,
  UserCircle,
  Send,
  StickyNote,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Patient {
  id: number;
  patient_id: string;
  full_name: string;
  phone?: string;
}

interface Visit {
  id: number;
  visit_id: string;
  visit_type: string;
  doctor?: { full_name: string } | null;
}

interface StaffNote {
  id: number;
  note_type: string;
  content: string;
  created_at: string;
  staff: {
    id: number;
    full_name: string;
    role: string | null;
  } | null;
}

const NOTE_TYPES = ['General', 'X-Ray', 'Report', 'Observation'];

function getNoteTypeBadge(type: string) {
  switch (type) {
    case 'general':
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
          General
        </Badge>
      );
    case 'x-ray':
      return (
        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
          X-Ray
        </Badge>
      );
    case 'report':
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          Report
        </Badge>
      );
    case 'observation':
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
          Observation
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {type}
        </Badge>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function StaffNotesPage() {
  const router = useRouter();
  const hospitalId =
    typeof window !== 'undefined' ? getUserData().hospital_id : null;
  const userId = typeof window !== 'undefined' ? getUserData().id : null;

  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState('');

  const [noteType, setNoteType] = useState('general');
  const [noteContent, setNoteContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  /* ---- Search patients ---- */
  const searchPatients = useCallback(
    async (query: string) => {
      if (!hospitalId || !query.trim()) {
        setPatients([]);
        return;
      }
      setSearchingPatients(true);
      try {
        const res = await fetch(
          `/api/patients?hospital_id=${hospitalId}&search=${encodeURIComponent(query.trim())}&limit=10`
        );
        const data = await res.json();
        if (res.ok) setPatients(data.patients || []);
      } catch {
        // silent
      } finally {
        setSearchingPatients(false);
      }
    },
    [hospitalId]
  );

  useEffect(() => {
    const timer = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(timer);
  }, [patientSearch, searchPatients]);

  /* ---- Fetch visits for selected patient ---- */
  useEffect(() => {
    const loadVisits = async () => {
      if (!selectedPatient || !hospitalId) return;
      try {
        const res = await fetch(`/api/visits?hospital_id=${hospitalId}`);
        const data = await res.json();
        if (res.ok) {
          const patientVisits = (data.visits || [])
            .filter(
              (v: { patient: { id: number } | null }) =>
                v.patient?.id === selectedPatient.id
            )
            .map(
              (v: {
                id: number;
                visit_id: string;
                visit_type: string;
                doctor: { full_name: string } | null;
              }) => ({
                id: v.id,
                visit_id: v.visit_id,
                visit_type: v.visit_type,
                doctor: v.doctor,
              })
            );
          setVisits(patientVisits);
          if (patientVisits.length > 0) {
            setSelectedVisitId(String(patientVisits[0].id));
          }
        }
      } catch {
        // silent
      }
    };
    loadVisits();
  }, [selectedPatient, hospitalId]);

  /* ---- Fetch notes for selected patient ---- */
  useEffect(() => {
    let cancelled = false;
    if (!selectedPatient || !hospitalId) {
      Promise.resolve().then(() => {
        if (!cancelled) setNotes([]);
      });
      return;
    }

    Promise.resolve().then(() => {
      if (!cancelled) setLoadingNotes(true);
    });

    const params = new URLSearchParams({
      hospital_id: String(hospitalId),
      patient_id: String(selectedPatient.id),
    });

    fetch(`/api/staff-notes?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.notes) setNotes(data.notes);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to fetch notes');
      })
      .finally(() => {
        if (!cancelled) setLoadingNotes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPatient, hospitalId, fetchKey]);

  /* ---- Submit note ---- */
  const handleSubmit = async () => {
    if (!selectedPatient || !selectedVisitId || !noteContent.trim()) {
      toast.error('Patient, visit, and content are required');
      return;
    }
    if (!userId) {
      toast.error('You must be logged in');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: hospitalId,
          patient_id: selectedPatient.id,
          visit_id: parseInt(selectedVisitId, 10),
          staff_id: userId,
          note_type: noteType.toLowerCase(),
          content: noteContent.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Note added successfully');
        setNoteContent('');
        setFetchKey((k) => k + 1);
      } else {
        toast.error(data.error || 'Failed to add note');
      }
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

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
          <h1 className="text-2xl font-bold text-gray-900">Staff Notes</h1>
          <p className="text-sm text-gray-500">
            Add and view clinical notes for patients
          </p>
        </div>
      </div>

      {/* Patient Search */}
      <Card>
        <CardContent className="p-4">
          {selectedPatient ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <span className="text-sm font-bold text-emerald-700">
                    {selectedPatient.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPatient.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedPatient.patient_id} |{' '}
                    {selectedPatient.phone || 'No phone'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientSearch('');
                  setVisits([]);
                  setSelectedVisitId('');
                }}
              >
                Change Patient
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search patient by name, ID, or phone..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  className="pl-10"
                />
                {searchingPatients && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              {showPatientDropdown && patients.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                      onClick={() => {
                        setSelectedPatient(p);
                        setShowPatientDropdown(false);
                      }}
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {p.full_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.patient_id} | {p.phone || 'No phone'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Form */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-gray-900">
              <StickyNote className="h-5 w-5 text-emerald-600" />
              Add New Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Note Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Note Type
                </Label>
                <Select value={noteType} onValueChange={(v) => setNoteType(v || "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((type) => (
                      <SelectItem key={type.toLowerCase()} value={type.toLowerCase()}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visit Select */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Visit
                </Label>
                <Select value={selectedVisitId} onValueChange={(v) => setSelectedVisitId(v || "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select visit" />
                  </SelectTrigger>
                  <SelectContent>
                    {visits.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.visit_id} — {v.visit_type.toUpperCase()}
                        {v.doctor ? ` (${v.doctor.full_name})` : ''}
                      </SelectItem>
                    ))}
                    {visits.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No visits found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="note_content" className="text-sm font-medium text-gray-700">
                Note Content
              </Label>
              <Textarea
                id="note_content"
                placeholder="Enter your clinical notes here..."
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSubmit}
                disabled={submitting || !noteContent.trim() || !selectedVisitId}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Notes */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-gray-900">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              Notes for {selectedPatient.full_name}
              {notes.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-gray-50"
                >
                  {notes.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingNotes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FileText className="h-10 w-10 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No notes yet</p>
                <p className="text-xs">
                  Add the first note for this patient above
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getNoteTypeBadge(note.note_type)}
                        {note.staff && (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <UserCircle className="h-3.5 w-3.5" />
                            {note.staff.full_name}
                            {note.staff.role && (
                              <span className="text-xs text-gray-400">
                                ({note.staff.role})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
