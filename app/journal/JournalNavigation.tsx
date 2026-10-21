"use client";

import { useEffect, useState } from "react";
import { ArrowLeftToLine, ArrowRightFromLine, BarChart3, BookOpen, CalendarDays, FolderClosed, House, LayoutDashboard, LogOut, Menu, Plus, ShieldCheck, Trash2, X } from "lucide-react";

type Props = {
  active: "home" | "dashboard" | "quality" | "files" | "trash";
  onNewTrade?: () => void;
  onSecurity?: () => void;
  onLogout?: () => void;
};

const links = [
  { key: "home", label: "Home", href: "/journal/home", icon: House },
  { key: "dashboard", label: "Dashboard", href: "/journal", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", href: "/journal#calendar", icon: CalendarDays },
  { key: "trades", label: "Trade Log", href: "/journal#trades", icon: BookOpen },
  { key: "quality", label: "Quality", href: "/journal/quality", icon: BarChart3 },
  { key: "analytics", label: "Exit Analysis", href: "/journal#analytics", icon: BarChart3 },
  { key: "files", label: "Device Files", href: "/journal/device-files", icon: FolderClosed },
  { key: "trash", label: "Trash", href: "/journal/trash", icon: Trash2 },
];

export default function JournalNavigation({ active, onNewTrade, onSecurity, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen]);

  async function logout() {
    if (onLogout) return onLogout();
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) window.location.href = "/";
  }

  return <>
    <button className="workspace-menu-toggle icon-button" type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} aria-controls="workspace-navigation" onClick={() => setMobileOpen(!mobileOpen)}>
      {mobileOpen ? <X size={18} /> : <Menu size={18} />}
    </button>
    {mobileOpen ? <button className="workspace-nav-scrim" aria-label="Close navigation" type="button" onClick={() => setMobileOpen(false)} /> : null}
    <aside id="workspace-navigation" className={`app-sidebar workspace-sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`} aria-label="Journal navigation">
      <a className="sidebar-brand" href="/journal/home" title="Adalwolf home">
        <span className="brand-mark" aria-hidden="true">AW</span>
        <div className="sidebar-brand-copy"><strong>Adalwolf</strong><small>Trading journal</small></div>
      </a>
      {onNewTrade ? <button className="sidebar-new-trade" type="button" title="New Trade" onClick={() => { onNewTrade(); setMobileOpen(false); }}><Plus size={17} /><strong>New Trade</strong></button> : <a className="sidebar-new-trade" href="/journal#new-trade" title="New Trade"><Plus size={17} /><strong>New Trade</strong></a>}
      <nav className="sidebar-nav" aria-label="Primary sections">
        {links.map(({ key, label, href, icon: Icon }) => <a key={key} href={href} title={label} className={active === key ? "active" : ""} aria-current={active === key ? "page" : undefined} onClick={() => setMobileOpen(false)}><Icon size={17} aria-hidden="true" /><strong>{label}</strong></a>)}
      </nav>
      <div className="sidebar-footer">
        {onSecurity ? <button className="sidebar-nav-button" type="button" title="Security" onClick={() => { onSecurity(); setMobileOpen(false); }}><ShieldCheck size={17} /><strong>Security</strong></button> : <a className="sidebar-nav-button" href="/journal#security" title="Security"><ShieldCheck size={17} /><strong>Security</strong></a>}
        <button className="sidebar-nav-button" type="button" title="Log out" onClick={() => void logout()}><LogOut size={17} /><strong>Log out</strong></button>
        <button className="sidebar-collapse-button" type="button" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ArrowRightFromLine size={16} /> : <ArrowLeftToLine size={16} />}</button>
      </div>
    </aside>
  </>;
}
