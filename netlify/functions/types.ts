export interface Integration {
  id: number
  user_id: number
  spreadsheet_id: string
  sheet_name: string
  auto_sync: boolean
  last_sync_at: string | null
  user?: {
    name: string
    email: string
  }
}

export interface SheetData {
  orderId: string
  customerName: string
  phone: string
  address: string
  city: string
  productName: string
  sku: string
  quantity: number
  price: number
  totalAmount: number
}

export interface SyncResult {
  new: number
  skipped: number
  skippedSkus: string[]
  skippedExistingOrders: number
  invalidData: Array<{
    row: number
    reason: string
    data: any
  }>
} 