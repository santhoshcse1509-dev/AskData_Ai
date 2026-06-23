import Papa from 'papaparse';

export interface CSVExportOptions {
  fileName?: string;
  delimiter?: string;
}

export async function exportToCSV(
  data: Record<string, any>[],
  columns: string[],
  options: CSVExportOptions = {}
): Promise<void> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    fileName = `data_export_${Date.now()}.csv`,
    delimiter = ',',
  } = options;

  try {
    // Prepare data for Papa Parse
    const preparedData = data.map((row) =>
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

    // Convert to CSV
    const csv = Papa.unparse(preparedData, {
      header: true,
      delimiter: delimiter,
      encoding: 'UTF-8',
    });

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`[v0] CSV exported successfully: ${fileName}`);
  } catch (error) {
    console.error('[v0] Error exporting to CSV:', error);
    throw error;
  }
}

export async function generateCSVBuffer(
  data: Record<string, any>[],
  columns: string[],
  options: CSVExportOptions = {}
): Promise<string> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    delimiter = ',',
  } = options;

  try {
    // Limit data for large exports
    const maxRows = 100000;
    const limitedData = data.slice(0, maxRows);

    // Prepare data for Papa Parse
    const preparedData = limitedData.map((row) =>
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

    // Convert to CSV
    const csv = Papa.unparse(preparedData, {
      header: true,
      delimiter: delimiter,
      encoding: 'UTF-8',
    });

    console.log(`[v0] CSV buffer generated successfully`);
    return csv;
  } catch (error) {
    console.error('[v0] Error generating CSV buffer:', error);
    throw error;
  }
}
