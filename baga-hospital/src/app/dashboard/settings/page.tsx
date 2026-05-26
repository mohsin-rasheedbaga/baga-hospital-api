'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  Key,
  Calendar,
  Building2,
  Phone,
  MapPin,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LicenseInfo {
  licensed: boolean;
  type: string;
  licenseKey: string;
  hospitalName: string;
  address: string;
  phone: string;
  email: string;
  expiryDate: string;
  duration: string;
  activatedAt: string;
  validatedOnline: boolean;
}

/* ------------------------------------------------------------------ */
/*  Settings Page                                                      */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const router = useRouter();
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running inside Electron
    const electronApi = (window as Record<string, unknown>).electronAPI;
    if (electronApi && typeof (electronApi as Record<string, unknown>).getLicenseData === 'function') {
      setIsElectron(true);
    }

    fetchLicenseInfo();
  }, []);

  async function fetchLicenseInfo() {
    try {
      const res = await fetch('/api/license-info');
      if (res.ok) {
        const data = await res.json();
        setLicenseInfo(data);
      } else {
        setLicenseInfo(null);
      }
    } catch (err) {
      console.error('Failed to fetch license info:', err);
      setLicenseInfo(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateLicense() {
    if (!newLicenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }

    setActivating(true);
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: newLicenseKey.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('License activated successfully! Hospital: ' + (data.hospitalName || 'BAGA Hospital'));
        setDialogOpen(false);
        setNewLicenseKey('');
        // Refresh license info
        setTimeout(() => fetchLicenseInfo(), 500);
      } else {
        toast.error(data.error || 'License activation failed');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setActivating(false);
    }
  }

  async function handleOpenLicenseWindow() {
    const electronApi = (window as Record<string, unknown>).electronAPI as Record<string, () => Promise<unknown>> | undefined;
    if (electronApi && typeof electronApi.openLicenseWindow === 'function') {
      await electronApi.openLicenseWindow();
    } else {
      // Fallback: open the dialog
      setDialogOpen(true);
    }
  }

  const isExpired =
    licenseInfo?.expiryDate &&
    licenseInfo?.duration !== 'lifetime' &&
    new Date(licenseInfo.expiryDate) < new Date();

  function getDurationDisplay() {
    if (!licenseInfo) return 'N/A';
    if (licenseInfo.duration === 'lifetime') return 'Lifetime';
    let text = licenseInfo.duration || 'N/A';
    if (licenseInfo.expiryDate && licenseInfo.duration !== 'lifetime') {
      text += ' (Until ' + new Date(licenseInfo.expiryDate).toLocaleDateString() + ')';
    }
    return text;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your license and system settings</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-sm text-gray-400">Loading settings...</span>
          </div>
        </div>
      ) : (
        <>
          {/* License Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    <Shield className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">License Information</CardTitle>
                    <CardDescription>Current license status and details</CardDescription>
                  </div>
                </div>
                {licenseInfo?.licensed && (
                  <Badge
                    variant="outline"
                    className={
                      isExpired
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }
                  >
                    {isExpired ? 'Expired' : 'Active'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {licenseInfo?.licensed ? (
                <div className="space-y-4">
                  {/* License details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                      <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Hospital Name</p>
                        <p className="text-sm font-medium text-gray-800">{licenseInfo.hospitalName || 'BAGA Hospital'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                      <Key className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">License Key</p>
                        <p className="text-sm font-mono font-medium text-gray-800">{licenseInfo.licenseKey || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                      <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Duration</p>
                        <p className="text-sm font-medium text-gray-800">{getDurationDisplay()}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                      <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Activated On</p>
                        <p className="text-sm font-medium text-gray-800">
                          {licenseInfo.activatedAt
                            ? new Date(licenseInfo.activatedAt).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {licenseInfo.address && (
                      <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">Address</p>
                          <p className="text-sm font-medium text-gray-800">{licenseInfo.address}</p>
                        </div>
                      </div>
                    )}
                    {licenseInfo.phone && (
                      <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                        <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">Phone</p>
                          <p className="text-sm font-medium text-gray-800">{licenseInfo.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleOpenLicenseWindow}
                      className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Change License
                    </Button>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-amber-500" />
                            Activate New License
                          </DialogTitle>
                          <DialogDescription>
                            Enter your new license key. This will replace the current license.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <label htmlFor="newLicenseKey" className="text-sm font-medium text-gray-700">
                              New License Key
                            </label>
                            <Input
                              id="newLicenseKey"
                              placeholder="BAGA-XXXXX-XXXXX"
                              value={newLicenseKey}
                              onChange={(e) => setNewLicenseKey(e.target.value)}
                              className="font-mono"
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button
                              onClick={handleActivateLicense}
                              disabled={activating || !newLicenseKey.trim()}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            >
                              {activating ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Validating...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setDialogOpen(false);
                                setNewLicenseKey('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 mb-4">
                    <AlertTriangle className="h-7 w-7 text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No Active License</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">
                    Please activate a license to use all features
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleOpenLicenseWindow}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      <Key className="h-4 w-4" />
                      Activate License
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* License Info for Trial */}
          {licenseInfo && licenseInfo.type === 'trial' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Trial Period</CardTitle>
                    <CardDescription>Free trial license information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3">
                  <div className="flex-1">
                    <p className="text-xs text-blue-500">Your 3-day trial is active</p>
                    <p className="text-sm font-medium text-blue-700">
                      Activate a license key for continued access
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={handleOpenLicenseWindow}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <Key className="h-4 w-4" />
                    Activate License
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <Shield className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-base">System Information</CardTitle>
                  <CardDescription>BAGA Hospital Management System details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Application</span>
                  <span className="font-medium text-gray-800">BAGA Hospital Management System</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">Version</span>
                  <span className="font-medium text-gray-800">2.4.0</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">Environment</span>
                  <span className="font-medium text-gray-800">{isElectron ? 'Desktop (Electron)' : 'Web Browser'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
