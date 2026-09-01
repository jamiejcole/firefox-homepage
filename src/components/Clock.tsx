import { useEffect, useState } from 'react'

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export default function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="text-center select-none">
      <div className="text-4xl font-medium tracking-tight text-(--text-h) tabular-nums">
        {timeFmt.format(now)}
      </div>
      <div className="mt-1 text-sm text-(--text)">{dateFmt.format(now)}</div>
    </div>
  )
}
