import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Shield, ScrollText, CloudIcon, Database, Loader2 } from "lucide-react";

export function MainNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <div className="flex items-center gap-2 bg-primary/5 p-2 rounded-lg cursor-pointer">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">TokenVault</h1>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 rounded-full text-sm text-secondary-foreground">
              <Database className="h-4 w-4" />
              <span>{user?.username}</span>
            </div>

            <Link href="/cloud-scanner">
              <Button 
                variant="outline" 
                size="sm" 
                className={`gap-2 ${location === "/cloud-scanner" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <CloudIcon className="h-4 w-4" />
                Cloud Scanner
              </Button>
            </Link>

            <Link href="/audit-logs">
              <Button 
                variant="outline" 
                size="sm" 
                className={`gap-2 ${location === "/audit-logs" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <ScrollText className="h-4 w-4" />
                Audit Logs
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Logout"
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}