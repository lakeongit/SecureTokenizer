import { Link, useLocation } from "wouter";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { HomeIcon, ScrollText, CloudIcon } from "lucide-react";

export function MainNav() {
  const [location] = useLocation();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={location === "/"}
          tooltip="Home"
        >
          <Link href="/">
            <HomeIcon />
            <span>Home</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={location === "/audit-logs"}
          tooltip="Audit Logs"
        >
          <Link href="/audit-logs">
            <ScrollText />
            <span>Audit Logs</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={location === "/cloud-scanner"}
          tooltip="Cloud Scanner"
        >
          <Link href="/cloud-scanner">
            <CloudIcon />
            <span>Cloud Scanner</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
