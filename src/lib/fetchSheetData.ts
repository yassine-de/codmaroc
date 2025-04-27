import { readSpreadsheet } from '../lib/sheets'

export async function fetchSheetData(integration: any) {
  const convertArabicToLatinNumbers = (str: string): string =>
    str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())

  const formatPhoneForWhatsApp = (phone: string): string => {
    let clean = phone.replace(/[^0-9]/g, '')
    if (clean.startsWith('00961')) return '+' + clean.substring(2)
    if (clean.startsWith('0')) clean = clean.substring(1)
    if (!clean.startsWith('961')) clean = '961' + clean
    return '+' + clean
  }

  const rows = await readSpreadsheet(integration.spreadsheet_id, integration.sheet_name)

  return rows.map((row: any) => {
    const rawPhone = row['Phone Number (C)']?.toString() || ''
    const phone = formatPhoneForWhatsApp(convertArabicToLatinNumbers(rawPhone).replace(/'/g, ''))

    const rawPrice = row['Price (I)']?.toString() || '0'
    const price = Number(convertArabicToLatinNumbers(rawPrice).replace(',', '.'))

    const quantity = parseInt(convertArabicToLatinNumbers(row['Quantity (H)']?.toString() || '1'))
    const total = price * quantity

    return {
      orderId: convertArabicToLatinNumbers(row['Order ID (A)'] || ''),
      customerName: row['Customer Name (B)'] || '',
      phone,
      address: row['Address (D)'] || '',
      city: row['City (E)'] || '',
      productName: row['Product Name (F)'] || '',
      sku: row['SKU (G)'] || '',
      quantity,
      price,
      totalAmount: total
    }
  })
}
