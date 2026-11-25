export interface ChatMessage {
  sender: 'customer' | 'seller' | 'system'
  text: string
}

export interface SpxRecommendation {
  mode: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  modeText: string
  levels: string[]
  reason: string
}

export interface AddressVerificationResult {
  address: string
  isValid: boolean
  isExisting: boolean
  province: string
  district: string
  ward: string
  suggestedWard?: string
  detailAddress: string
  addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  streetInfo?: string
  administrativeHistory?: string
  spxRecommendation: SpxRecommendation
  overviewAi: string
  bulletPoints: string[]
}

export interface AnalyzedData {
  intent: string
  intentConfidence: number
  summary: string
  customer: {
    customerName?: string
    phone?: string
    province?: string
    district?: string
    ward?: string
    detailAddress?: string
    rawAddress?: string
    addressType?: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
    spxFormat?: unknown
    verification?: AddressVerificationResult
  }
  items: Array<{
    bookId: string | null
    bookTitle: string
    quantity: number
    price?: number
    action?: string
    originalText?: string
  }>
  missingFields: string[]
  isReadyToCreateOrder: boolean
  suggestedReply: string
  shippingFee?: number
  totalCod?: number
}

export interface OrderDraft {
  customerName: string
  phone: string
  address: string
  province: string
  district: string
  ward: string
  detailAddress: string
  codAmount: number
  weightGram: number
  notes: string
  addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
}

export type ShippingCarrier = 'SPX' | 'GHN' | 'MANUAL'

export interface SpxAddressAlert {
  time: number
  inputText: string
  displayedCascader: string
  reason: string
}

export interface TrackingCheckpoint {
  time: string
  desc: string
  location?: string
}

export interface TrackingResult {
  trackingCode: string
  carrierUrl: string
  status: string
  statusText: string
  source?: string
  order?: {
    id?: number
    orderCode?: string
    customerName?: string
    customerPhone?: string
    customerAddress?: string
    total?: number
  } | null
  checkpoints: TrackingCheckpoint[]
}
