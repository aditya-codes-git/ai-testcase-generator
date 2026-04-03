import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import { BrainCircuit, LogOut, Download, Sparkles, Loader2, User, Activity, ListChecks } from "lucide-react"
import { TestCaseTable } from "../components/ui/TestCaseTable"
import type { TestCase } from "../components/ui/TestCaseTable"
import { TwoLevelSidebar } from "../components/ui/sidebar-component"
import * as XLSX from "xlsx"
import { generateTestCases } from "../lib/api"

export default function Dashboard({ session }: { session: any }) {
  const navigate = useNavigate()
  const [featureDesc, setFeatureDesc] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    projectDetails?: {
      projectName: string;
      priority: string;
      description: string;
      testCaseAuthor: string;
      testCaseReviewer: string;
      testCaseVersion: string;
      testExecutionDate: string;
    };
    testCases?: TestCase[];
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  const handleGenerate = async () => {
    if (!featureDesc.trim()) return
    console.log("Starting generation for:", featureDesc);
    try {
      setLoading(true)
      setError(null)
      const data = await generateTestCases(featureDesc)
      console.log("Raw data received:", data);
      
      if (!data || (!data.testCases && !data.projectDetails)) {
        throw new Error("Received empty or invalid data structure from AI.");
      }
      
      setResult(data)
    } catch (err: any) {
      console.error("HandleGenerate error:", err);
      setError(err.message || "Failed to generate test cases")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadExcel = () => {
    if (!result || !result.testCases || !result.projectDetails) return

    const wb = XLSX.utils.book_new()
    
    // Sheet 1: Project Details
    const projectInfo = [
      ["Project Name", result.projectDetails.projectName],
      ["Priority", result.projectDetails.priority],
      ["Description", result.projectDetails.description],
      ["Author", result.projectDetails.testCaseAuthor],
      ["Reviewer", result.projectDetails.testCaseReviewer || 'Pending'],
      ["Version", result.projectDetails.testCaseVersion],
      ["Execution Date", result.projectDetails.testExecutionDate || 'TBD'],
      ["Generated via", "AI TestGen SaaS"],
      ["", ""],
      ["Feature Context", featureDesc]
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(projectInfo)
    XLSX.utils.book_append_sheet(wb, ws1, "Project Details")

    // Sheet 2: Test Cases (New Schema)
    const testCasesForExcel = result.testCases.map(tc => ({
      "Test Case ID": tc.testCaseId,
      "Test Steps": tc.testSteps?.join('\n'),
      "Input Data": tc.inputData,
      "Expected Result": tc.expectedResult,
      "Actual Result": tc.actualResult || "",
      "Environment": tc.testEnvironment,
      "Status": tc.executionStatus,
      "Severity": tc.bugSeverity,
      "Priority": tc.bugPriority,
      "Notes": tc.notes
    }))
    
    const ws2 = XLSX.utils.json_to_sheet(testCasesForExcel)
    XLSX.utils.book_append_sheet(wb, ws2, "Test Cases")

    XLSX.writeFile(wb, `${result.projectDetails.projectName.replace(/\s+/g, '_')}_Test_Cases.xlsx`)
  }

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      <TwoLevelSidebar 
        userEmail={session?.user?.email} 
        onLogout={handleLogout} 
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-background/50">
        <header className="h-[72px] border-b border-border/50 bg-card/10 flex items-center justify-between px-8 shrink-0 backdrop-blur-sm sticky top-0 z-10">
          <div className="text-xl font-semibold md:hidden flex items-center gap-2 ml-10">
            <BrainCircuit className="w-5 h-5 text-primary" /> AI TestGen
          </div>
          <h1 className="text-xl font-semibold hidden md:block tracking-tight">Professional Generator</h1>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-10">
            
            {/* Professional Input Section */}
            <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Define Feature Context</h3>
              </div>
              <textarea 
                value={featureDesc}
                onChange={(e) => setFeatureDesc(e.target.value)}
                placeholder="Describe your feature with user flows, inputs, and constraints..."
                className="w-full h-40 px-5 py-4 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl outline-none resize-none transition-all text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 shadow-inner"
              />
              <div className="flex justify-between items-center mt-6">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> High Performance</span>
                  <span className="flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> Comprehensive Output</span>
                </div>
                <button 
                  onClick={() => {
                    console.log("Generate clicked");
                    handleGenerate();
                  }}
                  disabled={loading || !featureDesc.trim()}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-primary/20 active:scale-95 relative z-10"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                  {loading ? "Analyzing..." : "Generate Professional Tests"}
                </button>
              </div>
              
              {error && (
                <div className="mt-5 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium animate-in fade-in zoom-in-95 duration-300">
                  {error}
                </div>
              )}
            </div>

            {/* Professional Results Section */}
            {result && result.testCases && result.testCases.length > 0 && result.projectDetails && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-bold tracking-tight text-foreground">{result.projectDetails.projectName}</h2>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold uppercase tracking-widest">
                        v{result.projectDetails.testCaseVersion}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">{result.projectDetails.description}</p>
                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3.5 h-3.5" /> 
                        <span className="font-medium text-foreground/80">{result.projectDetails.testCaseAuthor}</span>
                      </div>
                      <div className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 border border-yellow-500/10 rounded text-[11px] font-bold lowercase">
                        {result.projectDetails.priority} priority
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-emerald-600/20 active:scale-95 whitespace-nowrap"
                  >
                    <Download className="w-4.5 h-4.5" /> Export Professional XLSX
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
