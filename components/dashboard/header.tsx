'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

export function Header({ onMenuClick, title = "Account Management" }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="w-full bg-white/60 backdrop-blur-xl px-6 py-4 rounded-[24px] border border-white/50 shadow-xl flex items-center justify-between gap-4">
      {/* Chic Header Module Tag */}
      <div className="bg-white/90 px-4 py-1.5 rounded-xl border border-slate-200/60 shadow-inner">
        <h2 className="text-sm font-black text-[#521903] uppercase tracking-wider">{title}</h2>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* User Pill Container */}
        <div className="flex items-center gap-2.5 bg-white/90 px-4 py-2 rounded-xl border border-slate-200/60 shadow-sm">
          <div className="h-5 w-5 rounded-full bg-[#521903] flex items-center justify-center text-white">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5-3-8-3z"/>
            </svg>
          </div>
          <span className="font-extrabold text-[#521903] text-xs tracking-tight">
            {user?.name || 'Mr. Admin'}
          </span>
        </div>

        {/* Brand Asset Image Logo */}
        <div className="h-10 w-11 relative shrink-0 hover:scale-110 hover:rotate-3 transition-transform duration-300 filter drop-shadow-md">
          <Image src="/logo.png" alt="HandSpeak Logo" fill className="object-contain" priority />
        </div>
      </div>
    </header>
  );
}