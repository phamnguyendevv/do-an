import { Sparkles } from 'lucide-react'
import type { AddressVerificationResult } from '../../types/assistant'

interface AddressVerificationCardProps {
  addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  ward: string
  isVerifying: boolean
  verification: AddressVerificationResult | null
  onUseSuggestedWard: (ward: string) => void
}

export function AddressVerificationCard({
  addressType,
  ward,
  isVerifying,
  verification,
  onUseSuggestedWard,
}: AddressVerificationCardProps) {
  return (
    <>
      {isVerifying && !verification && (
        <div className="mt-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-2.5 flex items-center gap-2 text-[11px] text-indigo-700 font-medium animate-pulse">
          <Sparkles size={13} className="text-indigo-600 animate-spin shrink-0" />
          <span>Gemini AI đang tự động thẩm định tuyến đường & đơn vị hành chính SPX...</span>
        </div>
      )}

      {verification && (
        <div className="mt-2.5 bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-slate-50 border border-indigo-200 rounded-lg p-2.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
              <Sparkles size={14} className="text-indigo-600 animate-pulse" />
              <span>Thông tin tổng quan do AI tạo</span>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                addressType === 'OLD_3_LEVEL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              SPX: {addressType === 'OLD_3_LEVEL' ? 'CŨ (3 cấp)' : 'MỚI (2 cấp)'}
            </span>
          </div>

          <p className="text-slate-800 text-[11px] leading-relaxed font-medium">
            {verification.overviewAi}
          </p>

          {verification.bulletPoints && verification.bulletPoints.length > 0 && (
            <ul className="text-[11px] text-slate-600 space-y-1 pl-1">
              {verification.bulletPoints.map((bp, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-indigo-500 font-bold shrink-0">•</span>
                  <span className="leading-snug">{bp}</span>
                </li>
              ))}
            </ul>
          )}

          {verification.suggestedWard && verification.suggestedWard !== ward && (
            <div className="flex items-center justify-between bg-white/90 border border-indigo-100 rounded px-2 py-1 text-[10px]">
              <span className="text-slate-600">
                Tham khảo vị trí con đường:{' '}
                <strong className="text-indigo-700">{verification.suggestedWard}</strong>
              </span>
              <button
                type="button"
                onClick={() => onUseSuggestedWard(verification.suggestedWard!)}
                className="text-indigo-600 hover:underline font-bold ml-2 cursor-pointer"
              >
                Sử dụng
              </button>
            </div>
          )}

          {verification.spxRecommendation.reason && (
            <div className="bg-indigo-100/60 rounded px-2 py-1 text-[10px] text-indigo-900 leading-tight">
              <strong>Khuyến nghị SPX:</strong> {verification.spxRecommendation.reason}
            </div>
          )}
        </div>
      )}
    </>
  )
}
