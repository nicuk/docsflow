'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  HelpCircle,
  Menu,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Users,
  CreditCard,
  Moon,
  Sun,
  Shield,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import DocsFlowBrand from '@/components/DocsFlowBrand'
import { SchemaAlignedCookieManager } from '@/lib/schema-aligned-cookies'

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null, requiresAdmin: false },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText, badge: null, requiresAdmin: false },
  { name: 'Chat Assistant', href: '/dashboard/chat', icon: MessageSquare, badge: null, requiresAdmin: false },

  { name: 'System Health', href: '/dashboard/health', icon: Shield, badge: null, requiresAdmin: true },
  { name: 'User Access', href: '/dashboard/admin', icon: Users, badge: null, requiresAdmin: true },
  { name: 'User Management', href: '/admin/users', icon: Shield, badge: null, requiresAdmin: true },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, badge: null, requiresAdmin: false },
  { name: 'Help & Support', href: '/support', icon: HelpCircle, badge: null, requiresAdmin: false },
]

// Get actual user data from cookies
const getUserFromCookies = () => {
  if (typeof window !== 'undefined') {
    const emailCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-email='))
      ?.split('=')[1];
    
    if (emailCookie) {
      const name = emailCookie.split('@')[0];
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email: emailCookie,
        avatar: '/placeholder.svg',
      };
    }
  }
  
  // Fallback - try to get from session storage
  try {
    const userData = typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
    if (userData) {
      const parsedUser = JSON.parse(userData);
      
      // CRITICAL: Check onboarding completion per enterprise architecture plan
      if (!parsedUser.onboarding_complete && typeof window !== 'undefined') {
        // Redirect to onboarding if not completed
        window.location.href = '/onboarding';
        return {
          name: 'Redirecting...',
          email: 'redirecting@example.com',
          avatar: '/placeholder.svg',
        };
      }
      
      return {
        name: parsedUser.email?.split('@')[0] || 'User',
        email: parsedUser.email || 'user@example.com',
        avatar: '/placeholder.svg',
      };
    }
  } catch (error) {
    console.error('Error getting user from session:', error);
  }
  
  // Final fallback
  return {
    name: 'User',
    email: 'user@example.com',
    avatar: '/placeholder.svg',
  };
};

// Dynamic user session hook
function useUserSession() {
  const [user, setUser] = useState({
    name: 'Loading...',
    email: 'loading@example.com',
    avatar: '/placeholder.svg',
    role: 'member',
  });

  useEffect(() => {
    const getUserData = async () => {
      // CRITICAL FIX: Check Supabase auth session FIRST
      try {
        const { createSupabaseClient } = await import('@/lib-frontend/supabase');
        const supabase = createSupabaseClient();
        
        // SECURITY FIX: Use getUser() instead of getSession() for authenticated data
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!error && user) {
          console.log('Found authenticated user:', user.email);
          
          // Get user profile from database
          const { data: userProfile } = await supabase
            .from('users')
            .select('name, email, role')
            .eq('id', user.id)
            .single();
          
          if (userProfile) {
            setUser({
              name: userProfile.name || user.email?.split('@')[0] || 'User',
              email: userProfile.email || user.email || 'user@example.com',
              avatar: '/placeholder.svg',
              role: userProfile.role || 'member',
            });
            return;
          } else {
            // User exists in auth but not in users table yet
            setUser({
              name: user.email?.split('@')[0] || 'User',
              email: user.email || 'user@example.com',
              avatar: '/placeholder.svg',
              role: 'member',
            });
            return;
          }
        }
      } catch (error) {
        console.error('Error checking Supabase session:', error);
      }
      
      // SECURITY FIX: Use schema-aligned cookie manager instead of direct parsing
      if (typeof window !== 'undefined') {
        try {
          const cookies = SchemaAlignedCookieManager.getSchemaAlignedCookies();
          const secureAccess = await SchemaAlignedCookieManager.getSecureUserAccess();
          
          if (cookies.userEmail && cookies.tenantId && secureAccess.tenantId) {
            console.log('✅ [SECURITY] Using validated session data:', {
              email: cookies.userEmail,
              tenantId: cookies.tenantId.substring(0, 8) + '...',
              role: secureAccess.role,
              isAdmin: secureAccess.isAdmin
            });
            
            setUser({
              name: cookies.userEmail.split('@')[0].charAt(0).toUpperCase() + cookies.userEmail.split('@')[0].slice(1),
              email: cookies.userEmail,
              avatar: '/placeholder.svg',
              role: secureAccess.role, // From database, not hardcoded
            });
            return;
          } else {
            console.warn('🚨 [SECURITY] Invalid cookie state - clearing contaminated cookies');
            SchemaAlignedCookieManager.clearAllAuthCookies();
          }
        } catch (error) {
          console.error('🚨 [SECURITY] Cookie validation failed:', error);
          SchemaAlignedCookieManager.clearAllAuthCookies();
        }
      }
      
      // Final fallback - but this indicates a session issue
      console.warn('No valid user session found, falling back to mock data');
      setUser({
        name: 'User',
        email: 'user@example.com',
        avatar: '/placeholder.svg',
        role: 'member',
      });
    };

    getUserData();
  }, []);

  return user;
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Theme Toggle Component
function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="h-8 w-8"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()
  const user = useUserSession() // Dynamic user session restoration

  // Add logout functionality
  const handleLogout = async () => {
    try {
      // Use the auth client's logout method which calls backend
      const { authClient } = await import('@/lib/auth-client');
      await authClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <MobileSidebar user={user} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 z-30 hidden md:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <DesktopSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} user={user} />
      </aside>

      {/* Main content area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-16'
        }`}
      >
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {navigationItems.find(item => item.href === pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Notifications */}
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>
              
              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                    <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 h-[calc(100vh-4rem)] overflow-hidden p-4 md:p-6">
          <div className="h-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function DesktopSidebar({ isOpen, setIsOpen, user }: { 
  isOpen: boolean; 
  setIsOpen: (open: boolean) => void;
  user: { name: string; email: string; avatar: string; role?: string; };
}) {
  const pathname = usePathname()
  const isAdmin = user.role === 'admin'

  return (
    <>
      {/* Sidebar header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <DocsFlowBrand size="sm" variant="horizontal" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
              <FileText className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 w-8"
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1">
          {navigationItems
            .filter(item => !item.requiresAdmin || isAdmin)
            .map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                title={!isOpen ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {isOpen && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <Badge variant="outline" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {!isOpen && item.badge && (
                  <Badge className="absolute left-8 top-1 h-4 w-4 p-0 flex items-center justify-center">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User info */}
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate dark:text-white">{user.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MobileSidebar({ user }: { user: { name: string; email: string; avatar: string; role?: string; } }) {
  const pathname = usePathname()
  const isAdmin = user.role === 'admin'

  return (
    <div className="flex flex-col h-full">
      {/* Mobile header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <DocsFlowBrand size="sm" variant="horizontal" />
      </div>

      {/* Mobile navigation */}
      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-1">
          {navigationItems
            .filter(item => !item.requiresAdmin || isAdmin)
            .map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <Badge variant="outline">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Mobile user info */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate dark:text-white">{user.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
