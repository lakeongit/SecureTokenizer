import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Shield, Key, Clock, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [detokenizeQuery, setDetokenizeQuery] = useState("");
  const [sensitiveData, setSensitiveData] = useState<Record<string, string>>({});
  const [expiryHours, setExpiryHours] = useState<string>("24");

  // Add field to sensitive data
  const addField = () => {
    setSensitiveData(prev => ({
      ...prev,
      [`field${Object.keys(prev).length + 1}`]: "",
    }));
  };

  // Remove field from sensitive data
  const removeField = (key: string) => {
    const { [key]: _, ...rest } = sensitiveData;
    setSensitiveData(rest);
  };

  // Tokenize mutation
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
    },
    onError: (error: Error) => {
      toast({
        title: "Tokenization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Detokenize mutation
  const detokenizeMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/detokenize", { token });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Data Retrieved",
        description: "Token successfully detokenized",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Detokenization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
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
          </TabsList>

          <TabsContent value="tokenize">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Tokenize Sensitive Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                        onClick={() => removeField(key)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <div className="w-48 space-y-2">
                    <Label>Expiry (hours)</Label>
                    <Input
                      type="number"
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={addField}>Add Field</Button>
                  <Button
                    variant="default"
                    onClick={() => tokenizeMutation.mutate({
                      data: sensitiveData,
                      expiryHours: parseInt(expiryHours),
                    })}
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
        </Tabs>
      </main>
    </div>
  );
}
