import { Link } from "react-router-dom"
import { HeroShader } from "../components/ui/hero-shader"
import { FeatureCard } from "../components/ui/FeatureCard"
import { BrainCircuit, FileJson, FileSpreadsheet, ArrowRight } from "lucide-react"

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="absolute top-0 w-full z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold tracking-tight">AI TestGen</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#docs" className="hover:text-foreground transition-colors">Docs</a>
        </nav>
        <Link to="/auth" className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-sm font-medium transition-colors border border-white/10">
          Login
        </Link>
      </header>

      <main className="flex-1">
        <HeroShader>
          <div className="max-w-6xl w-full mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div className="flex flex-col items-start gap-6 pt-12 md:pt-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                ⚡ AI-Powered QA Automation
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-white">
                Generate Test Cases in Seconds with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-fuchsia-500">AI</span>
              </h1>
              
              <p className="text-lg md:text-xl text-zinc-400 max-w-xl leading-relaxed">
                Convert feature descriptions into structured, categorized test cases instantly. Stop writing tests manually and start automating your QA pipeline.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
                <Link to="/auth" className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(139,92,246,0.5)]">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
                <button className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium backdrop-blur-sm transition-all border border-white/10">
                  View Demo
                </button>
              </div>
            </div>

            {/* Right Visual mock */}
            <div className="hidden md:flex relative h-full items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-fuchsia-600/30 blur-[100px] rounded-full opacity-60"></div>
              <div className="relative w-full max-w-lg aspect-square lg:aspect-[4/3] rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl p-6 flex flex-col gap-4 overflow-hidden">
                <div className="flex gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="h-4 w-1/3 bg-white/10 rounded"></div>
                <div className="space-y-3 mt-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="h-8 w-8 rounded-lg bg-primary/20 shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-full bg-white/5 rounded"></div>
                        <div className="h-3 w-4/5 bg-white/5 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </HeroShader>

        <section id="features" className="py-32 px-6 bg-background relative z-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for Modern Teams</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Everything you need to accelerate your testing process and ensure high-quality software delivery.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<BrainCircuit className="w-6 h-6" />}
                title="AI Test Generation"
                description="Leverage state-of-the-art AI to instantly turn simple feature descriptions into comprehensive test case scenarios."
              />
              <FeatureCard 
                icon={<FileJson className="w-6 h-6" />}
                title="Structured Output"
                description="Receive beautifully formatted, precise tabular data including positive, negative, and edge cases, ready to execute."
              />
              <FeatureCard 
                icon={<FileSpreadsheet className="w-6 h-6" />}
                title="Excel Export"
                description="One-click export directly to an Excel (.xlsx) file, fully formatted with sheets for project details and test suites."
              />
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-8 text-center text-zinc-500 text-sm border-t border-white/5 bg-background">
        &copy; {new Date().getFullYear()} AI TestGen. All rights reserved.
      </footer>
    </div>
  )
}
