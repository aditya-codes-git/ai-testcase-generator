import type { ReactNode } from "react"
import { cn } from "../../lib/utils"

export function FeatureCard({ icon, title, description, className }: { icon: ReactNode, title: string, description: string, className?: string }) {
  return (
    <div className={cn("p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 hover:border-primary/50 transition-all duration-300 group", className)}>
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
