import { 
  LayoutDashboard, Package, ShoppingCart, Receipt, BarChart3, Settings, ChevronLeft
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
  { title: "Raporlar", url: "/raporlar", icon: BarChart3 },
  { title: "Ayarlar", url: "/ayarlar", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M</span>
              </div>
              <span className="font-semibold text-sidebar-accent-foreground text-sm">Moda Atölyesi</span>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7 text-sidebar-foreground hover:text-sidebar-accent-foreground">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
        {collapsed && (
          <button onClick={toggleSidebar} className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">M</span>
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

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-[11px] text-sidebar-foreground/50">© 2025 Moda Atölyesi</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
