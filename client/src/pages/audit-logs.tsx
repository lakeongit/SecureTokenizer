import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuditLog } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Shield, Key, Clock, AlertCircle, Download, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MainNav } from "@/components/MainNav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";

const ACTIONS = ["tokenize", "detokenize", "login", "logout", "extend_token", "revoke_token"] as const;
type ActionType = typeof ACTIONS[number];

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<ActionType | "all">("all");
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", selectedAction, dateRange],
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
      case "extend_token":
        return <Clock className="h-4 w-4" />;
      case "revoke_token":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = searchQuery === "" ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = selectedAction === "all" || log.action === selectedAction;

    const logDate = new Date(log.timestamp);
    const matchesDate = (!dateRange.from || logDate >= dateRange.from) &&
      (!dateRange.to || logDate <= dateRange.to);

    return matchesSearch && matchesAction && matchesDate;
  });

  const downloadLogs = () => {
    if (!filteredLogs) return;

    const csv = [
      ["Timestamp", "Action", "Details"].join(","),
      ...filteredLogs.map(log => [
        format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
        log.action,
        JSON.stringify(log.details).replace(/,/g, ";") // Prevent CSV issues
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Total Tokenization Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {filteredLogs?.filter(log => log.action === "tokenize").length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4 rotate-180" />
                Total Detokenization Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {filteredLogs?.filter(log => log.action === "detokenize").length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Token Extensions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {filteredLogs?.filter(log => log.action === "extend_token").length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Token Revocations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {filteredLogs?.filter(log => log.action === "revoke_token").length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select
                  value={selectedAction}
                  onValueChange={(value) => setSelectedAction(value as ActionType | "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {ACTIONS.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action.charAt(0).toUpperCase() + action.slice(1).replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Date Range</Label>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLogs}
              disabled={!filteredLogs?.length}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center text-muted-foreground">
                    Loading audit logs...
                  </div>
                ) : filteredLogs?.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    No audit logs found
                  </div>
                ) : (
                  filteredLogs?.map((log) => (
                    <Card key={log.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">{getActionIcon(log.action)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">
                              {log.action.replace("_", " ")}
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
    </div>
  );
}