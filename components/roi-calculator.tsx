"use client"

import { useState } from "react"

export default function ROICalculator() {
  const [hours, setHours] = useState(10)
  const [rate, setRate] = useState(75)

  const monthly = hours * rate * 4
  const roi = Math.round(monthly / 99)

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-3">
          Hours spent searching documents weekly:
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider transition-all duration-300 hover:h-3 hover:bg-muted/80"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>1hr</span>
          <span className="font-semibold text-foreground">{hours} hours</span>
          <span>20hrs</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Your hourly business value:
        </label>
        <input
          type="range"
          min="25"
          max="200"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider transition-all duration-300 hover:h-3 hover:bg-muted/80"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>$25</span>
          <span className="font-semibold text-foreground">${rate}/hr</span>
          <span>$200</span>
        </div>
      </div>

      <div className="bg-card border border-border p-4 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 group-hover:bg-primary/5">
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
            ${monthly.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Monthly time savings value</div>
          <div className="text-xs text-muted-foreground">
            DocsFlow Professional: Starting at $99/month (2 users)
          </div>
          <div className="text-lg font-bold text-primary transition-all duration-300 group-hover:scale-110">
            {roi}x ROI
          </div>
        </div>
      </div>
    </div>
  )
}
