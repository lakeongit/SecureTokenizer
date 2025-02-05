import { Link, useLocation } from "wouter";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuGroup } from "@/components/ui/sidebar";
import { HomeIcon, ScrollText, CloudIcon, ShieldCheck, RefreshCcw, Database, Package, Clock } from "lucide-react";

export function MainNav() {
  const [location] = useLocation();

  return (
    <SidebarMenu>
      <SidebarMenuGroup label="Main">
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={location === "/"}
            tooltip="Tokenize Data"
          >
            <Link href="/">
              <ShieldCheck />
              <span>Tokenize Data</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={location === "/detokenize"}
            tooltip="Detokenize"
          >
            <Link href="/detokenize">
              <RefreshCcw />
              <span>Detokenize</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={location === "/bulk-operations"}
            tooltip="Bulk Operations"
          >
            <Link href="/bulk-operations">
              <Package />
              <span>Bulk Operations</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={location === "/token-management"}
            tooltip="Token Management"
          >
            <Link href="/token-management">
              <Database />
              <span>Token Management</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={location === "/expiring-tokens"}
            tooltip="Expiring Tokens"
          >
            <Link href="/expiring-tokens">
              <Clock />
              <span>Expiring Tokens</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenuGroup>

      <SidebarMenuGroup label="Tools">
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
      </SidebarMenuGroup>
    </SidebarMenu>
  );
}