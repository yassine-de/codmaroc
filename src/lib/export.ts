import { utils, write } from 'xlsx'
import { saveAs } from 'file-saver'

export function exportToExcel(data: any[], filename: string) {
  const ws = utils.json_to_sheet(data)
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Sheet1')
  const wbout = write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${filename}.xlsx`)
}

export function exportToCSV(data: any[], filename: string) {
  const ws = utils.json_to_sheet(data)
  const csv = utils.sheet_to_csv(ws)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, `${filename}.csv`)
}