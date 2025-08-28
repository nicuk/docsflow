"use client"

import { useState, useEffect, useCallback } from 'react'

interface LoadingStage {
  id: string
  name: string
  delay: number
  priority: number
}

interface ProgressiveLoadingState {
  currentStage: number
  completedStages: string[]
  isLoading: boolean
  error: string | null
}

interface UseProgressiveLoadingProps {
  stages: LoadingStage[]
  autoStart?: boolean
}

export function useProgressiveLoading({ 
  stages, 
  autoStart = true 
}: UseProgressiveLoadingProps) {
  const [state, setState] = useState<ProgressiveLoadingState>({
    currentStage: 0,
    completedStages: [],
    isLoading: false,
    error: null
  })

  const startLoading = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    // Sort stages by priority
    const sortedStages = [...stages].sort((a, b) => a.priority - b.priority)
    
    sortedStages.forEach((stage, index) => {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          currentStage: index + 1,
          completedStages: [...prev.completedStages, stage.id],
          isLoading: index < sortedStages.length - 1
        }))
      }, stage.delay)
    })
  }, [stages])

  const resetLoading = useCallback(() => {
    setState({
      currentStage: 0,
      completedStages: [],
      isLoading: false,
      error: null
    })
  }, [])

  const isStageComplete = useCallback((stageId: string) => {
    return state.completedStages.includes(stageId)
  }, [state.completedStages])

  const isStageActive = useCallback((stageId: string) => {
    const stage = stages.find(s => s.id === stageId)
    if (!stage) return false
    
    const stageIndex = stages.indexOf(stage)
    return state.currentStage === stageIndex + 1
  }, [stages, state.currentStage])

  useEffect(() => {
    if (autoStart) {
      startLoading()
    }
  }, [autoStart, startLoading])

  return {
    ...state,
    startLoading,
    resetLoading,
    isStageComplete,
    isStageActive,
    progress: (state.completedStages.length / stages.length) * 100
  }
}
