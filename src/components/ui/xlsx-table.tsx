import React from "react";
import * as XLSX from "xlsx";

interface Column {
  header: string;
  key: string;
}

interface XlsxTableProps {
  data: any[];
  columns: Column[];
  filename?: string;
  children: React.ReactNode;
  className?: string;
}

export function XlsxTable({ data, columns, filename = "export.xlsx", children, className }: XlsxTableProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const formattedData = data.map((item) => {
      const row: Record<string, any> = {};
      columns.forEach((col) => {
        row[col.header] = item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : "";
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className={className} onClick={handleExport} role="button" tabIndex={0}>
      {children}
    </div>
  );
}