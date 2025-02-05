import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  Key,
  Clock,
  Search,
  Plus,
  Filter,
  Database,
  FileText,
  Settings,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { fieldCategories, getAllFields, validateField } from "@/lib/field-definitions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tutorial } from "@/components/Tutorial";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// Add TypeScript interfaces for API responses
interface TokenizationResult {
  success: boolean;
  error?: string;
}

interface BulkResult {
  results: Array<{
    success: boolean;
    error?: string;
  }>;
}

interface TokenInfo {
  created: string;
  expires: string;
  userId: string;
}

interface ExpiringToken {
  token: string;
  created: string;
  expires: string;
}

interface TokenOperation {
  token: string;
  success: boolean;
  error?: string;
}

interface BulkOperationResult {
  results: TokenOperation[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [detokenizeQuery, setDetokenizeQuery] = useState("");
  const [sensitiveData, setSensitiveData] = useState<Record<string, string>>({});
  const [expiryHours, setExpiryHours] = useState<string>("24");
  const [bulkData, setBulkData] = useState<Array<Record<string, string>>>([]);
  const [selectedToken, setSelectedToken] = useState("");
  const [extensionHours, setExtensionHours] = useState("24");
  const [searchQuery, setSearchQuery] = useState("");
  const [customFieldName, setCustomFieldName] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [managementToken, setManagementToken] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [tokenSearch, setTokenSearch] = useState("");
  const [filterDays, setFilterDays] = useState(30);
  const [showExpired, setShowExpired] = useState(false);

  const handleFieldSelection = (fieldId: string) => {
    const field = getAllFields().find(f => f.id === fieldId);
    if (field) {
      if (fieldId in sensitiveData) {
        toast({
          title: "Duplicate field",
          description: "This field has already been added to your selection.",
          variant: "destructive",
        });
        return;
      }

      setSensitiveData(prev => ({
        ...prev,
        [field.id]: ""
      }));
    }
  };

  const addCustomField = () => {
    const normalizedFieldName = customFieldName.trim().toLowerCase().replace(/\s+/g, '_');

    const existingPredefinedField = getAllFields().find(f =>
      f.id.toLowerCase() === normalizedFieldName ||
      f.name.toLowerCase().replace(/\s+/g, '_') === normalizedFieldName
    );

    if (existingPredefinedField) {
      toast({
        title: "Field already exists",
        description: `This field is already available as "${existingPredefinedField.name}". Please select it from the list instead.`,
        variant: "destructive",
      });
      return;
    }

    if (normalizedFieldName in sensitiveData) {
      toast({
        title: "Duplicate field",
        description: "This field has already been added to your selection.",
        variant: "destructive",
      });
      return;
    }

    setSensitiveData(prev => ({
      ...prev,
      [normalizedFieldName]: ""
    }));
    setCustomFieldName("");
  };

  const removeField = (key: string) => {
    const { [key]: _, ...rest } = sensitiveData;
    setSensitiveData(rest);
    setValidationErrors(prev => {
      const { [key]: __, ...rest } = prev;
      return rest;
    });
  };

  const tokenizeMutation = useMutation({
    mutationFn: async (data: { data: Record<string, string>, expiryHours: number }) => {
      const res = await apiRequest("POST", "/api/tokenize", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Data Tokenized",
        description: "Your sensitive data has been securely tokenized",
      });
      setSensitiveData({});
      setExpiryHours("24");
      setValidationErrors({});
      queryClient.invalidateQueries({ queryKey: ['/api/tokens'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Tokenization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const detokenizeMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/detokenize", { token });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to detokenize');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Data Retrieved",
        description: (
          <div className="space-y-2 max-h-[300px] overflow-auto">
            <p className="font-medium">Detokenized Data:</p>
            {Object.entries(data.data).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium">{key}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        ),
        duration: 5000,
      });
      setDetokenizeQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Detokenization Failed",
        description: error.message,
        variant: "destructive",
      });
      setDetokenizeQuery("");
    },
  });

  const bulkTokenizeMutation = useMutation({
    mutationFn: async (data: Array<{ data: Record<string, string>, expiryHours: number }>) => {
      const res = await apiRequest("POST", "/api/bulk-tokenize", data);
      return res.json() as Promise<BulkResult>;
    },
    onSuccess: (data) => {
      const successful = data.results.filter((r: { success: boolean }) => r.success).length;
      const failed = data.results.filter((r: { success: boolean }) => !r.success).length;

      toast({
        title: "Bulk Tokenization Complete",
        description: (
          <div className="space-y-2">
            <p>Successfully processed {successful} items</p>
            {failed > 0 && (
              <p className="text-destructive">Failed to process {failed} items</p>
            )}
          </div>
        ),
        duration: 5000,
      });

      const errors = data.results
        .filter((r: { success: boolean; error?: string }) => !r.success)
        .map((r: { error?: string }) => r.error)
        .filter((error): error is string => error !== undefined);

      if (errors.length > 0) {
        console.error("Bulk tokenization errors:", errors);
      }

      setBulkData([]);
      queryClient.invalidateQueries({ queryKey: ['/api/tokens'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Tokenization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const extendTokenMutation = useMutation({
    mutationFn: async ({ token, hours }: { token: string, hours: number }) => {
      await apiRequest("POST", `/api/tokens/${token}/extend`, { hours });
    },
    onSuccess: () => {
      toast({
        title: "Token Extended",
        description: "Token expiration has been extended successfully",
      });
      setSelectedToken("");
      setExtensionHours("24");
      queryClient.invalidateQueries({ queryKey: ['/api/tokens'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Extension Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      await apiRequest("POST", `/api/tokens/${token}/revoke`);
    },
    onSuccess: () => {
      toast({
        title: "Token Revoked",
        description: "Token has been revoked successfully",
      });
      setSelectedToken("");
      queryClient.invalidateQueries({ queryKey: ['/api/tokens'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Revocation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const viewTokenInfoMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("GET", `/api/tokens/${token}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to get token info');
      }
      return res.json() as Promise<TokenInfo>;
    },
    onSuccess: (data) => {
      toast({
        title: "Token Information",
        description: (
          <div className="space-y-2">
            <p>Created: {new Date(data.created).toLocaleString()}</p>
            <p>Expires: {new Date(data.expires).toLocaleString()}</p>
            <p>Created by: {data.userId}</p>
          </div>
        ),
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Get Token Info",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addToBulk = () => {
    if (Object.keys(sensitiveData).length > 0) {
      setBulkData(prev => [...prev, { ...sensitiveData }]);
      setSensitiveData({});
    }
  };

  const removeFromBulk = (index: number) => {
    setBulkData(prev => prev.filter((_, i) => i !== index));
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n');
        const headers = rows[0].split(',').map(h => h.trim());

        // Validate headers
        if (headers.length === 0) {
          throw new Error('CSV file must contain at least one column');
        }

        // Process and validate each row
        const newBulkData = rows.slice(1)
          .filter(row => row.trim())
          .map((row, index) => {
            const values = row.split(',').map(v => v.trim());
            if (values.length !== headers.length) {
              throw new Error(`Row ${index + 2} has ${values.length} columns but should have ${headers.length}`);
            }

            const item: Record<string, string> = {};
            headers.forEach((header, index) => {
              if (!header) {
                throw new Error(`Invalid header name at column ${index + 1}`);
              }
              if (values[index]) {
                // Validate field based on header name if it matches a predefined field
                const validation = validateField(header, values[index]);
                if (!validation.isValid) {
                  throw new Error(`Row ${index + 2}, column "${header}": ${validation.message}`);
                }
                item[header] = values[index];
              }
            });
            return item;
          });

        setBulkData(prev => [...prev, ...newBulkData]);
        setCsvError(null);
        event.target.value = '';

        toast({
          title: "CSV Import Successful",
          description: `Successfully imported ${newBulkData.length} records from CSV`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file';
        setCsvError(errorMessage);
        toast({
          title: "CSV Import Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    reader.onerror = () => {
      const errorMessage = 'Failed to read the file';
      setCsvError(errorMessage);
      toast({
        title: "CSV Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    };

    reader.readAsText(file);
  };

  const processBulk = async () => {
    try {
      const items = bulkData.map(data => ({
        data,
        expiryHours: parseInt(expiryHours),
      }));

      const result = await bulkTokenizeMutation.mutateAsync(items);

      const successful = result.results.filter(r => r.success).length;
      const failed = result.results.filter(r => !r.success).length;

      toast({
        title: "Bulk Tokenization Complete",
        description: (
          <div className="space-y-2">
            <p>Successfully processed {successful} items</p>
            {failed > 0 && (
              <p className="text-destructive">Failed to process {failed} items</p>
            )}
          </div>
        ),
        duration: 5000,
      });

      const errors = result.results
        .filter(r => !r.success)
        .map(r => r.error)
        .filter((error): error is string => error !== undefined);

      if (errors.length > 0) {
        console.error("Bulk tokenization errors:", errors);
      }

      setBulkData([]);
    } catch (error) {
      toast({
        title: "Bulk Tokenization Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const addField = () => {
    setSensitiveData(prev => ({...prev, '': ''}));
  };

  const filteredCategories = fieldCategories.map(category => ({
    ...category,
    fields: category.fields.filter(field =>
      field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.fields.length > 0);

  const handleTokenize = () => {
    const allValidations = Object.entries(sensitiveData).map(([key, value]) => ({
      key,
      ...validateField(key, value)
    }));

    const invalidFields = allValidations.filter(v => !v.isValid);

    if (invalidFields.length > 0) {
      const newErrors: Record<string, string> = {};
      invalidFields.forEach(field => {
        if (field.message) {
          newErrors[field.key] = field.message;
        }
      });
      setValidationErrors(newErrors);

      toast({
        title: "Validation Error",
        description: "Please correct the invalid fields before tokenizing.",
        variant: "destructive",
      });
      return;
    }

    tokenizeMutation.mutate({
      data: sensitiveData,
      expiryHours: parseInt(expiryHours),
    });
  };

  const handleInputChange = (key: string, newValue: string) => {
    setSensitiveData(prev => ({
      ...prev,
      [key]: newValue,
    }));

    const validation = validateField(key, newValue);
    if (!validation.isValid && validation.message) {
      setValidationErrors(prev => ({
        ...prev,
        [key]: validation.message || '',  
      }));
    } else {
      setValidationErrors(prev => {
        const { [key]: _, ...rest } = prev;  
        return rest;
      });
    }
  };

  const handleViewInfo = () => {
    if (!managementToken) {
      toast({
        title: "Error",
        description: "Please enter a token",
        variant: "destructive",
      });
      return;
    }
    viewTokenInfoMutation.mutate(managementToken);
  };

  const handleExtend24h = () => {
    if (!managementToken) {
      toast({
        title: "Error",
        description: "Please enter a token",
        variant: "destructive",
      });
      return;
    }
    extendTokenMutation.mutate({ token: managementToken, hours: 24 });
  };

  const handleRevoke = () => {
    if (!managementToken) {
      toast({
        title: "Error",
        description: "Please enter a token",
        variant: "destructive",
      });
      return;
    }
    revokeTokenMutation.mutate(managementToken);
  };


  const expiringTokensQuery = useQuery({
    queryKey: ['/api/tokens/expiring', filterDays],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tokens/expiring/${filterDays}`);
      if (!res.ok) {
        throw new Error("Failed to fetch expiring tokens");
      }
      return res.json() as Promise<ExpiringToken[]>;
    }
  });

  const bulkExtendMutation = useMutation({
    mutationFn: async ({ tokens, hours }: { tokens: string[], hours: number }) => {
      const res = await apiRequest("POST", "/api/tokens/bulk-extend", { tokens, hours });
      return res.json() as Promise<BulkOperationResult>;
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Extension Complete",
        description: `Successfully extended ${data.summary.successful} out of ${data.summary.total} tokens`,
      });
      setSelectedTokens([]);
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/expiring', filterDays] });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Extension Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkRevokeMutation = useMutation({
    mutationFn: async (tokens: string[]) => {
      const res = await apiRequest("POST", "/api/tokens/bulk-revoke", { tokens });
      return res.json() as Promise<BulkOperationResult>;
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Revocation Complete",
        description: `Successfully revoked ${data.summary.successful} out of ${data.summary.total} tokens`,
      });
      setSelectedTokens([]);
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/expiring', filterDays] });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Revocation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Modern Header Design */}
        <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2 bg-primary/5 p-2 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-semibold">TokenVault</h1>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 rounded-full text-sm text-secondary-foreground">
                  <Database className="h-4 w-4" />
                  <span>{user?.username}</span>
                </div>
                <Link href="/audit-logs">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Clock className="h-4 w-4" />
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

        <main className="container mx-auto px-4 py-8 space-y-8">
          <Tutorial />

          {/* Enhanced Tab Navigation */}
          <Tabs defaultValue="tokenize" className="space-y-8">
            <div className="bg-white rounded-lg p-1 border shadow-sm">
              <TabsList className="grid grid-cols-5 gap-2">
                <TabsTrigger value="tokenize" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Key className="h-4 w-4 mr-2" />
                  Tokenize
                </TabsTrigger>
                <TabsTrigger value="detokenize">
                  <FileText className="h-4 w-4 mr-2" />
                  Detokenize
                </TabsTrigger>
                <TabsTrigger value="bulk">
                  <Database className="h-4 w-4 mr-2" />
                  Bulk Operations
                </TabsTrigger>
                <TabsTrigger value="manage">
                  <Settings className="h-4 w-4 mr-2" />
                  Management
                </TabsTrigger>
                <TabsTrigger value="expiring">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Expiring Tokens
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Improved Token Management Tab */}
            <TabsContent value="manage">
              <Card className="border-none shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary" />
                    Token Management
                  </CardTitle>
                  <CardDescription className="text-base">
                    View information, extend validity, or revoke existing tokens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <Label htmlFor="management-token" className="text-sm font-medium">
                          Token
                        </Label>
                        <Input
                          id="management-token"
                          value={managementToken}
                          onChange={(e) => setManagementToken(e.target.value)}
                          placeholder="Enter token to manage..."
                          className="mt-1.5"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleViewInfo}
                          disabled={viewTokenInfoMutation.isPending || !managementToken}
                          className="flex-1"
                          variant="outline"
                        >
                          {viewTokenInfoMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <FileText className="h-4 w-4 mr-2" />
                          )}
                          View Info
                        </Button>
                        <Button
                          onClick={handleExtend24h}
                          disabled={extendTokenMutation.isPending || !managementToken}
                          className="flex-1"
                          variant="secondary"
                        >
                          {extendTokenMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Clock className="h-4 w-4 mr-2" />
                          )}
                          Extend 24h
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleRevoke}
                          disabled={revokeTokenMutation.isPending || !managementToken}
                          className="flex-1"
                        >
                          {revokeTokenMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 mr-2" />
                          )}
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Enhanced Tokenize Tab */}
            <TabsContent value="tokenize">
              <Card className="border-none shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Key className="h-6 w-6 text-primary" />
                    Tokenize Sensitive Data
                  </CardTitle>
                  <CardDescription className="text-base">
                    Select fields to tokenize from predefined categories or add custom fields
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Search Fields</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search for fields..."
                          className="pl-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Add Custom Field</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter custom field name..."
                          value={customFieldName}
                          onChange={(e) => setCustomFieldName(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          onClick={addCustomField}
                          disabled={!customFieldName.trim()}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    {filteredCategories.map((category) => (
                      <AccordionItem value={category.name} key={category.name}>
                        <AccordionTrigger className="text-lg">
                          {category.name}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                            {category.fields.map((field) => (
                              <Card key={field.id} className="border">
                                <CardHeader className="p-4">
                                  <CardTitle className="text-sm flex justify-between">
                                    {field.name}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleFieldSelection(field.id)}
                                      disabled={field.id in sensitiveData}
                                    >
                                      {field.id in sensitiveData ? 'Added' : 'Add'}
                                    </Button>
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    {field.description}
                                  </CardDescription>
                                </CardHeader>
                              </Card>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {Object.keys(sensitiveData).length > 0 && (
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="text-lg">Selected Fields</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(sensitiveData).map(([key, value]) => (
                          <div key={key} className="flex gap-4">
                            <div className="flex-1 space-y-2">
                              <Label>{getAllFields().find(f => f.id === key)?.name || key}</Label>
                              <Input
                                value={value}
                                onChange={(e) => handleInputChange(key, e.target.value)}
                                placeholder={getAllFields().find(f => f.id === key)?.placeholder || "Enter value..."}
                                className={validationErrors[key] ? "border-destructive" : ""}
                              />
                              {validationErrors[key] && (
                                <p className="text-sm text-destructive mt-1">
                                  {validationErrors[key]}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              className="self-end"
                              onClick={() => removeField(key)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Data Retention Policy</CardTitle>
                      <CardDescription>
                        Configure how long the tokenized data should be retained
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full md:w-72 space-y-2">
                        <Label>Token Expiry</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={expiryHours}
                                onChange={(e) => setExpiryHours(e.target.value)}
                              />
                              <span className="text-sm text-muted-foreground self-center">hours</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tokens will be automatically invalidated after this duration</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-4">
                    <Button
                      variant="default"
                      onClick={handleTokenize}
                      disabled={tokenizeMutation.isPending || Object.keys(sensitiveData).length === 0}
                    >
                      {tokenizeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Tokenize Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detokenize">
              <Card className="border-none shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    Detokenize Data
                  </CardTitle>
                  <CardDescription className="text-base">
                    Retrieve sensitive data using a token
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <Label htmlFor="detokenize-query" className="text-sm font-medium">
                        Token
                      </Label>
                      <Input
                        id="detokenize-query"
                        value={detokenizeQuery}
                        onChange={(e) => setDetokenizeQuery(e.target.value)}
                        placeholder="Enter token to retrieve data..."
                        className="mt-1.5"
                      />
                    </div>
                    <Button
                      onClick={() => detokenizeMutation.mutate(detokenizeQuery)}
                      disabled={detokenizeMutation.isPending || !detokenizeQuery}
                      className="w-full"
                    >
                      {detokenizeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Retrieve Data
                    </Button>
                  </div>
                  {detokenizeMutation.data && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Retrieved Data</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {Object.entries(detokenizeMutation.data.data).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center">
                                <span className="font-medium">{key}:</span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk">
              <Card className="border-none shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Database className="h-6 w-6 text-primary" />
                    Bulk Operations
                  </CardTitle>
                  <CardDescription className="text-base">
                    Process multiple records at once using CSV upload or manual entry
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">CSV Upload</Label>
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvUpload}
                          className="cursor-pointer"
                        />
                        {csvError && (
                          <p className="text-sm text-destructive">{csvError}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Token Expiry</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={expiryHours}
                            onChange={(e) => setExpiryHours(e.target.value)}
                          />
                          <span className="text-sm text-muted-foreground self-center">hours</span>
                        </div>
                      </div>
                    </div>

                    {bulkData.length > 0 && (
                      <Card className="mt-4">
                        <CardHeader>
                          <CardTitle className="text-lg">Bulk Data Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                              {bulkData.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                                  <div className="flex-1">
                                    {Object.entries(item).map(([key, value]) => (
                                      <div key={key} className="text-sm">
                                        <span className="font-medium">{key}: </span>
                                        {value}
                                      </div>
                                    ))}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFromBulk(index)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-end gap-4">
                      <Button
                        variant="default"
                        onClick={processBulk}
                        disabled={bulkTokenizeMutation.isPending || bulkData.length === 0}
                      >
                        {bulkTokenizeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Database className="h-4 w-4 mr-2" />
                        )}
                        Process Bulk Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expiring">
              <Card className="border-none shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-primary" />
                    Expiring Tokens
                  </CardTitle>
                  <CardDescription className="text-base">
                    Manage tokens that are approaching expiration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Filter Period</Label>
                      <Select value={filterDays.toString()} onValueChange={(value) => setFilterDays(parseInt(value))}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select days" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Next 7 days</SelectItem>
                          <SelectItem value="30">Next 30 days</SelectItem>
                          <SelectItem value="90">Next 90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-expired"
                          checked={showExpired}
                          onCheckedChange={(checked) => setShowExpired(checked as boolean)}
                        />
                        <Label htmlFor="show-expired" className="text-sm font-medium">
                          Show expired tokens
                        </Label>
                      </div>
                    </div>
                  </div>

                  {expiringTokensQuery.data && expiringTokensQuery.data.length > 0 ? (
                    <ScrollArea className="h-[400px] border rounded-lg">
                      <div className="p-4 space-y-4">
                        {expiringTokensQuery.data.map((token) => (
                          <Card key={token.token} className="border">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="font-medium">{token.token}</div>
                                <div className="text-sm text-muted-foreground">
                                  Created: {format(new Date(token.created), 'PPP')}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Expires: {format(new Date(token.expires), 'PPP')}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Checkbox
                                  checked={selectedTokens.includes(token.token)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTokens([...selectedTokens, token.token]);
                                    } else {
                                      setSelectedTokens(selectedTokens.filter(t => t !== token.token));
                                    }
                                  }}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No expiring tokens found
                    </div>
                  )}

                  {selectedTokens.length > 0 && (
                    <div className="flex justify-end gap-4">
                      <Button
                        variant="secondary"
                        onClick={() => bulkExtendMutation.mutate({ tokens: selectedTokens, hours: 24 })}
                        disabled={bulkExtendMutation.isPending}
                      >
                        {bulkExtendMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Clock className="h-4 w-4 mr-2" />
                        )}
                        Extend Selected (24h)
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => bulkRevokeMutation.mutate(selectedTokens)}
                        disabled={bulkRevokeMutation.isPending}
                      >
                        {bulkRevokeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 mr-2" />
                        )}
                        Revoke Selected
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
}