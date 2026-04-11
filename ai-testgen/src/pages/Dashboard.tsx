import { useState, useEffect, useMemo } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import { BrainCircuit, LogOut, Download, Sparkles, Loader2, Activity, ListChecks, History, Calendar, FileText, ChevronRight, BarChart3, TrendingUp, Zap, RefreshCw, Wand2, ChevronDown, ChevronUp, FileCode2, Copy, Check } from "lucide-react"
import { TestCaseTable } from "../components/ui/TestCaseTable"
import type { TestCase } from "../components/ui/TestCaseTable"
import { TwoLevelSidebar, type PrimaryTab } from "../components/ui/sidebar-component"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { generateTestCases, refineTestCases, generateAutomationScript, fetchAutomationScript } from "../lib/api"
import { cn } from "../lib/utils"
import { AiChatPanel } from "../components/ui/AiChatPanel"

export default function Dashboard({ session }: { session: any }) {
  const navigate = useNavigate()
  const [featureDesc, setFeatureDesc] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<PrimaryTab>("dashboard")
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
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const handleGenerateScript = async () => {
    setActiveReportTab('script');
    const testCasesToUse = result?.testCases || selectedHistoryItem?.generated_json?.testCases;

    if (!testCasesToUse) {
      alert("No test cases found to generate a script from.");
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
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      <TwoLevelSidebar 
        userEmail={session?.user?.email} 
        onLogout={handleLogout} 
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "dashboard") setActiveSecondaryTab("overview");
        }}
        activeSecondaryTab={activeSecondaryTab}
        onSecondaryTabChange={setActiveSecondaryTab}
      />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-background/50">
        <header className="h-[72px] border-b border-border/50 bg-card/10 flex items-center justify-between px-8 shrink-0 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex-1"></div>
          <h1 className="text-xl font-semibold hidden md:block tracking-tight capitalize">
            {activeSecondaryTab === 'overview' ? 'AI Generator' : activeSecondaryTab}
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest leading-none">Testing Account</span>
              <span className="text-sm font-semibold">{session?.user?.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border/50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-10">
          <div className="max-w-6xl mx-auto">
            
            {/* View 1: Generator (Overview) */}
            {activeSecondaryTab === "overview" && (
              <div className="space-y-10">
                <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Define Feature Context</h3>
                  </div>
                  <textarea 
                    value={featureDesc}
                    onChange={(e) => setFeatureDesc(e.target.value)}
                    placeholder="Describe your feature with user flows, inputs, and constraints..."
                    className="w-full h-40 px-5 py-4 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl outline-none resize-none transition-all text-foreground placeholder:text-muted-foreground/60"
                  />
                  <div className="flex justify-between items-center mt-6">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> High Quality Output</span>
                      <span className="flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> Auto-saved to History</span>
                    </div>
                    <button 
                      onClick={handleGenerate}
                      disabled={loading || !featureDesc.trim()}
                      className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                      {loading ? "Generating..." : "Generate Professional Tests"}
                    </button>
                  </div>
                  {error && <div className="mt-5 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">{error}</div>}
                </div>

                {result && result.testCases && result.testCases.length > 0 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
                      <div className="space-y-2">
                         <div className="flex items-center gap-3">
                           <h2 className="text-3xl font-bold">{result.projectDetails?.projectName}</h2>
                           <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold uppercase">v1.0</span>
                         </div>
                         <p className="text-muted-foreground text-sm max-w-2xl">{result.projectDetails?.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setShowRefinePanel(p => !p)} className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-bold transition-all text-sm">
                          <Wand2 className="w-4 h-4" /> Refine
                          {showRefinePanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button onClick={handleGenerateScript} disabled={isGeneratingScript} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 shrink-0 disabled:opacity-50">
                          {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
                          Script
                        </button>
                        <button onClick={() => handleDownloadExcel()} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"><Download className="w-4 h-4" /> Export XLSX</button>
                      </div>
                    </div>

                    {/* Refinement Panel */}
                    {showRefinePanel && (
                      <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">Refine Test Cases</h4>
                          <span className="text-[10px] text-muted-foreground ml-auto uppercase tracking-widest font-bold">{result.testCases.length} cases loaded</span>
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
                              className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-all border border-border/50 hover:border-primary/30 disabled:opacity-50"
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
                            className="flex-1 px-4 py-3 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none transition-all text-sm text-foreground placeholder:text-muted-foreground/50"
                            disabled={refining}
                          />
                          <button
                            onClick={() => handleRefine()}
                            disabled={refining || !refineInstruction.trim()}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 text-sm whitespace-nowrap"
                          >
                            {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            {refining ? "Refining..." : "Refine"}
                          </button>
                        </div>

                        {refineError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">{refineError}</div>}
                        {refineSummary && (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-sm flex items-start gap-2">
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
                      <TestCaseTable testCases={result.testCases} />
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
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                      <History className="w-6 h-6 text-primary" />
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">Generation History</h2>
                        <p className="text-muted-foreground text-sm">Review your past test case generations and reports.</p>
                      </div>
                    </div>

                    {fetchingHistory ? (
                      <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary/40" /></div>
                    ) : history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-96 bg-card/10 rounded-3xl border border-dashed border-border/50">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-muted-foreground" /></div>
                        <h3 className="text-lg font-semibold">No reports generated yet</h3>
                        <p className="text-muted-foreground text-sm mt-1">Start by generating your first test cases in the Dashboard.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {history.map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => handleSelectHistoryItem(item)}
                            className="bg-card rounded-xl border border-border/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-md"
                          >
                            <div className="flex gap-4 items-start">
                              <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center shrink-0 border border-primary/10">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{item.generated_json.projectDetails?.projectName || "Unnamed Project"}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">{item.feature_text}</p>
                                <div className="flex items-center gap-3 mt-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString()}</span>
                                  <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" /> {item.generated_json.testCases?.length || 0} Cases</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-primary font-bold text-sm whitespace-nowrap">
                              View Report <ChevronRight className="w-4 h-4" />
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
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50 shadow-inner shrink-0">
                          <div className="space-y-2">
                             <div className="flex items-center gap-3">
                               <h2 className="text-2xl font-bold line-clamp-1">{selectedHistoryItem.generated_json.projectDetails?.projectName}</h2>
                               <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold uppercase shrink-0">v{selectedHistoryItem.generated_json.projectDetails?.testCaseVersion || 1}</span>
                             </div>
                             <p className="text-muted-foreground text-sm max-w-2xl line-clamp-2">{selectedHistoryItem.generated_json.projectDetails?.description}</p>
                             <p className="text-xs text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/30 mt-4 italic line-clamp-2">"{selectedHistoryItem.feature_text}"</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={handleGenerateScript} disabled={isGeneratingScript} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 shrink-0 disabled:opacity-50">
                              {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
                              Script
                            </button>
                            <button onClick={() => handleDownloadExcel(selectedHistoryItem.generated_json)} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 shrink-0"><Download className="w-4 h-4" /> Export</button>
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
                      <div className="lg:w-[35%] rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col shadow-inner">
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
                <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
                    <p className="text-muted-foreground text-sm">Visualize your generation velocity and project output.</p>
                  </div>
                </div>

                {fetchingHistory ? (
                   <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary/40" /></div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-96 bg-card/10 rounded-3xl border border-dashed border-border/50">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4"><TrendingUp className="w-8 h-8 text-muted-foreground" /></div>
                    <h3 className="text-lg font-semibold">No data available yet</h3>
                    <p className="text-muted-foreground text-sm mt-1">Start generating reports to see your metrics populate.</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Activity className="w-12 h-12 text-primary" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Generations</p>
                        <h4 className="text-4xl font-extrabold">{metrics.totalGenerations}</h4>
                        <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-2 tracking-tighter">
                          <Zap className="w-3 h-3" /> SUCCESSIVE RUNS
                        </p>
                      </div>

                      <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <ListChecks className="w-12 h-12 text-primary" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Test Cases</p>
                        <h4 className="text-4xl font-extrabold">{metrics.totalTestCases}</h4>
                        <p className="text-[10px] text-primary/60 font-bold flex items-center gap-1 mt-2 tracking-tighter uppercase underline underline-offset-2">
                          QA Scenarios Generated
                        </p>
                      </div>

                      <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <TrendingUp className="w-12 h-12 text-primary" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg Case/Project</p>
                        <h4 className="text-4xl font-extrabold">{metrics.avgCasesPerProject}</h4>
                        <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1 mt-2 tracking-tighter">
                          LAST UPDATED: {metrics.lastUpdated ? new Date(metrics.lastUpdated).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Activity Summary */}
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-border/50 bg-muted/30">
                        <h3 className="font-bold text-lg">Activity Summary</h3>
                      </div>
                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-muted/50 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                              <th className="px-6 py-4">Project</th>
                              <th className="px-6 py-4">Priority</th>
                              <th className="px-6 py-4">Cases</th>
                              <th className="px-6 py-4">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {history.slice(0, 5).map((item) => (
                              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-4 font-semibold text-sm">{item.generated_json.projectDetails?.projectName}</td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                    item.generated_json.projectDetails?.priority === 'High' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                                    item.generated_json.projectDetails?.priority === 'Medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                    "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                  )}>
                                    {item.generated_json.projectDetails?.priority}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-sm">{item.generated_json.testCases?.length || 0}</td>
                                <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
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
