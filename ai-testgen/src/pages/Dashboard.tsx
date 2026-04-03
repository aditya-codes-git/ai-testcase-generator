import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import { BrainCircuit, LogOut, Download, Sparkles, Loader2, Activity, ListChecks, History, Calendar, FileText, ChevronRight } from "lucide-react"
import { TestCaseTable } from "../components/ui/TestCaseTable"
import type { TestCase } from "../components/ui/TestCaseTable"
import { TwoLevelSidebar, type PrimaryTab } from "../components/ui/sidebar-component"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { generateTestCases } from "../lib/api"

export default function Dashboard({ session }: { session: any }) {
  const navigate = useNavigate()
  const [featureDesc, setFeatureDesc] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<PrimaryTab>("dashboard")
  const [activeSecondaryTab, setActiveSecondaryTab] = useState("overview")
  
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

  // History State
  const [history, setHistory] = useState<any[]>([])
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null)

  useEffect(() => {
    if (activeSecondaryTab === "reports") {
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
      const { error: dbError } = await supabase.from('test_cases').insert([
        {
          user_id: session.user.id,
          feature_text: featureDesc,
          generated_json: data,
          created_at: new Date().toISOString()
        }
      ])

      if (dbError) {
        console.warn("Could not save to history, but generation succeeded:", dbError)
      }
      
      setResult(data)
    } catch (err: any) {
      console.error("HandleGenerate error:", err)
      setError(err.message || "Failed to generate test cases")
    } finally {
      setLoading(false)
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
          <div className="text-xl font-semibold md:hidden flex items-center gap-2 ml-10">
            <BrainCircuit className="w-5 h-5 text-primary" /> AI TestGen
          </div>
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
                      <button onClick={() => handleDownloadExcel()} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all"><Download className="w-4 h-4" /> Export XLSX</button>
                    </div>
                    <TestCaseTable testCases={result.testCases} />
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
                            onClick={() => setSelectedHistoryItem(item)}
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
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <button 
                      onClick={() => setSelectedHistoryItem(null)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" /> Back to history
                    </button>
                    
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50 shadow-inner">
                      <div className="space-y-2">
                         <div className="flex items-center gap-3">
                           <h2 className="text-3xl font-bold">{selectedHistoryItem.generated_json.projectDetails?.projectName}</h2>
                           <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold uppercase">v{selectedHistoryItem.generated_json.projectDetails?.testCaseVersion}</span>
                         </div>
                         <p className="text-muted-foreground text-sm max-w-2xl">{selectedHistoryItem.generated_json.projectDetails?.description}</p>
                         <p className="text-xs text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/30 mt-4 italic">"{selectedHistoryItem.feature_text}"</p>
                      </div>
                      <button onClick={() => handleDownloadExcel(selectedHistoryItem.generated_json)} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"><Download className="w-4 h-4" /> Export XLSX</button>
                    </div>
                    
                    <TestCaseTable testCases={selectedHistoryItem.generated_json.testCases} />
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
