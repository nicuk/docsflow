"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type CalendarProps = {
  mode?: "single" | "multiple" | "range"
  selected?: Date | Date[] | { from: Date; to?: Date }
  onSelect?: (date: Date | Date[] | { from: Date; to?: Date } | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
  showOutsideDays?: boolean
}

function Calendar({
  className,
  mode = "single",
  selected,
  onSelect,
  disabled,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleDayClick = (day: Date) => {
    if (disabled?.(day)) return

    if (mode === "single") {
      onSelect?.(day)
    } else if (mode === "multiple") {
      const selectedArray = Array.isArray(selected) ? selected : []
      const isSelected = selectedArray.some(date => isSameDay(date, day))
      if (isSelected) {
        onSelect?.(selectedArray.filter(date => !isSameDay(date, day)))
      } else {
        onSelect?.([...selectedArray, day])
      }
    } else if (mode === "range") {
      const range = selected as { from: Date; to?: Date } | undefined
      if (!range?.from || (range.from && range.to)) {
        onSelect?.({ from: day })
      } else {
        onSelect?.({ from: range.from, to: day })
      }
    }
  }

  const isSelected = (day: Date) => {
    if (mode === "single") {
      return selected && isSameDay(selected as Date, day)
    } else if (mode === "multiple") {
      return Array.isArray(selected) && selected.some(date => isSameDay(date, day))
    } else if (mode === "range") {
      const range = selected as { from: Date; to?: Date } | undefined
      if (!range) return false
      if (range.from && range.to) {
        return day >= range.from && day <= range.to
      }
      return range.from && isSameDay(range.from, day)
    }
    return false
  }

  return (
    <div className={cn("p-3", className)} {...props}>
      <div className="flex flex-col space-y-4">
        <div className="flex justify-center pt-1 relative items-center">
          <Button
            variant="outline"
            size="sm"
            className="absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {format(currentMonth, "MMMM yyyy")}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-full border-collapse space-y-1">
          <div className="flex">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div
                key={day}
                className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isDisabled = disabled?.(day)
              const isDaySelected = isSelected(day)
              const isDayToday = isToday(day)

              return (
                <Button
                  key={day.toISOString()}
                  variant={isDaySelected ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-9 w-9 p-0 font-normal",
                    isDaySelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    isDayToday && !isDaySelected && "bg-accent text-accent-foreground",
                    isDisabled && "text-muted-foreground opacity-50 cursor-not-allowed",
                    !isSameMonth(day, currentMonth) && "text-muted-foreground opacity-50"
                  )}
                  onClick={() => handleDayClick(day)}
                  disabled={isDisabled}
                >
                  {format(day, "d")}
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
