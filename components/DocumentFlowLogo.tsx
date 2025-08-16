import Image from 'next/image';

export default function DocumentFlowLogo({ 
  size = 80, 
  variant = "primary",
  className = ""
}: { 
  size?: number;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  // Use the actual DocsFlow logo files
  return (
    <Image
      src="/logo.svg"
      alt="DocsFlow"
      width={size}
      height={size}
      className={`${className}`}
      priority
    />
  );
}
