import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Menu, LayoutDashboard, Package, ShoppingCart, Receipt } from "lucide-react";
import { NavLink } from "@/components/NavLink";

function MobileBottomNav() {
  const { setOpenMobile } = useSidebar();
  
  const navItems = [
    { title: "Özet", url: "/", icon: LayoutDashboard },
    { title: "Ürünler", url: "/urunler", icon: Package },
    { title: "Sipariş", url: "/siparisler", icon: ShoppingCart },
    { title: "Giderler", url: "/giderler", icon: Receipt },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-background/90 backdrop-blur-xl border-t border-border z-50 px-2 pb-safe pt-1">
      <div className="flex items-center justify-around h-14">
        {navItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex flex-col items-center justify-center w-14 h-full text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary font-medium [&>svg]:text-primary"
          >
            <item.icon className="h-[22px] w-[22px] mb-1 transition-colors" />
            <span className="text-[10px]">{item.title}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center justify-center w-14 h-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-[22px] w-[22px] mb-1 transition-colors" />
          <span className="text-[10px]">Menü</span>
        </button>
      </div>
    </nav>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { LogOut, User as UserIcon, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { settings } = useApp();
  const activeCompany = (settings.companies || []).find(c => c.id === settings.activeCompanyId) || (settings.companies || [])[0];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background pb-16 md:pb-0">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobil Header */}
          <header className="md:hidden h-14 flex items-center justify-between border-b border-border/50 px-4 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
             <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary shadow-sm flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">N</span>
                </div>
                <span className="font-semibold text-sm tracking-tight text-foreground/90">The Noire</span>
             </div>
             {user && (
               <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                 <LogOut className="h-4 w-4" />
               </Button>
             )}
          </header>
          
          {/* Masaüstü Header */}
          <header className="hidden md:flex h-14 items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center">
              <SidebarTrigger className="mr-3 text-muted-foreground hover:text-foreground">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              {activeCompany && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/60">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-foreground">{activeCompany.name}</span>
                </div>
              )}
            </div>

            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-right">
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-foreground leading-none">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{user.email}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={logout} 
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Çıkış Yap</span>
                </Button>
              </div>
            )}
          </header>
          
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>

          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
