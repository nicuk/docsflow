import { Badge } from "@/components/ui/badge"
import { Shield, Lock, CheckCircle, Globe } from "lucide-react"

export default function TrustBadges() {
  return (
    <section className="py-12 border-t bg-muted/20">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-6">
            Trusted by businesses worldwide with enterprise-grade security
          </h3>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-8 max-w-4xl mx-auto">
          {/* GDPR Compliance */}
          <div className="flex items-center gap-3 px-4 py-3 bg-background/60 backdrop-blur-sm border rounded-lg hover:shadow-md transition-shadow">
            <Shield className="h-6 w-6 text-green-600" />
            <div className="text-left">
              <div className="text-sm font-semibold">GDPR Compliant</div>
              <div className="text-xs text-muted-foreground">EU Data Protection</div>
            </div>
          </div>

          {/* SOC 2 */}
          <div className="flex items-center gap-3 px-4 py-3 bg-background/60 backdrop-blur-sm border rounded-lg hover:shadow-md transition-shadow">
            <CheckCircle className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <div className="text-sm font-semibold">SOC 2 Type II</div>
              <div className="text-xs text-muted-foreground">Security Audited</div>
            </div>
          </div>

          {/* Encryption */}
          <div className="flex items-center gap-3 px-4 py-3 bg-background/60 backdrop-blur-sm border rounded-lg hover:shadow-md transition-shadow">
            <Lock className="h-6 w-6 text-purple-600" />
            <div className="text-left">
              <div className="text-sm font-semibold">AES-256 Encryption</div>
              <div className="text-xs text-muted-foreground">Bank-grade Security</div>
            </div>
          </div>

          {/* ISO Compliance */}
          <div className="flex items-center gap-3 px-4 py-3 bg-background/60 backdrop-blur-sm border rounded-lg hover:shadow-md transition-shadow">
            <Globe className="h-6 w-6 text-orange-600" />
            <div className="text-left">
              <div className="text-sm font-semibold">ISO 27001</div>
              <div className="text-xs text-muted-foreground">Information Security</div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            Your data is processed securely and never used to train public AI models. 
            All documents remain in your controlled environment with full audit trails.
          </p>
        </div>
      </div>
    </section>
  )
}
