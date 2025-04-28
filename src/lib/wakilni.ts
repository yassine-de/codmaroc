// Wakilni API Integration

const API_URL = 'https://api.wakilni.com/api/v2'

interface WakilniAuth {
  key: string
  secret: string
}

interface WakilniResponse {
  success?: boolean
  data?: any
  message?: string
  bulk_id?: string
  delivery_id?: string
  tracking_url?: string
  tracking_id?: string
  order_details?: {
    created_at_date: string
    sender_name: string
    sender_address: string
    sender_phone: string
    recipient_name: string
    recipient_address: string
    recipient_phone: string
    packages_count: string[]
    payment_method: string
    collection_amount: number | null
    comments: string
  }
}

interface WakilniOrderItem {
  name: string
  quantity: number
  price: number
  sku?: string
}

interface WakilniBulkData {
  location_id?: number
  longitude?: number
  latitude?: number
  floor?: number
  area?: string
}

interface WakilniOrderData {
  receiver_first_name: string
  receiver_last_name: string
  receiver_phone_number: string
  receiver_area: string
  receiver_building: string
  receiver_floor: number
  receiver_location_id: number
  receiver_id: number
  waybill: number
  currency: number // 1 -> USD, 2 -> LBP
  cash_collection_type_id: number // paid: 54, on delivery: 52
  collection_amount: number
  note?: string
  packages: {
    quantity: number
    type_id: number // paper: 57, regular box: 58, small box: 59, large box: 60, very large box: 61
    name: string
    sku?: string
  }[]
  location_id: number
  get_order_details: boolean
}

interface OrderData {
  customer_name: string
  phone: string
  address: string
  city: string
  items: {
    name: string
    quantity: number
    price: number
    sku?: string
  }[]
  total_amount: number
  reference_id: string
  notes?: string
}

export class WakilniService {
  private token: string | null = null
  private auth: WakilniAuth

  constructor(auth: WakilniAuth) {
    this.auth = auth
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token

    try {
      const params = new URLSearchParams({
        key: this.auth.key,
        secret: this.auth.secret
      }).toString()

      const response = await fetch(`${API_URL}/third_party/auth_token?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get auth token: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      if (!data.token) {
        throw new Error('No token received from Wakilni')
      }
      
      this.token = data.token
      return data.token
    } catch (error) {
      console.error('Error getting Wakilni auth token:', error)
      throw error
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<WakilniResponse> {
    try {
      const token = await this.getToken()
      
      // Ensure endpoint starts with forward slash
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
      
      const url = `${API_URL}${normalizedEndpoint}`
      console.log('Making request to:', url)
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`Wakilni API error: ${response.status} ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Wakilni request error:', error)
      throw error
    }
  }

  async startBulk(data: WakilniBulkData = {}): Promise<WakilniResponse> {
    // Feste Werte für den Bulk-Start
    const bulkData = {
      location_id: 1,
      area: "Beirut",
      longitude: 35.5018,
      latitude: 33.8938,
      floor: 1
    }

    const response = await this.request('/clients/start_bulk', {
      method: 'POST',
      body: JSON.stringify(bulkData)
    })
    
    if (!response.success) {
      console.error('Wakilni startBulk Fehler:', response)
      throw new Error(response.message || JSON.stringify(response))
    }
    return response
  }

  async addDelivery(bulkId: string, orderData: Partial<WakilniOrderData>): Promise<WakilniResponse> {
    if (!bulkId) {
      throw new Error('No bulk_id provided');
    }

    // Standardwerte und formatierte Daten
    const deliveryData = {
      // Empfängerdaten mit Fallback-Werten
      receiver_first_name: orderData?.receiver_first_name || "Test",
      receiver_last_name: orderData?.receiver_last_name || "Customer",
      receiver_phone_number: orderData?.receiver_phone_number || "+961123456789",
      receiver_area: orderData?.receiver_area || "Beirut",
      receiver_building: orderData?.receiver_building || "Main Building",
      receiver_floor: 1,
      
      // Von der API geforderte Pflichtfelder
      receiver_location_id: 1,
      receiver_id: 1,
      waybill: 1,
      
      // Zahlungsinformationen
      currency: 1,
      cash_collection_type_id: 54,
      collection_amount: 0,
      
      // Paketinformationen
      packages: [
        {
          quantity: 1,
          type_id: 58,
          name: "Test Package",
          sku: "TEST-SKU"
        }
      ],
      
      // Zusätzliche Felder
      location_id: 1,
      get_order_details: true
    }

    console.log('Adding delivery with data:', JSON.stringify(deliveryData, null, 2));
    console.log('Bulk ID:', bulkId);

    const endpoint = `clients/add_delivery/${encodeURIComponent(bulkId)}`
    
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(deliveryData)
    })
  }

  async endBulk(bulkId: string): Promise<WakilniResponse> {
    return this.request(`/clients/end_bulk/${bulkId}`, {
      method: 'POST'
    })
  }

  async getOrderStatus(orderId: string): Promise<WakilniResponse> {
    return this.request(`/clients/orders/${orderId}`)
  }

  async getOrderHistory(trackingId: string): Promise<WakilniResponse> {
    return this.request(`/clients/tracking/orders/${trackingId}`)
  }

  async createOrder(orderData: Partial<WakilniOrderData>): Promise<WakilniResponse> {
    try {
      // 1. Start bulk
      const bulkResponse = await this.startBulk()
      if (!bulkResponse.bulk_id) {
        throw new Error('No bulk_id received: ' + JSON.stringify(bulkResponse))
      }

      // 2. Add delivery
      const deliveryResponse = await this.addDelivery(bulkResponse.bulk_id, orderData)
      
      // 3. End bulk
      await this.endBulk(bulkResponse.bulk_id)

      // Wenn wir hier ankommen, war alles erfolgreich
      return {
        success: true,
        delivery_id: deliveryResponse.delivery_id,
        tracking_url: deliveryResponse.tracking_url,
        tracking_id: deliveryResponse.tracking_id,
        order_details: deliveryResponse.order_details,
        message: 'Order created successfully'
      }
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  }

  async createOrderFromData(orderData: OrderData): Promise<WakilniResponse> {
    try {
      // Bulk-Start
      const bulkResponse = await this.startBulk()
      if (!bulkResponse.success || !bulkResponse.bulk_id) {
        console.error('Bulk-Start fehlgeschlagen:', bulkResponse)
        throw new Error(bulkResponse.message || 'Failed to start bulk order: ' + JSON.stringify(bulkResponse))
      }

      // Order-Daten konvertieren
      const wakilniOrderData = this.convertOrderData(orderData)

      // Order hinzufügen
      const addResponse = await this.addDelivery(bulkResponse.bulk_id, wakilniOrderData)
      if (!addResponse.success) {
        console.error('addDelivery fehlgeschlagen:', addResponse)
        throw new Error(addResponse.message || 'Failed to add delivery: ' + JSON.stringify(addResponse))
      }

      // Bulk beenden
      const endResponse = await this.endBulk(bulkResponse.bulk_id)
      if (!endResponse.success) {
        console.error('endBulk fehlgeschlagen:', endResponse)
        throw new Error(endResponse.message || 'Failed to end bulk order: ' + JSON.stringify(endResponse))
      }

      return endResponse
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  }

  convertOrderData(order: OrderData): WakilniOrderData {
    // Name in Vor- und Nachnamen aufteilen
    const nameParts = order.customer_name.split(' ')
    const firstName = nameParts[0] || 'Customer'
    const lastName = nameParts.slice(1).join(' ') || 'Unknown'

    // Adresse in Gebäude und Bereich aufteilen
    const addressParts = order.address.split(',')
    const building = addressParts[0] || order.address
    const area = order.city || 'Beirut'

    return {
      receiver_first_name: firstName,
      receiver_last_name: lastName,
      receiver_phone_number: order.phone,
      receiver_area: area,
      receiver_building: building,
      receiver_floor: 1,
      receiver_location_id: 1,
      receiver_id: 1,
      waybill: 1,
      currency: 1, // USD
      cash_collection_type_id: 52, // On Delivery
      collection_amount: order.total_amount,
      note: order.notes,
      packages: order.items.map(item => ({
        quantity: item.quantity,
        type_id: 58, // Regular box
        name: item.name,
        sku: item.sku
      })),
      location_id: 1,
      get_order_details: true
    }
  }
}

// Status mapping zwischen unseren Status und Wakilni Status
export const WAKILNI_STATUS = {
  PENDING: 1,
  CONFIRMED: 2,
  PROCESSING: 3,
  SUCCESS: 4,
  FAILED: 5,
  DECLINED: 6,
  CANCELED: 7,
  CLOSED_FAILED: 8,
  POSTPONED: 9,
  PENDING_CANCELLATION: 10
}

export const WAKILNI_STATUS_LABELS: Record<number, string> = {
  [WAKILNI_STATUS.PENDING]: 'Pending',
  [WAKILNI_STATUS.CONFIRMED]: 'Confirmed',
  [WAKILNI_STATUS.PROCESSING]: 'Processing',
  [WAKILNI_STATUS.SUCCESS]: 'Success',
  [WAKILNI_STATUS.FAILED]: 'Failed',
  [WAKILNI_STATUS.DECLINED]: 'Declined',
  [WAKILNI_STATUS.CANCELED]: 'Canceled',
  [WAKILNI_STATUS.CLOSED_FAILED]: 'Closed Failed',
  [WAKILNI_STATUS.POSTPONED]: 'Postponed',
  [WAKILNI_STATUS.PENDING_CANCELLATION]: 'Pending Cancellation'
} 