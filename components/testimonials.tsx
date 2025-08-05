import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function Testimonials() {
  const testimonials = [
    {
      before: "We spent 3-4 hours daily searching through shared drives, emails, and different folders. New employees would constantly ask 'where do I find X?' and interrupt senior staff.",
      after: "Now everyone finds procedures instantly with AI search. We saved 12 hours per week across our team in the first month.",
      quote: "Finally, our whole team can access company knowledge safely. Sales gets customer data without seeing payroll, finance gets reports without exposing sensitive contracts. It's like having a smart assistant for the entire company.",
      name: "Sarah Chen",
      title: "Operations Manager, TechStart Solutions",
      company: "12 employees",
      avatar: "SC",
      timeSaved: "12 hours/week",
      industry: "Technology"
    },
    {
      before: "Every week we'd waste hours looking for contracts, SOPs, and vendor information. 'Where is that file?' emails were constant, and new hires took weeks to find basic documents.",
      after: "Cut our 'where is that file?' emails by 90%. New employees can find procedures instantly instead of bothering senior staff.",
      quote: "The access controls mean I never worry about someone seeing information they shouldn't. Our productivity jumped immediately.",
      name: "Mike Rodriguez",
      title: "CEO, Rodriguez Manufacturing",
      company: "25 employees",
      avatar: "MR",
      timeSaved: "8 hours/week",
      industry: "Manufacturing"
    },
    {
      before: "Document chaos everywhere - everyone had their own filing system. HR policies scattered across email, Dropbox, and local drives. Compliance audits were nightmares.",
      after: "One intelligent system that knows what each person should see. Compliance documentation is organized and instantly accessible.",
      quote: "Our team collaboration improved overnight. Instead of everyone having their own document chaos, we have one intelligent system. It's like having a company brain.",
      name: "Lisa Park",
      title: "HR Director, GreenTech Services",
      company: "18 employees",
      avatar: "LP",
      timeSaved: "15 hours/week",
      industry: "Professional Services"
    },
  ]

  return (
    <section id="testimonials" className="py-20 bg-muted/30 dark:bg-muted/5 border-t border-b border-border/50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground mb-2">
              Testimonials
            </div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              Trusted by 500+ Growing Teams
            </h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              See what SME teams say about transforming their scattered business knowledge into collaborative intelligence.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="h-full flex flex-col group hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6 flex-grow space-y-4">
                {/* Before Section */}
                <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-muted-foreground/30">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Before DocsFlow:</p>
                  <p className="text-sm text-muted-foreground italic">{testimonial.before}</p>
                </div>
                
                {/* Arrow */}
                <div className="text-center text-2xl">⬇️</div>
                
                {/* After Section */}
                <div className="bg-primary/10 p-4 rounded-lg border-l-4 border-primary">
                  <p className="text-sm font-semibold text-primary mb-2">After DocsFlow:</p>
                  <p className="text-sm text-foreground">{testimonial.after}</p>
                </div>
                
                {/* Time Saved Badge */}
                <div className="bg-primary/5 p-3 rounded-lg text-center border border-primary/20">
                  <p className="font-bold text-lg text-primary">Saved: {testimonial.timeSaved}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.industry} • {testimonial.company}</p>
                </div>
                
                {/* Quote */}
                <div className="pt-2">
                  <div className="mb-2 text-2xl text-primary">"</div>
                  <p className="italic text-muted-foreground text-sm">{testimonial.quote}</p>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">{testimonial.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
