'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Printer, Tag } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LabOrder {
  id: number;
  order_id: string;
  status: string;
  test_ids: number[];
  total_price: number;
  ordered_at: string;
  patient?: { id: number; patient_id: string; full_name: string; phone?: string; age?: number; gender?: string } | null;
  doctor?: { id: number; full_name: string } | null;
}

interface LabTestCatalogItem {
  id: number;
  test_name: string;
  test_code?: string;
  category?: string;
}

interface StickerData {
  patientName: string;
  patientId: string;
  testName: string;
  testCode?: string;
  date: string;
  order_id: string;
  hospitalName: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

function getHospitalName(): string {
  if (typeof window === 'undefined') return 'BAGA Hospital';
  try {
    const h = JSON.parse(localStorage.getItem('baga_hospital') || '{}');
    return h.name || 'BAGA Hospital';
  } catch {
    return 'BAGA Hospital';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LabStickersPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const hospitalId = typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [stickers, setStickers] = useState<StickerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId || !orderId) return;

    Promise.all([
      fetch(`/api/lab-orders?hospital_id=${hospitalId}`),
      fetch(`/api/lab/catalog?hospital_id=${hospitalId}`),
    ])
      .then(([orderRes, catalogRes]) =>
        Promise.all([orderRes.json(), catalogRes.json()])
      )
      .then(([orderData, catalogData]) => {
        const found = (orderData.orders || []).find(
          (o: LabOrder) => String(o.id) === orderId
        );
        if (!found) {
          toast.error('Lab order not found');
          router.push('/dashboard/lab/orders');
          return;
        }

        const tests = catalogData.tests || [];
        const hospitalName = getHospitalName();
        const dateStr = new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        const result: StickerData[] = (found.test_ids || []).map((tid: number) => {
          const catItem = tests.find((t: LabTestCatalogItem) => t.id === tid);
          return {
            patientName: found.patient?.full_name || 'Unknown',
            patientId: found.patient?.patient_id || 'N/A',
            testName: catItem?.test_name || `Test #${tid}`,
            testCode: catItem?.test_code,
            date: dateStr,
            order_id: found.order_id,
            hospitalName,
          };
        });

        setStickers(result);
      })
      .catch(() => {
        toast.error('Failed to load sticker data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hospitalId, orderId, router]);

  const handlePrint = () => {
    window.print();
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
        <span className="text-sm text-gray-500">Loading stickers...</span>
      </div>
    );
  }

  if (stickers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Tag className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No sticker data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - hidden during print */}
      <div className="print:hidden flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => router.push('/dashboard/lab/orders')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lab Stickers</h1>
            <p className="text-sm text-gray-500">
              {stickers.length} sticker{stickers.length !== 1 ? 's' : ''} for printing
            </p>
          </div>
        </div>

        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Stickers
        </Button>
      </div>

      {/* Stickers Grid */}
      <div id="sticker-area" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stickers.map((sticker, idx) => (
          <div
            key={idx}
            className="sticker-card bg-white border-2 border-gray-300 rounded-lg p-4"
            style={{
              width: '100%',
              maxWidth: '3in',
              minHeight: '2in',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {/* Hospital name */}
            <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
              <p className="text-xs font-bold text-gray-700 tracking-wider uppercase">
                {sticker.hospitalName}
              </p>
            </div>

            {/* Patient Name - Large & Bold */}
            <div className="text-center mb-2">
              <p className="text-lg font-bold text-gray-900 leading-tight" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {sticker.patientName}
              </p>
            </div>

            {/* Patient ID */}
            <div className="text-center mb-2">
              <p className="text-xs text-gray-500">
                ID: <span className="font-bold text-gray-800 text-sm">{sticker.patientId}</span>
              </p>
            </div>

            {/* Test Name - Bold */}
            <div className="text-center border-t border-dashed border-gray-400 pt-2 mb-2">
              <p className="text-sm font-bold text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {sticker.testName}
              </p>
              {sticker.testCode && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {sticker.testCode}
                </p>
              )}
            </div>

            {/* Date + Order ID */}
            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-dashed border-gray-400 pt-2">
              <span>{sticker.date}</span>
              <span className="font-mono text-[10px]">{sticker.order_id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0;
            padding: 0.5in;
          }

          /* Hide everything except stickers */
          header,
          aside,
          nav,
          .print\\:hidden,
          #sticker-area ~ * {
            display: none !important;
          }

          /* Show sticker area */
          #sticker-area {
            display: grid !important;
            grid-template-columns: repeat(3, 3in) !important;
            gap: 0.25in !important;
            justify-content: center !important;
          }

          /* Fix sticker sizing for print */
          .sticker-card {
            width: 3in !important;
            min-height: 2in !important;
            max-width: 3in !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
          }

          /* Remove any rounded corners for print */
          .sticker-card {
            border-radius: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
