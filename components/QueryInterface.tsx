'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadedDataset, AnalyzeResponse } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

import ResultsTable from './ResultsTable';
import ExportButtons from './ExportButtons';

interface QueryInterfaceProps {
  sessionId: string;
  dataset: UploadedDataset;
}

export default function QueryInterface({ sessionId, dataset }: QueryInterfaceProps) {
  const [query, setQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
  
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
      setResults(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          datasetId: dataset.tableId,
          question: query,
          useCache: true,
          rawData: dataset.rawData, // Pass parsed data for demo mode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query failed');
      }

     const data: AnalyzeResponse = await response.json();
setError(null);
setResults(data);

console.log("Toast should appear now");
toast.success('Query executed successfully!');
setQueryHistory((prev) => {
  const updated = [query, ...prev.filter((q) => q !== query)];
  return updated.slice(0, 5);
});

setQuery('');
    } 
    catch (err) {
  console.error('[v0] Query error:', err);

  const message =
    err instanceof Error ? err.message : 'An error occurred';

  setError(message);

  toast.error(message);
}
    finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <Card className="bg-card border-border sticky top-4 z-10 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle>Ask a Question</CardTitle>
          <CardDescription>
            Query: <span className="text-accent font-medium">{dataset.fileName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Show all sales over $1000 from the last month..."
              className="flex-1 px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !query.trim()} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Query
                </>
              )}
            </Button>
          </form>
            {queryHistory.length > 0 && (
  <div className="mt-3 flex flex-wrap gap-2">
    {queryHistory.map((item, index) => (
      <button
        key={index}
        type="button"
        onClick={() => setQuery(item)}
        className="px-3 py-1 text-xs rounded-full bg-muted border border-border hover:bg-muted/80"
      >
        {item}
      </button>
    ))}
  </div>
)}
        </CardContent>
      </Card>

    
    {/* Loading Skeleton */}
{isLoading && (
  <Card className="bg-card border-border">
    <CardContent className="pt-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
)}

      {/* Results */}
      { !isLoading && results && !error && (
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {results.rowCount.toLocaleString()} rows returned {results.isCached && '(cached)'} in{' '}
                  {results.executionTime}ms
                </CardDescription>
              </div>
              <ExportButtons results={results} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Query Info */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Analysis:</strong> {results.summary}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-accent hover:underline">
                    Show SQL Query
                  </summary>
                  <pre className="mt-2 p-3 rounded bg-background text-xs overflow-auto max-h-32">
                    <code>{results.sqlQuery}</code>
                  </pre>
                </details>
              </div>
                  {/* Results Table */}
              {results.rows.length > 0 ? (
                <ResultsTable columns={results.columns} rows={results.rows} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No results found for this query.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!results && !error && (
        <Card className="bg-card border-border">
          <CardContent className="pt-8 text-center">
            <p className="text-muted-foreground mb-2">Ask a natural language question to analyze your data</p>
            <p className="text-sm text-muted-foreground">
              Examples: &quot;Show top 10 entries&quot;, &quot;Average of column X&quot;, &quot;Filter where Y {'>'} 100&quot;
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
