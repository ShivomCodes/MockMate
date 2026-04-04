import { createContext, useContext } from "react"
import { useSession } from "@/lib/authClient"

const AuthContext = createContext({
  user: null,
  isPending: true,
  isAuthenticated: false,
})

export function AuthProvider({ children }) {
  const sessionResult = useSession()
  const sessionData = sessionResult?.data
  const user = sessionData?.user ?? null
  const isPending = Boolean(sessionResult?.isPending)
  const isAuthenticated = Boolean(user)

  return (
    <AuthContext.Provider value={{ user, isPending, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
