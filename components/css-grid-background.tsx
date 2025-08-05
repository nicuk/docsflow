// CSS styles are handled by Tailwind

export default function CssGridBackground() {
  return (
    <>
      {/* Grid overlay that fades from outside to inside */}
      <div
        className="absolute inset-0 pointer-events-none z-[-1] grid-background"
        aria-hidden="true"
      />

      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[-2] grid-gradient"
        aria-hidden="true"
      />
    </>
  )
}
