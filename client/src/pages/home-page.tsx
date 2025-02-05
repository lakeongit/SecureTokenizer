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
import { Loader2, Shield, Key, Clock, Search, Plus } from "lucide-react";
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
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Tokenization Complete",
        description: `Successfully processed ${data.results.filter(r => r.success).length} items`,
      });
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

  const addToBulk = () => {
    if (Object.keys(sensitiveData).length > 0) {
      setBulkData(prev => [...prev, { ...sensitiveData }]);
      setSensitiveData({});
    }
  };

  const processBulk = () => {
    const items = bulkData.map(data => ({
      data,
      expiryHours: parseInt(expiryHours),
    }));
    bulkTokenizeMutation.mutate(items);
  };

  const removeFromBulk = (index: number) => {
    setBulkData(prev => prev.filter((_, i) => i !== index));
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n');
        const headers = rows[0].split(',').map(h => h.trim());

        const newBulkData = rows.slice(1)
          .filter(row => row.trim())
          .map(row => {
            const values = row.split(',').map(v => v.trim());
            const item: Record<string, string> = {};
            headers.forEach((header, index) => {
              if (values[index]) {
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
        setCsvError('Failed to parse CSV file. Please check the format.');
        toast({
          title: "CSV Import Failed",
          description: "Failed to parse the CSV file. Please check the format and try again.",
          variant: "destructive",
        });
      }
    };

    reader.onerror = () => {
      setCsvError('Failed to read the file.');
      toast({
        title: "CSV Import Failed",
        description: "Failed to read the file. Please try again.",
        variant: "destructive",
      });
    };

    reader.readAsText(file);
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
          <Tabs defaultValue="tokenize" className="space-y-8">
            <TabsList>
              <TabsTrigger value="tokenize">Tokenize Data</TabsTrigger>
              <TabsTrigger value="detokenize">Detokenize</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
              <TabsTrigger value="manage">Token Management</TabsTrigger>
            </TabsList>

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
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setSensitiveData(prev => ({
                                    ...prev,
                                    [key]: newValue,
                                  }));

                                  const validation = validateField(key, newValue);
                                  if (!validation.isValid && validation.message) {
                                    setValidationErrors(prev => ({
                                      ...prev,
                                      [key]: validation.message
                                    }));
                                  } else {
                                    setValidationErrors(prev => {
                                      const { [key]: _, ...rest } = prev;
                                      return rest;
                                    });
                                  }
                                }}
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

            <TabsContent value="manage">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Token Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Token</Label>
                    <Input
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      placeholder="Enter token to manage..."
                    />
                  </div>

                  {selectedToken && (
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="w-48 space-y-2">
                          <Label>Extension (hours)</Label>
                          <Input
                            type="number"
                            value={extensionHours}
                            onChange={(e) => setExtensionHours(e.target.value)}
                          />
                        </div>
                        <Button
                          className="self-end"
                          onClick={() => extendTokenMutation.mutate({
                            token: selectedToken,
                            hours: parseInt(extensionHours),
                          })}
                          disabled={extendTokenMutation.isPending}
                        >
                          {extendTokenMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Extend Expiry
                        </Button>
                      </div>

                      <div className="pt-4 border-t">
                        <Button
                          variant="destructive"
                          onClick={() => revokeTokenMutation.mutate(selectedToken)}
                          disabled={revokeTokenMutation.isPending}
                        >
                          {revokeTokenMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Revoke Token
                        </Button>
                      </div>
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