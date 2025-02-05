import { useQuery } from "@tanstack/react-query";
import { AuditLog } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Shield, Key, Clock, AlertCircle } from "lucide-react";

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "tokenize":
        return <Key className="h-4 w-4" />;
      case "detokenize":
        return <Key className="h-4 w-4 rotate-180" />;
      case "login":
        return <Shield className="h-4 w-4" />;
      case "logout":
        return <Shield className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center text-muted-foreground">
                  Loading audit logs...
                </div>
              ) : logs?.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No audit logs found
                </div>
              ) : (
                logs?.map((log) => (
                  <Card key={log.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getActionIcon(log.action)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">
                            {log.action}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.timestamp), "PPpp")}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {typeof log.details === "string"
                            ? log.details
                            : JSON.stringify(log.details, null, 2)}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
