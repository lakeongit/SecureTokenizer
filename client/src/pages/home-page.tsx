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
import { Loader2, Shield, Key, Clock, Search, Plus, Filter } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
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
        description: "Token successfully detokenized",
      });
      setDetokenizeQuery(""); // Clear the input after successful detokenization
    },
    onError: (error: Error) => {
      toast({
        title: "Detokenization Failed",
        description: error.message,
        variant: "destructive",
      });
      setDetokenizeQuery(""); // Clear the input on error
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
      // Fix the type issue by ensuring we're only setting string values
      setValidationErrors(prev => ({
        ...prev,
        [key]: validation.message || '',  // Ensure we always set a string
      }));
    } else {
      setValidationErrors(prev => {
        const { [key]: _, ...rest } = prev;  // Remove the key while maintaining type safety
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
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Secure Tokenization System</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Logged in as {user?.username}
              </span>
              <Link href="/audit-logs">
                <Button variant="outline" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Audit Logs
                </Button>
              </Link>
              <Button
                variant="outline"
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
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tutorial />
          <Tabs defaultValue="tokenize" className="space-y-8">
            <TabsList>
              <TabsTrigger value="tokenize">Tokenize Data</TabsTrigger>
              <TabsTrigger value="detokenize">Detokenize</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
              <TabsTrigger value="manage">Token Management</TabsTrigger>
              <TabsTrigger value="expiring">Expiring Tokens</TabsTrigger>
            </TabsList>

            <TabsContent value="manage">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Token Management
                  </CardTitle>
                  <CardDescription>
                    View information, extend validity, or revoke existing tokens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="management-token">Token</Label>
                      <Input
                        id="management-token"
                        value={managementToken}
                        onChange={(e) => setManagementToken(e.target.value)}
                        placeholder="Enter token to manage..."
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleViewInfo}
                        disabled={viewTokenInfoMutation.isPending || !managementToken}
                      >
                        {viewTokenInfoMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        View Info
                      </Button>
                      <Button
                        onClick={handleExtend24h}
                        disabled={extendTokenMutation.isPending || !managementToken}
                      >
                        {extendTokenMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Extend 24h
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleRevoke}
                        disabled={revokeTokenMutation.isPending || !managementToken}
                      >
                        {revokeTokenMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Revoke
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tokenize">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Tokenize Sensitive Data
                  </CardTitle>
                  <CardDescription>
                    Select fields to tokenize from predefined categories or add custom fields
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <Label>Search Fields</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search for fields..."
                          className="pl-8"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label>Add Custom Field</Label>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Detokenize Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Token</Label>
                    <div className="flex gap-4">
                      <Input
                        value={detokenizeQuery}
                        onChange={(e) => setDetokenizeQuery(e.target.value)}
                        placeholder="Enter token to retrieve data..."
                      />
                      <Button
                        onClick={() => detokenizeMutation.mutate(detokenizeQuery)}
                        disabled={detokenizeMutation.isPending || !detokenizeQuery}
                      >
                        {detokenizeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Retrieve Data
                      </Button>
                    </div>
                  </div>

                  {detokenizeMutation.data && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Retrieved Data</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <pre className="text-sm">
                            {JSON.stringify(detokenizeMutation.data.data, null, 2)}
                          </pre>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Bulk Tokenization
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV file or manually add items for bulk tokenization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Upload CSV File</Label>
                    <div className="flex flex-col gap-2">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-muted-foreground">
                        CSV should have headers matching the field names you want to tokenize
                      </p>
                      {csvError && (
                        <p className="text-sm text-destructive">{csvError}</p>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or add items manually
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(sensitiveData).map(([key, value]) => (
                      <div key={key} className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <Label>Field Name</Label>
                          <Input
                            value={key}
                            onChange={(e) => {
                              const { [key]: value, ...rest } = sensitiveData;
                              setSensitiveData({
                                ...rest,
                                [e.target.value]: value,
                              });
                            }}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label>Value</Label>
                          <Input
                            value={value}
                            onChange={(e) => {
                              setSensitiveData(prev => ({
                                ...prev,
                                [key]: e.target.value,
                              }));
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          className="self-end"
                          onClick={() => {
                            const { [key]: _, ...rest } = sensitiveData;
                            setSensitiveData(rest);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={() => addToBulk()} disabled={Object.keys(sensitiveData).length === 0}>
                      Add to Batch
                    </Button>
                    <Button onClick={() => addField()}>Add Field</Button>
                  </div>

                  {bulkData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Batch Items ({bulkData.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-4">
                            {bulkData.map((item, index) => (
                              <div key={index} className="flex items-center justify-between gap-4 p-2 border rounded">
                                <span className="text-sm truncate">
                                  {Object.entries(item)[0]?.[0]}: {Object.entries(item)[0]?.[1]}
                                  {Object.keys(item).length > 1 ? ` (+${Object.keys(item).length - 1} more)` : ''}
                                </span>
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

                  {bulkData.length > 0 && (
                    <div className="space-y-4">
                      <div className="w-48 space-y-2">
                        <Label>Expiry (hours)</Label>
                        <Input
                          type="number"
                          value={expiryHours}
                          onChange={(e) => setExpiryHours(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={processBulk}
                        disabled={bulkTokenizeMutation.isPending}
                      >
                        {bulkTokenizeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Process Batch ({bulkData.length} items)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="expiring">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Tokens Expiring Soon
                  </CardTitle>
                  <CardDescription>
                    View and manage tokens that will expire in the next {filterDays} days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label>Search Tokens</Label>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by token..."
                            className="pl-8"
                            value={tokenSearch}
                            onChange={(e) => setTokenSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <Label>Filter Options</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full">
                              <Filter className="h-4 w-4 mr-2" />
                              Filter
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setFilterDays(7)}>
                              Next 7 days
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterDays(30)}>
                              Next 30 days
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterDays(90)}>
                              Next 90 days
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {selectedTokens.length > 0 && (
                      <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
                        <span>{selectedTokens.length} tokens selected</span>
                        <div className="space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => bulkExtendMutation.mutate({
                              tokens: selectedTokens,
                              hours: 24
                            })}
                            disabled={bulkExtendMutation.isPending}
                          >
                            {bulkExtendMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Extend Selected
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to revoke the selected tokens? This action cannot be undone.')) {
                                bulkRevokeMutation.mutate(selectedTokens);
                              }
                            }}
                            disabled={bulkRevokeMutation.isPending}
                          >
                            {bulkRevokeMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Revoke Selected
                          </Button>
                        </div>
                      </div>
                    )}

                    {expiringTokensQuery.isLoading ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : expiringTokensQuery.isError ? (
                      <div className="text-destructive text-center p-4">
                        Failed to load expiring tokens
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {expiringTokensQuery.data
                          ?.filter(token =>
                            token.token.toLowerCase().includes(tokenSearch.toLowerCase())
                          )
                          .map((token) => (
                            <Card key={token.token} className="p-4">
                              <div className="flex items-start gap-4">
                                <Checkbox
                                  checked={selectedTokens.includes(token.token)}
                                  onCheckedChange={(checked) => {
                                    setSelectedTokens(prev =>
                                      checked
                                        ? [...prev, token.token]
                                        : prev.filter(t => t !== token.token)
                                    );
                                  }}
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                      <p className="font-medium">Token: {token.token}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Created: {format(new Date(token.created), 'PPp')}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Expires: {format(new Date(token.expires), 'PPp')}
                                      </p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setManagementToken(token.token);
                                        handleExtend24h();
                                      }}
                                    >
                                      Extend 24h
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
}