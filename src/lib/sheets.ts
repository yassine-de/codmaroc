import axios from 'axios'

interface SheetRow {
  'Order ID (A)': number
  'Customer Name (B)': string
  'Phone Number (C)': string
  'Address (D)': string
  'City (E)': string
  'Product Name (F)': string
  'SKU (G)': string
  'Quantity (H)': number
  'Price (I)': number
  'Total Amount (J)': number
}

export async function readSpreadsheet(spreadsheetId: string, sheetName: string) {
  try {
    // Use the public export URL which doesn't require authentication
    const response = await axios.get(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
      {
        headers: {
          'Accept': 'text/csv'
        }
      }
    )

    // Parse CSV data
    const rows = response.data
      .split('\n')
      .map(row => row.split(',')
        .map(cell => cell.trim().replace(/^"|"$/g, '')) // Remove quotes
      )
      .filter((row, index) => index > 0) // Skip header row
      .map(row => ({
        'Order ID (A)': parseInt(row[0]) || 0,
        'Customer Name (B)': row[1] || '',
        'Phone Number (C)': row[2] || '',
        'Address (D)': row[3] || '',
        'City (E)': row[4] || '',
        'Product Name (F)': row[5] || '',
        'SKU (G)': row[6] || '',
        'Quantity (H)': parseInt(row[7]) || 0,
        'Price (I)': parseFloat(row[8]) || 0,
        'Total Amount (J)': parseFloat(row[9]) || 0
      } as SheetRow))
      .filter(row => row['Order ID (A)'] > 0) // Filter out empty rows

    if (rows.length === 0) {
      throw new Error('No data found in sheet')
    }

    return rows
  } catch (error: any) {
    console.error('Error reading spreadsheet:', error)

    if (error.response?.status === 404) {
      throw new Error('Spreadsheet not found. Please check the spreadsheet ID.')
    }
    if (error.response?.status === 403) {
      throw new Error('Access denied. Please make sure the spreadsheet is publicly accessible (Anyone with the link can view).')
    }
    if (error.message === 'Network Error') {
      throw new Error('Network error. Please check your internet connection and make sure the spreadsheet ID is correct.')
    }

    throw new Error('Failed to read spreadsheet. Please make sure the spreadsheet is publicly accessible and the ID is correct.')
  }
}