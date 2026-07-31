'use client';

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import AppLogo from './ui/AppLogo';
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
  LineChart,
  TrendingUp,
  IterationCw,
  Radio,
  Package,
  CloudSun,
  MessagesSquare,
  Combine,
  Gauge,
} from 'lucide-react';
import { useExceptions, useSkus } from '../lib/api-hooks';
import { readWorkspaceForecastRun } from '../lib/workspace-forecast';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const { data: exceptions } = useExceptions({ limit: 200 });
  const { data: skuData } = useSkus({ pageSize: 1 });
  const [workspaceContext, setWorkspaceContext] = React.useState<{ workspaceName: string; industry: string; fileName?: string } | null>(null);

  const exceptionCount = exceptions?.filter(e => e.status !== 'resolved' && e.status !== 'dismissed').length ?? 0;
  const skuCount = skuData?.total ?? 0;

  React.useEffect(() => {
    const run = readWorkspaceForecastRun();
    if (run) {
      setWorkspaceContext({
        workspaceName: run.workspaceName || 'Your workspace',
        industry: run.industry || 'custom',
        fileName: run.fileName,
      });
    } else {
      setWorkspaceContext(null);
    }
  }, []);

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Forecast Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      title: 'Monitoring',
      items: [
        { label: 'Exceptions & Alerts', href: '/exceptions', icon: <AlertTriangle size={18} />, badge: exceptionCount },
        { label: 'Model Analytics', href: '/model-analytics', icon: <BarChart3 size={18} /> },
      ],
    },
    {
      title: 'Readiness',
      items: [
        { label: 'Data Maturity', href: '/data-maturity', icon: <Database size={18} /> },
        { label: 'Analytics Maturity', href: '/analytics-maturity', icon: <Gauge size={18} /> },
      ],
    },
    {
      title: 'Forecasting',
      items: [
        { label: 'What-If Scenarios', href: '/scenarios', icon: <FlaskConical size={18} /> },
        { label: 'Simulation Engine', href: '/simulations', icon: <TrendingUp size={18} /> },
        { label: 'Consensus Forecast', href: '/consensus', icon: <Combine size={18} /> },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Walk-Forward Backtest', href: '/backtesting', icon: <IterationCw size={18} /> },
        { label: 'Seasonality Decomp', href: '/seasonal-decomposition', icon: <LineChart size={18} /> },
        { label: 'Demand Sensing', href: '/demand-sensing', icon: <Radio size={18} /> },
        { label: 'External Factors', href: '/external-factors', icon: <CloudSun size={18} /> },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Inventory Optimization', href: '/inventory', icon: <Package size={18} /> },
      ],
    },
    {
      title: 'Data & Setup',
      items: [
        { label: 'Data Sources', href: '/data-sources', icon: <Database size={18} /> },
        { label: 'Configuration', href: '/configuration-panel', icon: <Settings2 size={18} /> },
        { label: 'Onboarding Wizard', href: '/onboarding-wizard', icon: <Wand2 size={18} /> },
      ],
    },
    {
      title: 'Collaboration',
      items: [
        { label: 'Annotations & Overrides', href: '/collaboration', icon: <MessagesSquare size={18} /> },
      ],
    },
    {
      title: 'Integrations',
      items: [
        { label: 'Export / Integrate', href: '/export', icon: <Download size={18} /> },
        { label: 'User Journey', href: '/user-flow', icon: <Map size={18} /> },
      ],
    },
  ];

  const visibleNavGroups = navGroups.map((group) => ({ ...group }));

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
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">ForecastIQ</span>
          )}
        </div>
      </div>

      {/* Workspace pill */}
      {!collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-muted border border-border flex items-center gap-2 shrink-0">
          <Building2 size={14} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {workspaceContext?.workspaceName || 'Your workspace'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {workspaceContext?.industry ? `${workspaceContext.industry.toUpperCase()} · ` : ''}
              {workspaceContext?.fileName ? workspaceContext.fileName : (skuCount > 0 ? `${skuCount} SKUs` : 'Awaiting dataset')}
            </p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-4">
        {visibleNavGroups.map((group) => (
          <div key={`group-${group.title}`}>
            {!collapsed && (
              <p className="section-header px-2 mb-1.5">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={`nav-${item.href}`}>
                  <Link
                    to={item.href}
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
