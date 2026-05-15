'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

export default function RegisterPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    age: '',
    gender: '',
    phone: '',
    address: '',
    blood_group: '',
    cnic: '',
    emergency_contact: '',
    emergency_phone: '',
  });

  const handleChange = (field: string, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value || '' }));
  };

  const resetForm = () => {
    setForm({
      full_name: '',
      age: '',
      gender: '',
      phone: '',
      address: '',
      blood_group: '',
      cnic: '',
      emergency_contact: '',
      emergency_phone: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error('Patient full name is required');
      return;
    }

    setLoading(true);
    try {
      const userData = getUserData();
      const hospitalId = userData.hospital_id;

      if (!hospitalId) {
        toast.error('Hospital information not found. Please log in again.');
        return;
      }

      const payload = {
        hospital_id: hospitalId,
        full_name: form.full_name.trim(),
        age: form.age ? parseInt(form.age, 10) : null,
        gender: form.gender || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        blood_group: form.blood_group || null,
        cnic: form.cnic.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to register patient');
        return;
      }

      toast.success(`Patient registered successfully — ID: ${data.patient?.patient_id}`);
      resetForm();
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900">Register New Patient</h1>
          <p className="text-sm text-gray-500">Fill in the patient details below</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                placeholder="Enter patient's full name"
                value={form.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                required
              />
            </div>

            {/* Row: Age + Gender */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="0"
                  max="150"
                  placeholder="Enter age"
                  value={form.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => handleChange('gender', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row: Phone + CNIC */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="03XX-XXXXXXX"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnic">CNIC</Label>
                <Input
                  id="cnic"
                  placeholder="XXXXX-XXXXXXX-X"
                  value={form.cnic}
                  onChange={(e) => handleChange('cnic', e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Enter full address"
                rows={2}
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            {/* Row: Blood Group */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Blood Group</Label>
                <Select value={form.blood_group} onValueChange={(v) => handleChange('blood_group', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUP_OPTIONS.map((bg) => (
                      <SelectItem key={bg} value={bg}>
                        {bg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Contact Name</Label>
                  <Input
                    id="emergency_contact"
                    placeholder="Emergency contact name"
                    value={form.emergency_contact}
                    onChange={(e) => handleChange('emergency_contact', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Contact Phone</Label>
                  <Input
                    id="emergency_phone"
                    type="tel"
                    placeholder="Emergency contact phone"
                    value={form.emergency_phone}
                    onChange={(e) => handleChange('emergency_phone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Register Patient
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={loading}
              >
                Reset Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
