import { AlertTriangle } from 'lucide-react'
import type { SpxAddressAlert } from '../../types/assistant'

interface SpxAddressAlertBannerProps {
  alert: SpxAddressAlert
  onDismiss: () => void
}

export function SpxAddressAlertBanner({ alert, onDismiss }: SpxAddressAlertBannerProps) {
  return (
    <div className="bg-rose-50 border border-rose-300 rounded-lg p-2.5 text-xs text-rose-800 flex items-start gap-2 shadow-xs">
      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-bold text-rose-900">⚠️ SPX tự điền địa chỉ chưa khớp!</div>
        <div className="text-[11px] mt-0.5">
          Đã thử cả 2 cấp & 3 cấp nhưng SPX đang chọn:{' '}
          <span className="font-bold text-rose-700">{alert.displayedCascader || '(Chưa chọn)'}</span>
        </div>
        <div className="text-[10px] text-rose-600 mt-0.5">{alert.reason}</div>
        <div className="text-[10px] font-semibold text-rose-900 mt-1">
          👉 Vui lòng mở tab SPX và chọn thủ công lại ô Tỉnh/Quận/Xã!
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-rose-400 hover:text-rose-700 text-xs ml-1 cursor-pointer"
      >
        ✕
      </button>
    </div>
  )
}
