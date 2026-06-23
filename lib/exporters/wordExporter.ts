import { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx';

export interface WordExportOptions {
  title?: string;
  fileName?: string;
  includeMetadata?: boolean;
}

export async function exportToWord(
  data: Record<string, any>[],
  columns: string[],
  options: WordExportOptions = {}
): Promise<void> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    title = 'Data Export',
    fileName = `data_export_${Date.now()}.docx`,
    includeMetadata = true,
  } = options;

  try {
    const buffer = await generateWordBuffer(data, columns, { title, includeMetadata });

    // Create blob and download
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`[v0] Word document exported successfully: ${fileName}`);
  } catch (error) {
    console.error('[v0] Error exporting to Word:', error);
    throw error;
  }
}

export async function generateWordBuffer(
  data: Record<string, any>[],
  columns: string[],
  options: WordExportOptions = {}
): Promise<Buffer> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    title = 'Data Export',
    includeMetadata = true,
  } = options;

  try {
    // Limit data for large exports
    const maxRows = 5000;
    const limitedData = data.slice(0, maxRows);

    const sections: any[] = [];

    // Add title
    sections.push(
      new Paragraph({
        text: title,
        style: 'Heading1',
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Add metadata if requested
    if (includeMetadata) {
      sections.push(
        new Paragraph({
          text: `Export Date: ${new Date().toLocaleString()}`,
          style: 'Normal',
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Total Rows: ${limitedData.length}`,
          style: 'Normal',
          spacing: { after: 200 },
        })
      );
    }

    // Create table rows
    const headerCells = columns.map(
      (col) =>
        new TableCell({
          children: [
            new Paragraph({
              text: col,
              bold: true,
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: {
            type: 'clear',
            fill: 'D3D3D3',
          },
        })
    );

    const bodyRows = limitedData.map(
      (row) =>
        new TableRow({
          children: columns.map(
            (col) =>
              new TableCell({
                children: [
                  new Paragraph({
                    text: formatCellValue(row[col]),
                    alignment: AlignmentType.LEFT,
                  }),
                ],
              })
          ),
        })
    );

    // Create table
    const table = new Table({
      rows: [
        new TableRow({
          children: headerCells,
        }),
        ...bodyRows,
      ],
      width: {
        size: 100,
        type: 'percentage',
      },
    });

    sections.push(table);

    // Create document
    const doc = new Document({
      sections: [
        {
          children: sections,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    console.log(`[v0] Word buffer generated successfully`);
    return buffer;
  } catch (error) {
    console.error('[v0] Error generating Word buffer:', error);
    throw error;
  }
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return String(value);
}
