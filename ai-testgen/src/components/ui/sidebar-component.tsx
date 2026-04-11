"use client";

import { useState } from "react";
import {
  Dashboard,
  Search as SearchIcon,
  Report,
  ChartBar,
  View,
  Menu,
  ChevronLeft,
  ChevronRight
} from "@carbon/icons-react";
import { cn } from "../../lib/utils";

export type PrimaryTab = "dashboard";

interface SidebarProps {
  className?: string;
  activeSecondaryTab: string;
  onSecondaryTabChange: (tab: string) => void;
}

export function TwoLevelSidebar({ 
  className,
  activeSecondaryTab,
  onSecondaryTabChange
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: "overview", label: "Overview", icon: View },
    { id: "reports", label: "Reports", icon: Report },
    { id: "metrics", label: "Metrics", icon: ChartBar },
  ];

  return (
    <>
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-md border border-border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu size={20} />
      </button>

      <div className={cn(
        "flex flex-col h-screen bg-black/40 backdrop-blur-3xl border-r border-white/[0.06] shrink-0 transition-all duration-300 md:translate-x-0 absolute md:relative z-40 group/sidebar",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-20" : "w-64",
        className
      )}>
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-violet-600 border border-violet-500/50 flex items-center justify-center text-white opacity-0 group-hover/sidebar:opacity-100 transition-opacity z-50 shadow-lg"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Header/Logo Space (Reserved if needed, but keeping it clean) */}
        {!isCollapsed && (
          <div className="p-6 h-[88px] flex items-center border-b border-white/[0.04]">
            <img src="/Logo/logo_full.png" alt="TestGen" className="h-8 w-auto" />
          </div>
        )}
        {isCollapsed && (
          <div className="h-[88px] flex items-center justify-center border-b border-white/[0.04]">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
               <Dashboard size={20} className="text-violet-400" />
            </div>
          </div>
        )}
        
        <div className="flex-1 flex flex-col p-4 gap-6 overflow-hidden">
          {/* Search (Only when expanded) */}
          {!isCollapsed && (
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all text-foreground placeholder:text-muted-foreground/30"
              />
            </div>
          )}

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSecondaryTab === item.id;
              return (
                <button 
                  key={item.id}
                  onClick={() => onSecondaryTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent whitespace-nowrap",
                    isActive 
                      ? "bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]" 
                      : "text-muted-foreground/60 hover:bg-white/[0.04] hover:text-foreground",
                    isCollapsed ? "justify-center px-0" : ""
                  )}
                >
                  <Icon size={isCollapsed ? 20 : 18} />
                  {!isCollapsed && <span>{item.label}</span>}
                  
                  {isCollapsed && (
                    <div className="absolute left-16 px-2 py-1 bg-black/90 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-white/10 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all pointer-events-none z-[100]">
                      {item.label}
                    </div>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

      </div>
      
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
