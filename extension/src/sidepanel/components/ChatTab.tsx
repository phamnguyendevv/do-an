import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  RefreshCw,
  Send,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import type {
  AddressVerificationResult,
  AnalyzedData,
  OrderDraft,
  ShippingCarrier,
  SpxAddressAlert,
} from '../../types/assistant'
import { formatCleanCustomerAddress } from '../../utils/address-format'
import { AddressVerificationCard } from './AddressVerificationCard'
import { SpxAddressAlertBanner } from './SpxAddressAlertBanner'

const MISSING_FIELD_LABELS: Record<string, string> = {
  items: 'Chưa có sách khách đặt mua (items)',
  customerName: 'Tên người nhận (customerName)',
  phone: 'Số điện thoại (phone)',
  detailAddress: 'Số nhà, tên đường (detailAddress)',
  province: 'Tỉnh / Thành phố (province)',
  district: 'Quận / Huyện (district)',
  ward: 'Phường / Xã (ward)',
}

function getIntentBadge(intent: string) {
  switch (intent) {
    case 'ORDER_CONFIRMATION':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">🟢 Khách chốt đơn</span>
    case 'ORDER_MODIFICATION':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">🟠 Đổi / sửa đơn</span>
    case 'ORDER_INTENT':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">🔵 Muốn mua (chưa chốt)</span>
    case 'INQUIRY':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">🟣 Hỏi hàng / tư vấn</span>
    case 'ORDER_CANCELLATION':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">🔴 Khách hủy đơn</span>
    default:
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">⚪ Khác</span>
  }
}

interface ChatTabProps {
  rawChatText: string
  setRawChatText: (val: string) => void
  extractStatus: string
  setExtractStatus: (val: string) => void
  spxAddressAlert: SpxAddressAlert | null
  onDismissAlert: () => void
  isExtracting: boolean
  isAnalyzing: boolean
  onExtract: (scrollUp: boolean) => void
  onAnalyze: () => void
  analyzedData: AnalyzedData | null
  customerZaloName: string
  customerZaloPhone: string
  orderDraft: OrderDraft
  setOrderDraft: React.Dispatch<React.SetStateAction<OrderDraft>>
  isVerifyingAddress: boolean
  addressVerification: AddressVerificationResult | null
  onVerifyAddress: () => void
  copiedReply: boolean
  sentToZalo: boolean
  onSendToChatBox: (text: string) => void
  onCopyReply: (text: string) => void
  createdOrderCode: string | null
  spxTrackingCode: string | null
  webAppUrl: string
  isInfoComplete: boolean
  isCreatingOrder: boolean
  onFastCreateOrder: (carrier: ShippingCarrier) => void
  onRpaFillSpx: () => void
  onGoToOrderTab: () => void
  onGoToTracking: (trackingCode: string) => void
}

export function ChatTab({
  rawChatText,
  setRawChatText,
  extractStatus,
  setExtractStatus,
  spxAddressAlert,
  onDismissAlert,
  isExtracting,
  isAnalyzing,
  onExtract,
  onAnalyze,
  analyzedData,
  customerZaloName,
  customerZaloPhone,
  orderDraft,
  setOrderDraft,
  isVerifyingAddress,
  addressVerification,
  onVerifyAddress,
  copiedReply,
  sentToZalo,
  onSendToChatBox,
  onCopyReply,
  createdOrderCode,
  spxTrackingCode,
  webAppUrl,
  isInfoComplete,
  isCreatingOrder,
  onFastCreateOrder,
  onRpaFillSpx,
  onGoToOrderTab,
  onGoToTracking,
}: ChatTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <button
          onClick={() => onExtract(false)}
          disabled={isExtracting}
          className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium py-1.5 px-2 rounded shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          title="Tự động cuộn và lấy toàn bộ tin nhắn cuộc trò chuyện Zalo"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isExtracting ? 'animate-spin' : ''}`} />
          Lấy full tin Zalo
        </button>
        <button
          onClick={() => onExtract(true)}
          disabled={isExtracting}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium py-1.5 px-2 rounded shadow-xs flex items-center justify-center gap-1 transition-colors"
          title="Cuộn ngược lên sâu hơn để nạp sạch toàn bộ lịch sử trò chuyện"
        >
          <span>⬆️ Cuộn sâu lấy hết</span>
        </button>
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 px-2.5 rounded shadow-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'AI đang bóc...' : 'Phân tích AI'}
        </button>
      </div>

      {extractStatus && (
        <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 flex items-center justify-between">
          <span>💬 {extractStatus}</span>
          <button
            onClick={() => setExtractStatus('')}
            className="text-indigo-400 hover:text-indigo-700 text-xs ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {spxAddressAlert && (
        <SpxAddressAlertBanner alert={spxAddressAlert} onDismiss={onDismissAlert} />
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-2xs">
        <textarea
          value={rawChatText}
          onChange={(e) => setRawChatText(e.target.value)}
          placeholder="Dán hoặc bấm 'Lấy full tin Zalo' để trích xuất hội thoại..."
          className="w-full text-xs text-slate-700 border-0 focus:ring-0 resize-none h-24 outline-none placeholder:text-slate-400"
        />
      </div>

      {analyzedData && (
        <div className="space-y-3 pt-1">
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ý định khách:
              </span>
              {getIntentBadge(analyzedData.intent)}
            </div>
            <p className="text-xs text-slate-700 italic border-l-2 border-indigo-400 pl-2">
              "{analyzedData.summary}"
            </p>
          </div>

          {analyzedData.missingFields.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Còn thiếu thông tin để tạo đơn:</p>
                <ul className="list-disc list-inside text-amber-700 mt-1">
                  {analyzedData.missingFields.map((field) => (
                    <li key={field}>{MISSING_FIELD_LABELS[field] || field}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2">
            <div className="font-bold text-xs text-slate-700 flex items-center justify-between">
              <span>Thông tin nhận hàng</span>
              {(analyzedData.customer.customerName || customerZaloName) &&
              (analyzedData.customer.phone || customerZaloPhone) &&
              (analyzedData.customer.detailAddress ||
                analyzedData.customer.rawAddress ||
                orderDraft.address) ? (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đủ thông tin nhận hàng
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                  Chưa đủ
                </span>
              )}
            </div>

            <div className="text-xs space-y-1 text-slate-600">
              <div>
                <span className="font-medium text-slate-500">Khách hàng:</span>{' '}
                <span className="text-slate-800 font-semibold">
                  {analyzedData.customer.customerName || customerZaloName || '(Chưa có)'}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-500">SĐT:</span>{' '}
                <span className="text-slate-800 font-semibold">
                  {analyzedData.customer.phone || customerZaloPhone || '(Chưa có)'}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-500">Địa chỉ:</span>{' '}
                <span className="text-slate-800">
                  {formatCleanCustomerAddress(
                    analyzedData.customer.detailAddress,
                    analyzedData.customer.ward,
                    analyzedData.customer.district,
                    analyzedData.customer.province,
                  ) ||
                    analyzedData.customer.rawAddress ||
                    '(Chưa có)'}
                </span>
              </div>

              {(!orderDraft.province ||
                (!orderDraft.district && orderDraft.addressType === 'OLD_3_LEVEL')) && (
                <div className="mt-1 bg-amber-50 border border-amber-300 rounded p-1.5 flex items-center justify-between text-[11px] text-amber-800">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                    <span>
                      Thiếu <b>{!orderDraft.province ? 'Tỉnh/Thành' : 'Quận/Huyện'}</b>
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isVerifyingAddress}
                    onClick={onVerifyAddress}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Sparkles size={10} className={isVerifyingAddress ? 'animate-spin' : ''} />
                    <span>{isVerifyingAddress ? 'Đang tra cứu...' : '✨ Gemini tra cứu'}</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="font-medium text-slate-500">Loại địa chỉ SPX:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOrderDraft((p) => ({ ...p, addressType: 'OLD_3_LEVEL' }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      orderDraft.addressType === 'OLD_3_LEVEL'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    CŨ (3 cấp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderDraft((p) => ({ ...p, addressType: 'NEW_2_LEVEL' }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      orderDraft.addressType === 'NEW_2_LEVEL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    MỚI (2 cấp)
                  </button>
                  <div className="ml-1 flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shadow-xs">
                    <Sparkles
                      size={11}
                      className={isVerifyingAddress ? 'animate-spin text-indigo-600' : 'text-indigo-600'}
                    />
                    <span>{isVerifyingAddress ? 'Đang thẩm định...' : 'Gemini AI (Mặc định)'}</span>
                    <button
                      type="button"
                      disabled={isVerifyingAddress}
                      onClick={onVerifyAddress}
                      title="Chạy lại thẩm định địa chỉ với Gemini AI"
                      className="ml-0.5 text-indigo-500 hover:text-indigo-800 cursor-pointer"
                    >
                      ↻
                    </button>
                  </div>
                </div>
              </div>

              <AddressVerificationCard
                addressType={orderDraft.addressType}
                ward={orderDraft.ward}
                isVerifying={isVerifyingAddress}
                verification={addressVerification}
                onUseSuggestedWard={(suggestedWard) =>
                  setOrderDraft((p) => ({ ...p, ward: suggestedWard }))
                }
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2">
            <div className="font-bold text-xs text-slate-700">
              Sách đặt mua ({analyzedData.items.length})
            </div>
            <div className="divide-y divide-slate-100">
              {analyzedData.items.map((item, idx) => (
                <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                  <div className="pr-2">
                    <p className="font-medium text-slate-800">{item.bookTitle}</p>
                    {item.bookId ? (
                      <span className="text-[10px] text-emerald-600">Khớp mã: {item.bookId}</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Chưa khớp kho</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-indigo-600">x{item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {analyzedData.suggestedReply && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">Gợi ý trả lời khách:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSendToChatBox(analyzedData.suggestedReply)}
                    className="text-[11px] text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    title="Điền thẳng vào ô chat Zalo và sao chép"
                  >
                    {sentToZalo ? (
                      <Check className="w-3 h-3 text-emerald-300" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    {sentToZalo ? 'Đã điền Zalo' : 'Điền vào Zalo'}
                  </button>
                  <button
                    onClick={() => onCopyReply(analyzedData.suggestedReply)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    {copiedReply ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedReply ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-indigo-950 bg-white p-2.5 rounded border border-indigo-200 select-text whitespace-pre-line leading-relaxed">
                {analyzedData.suggestedReply}
              </p>
            </div>
          )}

          {createdOrderCode && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-emerald-900 text-xs">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Đã tạo đơn lên Web Quản Lý!
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                  PENDING
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border border-emerald-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Mã đơn Web</span>
                  <span className="font-bold text-xs text-indigo-700">{createdOrderCode}</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Vận đơn SPX</span>
                  <span className="font-bold text-xs text-amber-700">{spxTrackingCode || 'Chưa gắn'}</span>
                </div>
              </div>

              <div className="pt-0.5 flex gap-2">
                <a
                  href={`${webAppUrl.replace(/\/+$/, '')}/orders`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors text-[11px] shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Xem trên Web Quản Lý
                </a>
                {spxTrackingCode && (
                  <button
                    onClick={() => onGoToTracking(spxTrackingCode)}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-1.5 px-2.5 rounded flex items-center justify-center gap-1 transition-colors text-[11px] cursor-pointer shadow-2xs"
                    title="Tra cứu hành trình vận đơn"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Tracking
                  </button>
                )}
              </div>
            </div>
          )}

          {!createdOrderCode && (
            <div className="space-y-2 pt-1">
              {isInfoComplete ? (
                <>
                  <button
                    onClick={() => onFastCreateOrder('SPX')}
                    disabled={isCreatingOrder}
                    className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-[0.99]"
                  >
                    <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" />
                    {isCreatingOrder
                      ? 'Đang tạo đơn & Đẩy SPX...'
                      : '⚡ Tạo đơn & Đẩy SPX ngay (1-Chạm)'}
                  </button>

                  <button
                    onClick={onGoToOrderTab}
                    className="w-full text-slate-500 hover:text-indigo-600 text-[11px] font-medium py-1 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Chỉnh sửa thông tin đơn (COD, địa chỉ, kênh khác)
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={onRpaFillSpx}
                      className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      title="Chuyển thẳng sang tab SPX, tự động điền Tên, SĐT, Địa chỉ, COD và giữ tab để bạn tự kiểm tra thủ công"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-white" />
                      🚀 Điền đơn vào SPX (Tự động điền & Giữ tab)
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onRpaFillSpx}
                    className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Chuyển thẳng sang tab SPX, tự động điền form và giữ tab để bạn tự kiểm tra thủ công"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                    🚀 Điền đơn vào SPX (Tự động điền & Giữ tab)
                  </button>
                  <button
                    onClick={onGoToOrderTab}
                    className="w-full text-slate-500 hover:text-slate-800 text-[11px] font-medium py-1 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Bổ sung thêm thông tin đơn nếu cần
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
