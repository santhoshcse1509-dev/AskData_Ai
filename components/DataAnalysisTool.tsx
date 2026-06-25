'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FileUploadFlow from './FileUploadFlow';
import QueryInterface from './QueryInterface';
import Header from './Header';
import { UploadedDataset } from '@/lib/types';

interface DataAnalysisToolProps {
  sessionId: string;
}

export default function DataAnalysisTool({ sessionId }: DataAnalysisToolProps) {
  const [datasets, setDatasets] = useState<UploadedDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<UploadedDataset | null>(null);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  // Load available datasets
  useEffect(() => {
    const loadDatasets = async () => {
      if (!sessionId) return;
      
      setIsLoadingDatasets(true);
      try {
        const response = await fetch('/api/list-tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (response.ok) {
          const data = await response.json();
          setDatasets(data.datasets || []);
          
          // Auto-select first dataset if available
          if (data.datasets.length > 0 && !selectedDataset) {
            setSelectedDataset(data.datasets[0]);
          }
        }
      } catch (error) {
        console.error('[v0] Error loading datasets:', error);
      } finally {
        setIsLoadingDatasets(false);
      }
    };

    loadDatasets();
  }, [sessionId, selectedDataset]);

  const handleDatasetAdded = (dataset: UploadedDataset) => {
    setDatasets((prev) => [...prev, dataset]);
    setSelectedDataset(dataset);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="upload">Upload Data</TabsTrigger>
            <TabsTrigger value="query" disabled={datasets.length === 0}>
              Query Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Import Your Dataset</CardTitle>
                <CardDescription>
                  Upload CSV or Excel files. Files are stored securely in S3 and parsed to create queryable tables.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadFlow sessionId={sessionId} onDatasetAdded={handleDatasetAdded} />
              </CardContent>
            </Card>

            {datasets.length > 0 && (
              <Card className="mt-8 bg-card border-border">
                <CardHeader>
                  <CardTitle>Uploaded Datasets</CardTitle>
                  <CardDescription>
                    {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} available
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {datasets.map((dataset) => (
                      <div
                        key={dataset.datasetId}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedDataset?.datasetId === dataset.datasetId
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50'
                        }`}
                        onClick={() => setSelectedDataset(dataset)}
                      >
                        <h3 className="font-semibold text-foreground truncate">{dataset.fileName}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {dataset.rowCount.toLocaleString()} rows × {dataset.columnCount} columns
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Uploaded {new Date(dataset.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="query">
            {selectedDataset ? (
              <QueryInterface sessionId={sessionId} dataset={selectedDataset} />
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="pt-8">
                  <p className="text-center text-muted-foreground">
                    Please upload and select a dataset to begin querying.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
