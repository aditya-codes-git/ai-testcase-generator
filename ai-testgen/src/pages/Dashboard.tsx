import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import { BrainCircuit, LogOut, Download, Sparkles, Loader2, Activity, ListChecks, History, Calendar, FileText, ChevronRight, BarChart3, TrendingUp, Zap, RefreshCw, Wand2, ChevronDown, ChevronUp, FileCode2, Copy, Check, Trash2, UploadCloud } from "lucide-react"
import { TestCaseTable } from "../components/ui/TestCaseTable"
import type { TestCase } from "../components/ui/TestCaseTable"
import { TwoLevelSidebar } from "../components/ui/sidebar-component"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { generateTestCases, refineTestCases, generateAutomationScript, fetchAutomationScript } from "../lib/api"
import { cn } from "../lib/utils"
import { AiChatPanel } from "../components/ui/AiChatPanel"
import { motion } from "framer-motion"

/* ── Glassmorphic Dashboard Nav (mirrors landing NavHeader) ──────────── */
function DashboardNav({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const [cursorPos, setCursorPos] = useState({ left: 0, width: 0, opacity: 0 });
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "reports", label: "Reports" },
    { id: "metrics", label: "Metrics" },
  ];

  return (
    <ul
      className="relative flex rounded-full border border-white/10 bg-white/5 backdrop-blur-xl p-1 shadow-2xl shadow-black/40"
      onMouseLeave={() => setCursorPos((p) => ({ ...p, opacity: 0 }))}
    >
      {tabs.map((tab) => (
        <DashboardNavTab
          key={tab.id}
          isActive={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          setCursorPos={setCursorPos}
        >
          {tab.label}
        </DashboardNavTab>
      ))}
      <motion.li
        animate={cursorPos}
        className="absolute z-0 h-8 rounded-full bg-white/10 md:h-9 top-1/2 -translate-y-1/2"
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    </ul>
  );
}

function DashboardNavTab({
  children,
  isActive,
  onClick,
  setCursorPos,
}: {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  setCursorPos: any;
}) {
  const ref = useRef<HTMLLIElement>(null);

  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref.current) return;
        const { width } = ref.current.getBoundingClientRect();
        setCursorPos({ width, opacity: 1, left: ref.current.offsetLeft });
      }}
      onClick={onClick}
      className="relative z-10 block cursor-pointer transition-colors"
    >
      <span
        className={cn(
          "block px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors md:px-6 md:py-2.5",
          isActive ? "text-white" : "text-white/50 hover:text-white/80"
        )}
      >
        {children}
      </span>
    </li>
  );
}

export default function Dashboard({ session }: { session: any }) {
  const navigate = useNavigate()
  const [featureDesc, setFeatureDesc] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeSecondaryTab, setActiveSecondaryTab] = useState("overview")
  
  // Script State
  const [currentTestCaseId, setCurrentTestCaseId] = useState<string | null>(null);
  const [testCaseVersion, setTestCaseVersion] = useState(1);
  const [automationScript, setAutomationScript] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'testCases' | 'script'>('testCases');
  const [copiedScript, setCopiedScript] = useState(false);

  // Generator State
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
    rawStringTestCases?: string;
    extractedText?: string;
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Refinement State
  const [refineInstruction, setRefineInstruction] = useState("")
  const [refining, setRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)
  const [refineSummary, setRefineSummary] = useState<string | null>(null)
  const [showRefinePanel, setShowRefinePanel] = useState(false)

  // History State
  const [history, setHistory] = useState<any[]>([])
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null)

  // Calculate Metrics
  const metrics = useMemo(() => {
    const totalGenerations = history.length
    const totalTestCases = history.reduce((sum, item) => sum + (item.generated_json.testCases?.length || 0), 0)
    const avgCasesPerProject = totalGenerations > 0 ? (totalTestCases / totalGenerations).toFixed(1) : "0"
    
    return {
      totalGenerations,
      totalTestCases,
      avgCasesPerProject,
      lastUpdated: history[0]?.created_at
    }
  }, [history])

  useEffect(() => {
    if (activeSecondaryTab === "reports" || activeSecondaryTab === "metrics") {
      fetchHistory()
    }
  }, [activeSecondaryTab])

  const fetchHistory = async () => {
    try {
      setFetchingHistory(true)
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setHistory(data || [])
    } catch (err: any) {
      console.error("Fetch history error:", err)
    } finally {
      setFetchingHistory(false)
    }
  }

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
      
      if (!data || (!data.testCases && !data.projectDetails)) {
        throw new Error("Received empty or invalid data structure from AI.")
      }
      
      // Save to Supabase
      const { data: insertedData, error: dbError } = await supabase.from('test_cases').insert([
        {
          user_id: session.user.id,
          feature_text: featureDesc,
          generated_json: data,
          created_at: new Date().toISOString()
        }
      ]).select().single()

      if (dbError) {
        console.warn("Could not save to history:", dbError)
      } else if (insertedData) {
        setCurrentTestCaseId(insertedData.id)
        setTestCaseVersion(1)
        setAutomationScript(null)
        setActiveReportTab('testCases')
        fetchHistory()
      }
      
      setResult(data)
    } catch (err: any) {
      console.error("HandleGenerate error:", err)
      setError(err.message || "Failed to generate test cases")
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingImage(true)
      setError(null)
      
      const formData = new FormData()
      formData.append("image", file)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/generate-from-image`, {
        method: "POST",
        body: formData
      })
      
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Unexpected server response: ${text.substring(0, 100)}`);
      }

      if (!response.ok || !data.success) {
        console.error("Backend Error Details:", data);
        throw new Error(data.error || "Failed to process image");
      }

      const newResult = {
        projectDetails: data.projectDetails || {
          projectName: "UI Image Analysis",
          priority: "Medium",
          description: "Test cases generated from uploaded application screenshot.",
          testCaseAuthor: session.user.email,
          testCaseReviewer: "Pending",
          testCaseVersion: "1.0",
          testExecutionDate: new Date().toLocaleDateString()
        },
        testCases: Array.isArray(data.testCases) ? data.testCases : [],
        extractedText: data.extractedText
      }

      // Save to Supabase
      const { data: insertedData, error: dbError } = await supabase.from('test_cases').insert([
        {
          user_id: session.user.id,
          feature_text: "Screenshot Upload",
          generated_json: newResult,
          created_at: new Date().toISOString()
        }
      ]).select().single()

      if (dbError) {
        console.warn("Could not save to history:", dbError)
      } else if (insertedData) {
        setCurrentTestCaseId(insertedData.id)
        setTestCaseVersion(1)
        setAutomationScript(null)
        setActiveReportTab('testCases')
        fetchHistory()
      }
      
      setResult(newResult)
    } catch (err: any) {
      console.error("HandleImageUpload error:", err)
      setError(err.message || "Failed to process screenshot")
    } finally {
      setIsUploadingImage(false)
      if (e.target) e.target.value = '' // reset input
    }
  }

  const handleGenerateScript = async () => {
    setActiveReportTab('script');
    const testCasesToUse = result?.testCases || selectedHistoryItem?.generated_json?.testCases;

    if (!testCasesToUse) {
      alert("No structured test cases found to generate a script from.");
      return;
    }
    
    if (!currentTestCaseId) {
      alert("Test case ID missing. Please try regenerating the test cases first.");
      return;
    }

    try {
      setIsGeneratingScript(true);
      const res = await generateAutomationScript(currentTestCaseId, testCasesToUse, testCaseVersion, 'java', 'selenium-testng');
      setAutomationScript(res.script);
      setTestCaseVersion(res.version);
    } catch (err: any) {
      console.error("Generate script error:", err);
      alert("Error generating script: " + (err.message || "Unknown error"));
    } finally {
      setIsGeneratingScript(false);
    }
  }

  const handleSelectHistoryItem = async (item: any) => {
    setSelectedHistoryItem(item)
    setCurrentTestCaseId(item.id)
    setTestCaseVersion(1)
    setAutomationScript(null)
    setActiveReportTab('testCases')
    
    // Fetch script async
    const scriptRec = await fetchAutomationScript(item.id)
    if (scriptRec) {
      setAutomationScript(scriptRec.script_content)
      setTestCaseVersion(scriptRec.version)
    }
  }

  const handleRefine = async (quickInstruction?: string) => {
    const instruction = quickInstruction || refineInstruction.trim()
    if (!instruction || !result?.testCases) return
    try {
      setRefining(true)
      setRefineError(null)
      setRefineSummary(null)
      const data = await refineTestCases(result.testCases, instruction)

      if (!data || !data.testCases) {
        throw new Error("Received empty or invalid refinement data.")
      }

      setResult(prev => ({
        ...prev!,
        testCases: data.testCases
      }))
      setRefineSummary(data.refinementSummary || `Refined with: "${instruction}"`)
      setRefineInstruction("")
      
      if (currentTestCaseId) {
        const newVersion = testCaseVersion + 1;
        setTestCaseVersion(newVersion);
        
        // Auto trigger script update in background
        setIsGeneratingScript(true);
        generateAutomationScript(currentTestCaseId, data.testCases, newVersion, 'java', 'selenium-testng')
          .then(res => {
            setAutomationScript(res.script);
          })
          .catch(err => {
            console.error("Auto script generation failed:", err);
          })
          .finally(() => {
            setIsGeneratingScript(false);
          });
      }
      
    } catch (err: any) {
      console.error("HandleRefine error:", err)
      setRefineError(err.message || "Failed to refine test cases")
    } finally {
      setRefining(false)
    }
  }

  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this report? This will remove all associated test cases, scripts, and chat history.")) return

    try {
      // 1. Optimistic UI update
      setHistory(prev => prev.filter(item => item.id !== id))
      if (selectedHistoryItem?.id === id) {
        setSelectedHistoryItem(null)
        setResult(null)
      }

      // 2. Delete associated data (Supabase)
      // Since we don't know for sure if cascade is on, we'll try to delete everything
      await supabase.from('test_case_scripts').delete().eq('test_case_id', id)
      await supabase.from('chat_messages').delete().eq('test_case_id', id)
      const { error } = await supabase.from('test_cases').delete().eq('id', id)

      if (error) throw error
    } catch (err: any) {
      console.error("Delete history error:", err)
      alert("Failed to delete report: " + err.message)
      // Rollback optimistic update
      fetchHistory()
    }
  }

  const handleDownloadExcel = async (exportData?: any) => {
    const dataToExport = exportData || result
    if (!dataToExport || !dataToExport.testCases || !dataToExport.projectDetails) return

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('QA Test Cases');

    const projectDetails = [
      ["Project Name", dataToExport.projectDetails.projectName],
      ["Priority", dataToExport.projectDetails.priority],
      ["Description", dataToExport.projectDetails.description],
      ["Test Case Author", dataToExport.projectDetails.testCaseAuthor],
      ["Test Case Reviewer", dataToExport.projectDetails.testCaseReviewer || 'Pending'],
      ["Test Case Version", dataToExport.projectDetails.testCaseVersion],
      ["Test Execution Date", dataToExport.projectDetails.testExecutionDate || new Date().toLocaleDateString()],
    ];

    projectDetails.forEach((detail) => {
      const row = worksheet.addRow(detail);
      const labelCell = row.getCell(1);
      const valueCell = row.getCell(2);
      labelCell.font = { bold: true };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
      [labelCell, valueCell].forEach(cell => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    worksheet.addRow([]);
    worksheet.addRow(["TEST CASE SPECIFICATIONS"]);
    worksheet.mergeCells(`A${projectDetails.length + 2}:J${projectDetails.length + 2}`);
    const specHeader = worksheet.getCell(`A${projectDetails.length + 2}`);
    specHeader.font = { bold: true, size: 12 };
    specHeader.alignment = { horizontal: 'center' };

    const headerRowNumber = projectDetails.length + 3;
    const columns = [
      { header: 'Test Case ID', key: 'testCaseId', width: 15 },
      { header: 'Test Steps', key: 'testSteps', width: 50 },
      { header: 'Input Data', key: 'inputData', width: 25 },
      { header: 'Expected Results', key: 'expectedResult', width: 50 },
      { header: 'Actual Results', key: 'actualResult', width: 25 },
      { header: 'Test Environment', key: 'testEnvironment', width: 15 },
      { header: 'Execution Status', key: 'executionStatus', width: 15 },
      { header: 'Bug Severity', key: 'bugSeverity', width: 12 },
      { header: 'Bug Priority', key: 'bugPriority', width: 12 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    const headerRow = worksheet.getRow(headerRowNumber);
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    dataToExport.testCases.forEach((tc: TestCase) => {
      const rowData = [
        tc.testCaseId,
        tc.testSteps?.map((step, i) => `${i + 1}. ${step}`).join('\n'),
        tc.inputData,
        tc.expectedResult,
        tc.actualResult || "",
        tc.testEnvironment,
        tc.executionStatus,
        tc.bugSeverity || "None",
        tc.bugPriority || "None",
        tc.notes || ""
      ];
      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });

    worksheet.columns = columns.map(c => ({ key: c.key, width: c.width }));
    worksheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${dataToExport.projectDetails.projectName.replace(/\s+/g, '_')}_QA_Template.xlsx`);
  };

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden noise-bg dashboard-glow">
      <TwoLevelSidebar 
        activeSecondaryTab={activeSecondaryTab}
        onSecondaryTabChange={setActiveSecondaryTab}
      />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-gradient-to-b from-background via-background to-background/95 relative">
        <header className="h-[72px] border-b border-white/[0.06] bg-black/40 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 sticky top-0 z-10">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.href = "/"}>
            <img src="/Logo/logo_full.png" alt="TestGen" className="h-9 w-auto group-hover:scale-105 transition-transform" />
          </div>

          {/* Center Nav — Glassmorphic Pill Tabs */}
          <nav className="hidden md:flex">
            <DashboardNav activeTab={activeSecondaryTab} onTabChange={setActiveSecondaryTab} />
          </nav>
          
          {/* Right — User + Sign Out */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.15em] leading-none">Testing Account</span>
              <span className="text-sm font-semibold text-foreground/80">{session?.user?.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full transition-all border border-white/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-10">
          <div className="max-w-6xl mx-auto">
            
            {/* View 1: Generator (Overview) */}
            {activeSecondaryTab === "overview" && (
              <div className="space-y-10">
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  {/* Subtle top gradient accent */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-24 bg-violet-500/5 blur-[60px] pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <Sparkles className="w-4.5 h-4.5 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg tracking-tight">Define Feature Context</h3>
                        <p className="text-xs text-muted-foreground">Describe your feature in detail for comprehensive test generation</p>
                      </div>
                    </div>
                    <textarea 
                      value={featureDesc}
                      onChange={(e) => setFeatureDesc(e.target.value)}
                      placeholder="e.g. Signup flow with email validation, password strength meter, OAuth options, error handling for duplicate accounts, and redirect after success..."
                      className="w-full h-44 px-5 py-4 mt-4 bg-black/40 border border-white/[0.08] focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 focus:shadow-[0_0_30px_-5px_rgba(139,92,246,0.15)] rounded-2xl outline-none resize-none transition-all text-foreground placeholder:text-muted-foreground/40 text-sm leading-relaxed"
                    />
                    <div className="flex justify-between items-center mt-6">
                      <div className="flex items-center gap-5 text-xs text-muted-foreground/60">
                        <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-violet-400/60" /> High Quality Output</span>
                        <span className="flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5 text-violet-400/60" /> Auto-saved to History</span>
                      </div>
                      <div className="flex gap-3">
                        <input 
                          type="file" 
                          id="screenshot-upload" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={loading || isUploadingImage}
                        />
                        <label 
                          htmlFor="screenshot-upload"
                          className={`flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-foreground/80 font-semibold hover:border-violet-500/30 hover:bg-white/[0.05] transition-all cursor-pointer text-sm ${isUploadingImage || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-violet-400" /> : <UploadCloud className="w-4 h-4 text-violet-400" />}
                          {isUploadingImage ? "Parsing Image..." : "Upload Screenshot"}
                        </label>
                        <button 
                          onClick={handleGenerate}
                          disabled={loading || !featureDesc.trim() || isUploadingImage}
                          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98] text-sm"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                          {loading ? "Generating..." : "Generate Professional Tests"}
                        </button>
                      </div>
                    </div>
                    {error && <div className="mt-5 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</div>}
                  </div>
                </div>

                {result?.testCases && result.testCases.length > 0 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 glass-card p-6 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      <div className="space-y-2">
                         <div className="flex items-center gap-3">
                           <h2 className="text-3xl font-bold tracking-tight">{result.projectDetails?.projectName}</h2>
                           <span className="px-2.5 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg text-[10px] font-bold uppercase">v1.0</span>
                         </div>
                         <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">{result.projectDetails?.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setShowRefinePanel(p => !p)} className="flex items-center gap-2 px-5 py-2.5 bg-violet-500/10 hover:bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-xl font-bold transition-all text-sm">
                          <Wand2 className="w-4 h-4" /> Refine
                          {showRefinePanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button onClick={handleGenerateScript} disabled={isGeneratingScript} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 shrink-0 disabled:opacity-50">
                          {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
                          Script
                        </button>
                        <button onClick={() => handleDownloadExcel()} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"><Download className="w-4 h-4" /> Export XLSX</button>
                      </div>
                    </div>

                    {/* Refinement Panel */}
                    {showRefinePanel && (
                      <div className="glass-card rounded-2xl p-6 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-violet-400" />
                          <h4 className="font-bold text-sm">Refine Test Cases</h4>
                          <span className="text-[10px] text-muted-foreground ml-auto uppercase tracking-widest font-bold">{result.testCases?.length || 0} cases loaded</span>
                        </div>

                        {/* Quick Action Chips */}
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: "Add Edge Cases", instruction: "Add edge cases including boundary values, extreme inputs, empty inputs, and null cases" },
                            { label: "Negative Testing", instruction: "Add negative testing scenarios with invalid inputs, incorrect flows, and error handling" },
                            { label: "Improve Coverage", instruction: "Improve test coverage by identifying and adding missing logical scenarios" },
                            { label: "Automation-Ready", instruction: "Make all test steps precise, deterministic, and automation-ready with clear selectors" },
                            { label: "BDD Format", instruction: "Convert all test cases into Given-When-Then BDD format" },
                          ].map((chip) => (
                            <button
                              key={chip.label}
                              onClick={() => handleRefine(chip.instruction)}
                              disabled={refining}
                              className="px-4 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-foreground/80 text-xs font-semibold transition-all border border-white/[0.08] hover:border-violet-500/30 disabled:opacity-50"
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>

                        {/* Custom Instruction */}
                        <div className="flex gap-3">
                          <input
                            value={refineInstruction}
                            onChange={(e) => setRefineInstruction(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                            placeholder="Custom instruction: e.g., 'Add security testing scenarios' or 'Focus on API error handling'"
                            className="flex-1 px-4 py-3 bg-black/40 border border-white/[0.08] focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 rounded-xl outline-none transition-all text-sm text-foreground placeholder:text-muted-foreground/40"
                            disabled={refining}
                          />
                          <button
                            onClick={() => handleRefine()}
                            disabled={refining || !refineInstruction.trim()}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 text-sm whitespace-nowrap shadow-lg shadow-violet-500/15"
                          >
                            {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            {refining ? "Refining..." : "Refine"}
                          </button>
                        </div>

                        {refineError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{refineError}</div>}
                        {refineSummary && (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-start gap-2">
                            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{refineSummary}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Report Tabs */}
                    <div className="flex border-b border-border/50 mb-4 overflow-x-auto no-scrollbar">
                      <button
                        onClick={() => setActiveReportTab('testCases')}
                        className={cn(
                          "px-6 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                          activeReportTab === 'testCases' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Test Cases
                      </button>
                      <button
                        onClick={() => setActiveReportTab('script')}
                        className={cn(
                          "px-6 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                          activeReportTab === 'script' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Automation Script {testCaseVersion > 1 ? `(v${testCaseVersion})` : ''}
                      </button>
                    </div>

                    {activeReportTab === 'testCases' && (
                      result.testCases && result.testCases.length > 0 ? (
                        <TestCaseTable testCases={result.testCases} />
                      ) : (
                        <div className="bg-[#1e1e1e] rounded-xl border border-border/50 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-border/50">
                            <span className="text-xs font-mono text-muted-foreground">Raw Test Cases (from Screenshot)</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (result.rawStringTestCases) {
                                    navigator.clipboard.writeText(result.rawStringTestCases);
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-xs font-medium text-muted-foreground hover:text-white transition-all"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copy
                              </button>
                            </div>
                          </div>
                          {result.extractedText && (
                            <div className="p-4 border-b border-border/50 bg-black/20">
                              <p className="text-xs font-bold text-muted-foreground mb-2">EXTRACTED UI TEXT:</p>
                              <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">{result.extractedText}</p>
                            </div>
                          )}
                          <pre className="p-4 overflow-auto max-h-[600px] text-sm font-mono text-emerald-400 bg-transparent leading-relaxed whitespace-pre-wrap word-break">
                            {result.rawStringTestCases}
                          </pre>
                        </div>
                      )
                    )}

                    {activeReportTab === 'script' && (
                      <div className="bg-[#1e1e1e] rounded-xl border border-border/50 overflow-hidden">
                        {isGeneratingScript ? (
                          <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                            <p className="text-muted-foreground">Generating automation script...</p>
                          </div>
                        ) : automationScript ? (
                          <div className="flex flex-col h-full max-h-[600px]">
                            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-border/50">
                              <span className="text-xs font-mono text-muted-foreground">Java (Selenium + TestNG)</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleGenerateScript}
                                  disabled={isGeneratingScript}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 hover:bg-primary/20 text-muted-foreground hover:text-primary rounded-md text-xs font-medium transition-all"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(automationScript);
                                    setCopiedScript(true);
                                    setTimeout(() => setCopiedScript(false), 2000);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-xs font-medium text-muted-foreground hover:text-white transition-all"
                                >
                                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  {copiedScript ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                  onClick={() => {
                                    const blob = new Blob([automationScript], { type: "text/plain;charset=utf-8" });
                                    saveAs(blob, `AutomationTest_v${testCaseVersion}.java`);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-md text-xs font-medium transition-all"
                                >
                                  <Download className="w-3.5 h-3.5" />.java
                                </button>
                              </div>
                            </div>
                            <pre className="p-4 overflow-auto text-sm font-mono text-emerald-400 bg-transparent leading-relaxed whitespace-pre-wrap word-break">
                              {automationScript}
                            </pre>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                              <FileCode2 className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Script Generated</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mb-6">
                              Generate a Java Selenium automation script based on these test cases.
                            </p>
                            <button
                              onClick={handleGenerateScript}
                              className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold flex items-center gap-2 rounded-xl transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
                            >
                              <FileCode2 className="w-4 h-4" /> Generate Script
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* View 2: Reports (History) */}
            {activeSecondaryTab === "reports" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {!selectedHistoryItem ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-white/[0.06] pb-5">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <History className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">Generation History</h2>
                        <p className="text-muted-foreground/60 text-sm">Review your past test case generations and reports.</p>
                      </div>
                    </div>

                    {fetchingHistory ? (
                      <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary/40" /></div>
                    ) : history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-96 glass-card rounded-3xl border border-dashed border-white/[0.08]">
                        <div className="w-16 h-16 bg-violet-500/5 rounded-2xl flex items-center justify-center mb-4 border border-violet-500/10"><FileText className="w-8 h-8 text-violet-400/40" /></div>
                        <h3 className="text-lg font-bold">No reports generated yet</h3>
                        <p className="text-muted-foreground/50 text-sm mt-1">Start by generating your first test cases in the Dashboard.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {history.map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => handleSelectHistoryItem(item)}
                            className="glass-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-violet-500/20 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer group hover:scale-[1.005] hover:shadow-[0_8px_30px_-10px_rgba(139,92,246,0.08)]"
                          >
                            <div className="flex gap-4 items-start">
                              <div className="w-10 h-10 bg-violet-500/5 rounded-xl flex items-center justify-center shrink-0 border border-violet-500/10 group-hover:bg-violet-500/10 transition-colors">
                                <FileText className="w-5 h-5 text-violet-400" />
                              </div>
                              <div>
                                <h4 className="font-bold text-foreground group-hover:text-violet-300 transition-colors">{item.generated_json.projectDetails?.projectName || "Unnamed Project"}</h4>
                                <p className="text-sm text-muted-foreground/60 line-clamp-1 max-w-md">{item.feature_text}</p>
                                <div className="flex items-center gap-3 mt-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/50">
                                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString()}</span>
                                  <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" /> {item.generated_json.testCases?.length || 0} Cases</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="hidden md:flex items-center gap-2 text-violet-400 font-bold text-sm whitespace-nowrap">
                                View Report <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                              <button
                                onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                                className="p-2 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                title="Delete Report"
                              >
                                <Trash2 className="w-5 h-5 transition-transform active:scale-90" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col h-[calc(100vh-160px)] animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="mb-4 shrink-0">
                      <button 
                        onClick={() => setSelectedHistoryItem(null)}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors w-fit"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" /> Back to history
                      </button>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 pb-6">
                      {/* LEFT: Test Case Table (65%) */}
                      <div className="lg:w-[65%] flex flex-col gap-6 overflow-hidden">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 glass-card p-6 rounded-2xl shrink-0 relative overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                          <div className="space-y-2">
                             <div className="flex items-center gap-3">
                               <h2 className="text-2xl font-bold line-clamp-1 tracking-tight">{selectedHistoryItem.generated_json.projectDetails?.projectName}</h2>
                               <span className="px-2.5 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg text-[10px] font-bold uppercase shrink-0">v{selectedHistoryItem.generated_json.projectDetails?.testCaseVersion || 1}</span>
                             </div>
                             <p className="text-muted-foreground/70 text-sm max-w-2xl line-clamp-2 leading-relaxed">{selectedHistoryItem.generated_json.projectDetails?.description}</p>
                             <p className="text-xs text-muted-foreground/50 bg-black/30 p-3 rounded-xl border border-white/[0.05] mt-4 italic line-clamp-2">"{selectedHistoryItem.feature_text}"</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={handleGenerateScript} disabled={isGeneratingScript} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 shrink-0 disabled:opacity-50">
                              {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
                              Script
                            </button>
                            <button onClick={() => handleDownloadExcel(selectedHistoryItem.generated_json)} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 shrink-0"><Download className="w-4 h-4" /> Export</button>
                          </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col min-h-0">
                          {/* Report Tabs */}
                          <div className="flex border-b border-border/50 mb-4 shrink-0 overflow-x-auto no-scrollbar">
                            <button
                              onClick={() => setActiveReportTab('testCases')}
                              className={cn(
                                "px-6 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                                activeReportTab === 'testCases' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Test Cases
                            </button>
                            <button
                              onClick={() => setActiveReportTab('script')}
                              className={cn(
                                "px-6 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                                activeReportTab === 'script' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Automation Script {testCaseVersion > 1 ? `(v${testCaseVersion})` : ''}
                            </button>
                          </div>

                          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-border/50 bg-card/40 relative">
                            {activeReportTab === 'testCases' && (
                              <TestCaseTable testCases={selectedHistoryItem.generated_json.testCases} />
                            )}

                            {activeReportTab === 'script' && (
                              <div className="absolute inset-0 bg-[#1e1e1e] overflow-hidden flex flex-col">
                                {isGeneratingScript ? (
                                  <div className="flex flex-col items-center justify-center py-20 h-full">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                                    <p className="text-muted-foreground">Generating automation script...</p>
                                  </div>
                                ) : automationScript ? (
                                  <div className="flex flex-col h-full">
                                    <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-border/50 shrink-0">
                                      <span className="text-xs font-mono text-muted-foreground">Java (Selenium + TestNG)</span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={handleGenerateScript}
                                          disabled={isGeneratingScript}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 hover:bg-primary/20 text-muted-foreground hover:text-primary rounded-md text-xs font-medium transition-all"
                                        >
                                          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                                        </button>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(automationScript);
                                            setCopiedScript(true);
                                            setTimeout(() => setCopiedScript(false), 2000);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-xs font-medium text-muted-foreground hover:text-white transition-all"
                                        >
                                          {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                          {copiedScript ? 'Copied' : 'Copy'}
                                        </button>
                                        <button
                                          onClick={() => {
                                            const blob = new Blob([automationScript], { type: "text/plain;charset=utf-8" });
                                            saveAs(blob, `AutomationTest_v${testCaseVersion}.java`);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-md text-xs font-medium transition-all"
                                        >
                                          <Download className="w-3.5 h-3.5" />.java
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex-1 overflow-auto min-h-0 bg-[#1e1e1e]">
                                      <pre className="p-4 text-sm font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap word-break">
                                        {automationScript}
                                      </pre>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                      <FileCode2 className="w-6 h-6 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">No Script Generated</h3>
                                    <p className="text-muted-foreground text-sm max-w-sm mb-6">
                                      Generate a Java Selenium automation script based on these test cases.
                                    </p>
                                    <button
                                      onClick={handleGenerateScript}
                                      className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold flex items-center gap-2 rounded-xl transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
                                    >
                                      <FileCode2 className="w-4 h-4" /> Generate Script
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                        {/* RIGHT: AI Chat Panel (35%) */}
                      <div className="lg:w-[35%] rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl overflow-hidden flex flex-col">
                        <AiChatPanel 
                          testCases={selectedHistoryItem.generated_json.testCases}
                          testCaseId={selectedHistoryItem.id}
                          userId={session?.user?.id}
                          onTestCasesUpdated={async (newTestCases, newVersion) => {
                            const updatedHistoryItem = {
                              ...selectedHistoryItem,
                              generated_json: {
                                ...selectedHistoryItem.generated_json,
                                testCases: newTestCases,
                                projectDetails: {
                                  ...selectedHistoryItem.generated_json.projectDetails,
                                  testCaseVersion: newVersion.toString()
                                }
                              }
                            };
                            setSelectedHistoryItem(updatedHistoryItem);
                            setHistory(prev => prev.map(item => item.id === selectedHistoryItem.id ? updatedHistoryItem : item));
                            
                            try {
                              await supabase.from('test_cases').update({ generated_json: updatedHistoryItem.generated_json }).eq('id', selectedHistoryItem.id);
                              
                              if (selectedHistoryItem.id) {
                                setTestCaseVersion(newVersion);
                                setIsGeneratingScript(true);
                                generateAutomationScript(selectedHistoryItem.id, newTestCases, newVersion, 'java', 'selenium-testng')
                                  .then(res => setAutomationScript(res.script))
                                  .catch(err => console.error("Auto script generation error:", err))
                                  .finally(() => setIsGeneratingScript(false));
                              }
                            } catch (e) {
                              console.warn("Update error:", e)
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View 3: Metrics (Stats) */}
            {activeSecondaryTab === "metrics" && (
              <div className="space-y-10 animate-in fade-in duration-500 pb-10">
                <div className="flex items-center gap-4 border-b border-white/[0.06] pb-5">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                    <BarChart3 className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
                    <p className="text-muted-foreground/60 text-sm">Visualize your generation velocity and project output.</p>
                  </div>
                </div>

                {fetchingHistory ? (
                   <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-violet-400/40" /></div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-96 glass-card rounded-3xl border border-dashed border-white/[0.08]">
                    <div className="w-16 h-16 bg-violet-500/5 rounded-2xl flex items-center justify-center mb-4 border border-violet-500/10"><TrendingUp className="w-8 h-8 text-violet-400/40" /></div>
                    <h3 className="text-lg font-bold">No data available yet</h3>
                    <p className="text-muted-foreground/50 text-sm mt-1">Start generating reports to see your metrics populate.</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="glass-card p-7 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Activity className="w-14 h-14 text-emerald-400" />
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] mb-2">Total Generations</p>
                        <h4 className="text-4xl font-extrabold tracking-tight">{metrics.totalGenerations}</h4>
                        <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-3 tracking-tighter">
                          <Zap className="w-3 h-3" /> SUCCESSIVE RUNS
                        </p>
                      </div>

                      <div className="glass-card p-7 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent"></div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <ListChecks className="w-14 h-14 text-violet-400" />
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] mb-2">Total Test Cases</p>
                        <h4 className="text-4xl font-extrabold tracking-tight">{metrics.totalTestCases}</h4>
                        <p className="text-[10px] text-violet-400/60 font-bold flex items-center gap-1 mt-3 tracking-tighter uppercase">
                          QA Scenarios Generated
                        </p>
                      </div>

                      <div className="glass-card p-7 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <TrendingUp className="w-14 h-14 text-indigo-400" />
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] mb-2">Avg Case/Project</p>
                        <h4 className="text-4xl font-extrabold tracking-tight">{metrics.avgCasesPerProject}</h4>
                        <p className="text-[10px] text-muted-foreground/50 font-bold flex items-center gap-1 mt-3 tracking-tighter">
                          LAST UPDATED: {metrics.lastUpdated ? new Date(metrics.lastUpdated).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Activity Summary */}
                    <div className="glass-card rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                        <h3 className="font-bold text-lg tracking-tight">Activity Summary</h3>
                      </div>
                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-white/[0.02] text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50">
                              <th className="px-6 py-4">Project</th>
                              <th className="px-6 py-4">Priority</th>
                              <th className="px-6 py-4">Cases</th>
                              <th className="px-6 py-4">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {history.slice(0, 5).map((item) => (
                              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 font-semibold text-sm">{item.generated_json.projectDetails?.projectName}</td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border",
                                    item.generated_json.projectDetails?.priority === 'High' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                                    item.generated_json.projectDetails?.priority === 'Medium' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                  )}>
                                    {item.generated_json.projectDetails?.priority}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-sm">{item.generated_json.testCases?.length || 0}</td>
                                <td className="px-6 py-4 text-xs text-muted-foreground/60">{new Date(item.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
