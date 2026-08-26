import { 
  LayoutDashboard, Package, ShoppingCart, Receipt, BarChart3, Settings, ChevronLeft, Megaphone, Wallet, FileText
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Gösterge Paneli", url: "/", icon: LayoutDashboard },
  { title: "Ürünler", url: "/urunler", icon: Package },
  { title: "Siparişler", url: "/siparisler", icon: ShoppingCart },
  { title: "Giderler", url: "/giderler", icon: Receipt },
  { title: "Mali Tablo", url: "/mali-tablo", icon: Wallet },
  { title: "E-Fatura & Muhasebe", url: "/faturalar", icon: FileText },
  { title: "Reklam Takibi", url: "/reklam-takip", icon: Megaphone },
  { title: "Raporlar", url: "/raporlar", icon: BarChart3 },
  { title: "Ayarlar", url: "/ayarlar", icon: Settings },
];

import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User as UserIcon } from "lucide-react";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">N</span>
              </div>
              <span className="font-semibold text-sidebar-accent-foreground text-sm">The Noire</span>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7 text-sidebar-foreground hover:text-sidebar-accent-foreground">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
        {collapsed && (
          <button onClick={toggleSidebar} className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">N</span>
          </button>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/50">
        {user && !collapsed && (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-sidebar-accent/40">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-sidebar-primary font-bold text-xs shrink-0 overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate">{user.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="h-7 w-7 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 shrink-0"
              title="Çıkış Yap"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {user && collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 mx-auto"
            title="Çıkış Yap"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
