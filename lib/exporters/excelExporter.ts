import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  title?: string;
  fileName?: string;
  includeMetadata?: boolean;
  sheetName?: string;
}

export async function exportToExcel(
  data: Record<string, any>[],
  columns: string[],
  options: ExcelExportOptions = {}
): Promise<void> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    fileName = `data_export_${Date.now()}.xlsx`,
    sheetName = 'Data',
    includeMetadata = true,
  } = options;

  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data for main sheet
    const mainData = data.map((row) =>
      Object.fromEntries(
        columns.map((col) => {
          const value = row[col];
          if (value === null || value === undefined) {
            return [col, ''];
          }
          if (typeof value === 'object') {
            return [col, JSON.stringify(value)];
          }
          return [col, value];
        })
      )
    );

    // Add main data sheet
    const ws = XLSX.utils.json_to_sheet(mainData);
    
    // Auto-fit columns
    const columnWidths = columns.map((col) => ({
      wch: Math.max(
        col.length,
        Math.max(
          ...mainData.map((row) => {
            const val = row[col];
            return String(val).length;
          })
        ),
        10
      ),
    }));
    ws['!cols'] = columnWidths;

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    XLSX.utils.book_append_sheet(workbook, ws, sheetName);

    // Add metadata sheet if requested
    if (includeMetadata) {
      const metadataData = [
        ['Metadata', ''],
        ['Export Date', new Date().toLocaleString()],
        ['Total Rows', mainData.length],
        ['Total Columns', columns.length],
        ['', ''],
        ['Columns', ''],
        ...columns.map((col) => [col, '']),
      ];

      const metaWs = XLSX.utils.aoa_to_sheet(metadataData);
      metaWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, metaWs, 'Metadata');
    }

    // Write file
    XLSX.writeFile(workbook, fileName);
    console.log(`[v0] Excel exported successfully: ${fileName}`);
  } catch (error) {
    console.error('[v0] Error exporting to Excel:', error);
    throw error;
  }
}

export async function generateExcelBuffer(
  data: Record<string, any>[],
  columns: string[],
  options: ExcelExportOptions = {}
): Promise<Buffer> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    sheetName = 'Data',
    includeMetadata = true,
  } = options;

  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Limit data for large exports
    const maxRows = 50000; // Excel supports up to ~1M rows but we'll limit for performance
    const limitedData = data.slice(0, maxRows);

    // Prepare data for main sheet
    const mainData = limitedData.map((row) =>
      Object.fromEntries(
        columns.map((col) => {
          const value = row[col];
          if (value === null || value === undefined) {
            return [col, ''];
          }
          if (typeof value === 'object') {
            return [col, JSON.stringify(value)];
          }
          return [col, value];
        })
      )
    );

    // Add main data sheet
    const ws = XLSX.utils.json_to_sheet(mainData);
    
    // Auto-fit columns
    const columnWidths = columns.map((col) => ({
      wch: Math.max(
        col.length,
        Math.max(
          ...mainData.slice(0, 100).map((row) => { // Sample first 100 rows for width calculation
            const val = row[col];
            return String(val).length;
          }),
          10
        ),
      ),
    }));
    ws['!cols'] = columnWidths;

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    XLSX.utils.book_append_sheet(workbook, ws, sheetName);

    // Add metadata sheet if requested
    if (includeMetadata) {
      const metadataData = [
        ['Metadata', ''],
        ['Export Date', new Date().toLocaleString()],
        ['Total Rows', limitedData.length],
        ['Total Columns', columns.length],
        ['', ''],
        ['Columns', ''],
        ...columns.map((col) => [col, '']),
      ];

      const metaWs = XLSX.utils.aoa_to_sheet(metadataData);
      metaWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, metaWs, 'Metadata');
    }

    // Write to buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    console.log(`[v0] Excel buffer generated successfully`);
    return buffer as Buffer;
  } catch (error) {
    console.error('[v0] Error generating Excel buffer:', error);
    throw error;
  }
}
