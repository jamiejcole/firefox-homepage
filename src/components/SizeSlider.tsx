import { SCALE_MAX, SCALE_MIN, SCALE_STEP } from '../lib/settings'

interface SizeSliderProps {
  value: number
  onChange: (value: number) => void
}

export default function SizeSlider({ value, onChange }: SizeSliderProps) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs text-(--text)">
      <span className="shrink-0">Size</span>
      <input
        type="range"
        min={SCALE_MIN}
        max={SCALE_MAX}
        step={SCALE_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer accent-(--accent)"
      />
    </div>
  )
}
