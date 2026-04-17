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

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background pb-16 md:pb-0">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobil Header: Sadece logo/isim gösterilir */}
          <header className="md:hidden h-14 flex items-center justify-center border-b border-border/50 px-4 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
             <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary shadow-sm flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">M</span>
                </div>
                <span className="font-semibold text-sm tracking-tight text-foreground/90">Moda Atölyesi</span>
             </div>
          </header>
          
          {/* Masaüstü Header */}
          <header className="hidden md:flex h-14 items-center border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger className="mr-3 text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
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
