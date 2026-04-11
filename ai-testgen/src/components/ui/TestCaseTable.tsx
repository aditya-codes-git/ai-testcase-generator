import { cn } from "../../lib/utils";

export interface TestCase {
  testCaseId: string;
  testSteps: string[];
  inputData: string;
  expectedResult: string;
  actualResult?: string;
  testEnvironment: string;
  executionStatus: string;
  bugSeverity?: string;
  bugPriority?: string;
  notes?: string;
}

export function TestCaseTable({ testCases }: { testCases: TestCase[] }) {
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/[0.06] bg-black/30 backdrop-blur-xl shadow-sm">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-[10px] uppercase tracking-[0.15em] bg-white/[0.02] text-foreground/60 border-b border-white/[0.06]">
          <tr>
            <th className="px-4 py-4 font-bold">ID</th>
            <th className="px-4 py-4 font-bold min-w-[250px]">Test Steps</th>
            <th className="px-4 py-4 font-bold min-w-[150px]">Input Data</th>
            <th className="px-4 py-4 font-bold min-w-[150px]">Expected Result</th>
            <th className="px-4 py-4 font-bold">Environment</th>
            <th className="px-4 py-4 font-bold text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {testCases.map((tc, idx) => (
            <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-200">
              <td className="px-4 py-4 font-semibold text-foreground align-top">{tc.testCaseId}</td>
              <td className="px-4 py-4 align-top">
                <ol className="list-decimal list-inside space-y-1.5">
                  {tc.testSteps?.map((step, sIdx) => (
                    <li key={sIdx} className="text-[13px] leading-snug text-foreground/70">{step}</li>
                  ))}
                </ol>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="font-mono text-xs p-2.5 bg-black/30 rounded-lg border border-white/[0.06] break-all text-foreground/70 max-w-[200px]">
                  {tc.inputData || '-'}
                </div>
              </td>
              <td className="px-4 py-4 align-top text-foreground/70 leading-relaxed">{tc.expectedResult || '-'}</td>
              <td className="px-4 py-4 align-top">
                 <span className="text-xs text-muted-foreground/60 whitespace-nowrap">{tc.testEnvironment || 'Web'}</span>
              </td>
              <td className="px-4 py-4 text-center align-top">
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                  tc.executionStatus?.toLowerCase().includes('pass') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  tc.executionStatus?.toLowerCase().includes('fail') ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  "bg-white/[0.03] text-muted-foreground/60 border-white/[0.08]"
                )}>
                  {tc.executionStatus || 'Not Executed'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
