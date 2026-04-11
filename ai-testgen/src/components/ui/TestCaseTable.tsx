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
    <div className="w-full overflow-x-auto rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-xs uppercase bg-muted/50 text-foreground border-b border-border/50">
          <tr>
            <th className="px-4 py-4 font-semibold">ID</th>
            <th className="px-4 py-4 font-semibold min-w-[250px]">Test Steps</th>
            <th className="px-4 py-4 font-semibold min-w-[150px]">Input Data</th>
            <th className="px-4 py-4 font-semibold min-w-[150px]">Expected Result</th>
            <th className="px-4 py-4 font-semibold">Environment</th>
            <th className="px-4 py-4 font-semibold text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {testCases.map((tc, idx) => (
            <tr key={idx} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
              <td className="px-4 py-4 font-medium text-foreground align-top">{tc.testCaseId}</td>
              <td className="px-4 py-4 align-top">
                <ol className="list-decimal list-inside space-y-1.5">
                  {tc.testSteps?.map((step, sIdx) => (
                    <li key={sIdx} className="text-[13px] leading-snug">{step}</li>
                  ))}
                </ol>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="font-mono text-xs p-2 bg-background/50 rounded border border-border/30 break-all text-foreground/80 max-w-[200px]">
                  {tc.inputData || '-'}
                </div>
              </td>
              <td className="px-4 py-4 align-top text-foreground/80 leading-relaxed">{tc.expectedResult || '-'}</td>
              <td className="px-4 py-4 align-top">
                 <span className="text-xs text-muted-foreground whitespace-nowrap">{tc.testEnvironment || 'Web'}</span>
              </td>
              <td className="px-4 py-4 text-center align-top">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                  tc.executionStatus?.toLowerCase().includes('pass') ? "bg-green-500/10 text-green-500 border-green-500/20" :
                  tc.executionStatus?.toLowerCase().includes('fail') ? "bg-red-500/10 text-red-500 border-red-500/20" :
                  "bg-muted text-muted-foreground border-border/50"
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
