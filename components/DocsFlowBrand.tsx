import DocumentFlowLogo from "./DocumentFlowLogo";

interface DocsFlowBrandProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "horizontal" | "stacked";
  iconVariant?: "primary" | "secondary";
  showIcon?: boolean;
}

export default function DocsFlowBrand({ 
  size = "md", 
  variant = "horizontal",
  iconVariant = "primary",
  showIcon = true 
}: DocsFlowBrandProps) {
  const sizeConfig = {
    sm: {
      icon: 32,
      fontSize: "text-lg",
      spacing: "gap-2"
    },
    md: {
      icon: 48,
      fontSize: "text-2xl",
      spacing: "gap-3"
    },
    lg: {
      icon: 64,
      fontSize: "text-4xl",
      spacing: "gap-4"
    },
    xl: {
      icon: 80,
      fontSize: "text-5xl",
      spacing: "gap-5"
    }
  };

  const config = sizeConfig[size];
  const isStacked = variant === "stacked";

  return (
    <div className={`
      flex items-center 
      ${isStacked ? 'flex-col' : 'flex-row'} 
      ${config.spacing}
    `}>
      {showIcon && (
        <DocumentFlowLogo size={config.icon} variant={iconVariant} />
      )}
      
      <div className={`
        ${config.fontSize} 
        font-bold tracking-tight 
        ${isStacked ? 'text-center' : ''}
      `}>
        <span className="text-blue-600">DOCS</span>
        <span className="text-slate-800 dark:text-slate-200 ml-1">FLOW</span>
      </div>
    </div>
  );
}
