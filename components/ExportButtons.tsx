'use client';

import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnalyzeResponse } from '@/lib/types';
import { exportToPDF, generatePDFBuffer } from '@/lib/exporters/pdfExporter';
import { exportToExcel, generateExcelBuffer } from '@/lib/exporters/excelExporter';
import { exportToCSV, generateCSVBuffer } from '@/lib/exporters/csvExporter';
import { exportToWord, generateWordBuffer } from '@/lib/exporters/wordExporter';

interface ExportButtonsProps {
  results: AnalyzeResponse;
}

type ExportFormat = 'pdf' | 'excel' | 'csv' | 'word';

interface ExportState {
  format: ExportFormat | null;
  isLoading: boolean;
  status: 'idle' | 'success' | 'error';
  message: string;
}

export default function ExportButtons({ results }: ExportButtonsProps) {
  const [exportState, setExportState] = useState<ExportState>({
    format: null,
    isLoading: false,
    status: 'idle',
    message: '',
  });

  const handleExport = async (format: ExportFormat) => {
    setExportState({
      format,
      isLoading: true,
      status: 'idle',
      message: '',
    });

    try {
      const isLargeDataset = results.rows.length > 5000;
      const timestamp = new Date().toISOString().slice(0, 10);
      const baseFileName = `data_export_${timestamp}`;

      if (format === 'pdf') {
        if (isLargeDataset) {
          // For large datasets, show message
          throw new Error(
            'PDF export for datasets > 5000 rows should be triggered via email. Please contact support.'
          );
        }
        await exportToPDF(results.rows, results.columns, {
          title: 'Data Export',
          fileName: `${baseFileName}.pdf`,
        });
      } else if (format === 'excel') {
        await exportToExcel(results.rows, results.columns, {
          fileName: `${baseFileName}.xlsx`,
        });
      } else if (format === 'csv') {
        await exportToCSV(results.rows, results.columns, {
          fileName: `${baseFileName}.csv`,
        });
      } else if (format === 'word') {
        await exportToWord(results.rows, results.columns, {
          fileName: `${baseFileName}.docx`,
        });
      }

      setExportState({
        format,
        isLoading: false,
        status: 'success',
        message: `${format.toUpperCase()} exported successfully!`,
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setExportState((prev) => ({
          ...prev,
          status: 'idle',
          message: '',
        }));
      }, 3000);
    } catch (error) {
      console.error('[v0] Export error:', error);
      setExportState({
        format,
        isLoading: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Export failed',
      });
    }
  };

  const exportFormats: { format: ExportFormat; icon: React.ReactNode; label: string }[] = [
    { format: 'pdf', icon: <FileText className="w-4 h-4" />, label: 'PDF' },
    { format: 'excel', icon: <Download className="w-4 h-4" />, label: 'Excel' },
    { format: 'csv', icon: <Download className="w-4 h-4" />, label: 'CSV' },
    { format: 'word', icon: <FileText className="w-4 h-4" />, label: 'Word' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {exportFormats.map(({ format, icon, label }) => (
          <Button
            key={format}
            variant="outline"
            size="sm"
            onClick={() => handleExport(format)}
            disabled={exportState.isLoading}
            className="gap-2"
          >
            {exportState.isLoading && exportState.format === format ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                {icon}
                Export {label}
              </>
            )}
          </Button>
        ))}
      </div>

      {exportState.status !== 'idle' && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            exportState.status === 'success'
              ? 'bg-green-500/10 text-green-700 border border-green-500/50'
              : 'bg-red-500/10 text-red-700 border border-red-500/50'
          }`}
        >
          {exportState.status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{exportState.message}</span>
        </div>
      )}
    </div>
  );
}
