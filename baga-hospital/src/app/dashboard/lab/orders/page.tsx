'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  PlayCircle,
  Calendar,
  DollarSign,
  TestTubes,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LabOrder {
  id: number;
  order_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  test_ids: number[];
  total_price: number;
  ordered_at: string;
  completed_at?: string | null;
  patient?: { id: number; patient_id: string; full_name: string; phone?: string } | null;
  doctor?: { id: number; full_name: string } | null;
  reports?: Array<Record<string, unknown>>;
  test_names?: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: PlayCircle,
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LabOrdersPage() {
  const router = useRouter();
  const hospitalId = typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  /* ---- Fetch all orders ---- */
  useEffect(() => {
    let cancelled = false;
    if (!hospitalId) return;

    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(`/api/lab-orders?hospital_id=${hospitalId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.orders) setOrders(data.orders);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load lab orders');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hospitalId]);

  /* ---- Filter ---- */
  const filteredOrders = orders.filter((order) => {
    // Status filter
    if (activeTab !== 'all' && order.status !== activeTab) return false;
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        order.order_id?.toLowerCase().includes(q) ||
        order.patient?.full_name?.toLowerCase().includes(q) ||
        order.doctor?.full_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lab Orders</h1>
            <p className="text-sm text-gray-500">
              {orders.length} total orders
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order ID, patient, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v || "")}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="all" className="data-[active]:bg-white">
            All
            <span className="ml-1.5 text-xs text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5 data-[active]:bg-emerald-100 data-[active]:text-emerald-700">
              {counts.all}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[active]:bg-white">
            Pending
            <span className="ml-1.5 text-xs text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5 data-[active]:bg-amber-100 data-[active]:text-amber-700">
              {counts.pending}
            </span>
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="data-[active]:bg-white">
            In Progress
            <span className="ml-1.5 text-xs text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5 data-[active]:bg-blue-100 data-[active]:text-blue-700">
              {counts.in_progress}
            </span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[active]:bg-white">
            Completed
            <span className="ml-1.5 text-xs text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5 data-[active]:bg-emerald-100 data-[active]:text-emerald-700">
              {counts.completed}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* All tabs share the same content with different filtering */}
        {['all', 'pending', 'in_progress', 'completed'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
                <span className="text-sm text-gray-500">Loading lab orders...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
                    <TestTubes className="h-7 w-7 text-emerald-400" />
                  </div>
                  <p className="text-base font-medium text-gray-700 mb-1">No lab orders found</p>
                  <p className="text-sm text-gray-400">
                    {search
                      ? 'Try adjusting your search query'
                      : tab === 'all'
                      ? 'No lab orders yet'
                      : `No ${statusConfig[tab]?.label?.toLowerCase() || tab} orders`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const cfg = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  const isCompleted = order.status === 'completed';

                  return (
                    <Card
                      key={order.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-300 ${
                        isCompleted ? 'opacity-80' : ''
                      }`}
                      onClick={() =>
                        isCompleted
                          ? null
                          : router.push(`/dashboard/lab/report/${order.id}`)
                      }
                    >
                      <CardContent className="p-5">
                        {/* Top: Order ID + Status */}
                        <div className="flex items-start justify-between mb-3">
                          <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {order.order_id}
                          </span>
                          <Badge className={`${cfg.color} shrink-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>

                        {/* Patient & Doctor */}
                        <div className="space-y-1.5 mb-3">
                          <p className="text-base font-semibold text-gray-900 truncate">
                            {order.patient?.full_name || 'Unknown Patient'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Dr. {order.doctor?.full_name || 'N/A'}
                          </p>
                        </div>

                        {/* Tests */}
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Tests Ordered
                          </p>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {order.test_names?.join(', ') ||
                              `${order.test_ids?.length || 0} test(s)`}
                          </p>
                        </div>

                        {/* Bottom: Price + Date */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                            Rs. {(order.total_price || 0).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.ordered_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Action hint */}
                        {!isCompleted && (
                          <div className="mt-3 text-center">
                            <span className="text-xs text-emerald-600 font-medium">
                              Click to enter report
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
