'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { User, Menu, Calendar, LogOut, Settings, CreditCard } from 'lucide-react';
import { signOut } from '@/app/_actions/auth';
import Link from 'next/link';
import { Toaster } from 'sonner';

interface MemberLayoutProps {
  children: React.ReactNode;
}

export default function MemberLayout({ children }: MemberLayoutProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    setShowUserDropdown(false);
  };

  const getMenuItemClassName = (path: string) => {
    const isActive = pathname.startsWith(path);
    return `flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? 'bg-purple-100 text-purple-700 border-l-2 border-purple-600'
        : 'text-gray-700 hover:bg-gray-100'
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 h-10 fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          {/* サイトタイトル */}
          <div className="flex items-center">
            <h1 className="text-sm font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text">
              StoryCastAI
            </h1>
          </div>

          {/* ユーザーアイコン */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              <User className="w-4 h-4 text-gray-600" />
            </button>

            {/* ドロップダウンメニュー */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex pt-10">
        {/* サイドバー */}
        <aside className="w-40 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-10">
          <nav className="p-2">
            <ul className="space-y-1">
              <li>
                <Link href="/accounts" className={getMenuItemClassName('/accounts')}>
                  <Settings className="size-4" />
                  <span>アカウント</span>
                </Link>
              </li>
              <li>
                <Link href="/posts" className={getMenuItemClassName('/posts')}>
                  <Menu className="size-4" />
                  <span>投稿コンテンツ</span>
                </Link>
              </li>
              <li>
                <Link href="/schedules" className={getMenuItemClassName('/schedules')}>
                  <Calendar className="size-4" />
                  <span>スケジュール</span>
                </Link>
              </li>
              <li>
                <Link href="/plan" className={getMenuItemClassName('/plan')}>
                  <CreditCard className="size-4" />
                  <span>プラン管理</span>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 ml-40">
          <div className="p-4">{children}</div>
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
