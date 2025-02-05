import { Link, useLocation } from "wouter";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  Shield,
  RefreshCcw,
  Package,
  Database,
  Clock,
  CloudIcon,
  ScrollText,
} from "lucide-react";

export function MainNav() {
  const [location] = useLocation();

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/"}
              tooltip="Tokenize Data"
            >
              <Link href="/">
                <Shield className="h-4 w-4" />
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
                <RefreshCcw className="h-4 w-4" />
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
                <Package className="h-4 w-4" />
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
                <Database className="h-4 w-4" />
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
                <Clock className="h-4 w-4" />
                <span>Expiring Tokens</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Tools</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/cloud-scanner"}
              tooltip="Cloud Scanner"
            >
              <Link href="/cloud-scanner">
                <CloudIcon className="h-4 w-4" />
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
                <ScrollText className="h-4 w-4" />
                <span>Audit Logs</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}