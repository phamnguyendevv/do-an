export interface ExtensionAuthCredentials {
  authToken: string
  userEmail: string
  assistantApiKey: string
}

const STORAGE_KEYS = {
  authToken: 'bookstore_auth_token',
  userEmail: 'bookstore_user_email',
  apiKey: 'bookstore_assistant_api_key',
}

export async function getExtensionAuthCredentials(): Promise<ExtensionAuthCredentials> {
  let authToken = ''
  let userEmail = ''
  let assistantApiKey = ''

  if (typeof window !== 'undefined' && window.localStorage) {
    authToken = localStorage.getItem(STORAGE_KEYS.authToken) || ''
    userEmail = localStorage.getItem(STORAGE_KEYS.userEmail) || ''
    assistantApiKey = localStorage.getItem(STORAGE_KEYS.apiKey) || ''
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const stored = (await chrome.storage.local.get([
        'authToken',
        'userEmail',
        'assistantApiKey',
      ])) as Record<string, any>
      if (typeof stored?.authToken === 'string') authToken = stored.authToken
      if (typeof stored?.userEmail === 'string') userEmail = stored.userEmail
      if (typeof stored?.assistantApiKey === 'string') assistantApiKey = stored.assistantApiKey
    } catch { }
  }

  return { authToken, userEmail, assistantApiKey }
}

export async function saveExtensionAuthCredentials(creds: Partial<ExtensionAuthCredentials>) {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (creds.authToken !== undefined) {
      if (creds.authToken) localStorage.setItem(STORAGE_KEYS.authToken, creds.authToken)
      else localStorage.removeItem(STORAGE_KEYS.authToken)
    }
    if (creds.userEmail !== undefined) {
      if (creds.userEmail) localStorage.setItem(STORAGE_KEYS.userEmail, creds.userEmail)
      else localStorage.removeItem(STORAGE_KEYS.userEmail)
    }
    if (creds.assistantApiKey !== undefined) {
      if (creds.assistantApiKey) localStorage.setItem(STORAGE_KEYS.apiKey, creds.assistantApiKey)
      else localStorage.removeItem(STORAGE_KEYS.apiKey)
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({
      ...(creds.authToken !== undefined ? { authToken: creds.authToken } : {}),
      ...(creds.userEmail !== undefined ? { userEmail: creds.userEmail } : {}),
      ...(creds.assistantApiKey !== undefined ? { assistantApiKey: creds.assistantApiKey } : {}),
    })
  }
}

export async function buildAssistantHeaders(
  extraHeaders: Record<string, string> = {},
): Promise<Record<string, string>> {
  const { authToken, assistantApiKey } = await getExtensionAuthCredentials()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }
  if (assistantApiKey) {
    headers['x-api-key'] = assistantApiKey
  }
  return headers
}

/**
 * Kiểm tra & xin quyền host_permissions động cho Backend API URL tùy chỉnh (Manifest V3 optional_host_permissions).
 */
export async function ensureHostPermission(rawUrl: string): Promise<{ granted: boolean; originPattern?: string }> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return { granted: false }
  }

  const originPattern = `${parsed.origin}/*`
  if (typeof chrome === 'undefined' || !chrome.permissions) {
    return { granted: true, originPattern }
  }

  try {
    const has = await chrome.permissions.contains({ origins: [originPattern] })
    if (has) {
      return { granted: true, originPattern }
    }
    const granted = await chrome.permissions.request({ origins: [originPattern] })
    return { granted, originPattern }
  } catch {
    return { granted: false, originPattern }
  }
}

export async function resolveBackendBaseUrl(defaultUrl = 'https://api.zymail.site'): Promise<string> {
  let targetApi = defaultUrl.replace(/\/+$/, '')
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const stored = (await chrome.storage.local.get(['backendUrl'])) as Record<string, any>
      if (stored?.backendUrl && typeof stored.backendUrl === 'string' && stored.backendUrl.trim()) {
        targetApi = stored.backendUrl.trim().replace(/\/+$/, '')
      }
    } catch { }
  }
  return targetApi
}

export interface FetchFallbackOptions {
  stopStatuses?: number[]
  onAttemptError?: (url: string, error: unknown) => void
}

/**
 * Gọi danh sách endpoint theo thứ tự ưu tiên; tự fallback sang endpoint kế tiếp khi lỗi mạng hoặc HTTP không thành công.
 */
export async function fetchWithFallback(
  urls: string[],
  initFactory: () => RequestInit | Promise<RequestInit>,
  options: FetchFallbackOptions = {},
): Promise<Response | null> {
  const stopStatuses = options.stopStatuses ?? [401]
  let lastResponse: Response | null = null

  for (const url of urls) {
    try {
      const init = await initFactory()
      const res = await fetch(url, init)
      if (res.ok || stopStatuses.includes(res.status)) {
        return res
      }
      lastResponse ??= res
    } catch (err) {
      options.onAttemptError?.(url, err)
    }
  }

  return lastResponse
}
