import { ExternalLink, Search } from 'lucide-react'
import type { TrackingResult } from '../../types/assistant'

interface TrackingTabProps {
  trackingInput: string
  setTrackingInput: (val: string) => void
  isTracking: boolean
  trackingResult: TrackingResult | null
  onTrack: () => void
}

export function TrackingTab({
  trackingInput,
  setTrackingInput,
  isTracking,
  trackingResult,
  onTrack,
}: TrackingTabProps) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
        <div className="font-bold text-xs text-slate-800">Tra cứu vận đơn Shopee Xpress</div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nhập mã vận đơn SPXVN..."
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isTracking) {
                onTrack()
              }
            }}
            className="flex-1 text-xs border border-slate-300 rounded px-2.5 py-1.5 uppercase font-medium"
          />
          <button
            onClick={onTrack}
            disabled={isTracking}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Tra cứu
          </button>
        </div>
      </div>

      {trackingResult && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Mã vận đơn</span>
              <p className="font-bold text-xs text-amber-700">{trackingResult.trackingCode}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  trackingResult.status === 'DELIVERED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : trackingResult.status === 'RETURNED' || trackingResult.status === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {trackingResult.statusText}
              </span>
              {trackingResult.carrierUrl && (
                <a
                  href={trackingResult.carrierUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-amber-600 p-0.5"
                  title="Mở cổng tra cứu SPX Express trực tiếp"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {trackingResult.order && (
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span>Đơn hàng liên kết:</span>
                <span className="text-indigo-600 font-bold">
                  {trackingResult.order.orderCode || `#${trackingResult.order.id}`}
                </span>
              </div>
              <p className="text-slate-600 truncate">
                Khách: <strong>{trackingResult.order.customerName}</strong> (
                {trackingResult.order.customerPhone})
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {trackingResult.order.customerAddress}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500">Thu hộ COD / Tổng:</span>
                <span className="font-bold text-emerald-700">
                  {Number(trackingResult.order.total || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-700">Hành trình chi tiết:</span>
            <div className="border-l-2 border-amber-300 ml-2 pl-3 space-y-3">
              {trackingResult.checkpoints && trackingResult.checkpoints.length > 0 ? (
                trackingResult.checkpoints.map((cp, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />
                    <span className="text-[10px] font-semibold text-slate-400">{cp.time}</span>
                    <p className="text-slate-700 text-xs">{cp.desc}</p>
                    {cp.location && (
                      <span className="text-[10px] text-slate-400 block">
                        Địa điểm: {cp.location}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs">Chưa có mốc hành trình.</p>
              )}
            </div>
          </div>

          <a
            href={`https://spx.vn/track?tracking_number=${encodeURIComponent(trackingResult.trackingCode)}`}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Xem trực tiếp trên spx.vn
          </a>
        </div>
      )}
    </div>
  )
}
