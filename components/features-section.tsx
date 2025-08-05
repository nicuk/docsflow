import FeatureCard from "@/components/feature-card"
import {
  BotIcon,
  SparklesIcon,
  DatabaseIcon,
  ShieldIcon,
  FileTextIcon,
  ServerIcon,
  LockIcon,
  ZapIcon,
} from "@/components/feature-icons"

export default function FeaturesSection() {
  const features = [
    {
      icon: <BotIcon />,
      title: "Upload Once — AI Handles the Rest",
      description: "Drag and drop your files. AI instantly understands and organizes everything for your team.",
      accentColor: "rgba(36, 101, 237, 0.5)",
    },
    {
      icon: <FileTextIcon />,
      title: "Search by Question, Not Folder",
      description: "Ask 'What's our return policy?' Get exact answers with page references in seconds.",
      accentColor: "rgba(249, 115, 22, 0.5)",
    },
    {
      icon: <SparklesIcon />,
      title: "Exact Answers with Page References",
      description: "No more guessing. Get specific quotes with document sources and page numbers.",
      accentColor: "rgba(236, 72, 153, 0.5)",
    },
    {
      icon: <ShieldIcon />,
      title: "Access Control by Department",
      description: "Sales sees customer data. Finance sees reports. Admin controls everything. Fully secure.",
      accentColor: "rgba(132, 204, 22, 0.5)",
    },
    {
      icon: <ServerIcon />,
      title: "Instant Onboarding for New Hires",
      description: "New employees find procedures instantly instead of bothering senior staff for weeks.",
      accentColor: "rgba(168, 85, 247, 0.5)",
    },
    {
      icon: <DatabaseIcon />,
      title: "Fully Auditable and Secure",
      description: "Track who searched what, when. Enterprise-grade security that scales with your team.",
      accentColor: "rgba(34, 211, 238, 0.5)",
    },
    {
      icon: <LockIcon />,
      title: "No More 'Where Is That File?'",
      description: "End email chaos. Everyone gets instant access to the information they need, nothing more.",
      accentColor: "rgba(251, 191, 36, 0.5)",
    },
    {
      icon: <ZapIcon />,
      title: "Works with Your Existing Files",
      description: "PDFs, Word docs, spreadsheets, presentations. No file conversion or special formatting needed.",
      accentColor: "rgba(16, 185, 129, 0.5)",
    },
  ]

  return (
    <section className="py-20 bg-muted/50 dark:bg-muted/10 border-t border-b border-border/50" aria-labelledby="features-heading">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground mb-2">
              Key Features
            </div>
            <h2 id="features-heading" className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              Ask. Answer. Never Search Again.
            </h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              Upload once — AI handles the rest. Search by question, not folder. Get exact answers with page-level references.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              accentColor={feature.accentColor}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
