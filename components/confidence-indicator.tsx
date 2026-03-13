import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface ConfidenceIndicatorProps {
  score: number; // 0-1 confidence score
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConfidenceIndicator({ 
  score, 
  showLabel = false, 
  size = 'md',
  className 
}: ConfidenceIndicatorProps) {
  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case 'high': return CheckCircle;
      case 'medium': return AlertCircle;
      case 'low': return AlertTriangle;
      default: return AlertTriangle;
    }
  };

  const getConfidenceMessage = (level: string) => {
    switch (level) {
      case 'high': return 'High confidence - Reliable information';
      case 'medium': return 'Medium confidence - Verify important details';
      case 'low': return 'Low confidence - Use as starting point only';
      default: return 'Unknown confidence level';
    }
  };

  const level = getConfidenceLevel(score);
  const Icon = getConfidenceIcon(level);
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Traffic Light Indicator */}
      <div className="flex items-center gap-1">
        <div className={cn(
          "rounded-full",
          sizeClasses[size],
          getConfidenceColor(level)
        )} />
        <Icon className={cn(
          sizeClasses[size],
          level === 'high' && "text-green-600",
          level === 'medium' && "text-yellow-600",
          level === 'low' && "text-red-600"
        )} />
      </div>
      
      {/* Confidence Percentage */}
      <span className={cn(
        "font-medium",
        textSizeClasses[size],
        level === 'high' && "text-green-700",
        level === 'medium' && "text-yellow-700",
        level === 'low' && "text-red-700"
      )}>
        {Math.min(100, Math.max(0, Math.round(score * 100)))}%
      </span>

      {/* Optional Label */}
      {showLabel && (
        <span className={cn(
          "text-muted-foreground",
          textSizeClasses[size]
        )}>
          {getConfidenceMessage(level)}
        </span>
      )}
    </div>
  );
}

export default ConfidenceIndicator; 