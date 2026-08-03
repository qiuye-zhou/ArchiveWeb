/**
 * 鉴权 hook：聚合常用鉴权状态与方法
 */
import { useAuthStore } from '@/store/useAuthStore'

export function useAuth() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const setToken = useAuthStore((s) => s.setToken)
  const setUser = useAuthStore((s) => s.setUser)

  return {
    token,
    user,
    login,
    logout,
    fetchProfile,
    setToken,
    setUser,
    isAuthed: !!token,
  }
}
