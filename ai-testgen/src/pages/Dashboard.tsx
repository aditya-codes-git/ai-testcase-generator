import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import { BrainCircuit, LogOut, Download, Sparkles, Loader2 } from "lucide-react"
import { TestCaseTable } from "../components/ui/TestCaseTable"
import type { TestCase } from "../components/ui/TestCaseTable"
import * as XLSX from "xlsx"
import { generateTestCases } from "../lib/api"

export default function Dashboard({ session }: { session: any }) {
  const navigate = useNavigate()
  const [featureDesc, setFeatureDesc] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    projectName?: string;
    priority?: string;
    description?: string;
    testCases?: TestCase[];
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  const handleGenerate = async () => {
    if (!featureDesc.trim()) return
    try {
      setLoading(true)
      setError(null)
      const data = await generateTestCases(featureDesc)
      setResult(data)
    } catch (err: any) {
      setError(err.message || "Failed to generate test cases")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadExcel = () => {
    if (!result || !result.testCases) return

    const wb = XLSX.utils.book_new()
    
    // Sheet 1: Project Info
    const projectInfo = [
      ["Project Name", result.projectName || "Generated Project"],
      ["Priority", result.priority || "High"],
      ["Description", result.description || "Generated test cases"],
      ["Original Feature Description", featureDesc]
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(projectInfo)
    XLSX.utils.book_append_sheet(wb, ws1, "Project Details")

    // Sheet 2: Test Cases
    const testCasesForExcel = result.testCases.map(tc => ({
      ID: tc.id,
      Title: tc.title,
      Type: tc.type,
      Steps: tc.steps?.join('\n'),
      "Input Data": tc.inputData,
      "Expected Result": tc.expectedResult,
      "Environment": tc.environment,
      "Status": tc.status,
      "Bug Severity": tc.bugSeverity,
      "Bug Priority": tc.bugPriority,
      "Notes": tc.notes
    }))
    
    const ws2 = XLSX.utils.json_to_sheet(testCasesForExcel)
    XLSX.utils.book_append_sheet(wb, ws2, "Test Cases")

    XLSX.writeFile(wb, `${result.projectName?.replace(/\s+/g, '_') || 'TestCases'}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-background flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/30 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-2 border-b border-border/50">
          <BrainCircuit className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">AI TestGen</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium border border-primary/20 cursor-default">
            Dashboard
          </div>
        </nav>
        <div className="p-4 border-t border-border/50 text-sm text-muted-foreground truncate">
          {session?.user?.email}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-border/50 bg-card/30 flex items-center justify-between px-6 shrink-0">
          <div className="text-xl font-semibold md:hidden flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" /> AI TestGen
          </div>
          <h1 className="text-xl font-semibold hidden md:block">Generate Test Cases</h1>
          <button 
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Input Card */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <label className="block text-sm font-medium mb-3 text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Describe your feature
              </label>
              <textarea 
                value={featureDesc}
                onChange={(e) => setFeatureDesc(e.target.value)}
                placeholder="e.g., A user login form with email, password, and a 'remember me' checkbox that persists the session for 30 days..."
                className="w-full h-32 px-4 py-3 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none resize-none transition-all text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex justify-between items-center mt-4">
                <p className="text-xs text-muted-foreground">Detailed descriptions yield better test coverage.</p>
                <button 
                  onClick={handleGenerate}
                  disabled={loading || !featureDesc.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                  {loading ? "Generating..." : "Generate Tests"}
                </button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Results Section */}
            {result && result.testCases && result.testCases.length > 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{result.projectName || "Generated Tests"}</h2>
                    <p className="text-muted-foreground">{result.description}</p>
                  </div>
                  <button 
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" /> Download Excel
                  </button>
                </div>
                
                <TestCaseTable testCases={result.testCases} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
