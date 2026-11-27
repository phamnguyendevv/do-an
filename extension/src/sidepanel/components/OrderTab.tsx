import {
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import type {
  OrderDraft,
  ShippingCarrier,
  SpxAddressAlert,
} from '../../types/assistant'
import { SpxAddressAlertBanner } from './SpxAddressAlertBanner'

interface OrderTabProps {
  spxAddressAlert: SpxAddressAlert | null
  onDismissAlert: () => void
  orderDraft: OrderDraft
  setOrderDraft: React.Dispatch<React.SetStateAction<OrderDraft>>
  isVerifyingAddress: boolean
  onVerifyAddress: () => void
  shippingCarrier: ShippingCarrier
  setShippingCarrier: (carrier: ShippingCarrier) => void
  isCreatingOrder: boolean
  onCreateOrder: (carrier: ShippingCarrier) => void
  onRpaFillSpx: () => void
  spxScreenshot: string | null
  spxFilledData: Record<string, any> | null
  spxScreenshotTime: number | null
  activeCustomerName: string
  activeCustomerPhone: string
  createdOrderCode: string | null
  spxTrackingCode: string | null
  webAppUrl: string
}

export function OrderTab({
  spxAddressAlert,
  onDismissAlert,
  orderDraft,
  setOrderDraft,
  isVerifyingAddress,
  onVerifyAddress,
  shippingCarrier,
  setShippingCarrier,
  isCreatingOrder,
  onCreateOrder,
  onRpaFillSpx,
  spxScreenshot,
  spxFilledData,
  spxScreenshotTime,
  activeCustomerName,
  activeCustomerPhone,
  createdOrderCode,
  spxTrackingCode,
  webAppUrl,
}: OrderTabProps) {
  return (
    <div className="space-y-3">
      {spxAddressAlert && (
        <SpxAddressAlertBanner alert={spxAddressAlert} onDismiss={onDismissAlert} />
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
        <div className="font-bold text-xs text-slate-800 border-b pb-2 flex items-center justify-between">
          <span>Thông tin đơn hàng & Vận chuyển</span>
          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
            Chi tiết
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Tên khách hàng:</label>
            <input
              type="text"
              value={orderDraft.customerName}
              onChange={(e) => setOrderDraft({ ...orderDraft, customerName: e.target.value })}
              className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Số điện thoại:</label>
            <input
              type="text"
              value={orderDraft.phone}
              onChange={(e) => setOrderDraft({ ...orderDraft, phone: e.target.value })}
              className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-500 font-medium">Địa chỉ giao hàng:</label>
              <button
                type="button"
                onClick={onVerifyAddress}
                className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>✨ AI Phân tách 3 cấp / 2 cấp</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={orderDraft.address}
              onChange={(e) => setOrderDraft({ ...orderDraft, address: e.target.value })}
              placeholder="Ví dụ: 548/6 Nguyễn Thái Sơn, Phường An Nhơn, Quận Gò Vấp, TPHCM"
              className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 resize-none text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-500 font-medium">Loại địa chỉ SPX:</label>
              <button
                type="button"
                disabled={isVerifyingAddress}
                onClick={onVerifyAddress}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Sparkles
                  size={11}
                  className={isVerifyingAddress ? 'animate-spin text-indigo-600' : 'text-indigo-600'}
                />
                {isVerifyingAddress ? 'Đang kiểm tra...' : '✨ Kiểm tra với Gemini AI'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-1.5 p-2 rounded border cursor-pointer text-xs transition-all ${
                  orderDraft.addressType === 'OLD_3_LEVEL'
                    ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="spx_address_type"
                  checked={orderDraft.addressType === 'OLD_3_LEVEL'}
                  onChange={() => setOrderDraft((p) => ({ ...p, addressType: 'OLD_3_LEVEL' }))}
                />
                <span>CŨ (3 cấp: Tỉnh-Huyện-Xã)</span>
              </label>
              <label
                className={`flex items-center gap-1.5 p-2 rounded border cursor-pointer text-xs transition-all ${
                  orderDraft.addressType === 'NEW_2_LEVEL'
                    ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="spx_address_type"
                  checked={orderDraft.addressType === 'NEW_2_LEVEL'}
                  onChange={() => setOrderDraft((p) => ({ ...p, addressType: 'NEW_2_LEVEL' }))}
                />
                <span>MỚI (2 cấp: Tỉnh-Xã)</span>
              </label>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2 text-xs">
            <div className="font-semibold text-slate-700 flex items-center justify-between">
              <span>Phân tách để điền form SPX:</span>
              <span className="text-[10px] text-emerald-600 font-bold">
                {orderDraft.addressType === 'OLD_3_LEVEL' ? '● 3 cấp' : '● 2 cấp'}
              </span>
            </div>
            <div>
              <label className="block text-slate-500 text-[11px] mb-0.5">
                * Địa chỉ chi tiết (Số nhà, tên đường):
              </label>
              <input
                type="text"
                value={orderDraft.detailAddress}
                onChange={(e) => setOrderDraft({ ...orderDraft, detailAddress: e.target.value })}
                placeholder="548/6 Nguyễn Thái Sơn"
                className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">* Tỉnh / Thành phố:</label>
                <input
                  type="text"
                  value={orderDraft.province}
                  onChange={(e) => setOrderDraft({ ...orderDraft, province: e.target.value })}
                  placeholder="Hồ Chí Minh"
                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
                />
              </div>
              {orderDraft.addressType === 'OLD_3_LEVEL' ? (
                <div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">
                    * Quận / Huyện (Cấp 2):
                  </label>
                  <input
                    type="text"
                    value={orderDraft.district}
                    onChange={(e) => setOrderDraft({ ...orderDraft, district: e.target.value })}
                    placeholder="Quận Gò Vấp"
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">
                    * Phường / Xã (Cấp 2):
                  </label>
                  <input
                    type="text"
                    value={orderDraft.ward}
                    onChange={(e) => setOrderDraft({ ...orderDraft, ward: e.target.value })}
                    placeholder="Xã/Phường"
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
                  />
                </div>
              )}
            </div>
            {orderDraft.addressType === 'OLD_3_LEVEL' && (
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">
                  * Phường / Xã (Cấp 3):
                </label>
                <input
                  type="text"
                  value={orderDraft.ward}
                  onChange={(e) => setOrderDraft({ ...orderDraft, ward: e.target.value })}
                  placeholder="Phường An Nhơn"
                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Tiền thu hộ (COD):</label>
              <input
                type="number"
                value={orderDraft.codAmount}
                onChange={(e) => setOrderDraft({ ...orderDraft, codAmount: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Khối lượng (gram):</label>
              <input
                type="number"
                value={orderDraft.weightGram}
                onChange={(e) => setOrderDraft({ ...orderDraft, weightGram: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-slate-500 font-medium mb-1.5">Kênh vận chuyển:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setShippingCarrier('SPX')}
                className={`py-1.5 px-2 rounded border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  shippingCarrier === 'SPX'
                    ? 'bg-amber-50 border-amber-500 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Truck className="w-3 h-3 text-amber-600" />
                SPX
              </button>
              <button
                type="button"
                onClick={() => setShippingCarrier('GHN')}
                className={`py-1.5 px-2 rounded border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  shippingCarrier === 'GHN'
                    ? 'bg-orange-50 border-orange-500 text-orange-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                GHN
              </button>
              <button
                type="button"
                onClick={() => setShippingCarrier('MANUAL')}
                className={`py-1.5 px-2 rounded border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  shippingCarrier === 'MANUAL'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tự giao
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <button
            onClick={() => onCreateOrder(shippingCarrier)}
            disabled={isCreatingOrder}
            className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
            {isCreatingOrder
              ? 'Đang tạo đơn & Đẩy vận chuyển...'
              : `⚡ Xác nhận tạo đơn & Đẩy ${shippingCarrier}`}
          </button>

          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase block">
              Phương án 2 (RPA Tự điền Form SPX):
            </span>
            <button
              type="button"
              onClick={onRpaFillSpx}
              className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Chuyển thẳng sang tab SPX bạn đã đăng nhập, tự động điền form và giữ nguyên tab để kiểm tra (chưa bấm nút tạo đơn)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-white" />
              🚀 Điền tự động vào cổng SPX (Giữ tab kiểm tra)
            </button>
            <p className="text-[10px] text-slate-500 italic text-center">
              Vào thẳng single-order/create ➔ Tự điền Tên, SĐT, Địa chỉ, COD & Hàng hóa ➔ Chụp ảnh màn hình ➔ Giữ nguyên tab (chưa bấm tạo đơn).
            </p>
          </div>

          {spxScreenshot && (
            <div className="bg-emerald-50/80 border border-emerald-300 rounded-lg p-2.5 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Ảnh chụp màn hình form SPX đã điền
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">
                  {spxScreenshotTime ? new Date(spxScreenshotTime).toLocaleTimeString('vi-VN') : 'Vừa xong'}
                </span>
              </div>

              <div className="bg-white rounded p-2 text-[10.5px] space-y-1 border border-emerald-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách nhận:</span>
                  <span className="font-bold text-slate-800">
                    {spxFilledData?.recipientName || activeCustomerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-bold text-slate-800">
                    {spxFilledData?.recipientPhone || activeCustomerPhone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tiền thu hộ (COD):</span>
                  <span className="font-bold text-emerald-700">
                    {Number(spxFilledData?.codAmount || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between items-center pt-0.5 border-t border-slate-100">
                  <span className="text-slate-500">Nút "Tạo đơn":</span>
                  <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                    🛡️ Chưa bấm (đúng yêu cầu)
                  </span>
                </div>
              </div>

              <div className="relative rounded overflow-hidden border border-emerald-200 bg-slate-50">
                <img
                  src={spxScreenshot}
                  alt="Ảnh chụp màn hình form SPX"
                  className="w-full h-auto object-cover max-h-40 rounded"
                />
                <a
                  href={spxScreenshot}
                  download={`spx-filled-order-${spxScreenshotTime || 'evidence'}.png`}
                  className="absolute bottom-1.5 right-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow flex items-center gap-1 cursor-pointer"
                  title="Tải ảnh bằng chứng về máy"
                >
                  <Download className="w-3 h-3" />
                  Tải ảnh
                </a>
              </div>
            </div>
          )}
        </div>

        {(createdOrderCode || spxTrackingCode) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-emerald-900">
              <Check className="w-4 h-4 text-emerald-600" />
              Đã hoàn tất xử lý & đồng bộ đơn hàng!
            </p>
            {createdOrderCode && (
              <div className="bg-white p-2 rounded border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Mã đơn hệ thống
                  </span>
                  <span className="font-bold text-sm text-indigo-700">{createdOrderCode}</span>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Đã lưu vào Web Quản Lý
                </span>
              </div>
            )}
            {spxTrackingCode && (
              <div className="bg-white p-2 rounded border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Mã vận đơn SPX
                  </span>
                  <span className="font-bold text-sm text-amber-700">{spxTrackingCode}</span>
                </div>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Shopee Xpress
                </span>
              </div>
            )}
            {createdOrderCode && (
              <a
                href={`${webAppUrl.replace(/\/+$/, '')}/orders`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs mt-1 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Mở xem trên Web Quản Lý
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
