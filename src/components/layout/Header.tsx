'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LogOut, Menu, Moon, Sun, Settings, User } from 'lucide-react';
import { useTheme } from 'next-themes';

interface HeaderProps {
  email?: string;
  displayName?: string;
  onToggleSidebar?: () => void;
}

export function Header({ email, displayName, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">올A+</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="테마 전환"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="gap-2 px-2" />
            }
          >
            <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm text-muted-foreground hidden sm:block max-w-[150px] truncate">
              {displayName || email}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            {email && (
              <>
                <div className="px-1.5 py-1.5">
                  <p className="text-sm font-medium">{displayName || '사용자'}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => router.push('/settings/api-keys')}>
              <Settings className="h-4 w-4" />
              설정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
