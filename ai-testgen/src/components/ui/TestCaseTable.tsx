import { cn } from "../../lib/utils";

export interface TestCase {
  id: string;
  title: string;
  type: "positive" | "negative" | "edge" | string;
  steps: string[];
  inputData: string;
  expectedResult: string;
  actualResult?: string;
  environment: string;
  status: string;
  bugSeverity?: string;
  bugPriority?: string;
  notes?: string;
}

export function TestCaseTable({ testCases }: { testCases: TestCase[] }) {
  if (!testCases || testCases.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-xs uppercase bg-muted/50 text-foreground border-b border-border/50">
          <tr>
            <th className="px-4 py-3 font-semibold">ID</th>
            <th className="px-4 py-3 font-semibold min-w-[150px]">Title</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold min-w-[200px]">Steps</th>
            <th className="px-4 py-3 font-semibold min-w-[150px]">Input Data</th>
            <th className="px-4 py-3 font-semibold min-w-[150px]">Expected Result</th>
            <th className="px-4 py-3 font-semibold text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {testCases.map((tc, idx) => (
            <tr key={idx} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-medium text-foreground">{tc.id}</td>
              <td className="px-4 py-3">{tc.title}</td>
              <td className="px-4 py-3">
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  tc.type?.toLowerCase() === 'positive' && "bg-green-500/10 text-green-500",
                  tc.type?.toLowerCase() === 'negative' && "bg-red-500/10 text-red-500",
                  tc.type?.toLowerCase() === 'edge' && "bg-yellow-500/10 text-yellow-500",
                )}>
                  {tc.type || "Other"}
                </span>
              </td>
              <td className="px-4 py-3">
                <ol className="list-decimal list-inside space-y-1">
                  {tc.steps?.map((step, sIdx) => <li key={sIdx}>{step}</li>)}
                </ol>
              </td>
              <td className="px-4 py-3 font-mono text-xs break-all bg-background/50 rounded">{tc.inputData || '-'}</td>
              <td className="px-4 py-3">{tc.expectedResult || '-'}</td>
              <td className="px-4 py-3 text-center">
                <span className="px-2 py-1 bg-muted rounded-full text-xs">{tc.status || 'Not Executed'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
