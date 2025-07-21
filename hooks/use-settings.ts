"use client"

import { useState, useEffect } from "react"
import type { TenantSettings } from "@/types/settings"
import { generateMockSettings } from "@/lib/mock-settings-data"

export const useSettings = (industry: "motorcycle_dealer" | "warehouse_distribution" = "motorcycle_dealer") => {
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("company")

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const mockSettings = generateMockSettings(industry)
      setSettings(mockSettings)
      setLoading(false)
    }

    loadSettings()
  }, [industry])

  const updateSettings = async (section: keyof TenantSettings, data: any) => {
    if (!settings) return

    const updatedSettings = {
      ...settings,
      [section]: { ...settings[section], ...data },
    }

    setSettings(updatedSettings)

    // In a real app, this would make an API call
    console.log(`Updating ${section}:`, data)
  }

  const saveSettings = async () => {
    // In a real app, this would save all settings to the backend
    console.log("Saving settings:", settings)
  }

  return {
    settings,
    loading,
    activeTab,
    setActiveTab,
    updateSettings,
    saveSettings,
  }
}
