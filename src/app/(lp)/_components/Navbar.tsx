'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenModal: () => void;
}

export default function Navbar({ onOpenModal }: NavbarProps) {
  return (
    <header className="bg-white/60 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:py-6">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text">
                StoriesAI
              </span>
            </Link>
          </div>

          {/* <nav className="flex items-center space-x-8">
            <button
              onClick={onOpenModal}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full px-5 py-2 hover:opacity-90 transition-opacity"
            >
              事前登録
            </button>
          </nav> */}
        </div>
      </div>
    </header>
  );
}
