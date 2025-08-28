import Image from 'next/image';

interface DocsFlowBrandProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "horizontal" | "stacked" | "icon-only" | "text-only";
  className?: string;
}

export default function DocsFlowBrand({ 
  size = "md", 
  variant = "horizontal",
  className = ""
}: DocsFlowBrandProps) {
  const sizeConfig = {
    sm: {
      height: 32,
      width: variant === "horizontal" ? 120 : 32,
      iconSize: 24
    },
    md: {
      height: 48,
      width: variant === "horizontal" ? 180 : 48,
      iconSize: 32
    },
    lg: {
      height: 64,
      width: variant === "horizontal" ? 240 : 64,
      iconSize: 48
    },
    xl: {
      height: 80,
      width: variant === "horizontal" ? 300 : 80,
      iconSize: 64
    }
  };

  const config = sizeConfig[size];

  // Icon only variant
  if (variant === "icon-only") {
    return (
      <Image
        src="/logo.svg"
        alt="DocsFlow"
        width={config.iconSize}
        height={config.iconSize}
        className={`${className}`}
        priority
      />
    );
  }

  // Text only variant
  if (variant === "text-only") {
    return (
      <div className={`font-bold tracking-tight ${className}`}>
        <span className="text-blue-600">DOCS</span>
        <span className="text-slate-800 dark:text-slate-200">FLOW</span>
      </div>
    );
  }

  // Horizontal (default) and stacked variants use horizontal brand logo
  return (
    <Image
      src="/docsflow-brand-primary-horizontal-md.svg"
      alt="DocsFlow - Turn Documents Into Instant Answers"
      width={variant === "stacked" ? config.height : config.width}
      height={config.height}
      className={`${className}`}
      priority
    />
  );
}
