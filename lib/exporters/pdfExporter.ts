import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFExportOptions {
  title?: string;
  fileName?: string;
  includeMetadata?: boolean;
}

export async function exportToPDF(
  data: Record<string, any>[],
  columns: string[],
  options: PDFExportOptions = {}
): Promise<void> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    title = 'Data Export',
    fileName = `data_export_${Date.now()}.pdf`,
    includeMetadata = true,
  } = options;

  try {
    // Create PDF document
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Add title
    pdf.setFontSize(16);
    pdf.text(title, 14, 15);

    // Add metadata if requested
    let startY = 25;
    if (includeMetadata) {
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Exported: ${new Date().toLocaleString()}`,
        14,
        startY
      );
      pdf.text(`Total rows: ${data.length}`, 14, startY + 5);
      startY = 35;
    }

    // Prepare table data
    const tableData = data.map((row) => columns.map((col) => {
      const value = row[col];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    }));

    // Generate table
    autoTable(pdf, {
      head: [columns],
      body: tableData,
      startY: startY,
      margin: 10,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        // Auto-calculate column widths
      },
    });

    // Download
    pdf.save(fileName);
    console.log(`[v0] PDF exported successfully: ${fileName}`);
  } catch (error) {
    console.error('[v0] Error exporting to PDF:', error);
    throw error;
  }
}

export async function generatePDFBuffer(
  data: Record<string, any>[],
  columns: string[],
  options: PDFExportOptions = {}
): Promise<Buffer> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    title = 'Data Export',
    includeMetadata = true,
  } = options;

  try {
    // Create PDF document
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Add title
    pdf.setFontSize(16);
    pdf.text(title, 14, 15);

    // Add metadata if requested
    let startY = 25;
    if (includeMetadata) {
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Exported: ${new Date().toLocaleString()}`,
        14,
        startY
      );
      pdf.text(`Total rows: ${data.length}`, 14, startY + 5);
      startY = 35;
    }

    // Prepare table data - limit for large datasets
    const maxRows = 5000;
    const limitedData = data.slice(0, maxRows);
    const tableData = limitedData.map((row) =>
      columns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      })
    );

    // Generate table
    autoTable(pdf, {
      head: [columns],
      body: tableData,
      startY: startY,
      margin: 10,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Return as Buffer
    return Buffer.from(pdf.output('arraybuffer'));
  } catch (error) {
    console.error('[v0] Error generating PDF buffer:', error);
    throw error;
  }
}
