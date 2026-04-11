"use client";

import { useState } from "react";
import {
  Dashboard,
  User as UserIcon,
  Search as SearchIcon,
  Report,
  ChartBar,
  View,
  Logout,
  Menu
} from "@carbon/icons-react";
import { cn } from "../../lib/utils";

export type PrimaryTab = "dashboard";

interface SidebarProps {
  userEmail?: string;
  onLogout?: () => void;
  className?: string;
  activeTab: PrimaryTab;
  onTabChange: (tab: PrimaryTab) => void;
  activeSecondaryTab: string;
  onSecondaryTabChange: (tab: string) => void;
}

export function TwoLevelSidebar({ 
  userEmail, 
  onLogout, 
  className,
  activeTab,
  onTabChange,
  activeSecondaryTab,
  onSecondaryTabChange
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const primaryNav = [
    { id: "dashboard", icon: Dashboard, label: "Dashboard" },
  ];

  const getSecondaryNav = () => {
    // We only have the dashboard tab now
    return [
      { id: "overview", label: "Overview", icon: View },
      { id: "reports", label: "Reports", icon: Report },
      { id: "metrics", label: "Metrics", icon: ChartBar },
    ];
  };

  return (
    <>
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-md border border-border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu size={20} />
      </button>

      <div className={cn(
        "flex h-screen bg-card border-r border-border/50 shrink-0 transition-transform duration-300 md:translate-x-0 absolute md:relative z-40",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>
        {/* Level 1: Primary Navigation */}
        <div className="w-[72px] flex flex-col items-center py-6 border-r border-border/50 bg-background/50">
          {/* Logo container removed for redundancy */}
          
          <nav className="flex-1 w-full flex flex-col items-center gap-4">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id as PrimaryTab)}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={20} />
                  <div className="absolute left-14 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-border shadow-sm">
                    {item.label}
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto w-full flex flex-col items-center gap-4">
            <button 
              onClick={onLogout}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all group relative"
            >
              <Logout size={20} />
              <div className="absolute left-14 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-border shadow-sm">
                Log Out
              </div>
            </button>
            <button className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden group relative">
              <UserIcon size={20} className="text-muted-foreground" />
              {userEmail && (
                <div className="absolute left-14 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-border shadow-sm">
                  {userEmail}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Level 2: Secondary Navigation */}
        <div className="w-64 flex flex-col bg-card/30 hidden sm:flex">
          <div className="p-6 border-b border-border/50 h-[88px] flex flex-col justify-center gap-1">
            <div 
              onClick={() => window.location.href = "/"}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <img src="/Logo/logo_full.png" alt="TestPilot AI" className="h-10 w-auto group-hover:scale-105 transition-transform" />
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{activeTab}</p>
          </div>
          
          <div className="p-4">
            <div className="relative mb-6">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-foreground"
              />
            </div>

            <nav className="space-y-1">
              {getSecondaryNav().map((item) => {
                const Icon = item.icon;
                const isActive = activeSecondaryTab === item.id;
                return (
                  <button 
                    key={item.id}
                    onClick={() => onSecondaryTabChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>


        </div>
      </div>
      
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
