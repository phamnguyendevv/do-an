import { useState } from 'react'
import { KeyRound, LogIn, LogOut, ShieldCheck } from 'lucide-react'

interface SettingsPanelProps {
  backendUrl: string
  onSaveBackendUrl: (url: string) => Promise<void>
  webAppUrl: string
  onChangeWebAppUrl: (url: string) => void
  userEmail: string
  authToken: string
  assistantApiKey: string
  onSaveApiKey: (key: string) => Promise<void>
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  onLogout: () => Promise<void>
}

export function SettingsPanel({
  backendUrl,
  onSaveBackendUrl,
  webAppUrl,
  onChangeWebAppUrl,
  userEmail,
  authToken,
  assistantApiKey,
  onSaveApiKey,
  onLogin,
  onLogout,
}: SettingsPanelProps) {
  const [draftBackendUrl, setDraftBackendUrl] = useState(backendUrl)
  const [permissionNote, setPermissionNote] = useState('')
  const [loginEmail, setLoginEmail] = useState(userEmail || '')
  const [loginPassword, setLoginPassword] = useState('')
  const [draftApiKey, setDraftApiKey] = useState(assistantApiKey)
  const [authStatus, setAuthStatus] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleSaveUrl = async () => {
    await onSaveBackendUrl(draftBackendUrl.trim())
    setPermissionNote('Đã lưu URL và kiểm tra quyền truy cập host!')
    setTimeout(() => setPermissionNote(''), 3000)
  }

  const handleLoginSubmit = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setAuthStatus('Vui lòng nhập email và mật khẩu.')
      return
    }
    setIsLoggingIn(true)
    setAuthStatus('')
    const res = await onLogin(loginEmail.trim(), loginPassword)
    setIsLoggingIn(false)
    if (res.ok) {
      setLoginPassword('')
      setAuthStatus('Đăng nhập thành công!')
    } else {
      setAuthStatus(res.error || 'Đăng nhập thất bại.')
    }
  }

  const handleSaveKey = async () => {
    await onSaveApiKey(draftApiKey.trim())
    setAuthStatus(draftApiKey.trim() ? 'Đã lưu API Key!' : 'Đã xóa API Key.')
    setTimeout(() => setAuthStatus(''), 2500)
  }

  return (
    <div className="bg-indigo-50 border-b border-indigo-200 p-3 text-xs flex flex-col gap-2.5 max-h-96 overflow-y-auto">
      <div>
        <label className="block font-semibold text-indigo-900 mb-1">Backend API URL:</label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={draftBackendUrl}
            onChange={(e) => setDraftBackendUrl(e.target.value)}
            className="flex-1 border border-indigo-300 rounded px-2 py-1 bg-white"
          />
          <button
            type="button"
            onClick={() => {
              void handleSaveUrl()
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded font-semibold cursor-pointer shrink-0"
          >
            Lưu & Cấp quyền
          </button>
        </div>
        {permissionNote && <p className="text-[10px] text-emerald-700 mt-0.5">{permissionNote}</p>}
      </div>

      <div>
        <label className="block font-semibold text-indigo-900 mb-1">Web Quản Lý URL:</label>
        <input
          type="text"
          value={webAppUrl}
          onChange={(e) => onChangeWebAppUrl(e.target.value)}
          placeholder="http://localhost:5173"
          className="w-full border border-indigo-300 rounded px-2 py-1 bg-white"
        />
      </div>

      <div className="border-t border-indigo-200 pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-indigo-900 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            Xác thực API Backend
          </span>
          {authToken ? (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
              JWT: {userEmail || 'Đã đăng nhập'}
            </span>
          ) : assistantApiKey ? (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
              API Key đang bật
            </span>
          ) : (
            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
              Chưa xác thực
            </span>
          )}
        </div>

        {authToken ? (
          <button
            type="button"
            onClick={() => {
              void onLogout()
            }}
            className="w-full bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 py-1 px-2 rounded flex items-center justify-center gap-1 font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất ({userEmail || 'Tài khoản'})
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="email"
                placeholder="Email nhân viên"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="border border-indigo-300 rounded px-2 py-1 bg-white"
              />
              <input
                type="password"
                placeholder="Mật khẩu"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="border border-indigo-300 rounded px-2 py-1 bg-white"
              />
            </div>
            <button
              type="button"
              disabled={isLoggingIn}
              onClick={() => {
                void handleLoginSubmit()
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-2 rounded flex items-center justify-center gap-1 font-semibold cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập lấy JWT'}
            </button>
          </div>
        )}

        <div>
          <label className="text-[11px] text-indigo-800 font-medium flex items-center gap-1 mb-1">
            <KeyRound className="w-3 h-3" />
            Hoặc dùng API Key (`x-api-key`):
          </label>
          <div className="flex gap-1.5">
            <input
              type="password"
              placeholder="Nhập ASSISTANT_API_KEY..."
              value={draftApiKey}
              onChange={(e) => setDraftApiKey(e.target.value)}
              className="flex-1 border border-indigo-300 rounded px-2 py-1 bg-white"
            />
            <button
              type="button"
              onClick={() => {
                void handleSaveKey()
              }}
              className="bg-white border border-indigo-300 hover:bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded font-semibold cursor-pointer"
            >
              Lưu Key
            </button>
          </div>
        </div>

        {authStatus && <p className="text-[10.5px] font-medium text-indigo-900">{authStatus}</p>}
      </div>
    </div>
  )
}
