import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Cloud, Settings, AlertCircle } from "lucide-react";
import { MainNav } from "@/components/MainNav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CloudScannerTutorial } from "@/components/CloudScannerTutorial";

interface ScannerConfig {
  projectId: string;
  scanInterval: string;
  bucketPatterns: string[];
  customDataPatterns: RegExp[];
  encryptionOptions: {
    algorithm: string;
    keyRotationInterval: number;
  };
}

interface ScannerStatus {
  isRunning: boolean;
  lastScanTime?: string;
  totalScans: number;
  totalFindings: number;
  config: ScannerConfig;
}

export default function CloudScannerPage() {
  const { toast } = useToast();
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState<Partial<ScannerConfig>>({});

  const { data: status, isLoading: isStatusLoading } = useQuery<ScannerStatus>({
    queryKey: ['/api/scanner/status'],
    refetchInterval: 5000,
  });

  const startScannerMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/scanner/start");
    },
    onSuccess: () => {
      toast({
        title: "Scanner Started",
        description: "Cloud scanner has been started successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/scanner/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Scanner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopScannerMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/scanner/stop");
    },
    onSuccess: () => {
      toast({
        title: "Scanner Stopped",
        description: "Cloud scanner has been stopped successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/scanner/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Stop Scanner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<ScannerConfig>) => {
      await apiRequest("PATCH", "/api/scanner/config", config);
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Scanner configuration has been updated successfully",
      });
      setEditingConfig(false);
      queryClient.invalidateQueries({ queryKey: ['/api/scanner/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate(configForm);
  };

  if (isStatusLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const scannerStatus = status || {
    isRunning: false,
    lastScanTime: undefined,
    totalScans: 0,
    totalFindings: 0,
    config: {
      projectId: '',
      scanInterval: '',
      bucketPatterns: [],
      customDataPatterns: [],
      encryptionOptions: {
        algorithm: '',
        keyRotationInterval: 0
      }
    }
  };

  return (
    <>
      <CloudScannerTutorial />
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Cloud Scanner</h2>
                <p className="text-muted-foreground">
                  Monitor and manage Google Cloud storage scanning operations
                </p>
              </div>
              <Button
                variant={scannerStatus.isRunning ? "destructive" : "default"}
                onClick={() => scannerStatus.isRunning
                  ? stopScannerMutation.mutate()
                  : startScannerMutation.mutate()
                }
                disabled={startScannerMutation.isPending || stopScannerMutation.isPending}
              >
                {(startScannerMutation.isPending || stopScannerMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {scannerStatus.isRunning ? "Stop Scanner" : "Start Scanner"}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Scanner Status
                  </CardTitle>
                  <Cloud className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {scannerStatus.isRunning ? "Active" : "Inactive"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last scan: {scannerStatus.lastScanTime
                      ? new Date(scannerStatus.lastScanTime).toLocaleString()
                      : "Never"
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Scans
                  </CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {scannerStatus.totalScans}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Completed scan operations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Findings
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {scannerStatus.totalFindings}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sensitive data instances found
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Scanner Configuration</CardTitle>
                    <CardDescription>
                      Configure scanner behavior and patterns
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (editingConfig) {
                        setEditingConfig(false);
                      } else {
                        setConfigForm(scannerStatus.config || {});
                        setEditingConfig(true);
                      }
                    }}
                  >
                    {editingConfig ? "Cancel" : "Edit"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingConfig ? (
                  <form onSubmit={handleConfigSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Project ID</Label>
                      <Input
                        value={configForm.projectId || ''}
                        onChange={(e) => setConfigForm(prev => ({
                          ...prev,
                          projectId: e.target.value
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Scan Interval (cron format)</Label>
                      <Input
                        value={configForm.scanInterval || ''}
                        onChange={(e) => setConfigForm(prev => ({
                          ...prev,
                          scanInterval: e.target.value
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Bucket Patterns (comma-separated)</Label>
                      <Input
                        value={configForm.bucketPatterns?.join(',') || ''}
                        onChange={(e) => setConfigForm(prev => ({
                          ...prev,
                          bucketPatterns: e.target.value.split(',').map(p => p.trim())
                        }))}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={updateConfigMutation.isPending}
                    >
                      {updateConfigMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Configuration
                    </Button>
                  </form>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Setting</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Project ID</TableCell>
                        <TableCell>{scannerStatus.config.projectId}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Scan Interval</TableCell>
                        <TableCell>{scannerStatus.config.scanInterval}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Bucket Patterns</TableCell>
                        <TableCell>{scannerStatus.config.bucketPatterns.join(', ')}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Encryption Algorithm</TableCell>
                        <TableCell>{scannerStatus.config.encryptionOptions.algorithm}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}