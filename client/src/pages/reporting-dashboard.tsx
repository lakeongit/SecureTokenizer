import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/MainNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  Activity,
  Shield,
  Zap,
  Calendar as CalendarIcon,
  BarChart as ChartIcon
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function ReportingDashboard() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Fetch metrics data
  const { data: tokenMetrics } = useQuery({
    queryKey: ['/api/reports/tokenization', dateRange],
    queryFn: async () => {
      const timeParam = dateRange 
        ? `?timeRange=${dateRange.start.toISOString()},${dateRange.end.toISOString()}`
        : '';
      return fetch(`/api/reports/tokenization${timeParam}`).then(res => res.json());
    }
  });

  const { data: scannerMetrics } = useQuery({
    queryKey: ['/api/reports/scanner', dateRange],
    queryFn: async () => {
      const timeParam = dateRange 
        ? `?timeRange=${dateRange.start.toISOString()},${dateRange.end.toISOString()}`
        : '';
      return fetch(`/api/reports/scanner${timeParam}`).then(res => res.json());
    }
  });

  const { data: complianceMetrics } = useQuery({
    queryKey: ['/api/reports/compliance'],
    queryFn: async () => fetch('/api/reports/compliance').then(res => res.json())
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ['/api/reports/performance', dateRange],
    queryFn: async () => {
      const timeParam = dateRange 
        ? `?timeRange=${dateRange.start.toISOString()},${dateRange.end.toISOString()}`
        : '';
      return fetch(`/api/reports/performance${timeParam}`).then(res => res.json());
    }
  });

  const tokenDistributionData = tokenMetrics ? [
    { name: 'Active', value: tokenMetrics.activeTokens },
    { name: 'Expired', value: tokenMetrics.expiredTokens },
    { name: 'Revoked', value: tokenMetrics.revokedTokens }
  ] : [];

  const scannerPerformanceData = scannerMetrics ? [
    { name: 'Total Scans', value: scannerMetrics.totalScans },
    { name: 'Findings', value: scannerMetrics.totalFindings },
    { name: 'Buckets', value: scannerMetrics.bucketsCovered }
  ] : [];

  const complianceData = complianceMetrics ? [
    { name: 'Token Expiry', value: complianceMetrics.tokenExpiryCompliance },
    { name: 'Data Retention', value: complianceMetrics.dataRetentionCompliance },
    { name: 'Scanning Coverage', value: complianceMetrics.scanningCoverage },
    { name: 'Token Usage', value: 100 - complianceMetrics.unusedTokenPercentage }
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-muted-foreground">
              Comprehensive insights into your tokenization and scanning operations
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange ? (
                  `${format(dateRange.start, "LLL dd, y")} - ${format(
                    dateRange.end,
                    "LLL dd, y"
                  )}`
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{
                  from: dateRange?.start,
                  to: dateRange?.end
                }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({
                      start: range.from,
                      end: range.to
                    });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tokenization">Tokenization</TabsTrigger>
            <TabsTrigger value="scanner">Scanner</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Tokens
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tokenMetrics?.totalTokens || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Scanner Findings
                  </CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {scannerMetrics?.totalFindings || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Compliance Score
                  </CardTitle>
                  <ChartIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {complianceMetrics
                      ? Math.round(
                          (complianceMetrics.tokenExpiryCompliance +
                            complianceMetrics.dataRetentionCompliance +
                            complianceMetrics.scanningCoverage) /
                            3
                        )
                      : 0}
                    %
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Response Time
                  </CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performanceMetrics
                      ? Math.round(
                          (performanceMetrics.averageTokenizationTime +
                            performanceMetrics.averageDetokenizationTime) /
                            2
                        )
                      : 0}
                    ms
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Token Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={tokenDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {tokenDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Scanner Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={scannerPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Metrics</CardTitle>
                <CardDescription>Key compliance indicators and their current status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={complianceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#82ca9d">
                      {complianceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.value >= 90 ? '#4CAF50' : entry.value >= 70 ? '#FFC107' : '#F44336'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add other tab contents for tokenization, scanner, and compliance details */}
        </Tabs>
      </div>
    </div>
  );
}
