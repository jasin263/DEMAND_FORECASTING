'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard,
  Wand2,
  Settings2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  Database,
  Download,
  FlaskConical,
  Building2,
  Map,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Core',
    items: [
      {
        label: 'Forecast Dashboard',
        href: '/',
        icon: <LayoutDashboard size={18} />,
      },
      {
        label: 'Exceptions & Alerts',
        href: '/exceptions',
        icon: <AlertTriangle size={18} />,
        badge: 7,
      },
      {
        label: 'What-If Scenarios',
        href: '/scenarios',
        icon: <FlaskConical size={18} />,
      },
    ],
  },
  {
    title: 'Setup',
    items: [
      {
        label: 'Onboarding Wizard',
        href: '/onboarding-wizard',
        icon: <Wand2 size={18} />,
      },
      {
        label: 'Configuration',
        href: '/configuration-panel',
        icon: <Settings2 size={18} />,
      },
      {
        label: 'Data Sources',
        href: '/data-sources',
        icon: <Database size={18} />,
      },
      {
        label: 'User Journey',
        href: '/user-flow',
        icon: <Map size={18} />,
      },
    ],
  },
  {
    title: 'Output',
    items: [
      {
        label: 'Export / Integrate',
        href: '/export',
        icon: <Download size={18} />,
      },
      {
        label: 'Model Analytics',
        href: '/model-analytics',
        icon: <BarChart3 size={18} />,
      },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out overflow-hidden"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <AppLogo size={28} />
          {!collapsed && (
            <span className="font-semibold text-sm text-foreground tracking-tight truncate">
              ForecastIQ
            </span>
          )}
        </div>
      </div>

      {/* Workspace pill */}
      {!collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-muted border border-border flex items-center gap-2 shrink-0">
          <Building2 size={14} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">Nestle FMCG Demo</p>
            <p className="text-xs text-muted-foreground">FMCG · 342 SKUs</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={`group-${group.title}`}>
            {!collapsed && (
              <p className="section-header px-2 mb-1.5">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={`nav-${item.href}`}>
                  <Link
                    href={item.href}
                    className={isActive(item.href) ? 'nav-item-active' : 'nav-item'}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="status-badge bg-warning/10 text-warning font-tabular">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && item.badge !== undefined && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-warning" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2 shrink-0">
        <button
          onClick={onToggle}
          className="btn-ghost w-full justify-center"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}