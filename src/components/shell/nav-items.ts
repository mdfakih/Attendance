import type { FeatureKey, PermissionModule } from '@attendance/contracts';

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: string;
  readonly module?: PermissionModule;
  readonly adminOnly?: boolean;
  readonly feature?: FeatureKey;
}

export interface NavSection {
  readonly title?: string;
  readonly items: readonly NavItem[];
}

export const NAV: readonly NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'dashboard', module: 'DASHBOARD' },
      { label: 'Live map', href: '/live-map', icon: 'map', module: 'DASHBOARD' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Employees', href: '/employees', icon: 'people', module: 'EMPLOYEES' },
      { label: 'Devices', href: '/devices', icon: 'phone', module: 'DEVICES' },
      { label: 'Bulk upload', href: '/employees/import', icon: 'upload', module: 'EMPLOYEES' },
    ],
  },
  {
    title: 'Attendance',
    items: [
      { label: 'Daily', href: '/attendance/daily', icon: 'today', module: 'ATTENDANCE' },
      { label: 'Monthly register', href: '/attendance/register', icon: 'grid', module: 'ATTENDANCE' },
      { label: 'Leave requests', href: '/leave', icon: 'leave', module: 'LEAVE', feature: 'LEAVE' },
      { label: 'Extra time requests', href: '/attendance/extra-time', icon: 'timer', module: 'ATTENDANCE' },
    ],
  },
  {
    title: 'Pay',
    items: [
      { label: 'Salary register', href: '/pay', icon: 'money', module: 'PAY' },
      { label: 'Exports', href: '/exports', icon: 'download', module: 'REPORTS' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { label: 'Branches & departments', href: '/setup/org', icon: 'business', module: 'SETTINGS' },
      { label: 'Sites & geofences', href: '/setup/sites', icon: 'place', module: 'SITES' },
      { label: 'Shifts & policies', href: '/setup/shifts', icon: 'schedule', module: 'SHIFTS' },
      { label: 'Holidays & weekly offs', href: '/setup/calendar', icon: 'event', module: 'CALENDAR' },
      { label: 'Leave types', href: '/setup/leave-types', icon: 'leave', module: 'LEAVE_SETUP', feature: 'LEAVE' },
      { label: 'Users & roles', href: '/users', icon: 'admin', adminOnly: true },
      { label: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
    ],
  },
];
