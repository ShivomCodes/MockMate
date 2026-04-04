export default function Spinner({ className = "" }) {
  return (
    <div
      className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-violet-400 ${className}`}
      aria-label="Loading"
      role="status"
    />
  )
}
