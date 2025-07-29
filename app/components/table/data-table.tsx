import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

type Column<T> = {
  key: keyof T;
  header: string;
  className?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
};

export function DataTable<T extends object>({
  data,
  columns,
}: DataTableProps<T>) {
  return (
    <div className="border shadow-sm overflow-x-auto text-foreground">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns?.map((col, colIndex) => {
                const value = row[col.key];
                return (
                  <TableCell key={colIndex} className={col.className}>
                    {col.render ? col.render(value, row) : String(value)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
