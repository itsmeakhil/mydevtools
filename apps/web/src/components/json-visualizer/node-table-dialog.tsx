'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TableData } from '@/lib/json-visualizer'

export function NodeTableDialog({
  open,
  onOpenChange,
  path,
  table,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  path: string
  table: TableData | null
  title: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="truncate font-mono text-xs">{path}</DialogDescription>
        </DialogHeader>
        {table && (
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-right font-mono text-xs">#</TableHead>
                  {table.columns.map((c) => (
                    <TableHead key={c} className="font-mono text-xs">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{i}</TableCell>
                    {row.map((cell, j) => (
                      <TableCell key={j} className="max-w-[280px] truncate font-mono text-xs">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
