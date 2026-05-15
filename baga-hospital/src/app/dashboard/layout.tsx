'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  UserPlus,
  Stethoscope,
  Pill,
  FlaskConical,
  Users,
  Settings,
  Clipboard,
  FileText,
  CreditCard,
  Activity,
  Scissors,
  LogOut,
  Menu,
  Shield,
  UserCheck,
  Banknote,
  Beaker,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type UserRole = 'admin' | 'doctor' | 'reception' | 'lab' | 'pharmacy' | 'hr' | 'staff';

interface UserInfo {
  id: number;
  full_name: string;
  username: string;
  role: UserRole;
  hospital_id: number;
}

interface HospitalInfo {
  name: string;
  features: string[];
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

/* ------------------------------------------------------------------ */
/*  Navigation config                                                  */
/* ------------------------------------------------------------------ */

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'reception', 'lab', 'pharmacy', 'hr', 'staff'] },
  { name: 'Patients', href: '/dashboard/patients', icon: Users, roles: ['admin'] },
  { name: 'New Patient', href: '/dashboard/patients/new', icon: UserPlus, roles: ['reception'] },
  { name: 'New Visit', href: '/dashboard/visits/new', icon: Clipboard, roles: ['reception'] },
  { name: 'Visits', href: '/dashboard/visits', icon: Clipboard, roles: ['admin'] },
  { name: 'My Patients', href: '/dashboard/my-patients', icon: Users, roles: ['doctor'] },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard, roles: ['reception'] },
  { name: 'Prescriptions', href: '/dashboard/prescriptions', icon: Pill, roles: ['doctor', 'pharmacy'] },
  { name: 'Doctors', href: '/dashboard/doctors', icon: Stethoscope, roles: ['admin'] },
  { name: 'Pharmacy', href: '/dashboard/pharmacy', icon: Pill, roles: ['admin'] },
  { name: 'Lab Orders', href: '/dashboard/lab-orders', icon: FlaskConical, roles: ['admin', 'doctor', 'lab'] },
  { name: 'Lab Catalog', href: '/dashboard/lab-catalog', icon: Beaker, roles: ['admin', 'lab'] },
  { name: 'HR', href: '/dashboard/hr', icon: UserCheck, roles: ['admin'] },
  { name: 'Employees', href: '/dashboard/employees', icon: Users, roles: ['hr'] },
  { name: 'Salaries', href: '/dashboard/salaries', icon: Banknote, roles: ['admin', 'hr'] },
  { name: 'Surgery', href: '/dashboard/surgery', icon: Scissors, roles: ['admin'] },
  { name: 'Discharge', href: '/dashboard/discharge', icon: Activity, roles: ['doctor'] },
  { name: 'Fee Settlement', href: '/dashboard/fee-settlement', icon: CreditCard, roles: ['admin', 'doctor'] },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText, roles: ['admin'] },
  { name: 'Staff', href: '/dashboard/staff', icon: Settings, roles: ['admin'] },
  { name: 'Staff Notes', href: '/dashboard/staff-notes', icon: StickyNote, roles: ['staff'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin'] },
];

/* ------------------------------------------------------------------ */
/*  Helper: role badge colour                                          */
/* ------------------------------------------------------------------ */

function roleColor(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    doctor: 'bg-blue-100 text-blue-700 border-blue-200',
    reception: 'bg-amber-100 text-amber-700 border-amber-200',
    lab: 'bg-purple-100 text-purple-700 border-purple-200',
    pharmacy: 'bg-pink-100 text-pink-700 border-pink-200',
    hr: 'bg-orange-100 text-orange-700 border-orange-200',
    staff: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return map[role] ?? '';
}

function roleLabel(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/* ------------------------------------------------------------------ */
/*  Sidebar content (shared between desktop + mobile sheet)            */
/* ------------------------------------------------------------------ */

function SidebarNav({
  user,
  hospital,
  onNavigate,
}: {
  user: UserInfo;
  hospital: HospitalInfo;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  const handleLogout = () => {
    localStorage.removeItem('baga_user');
    localStorage.removeItem('baga_hospital');
    router.push('/');
  };

  const navLink = (item: NavItem) => {
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={`
          group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150
          ${
            isActive
              ? 'bg-emerald-100 text-emerald-700 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }
        `}
      >
        <item.icon
          className={`h-4.5 w-4.5 shrink-0 transition-colors ${
            isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'
          }`}
        />
        {item.name}
        {isActive && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-500/20">
          <Shield className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-[160px]">
            {hospital.name}
          </span>
          <span className="text-[11px] text-gray-400 leading-tight">Hospital System</span>
        </div>
      </div>

      <Separator className="mx-3 w-auto" />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {filteredItems.map(navLink)}
      </nav>

      <Separator className="mx-3 w-auto" />

      {/* User info + logout */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            {user.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-gray-800 truncate">{user.full_name}</span>
            <span className="text-[11px] text-gray-400">{roleLabel(user.role)}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const currentPath = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [hospital, setHospital] = useState<HospitalInfo | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('baga_user');
    const h = localStorage.getItem('baga_hospital');
    if (u && h) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading from localStorage on mount
      setUser(JSON.parse(u));
      setHospital(JSON.parse(h));
    } else {
      router.push('/');
    }
    setMounted(true);
  }, [router]);

  if (!mounted || !user || !hospital) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  const pageTitle =
    navItems.find((item) => item.href === currentPath)?.name ?? 'Dashboard';

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-gray-200 bg-white">
        <SidebarNav user={user} hospital={hospital} />
      </aside>

      {/* ---------- Main area ---------- */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 lg:px-6">
          {/* Mobile menu button */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
            </Button>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarNav
                user={user}
                hospital={hospital}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-green-600">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">BAGA</span>
          </div>

          <h1 className="text-lg font-semibold text-gray-800 hidden lg:block">{pageTitle}</h1>

          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className={roleColor(user.role)}>
              {roleLabel(user.role)}
            </Badge>
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                {user.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <span className="font-medium">{user.full_name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
