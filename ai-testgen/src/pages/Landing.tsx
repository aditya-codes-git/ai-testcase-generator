import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { HeroShader } from "../components/ui/hero-shader"
import NavHeader from "../components/ui/nav-header"
import { CinematicFooter } from "../components/ui/motion-footer"
import { 
  BrainCircuit, 
  FileSpreadsheet, 
  ArrowRight, 
  Zap, 
  Shield, 
  Rocket, 
  Layers, 
  CheckCircle2, 
  Sparkles,
  Search,
  Download,
  Users
} from "lucide-react"

export default function Landing() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkUser()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-black text-white selection:bg-white/15 scroll-smooth">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/[0.03] rounded-full blur-[120px] animate-glow-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-600/[0.02] rounded-full blur-[100px]"></div>
      </div>

      {/* Navigation Header */}
      <header className="fixed top-0 w-full z-[100] px-6 py-8 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/Logo/logo_full.png" alt="TestGen" className="h-12 w-auto group-hover:scale-105 transition-transform" />
          </div>
          
          <nav className="hidden lg:flex flex-1 justify-center">
            <NavHeader />
          </nav>

          <div className="flex items-center gap-4">
             <Link 
              to={user ? "/dashboard" : "/auth"} 
              className="px-8 py-2.5 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl text-white text-xs font-bold uppercase tracking-widest transition-all border border-white/10 flex items-center gap-3 shadow-lg shadow-black/20"
            >
              {user ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  {user.email.split('@')[0]}
                </>
              ) : "Login"}
            </Link>
            {!user && (
              <Link to="/auth" className="hidden sm:block px-8 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-violet-500/20">
                Get Started
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 bg-black min-h-screen rounded-b-[3rem] shadow-2xl border-b border-white/5 pb-24 selection:bg-white/20">
        {/* HERO SECTION */}
        <HeroShader>
          <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-screen">
            
            {/* Left Content */}
            <div className="flex flex-col items-start gap-8 pt-32 lg:pt-0">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-700">
                <Sparkles className="w-3 h-3 fill-white" />
                Next Generation Testing
              </div>
              
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.95] text-white animate-in fade-in slide-in-from-left-8 duration-700 delay-150">
                QA Lifecycle <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-300 to-indigo-400">Automated.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-white/50 max-w-xl leading-snug font-medium animate-in fade-in slide-in-from-left-8 duration-700 delay-300">
                TestGen transforms feature requirements into professional grade QA artifacts in seconds, not hours.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
                <Link to={user ? "/dashboard" : "/auth"} className="flex flex-1 sm:flex-none items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-primary hover:bg-primary/90 text-white text-sm font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-violet-500/20">
                  {user ? "Back to Dashboard" : "Start Pilot Run"} <ArrowRight className="w-5 h-5" />
                </Link>
                <button className="flex flex-1 sm:flex-none items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold uppercase tracking-widest backdrop-blur-2xl transition-all border border-white/10">
                  Live Technical Demo
                </button>
              </div>

            </div>

            {/* Right Visual mock */}
            <div className="hidden lg:flex relative h-full items-center justify-center animate-in fade-in zoom-in-75 duration-1000 delay-300">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-white/5 blur-[120px] rounded-full opacity-20 animate-glow-pulse"></div>
              
              {/* Main Card */}
              {/* Main Card */}
              <div className="relative w-full max-w-xl aspect-[1.4/1] rounded-[2rem] bg-white/[0.05] backdrop-blur-3xl border border-white/15 shadow-[0_0_100px_-20px_rgba(0,0,0,1)] p-8 flex flex-col gap-6 overflow-hidden transform hover:-rotate-1 transition-transform duration-700">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-white/20 shadow-lg shadow-white/5"></div>
                    <div className="w-3.5 h-3.5 rounded-full bg-white/15 shadow-lg shadow-white/5"></div>
                    <div className="w-3.5 h-3.5 rounded-full bg-white/10 shadow-lg shadow-white/5"></div>
                  </div>
                  <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold text-white/70 uppercase tracking-widest">Llama-3.3 Engine</div>
                </div>
                
                <div className="space-y-4 mt-2">
                   <div className="h-6 w-1/2 bg-white/10 rounded-lg animate-pulse"></div>
                   <div className="space-y-3">
                      <div className="h-2 w-full bg-white/5 rounded-full"></div>
                      <div className="h-2 w-5/6 bg-white/5 rounded-full opacity-70"></div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                   <div className="h-28 rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10"></div>
                      <div className="h-2 w-full bg-white/10 rounded-full"></div>
                      <div className="h-2 w-2/3 bg-white/5 rounded-full"></div>
                   </div>
                   <div className="h-28 rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10"></div>
                      <div className="h-2 w-full bg-white/10 rounded-full"></div>
                      <div className="h-2 w-1/3 bg-white/5 rounded-full"></div>
                   </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
              </div>

              {/* Tag Overlays */}
              <div className="absolute top-1/4 -left-10 px-6 py-3 rounded-2xl bg-black/80 shadow-2xl border border-white/10 flex items-center gap-3 animate-bounce shadow-white/5">
                 <CheckCircle2 className="w-5 h-5 text-white/70" />
                 <span className="text-xs font-bold uppercase tracking-widest">Excel Ready</span>
              </div>
            </div>
          </div>
        </HeroShader>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-24 px-6 bg-black relative overflow-hidden">
           {/* Subtle beam-like accent line */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-white/20 to-transparent"></div>
           <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center mb-20 space-y-4">
                <h2 className="text-xs font-bold text-white/50 uppercase tracking-[0.4em]">The Engine</h2>
                <h3 className="text-4xl md:text-6xl font-black tracking-tight">How TestGen Works</h3>
                <p className="text-white/30 text-lg max-w-2xl mx-auto italic">Zero friction between feature ideation and quality verification.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                 {[
                   { step: "01", icon: <Search />, title: "Describe", desc: "Speak naturally to the AI. Paste requirements or feature flows." },
                   { step: "02", icon: <BrainCircuit />, title: "Generate", desc: "Our engine crafts positive, negative, and edge-case scenarios." },
                   { step: "03", icon: <Download />, title: "Deploy", desc: "Download professional Excel sheets and ship high-quality code." }
                 ].map((item, i) => (
                  <div key={i} className="group relative p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-3xl hover:bg-white/[0.06] hover:border-violet-500/30 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.15)] transition-all duration-500 overflow-hidden text-center">
                     <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-500/[0.03] rounded-full blur-[60px] group-hover:blur-[80px] transition-all"></div>
                     <div className="relative z-10 flex flex-col items-center">
                       <div className="text-5xl font-black text-white/[0.03] mb-6 opacity-0 group-hover:opacity-100 transition-opacity">{item.step}</div>
                       <div className="w-16 h-16 rounded-3xl bg-violet-500/5 flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 group-hover:bg-violet-500/10 transition-all text-violet-400">
                         {item.icon}
                       </div>
                       <h4 className="text-2xl font-bold mb-4">{item.title}</h4>
                       <p className="text-white/50 text-sm leading-relaxed group-hover:text-white/70 transition-colors">{item.desc}</p>
                     </div>
                  </div>
                 ))}
              </div>
           </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-24 px-6 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-white/[0.01] rounded-full blur-[150px]"></div>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-end justify-between mb-20 gap-8">
              <div className="space-y-4 text-left">
                <h2 className="text-xs font-bold text-white/50 uppercase tracking-[0.4em]">Core Capabilities</h2>
                <h3 className="text-4xl md:text-5xl font-black tracking-tight">Enterprise Grade <br />QA Logistics</h3>
              </div>
              <p className="text-white/30 max-w-md text-sm md:text-base lg:text-right">A unified platform for software quality, built for teams that move at the speed of thought.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <Zap />, title: "Sub-Second Latency", desc: "Powered by Groq's high-speed inference for near-instant scenarios." },
                { icon: <Shield />, title: "Secure Data RLS", desc: "Every project is isolated via Supabase Row-Level Security." },
                { icon: <FileSpreadsheet />, title: "ExcelJS Templating", desc: "Enterprise-themed exports with frozen headers and styling." },
                { icon: <Rocket />, title: "Rapid Iteration", desc: "Update feature text and re-generate in one hover action." },
                { icon: <Layers />, title: "Persistent History", desc: "Never lose a test run. All generations are stored securely." },
                { icon: <Users />, title: "Collaborative Ready", desc: "Share reports with your team via standardized file formats." }
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-3xl bg-white/[0.04] border border-white/10 hover:border-indigo-500/30 hover:bg-white/[0.06] hover:shadow-[0_20px_50px_-12px_rgba(79,70,229,0.15)] transition-all group">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-500/5 flex items-center justify-center mb-6 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                      {f.icon}
                   </div>
                   <h5 className="text-xl font-bold mb-3">{f.title}</h5>
                   <p className="text-white/50 text-sm leading-relaxed group-hover:text-white/70 transition-colors">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>



        {/* ENTERPRISE LOGISTICS */}
        <section id="enterprise" className="py-24 px-6 border-t border-white/[0.05] bg-white/[0.01]">
           <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
              <div className="lg:w-1/2 space-y-8 text-left">
                 <h3 className="text-4xl md:text-5xl font-black tracking-tighter">Secure. Scalable. <br />Private.</h3>
                 <p className="text-white/30 text-lg leading-relaxed">
                    Built on the bedrock of modern tech stacks. We ensure your feature descriptions stay private and your test reports are generated using isolated context windows.
                 </p>
                 <div className="space-y-4 text-sm font-bold uppercase tracking-wider text-white/70">
                    <p className="flex items-center gap-3"><Shield className="w-5 h-5" /> SOC-2 Compliant Infrastructure</p>
                    <p className="flex items-center gap-3"><Users className="w-5 h-5" /> Role-Based Access Control</p>
                 </div>
              </div>
              <div className="lg:w-1/2 w-full aspect-video rounded-3xl bg-transparent border-4 border-dashed border-white/[0.05] flex items-center justify-center group overflow-hidden">
                  <div className="w-full h-full p-10 flex flex-col justify-center gap-6 group-hover:scale-105 transition-transform duration-1000">
                     <div className="h-6 w-3/4 bg-white/10 rounded-full"></div>
                     <div className="h-6 w-full bg-white/5 rounded-full"></div>
                     <div className="h-6 w-1/2 bg-white/10 rounded-full"></div>
                     <div className="h-6 w-2/3 bg-white/5 rounded-full"></div>
                  </div>
              </div>
           </div>
        </section>

        {/* CTA FOOTER */}
        <section className="py-32 px-6 text-center relative selection:bg-white selection:text-black">
           <div className="absolute inset-0 bg-white/[0.02] blur-[150px] opacity-20"></div>
           <div className="max-w-4xl mx-auto space-y-10 relative z-10">
              <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-none">Ready to automate <br />your QA pipeline?</h2>
              <p className="text-xl text-white/30 font-medium">Join 200+ QA Engineers who have reclaimed their weekends.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                 <Link to="/auth" className="px-12 py-5 rounded-3xl bg-primary text-white font-black text-xs uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl shadow-violet-500/20">Launch Mission</Link>
                 <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-12 py-5 rounded-3xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-[0.3em] backdrop-blur-xl hover:bg-white/10 transition-all">Back to Top</button>
              </div>
           </div>
        </section>
      </main>

      {/* THE CINEMATIC FOOTER */}
      <CinematicFooter />
    </div>
  )
}
