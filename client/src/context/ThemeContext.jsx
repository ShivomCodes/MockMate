import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
})

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "dark"
  }

  const stored = localStorage.getItem("mockmate-theme")
  if (stored === "light" || stored === "dark") {
    return stored
  }

  // Fall back to system preference
  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light"
  }

  return "dark"
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement

    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }

    localStorage.setItem("mockmate-theme", theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
