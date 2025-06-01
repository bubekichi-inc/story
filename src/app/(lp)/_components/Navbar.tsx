'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenModal: () => void;
}

export default function Navbar({ onOpenModal }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:py-6">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text">
                StoriesAI
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-700 hover:text-gray-900 font-medium">
              機能紹介
            </Link>
            <Link href="#how-it-works" className="text-gray-700 hover:text-gray-900 font-medium">
              使い方
            </Link>
            <button
              onClick={onOpenModal}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full px-5 py-2 hover:opacity-90 transition-opacity"
            >
              事前登録
            </button>
          </nav>

          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* モバイルメニュー */}
      {isOpen && (
        <div className="md:hidden bg-white">
          <div className="px-4 py-5 space-y-4">
            <Link
              href="#features"
              className="block text-gray-700 hover:text-gray-900 font-medium"
              onClick={() => setIsOpen(false)}
            >
              機能紹介
            </Link>
            <Link
              href="#how-it-works"
              className="block text-gray-700 hover:text-gray-900 font-medium"
              onClick={() => setIsOpen(false)}
            >
              使い方
            </Link>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenModal();
              }}
              className="block w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full px-5 py-2"
            >
              事前登録
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
