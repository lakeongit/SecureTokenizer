
import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/utils";

const SAMPLE_DATA = Array(10).fill(null).map((_, i) => ({
  data: {
    ssn: `123-45-${6789 + i}`,
    credit_card: `4111-1111-1111-${1111 + i}`,
    patient_id: `PT${100000 + i}`,
  },
  expiryHours: 24
}));

export default function BulkTestPage() {
  const { toast } = useToast();
  const [results, setResults] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const runBulkTest = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/bulk-tokenize", SAMPLE_DATA);
      const data = await res.json();
      setResults(data.results);
      toast({
        title: "Bulk Test Complete",
        description: `Processed ${data.results.length} items`,
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Bulk Testing</h1>
        <Button onClick={runBulkTest} disabled={isLoading}>
          Run Bulk Test ({SAMPLE_DATA.length} items)
        </Button>
        
        {results.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Results</h2>
            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[500px]">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
