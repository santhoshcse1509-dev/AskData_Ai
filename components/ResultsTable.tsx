'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResultsTableProps {
  columns: string[];
  rows: Record<string, any>[];
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function ResultsTable({ columns, rows }: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sort and paginate data
  const paginatedData = useMemo(() => {
    let sorted = [...rows];

    if (sortColumn) {
      sorted.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    return sorted.slice(startIndex, startIndex + rowsPerPage);
  }, [rows, currentPage, rowsPerPage, sortColumn, sortDirection]);

  const totalPages = Math.ceil(rows.length / rowsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  if (columns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No columns to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Rows per page:</label>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1 rounded bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {ROWS_PER_PAGE_OPTIONS.map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages} ({rows.length} total rows)
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((column) => (
                  <th
                    key={column}
                    onClick={() => handleSort(column)}
                    className="px-4 py-3 text-left font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {column}
                      {sortColumn === column && (
                        <span className="text-accent">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  {columns.map((column) => (
                    <td key={`${idx}-${column}`} className="px-4 py-3 text-foreground">
                      <div className="max-w-xs truncate" title={String(row[column] ?? '')}>
                        {row[column] === null || row[column] === undefined
                          ? '—'
                          : typeof row[column] === 'object'
                          ? JSON.stringify(row[column])
                          : String(row[column])}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="px-2 text-muted-foreground">...</span>}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div />
      </div>
    </div>
  );
}
