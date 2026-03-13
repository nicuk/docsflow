"use client"

import * as React from "react"
// Chart component temporarily disabled - fix recharts imports
// import { AreaChart, BarChart, LineChart } from "recharts"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

// Enterprise-grade chart configuration
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

// Enterprise Chart Container with Tremor
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ className, children, config, ...props }, ref) => {
  return (
    <ChartContext.Provider value={{ config }}>
      <Card
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        {children}
      </Card>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

// Enterprise Chart Components (temporarily disabled until chart library integration)
// const Chart = {
//   Area: AreaChart,
//   Bar: BarChart,
//   Line: LineChart,
//   Donut: DonutChart,
// }

// Tooltip component (Tremor handles this internally)
const ChartTooltip = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }
>(({ className, ...props }, ref) => {
  // Tremor handles tooltips internally, this is for compatibility
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-background px-3 py-2 text-sm shadow-md",
        className
      )}
      {...props}
    />
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

// Legend component (Tremor handles this internally)
const ChartLegend = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>
}

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    hideIcon?: boolean
    nameKey?: string
    payload?: any[]
    verticalAlign?: "top" | "bottom"
  }
>(({ className, ...props }, ref) => {
  // Tremor handles legends internally, this is for compatibility
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4 pt-3",
        className
      )}
      {...props}
    />
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  // Chart, // Temporarily disabled until chart library integration complete
}
