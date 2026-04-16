import XLSX from "xlsx";

interface ExportRow {
  studentName: string;
  studentEmail: string;
  examTitle: string;
  formNumber: number;
  score: number;
  totalQuestions: number;
  solvingTimeSeconds: number;
  startedAt: string;
  submittedAt: string;
}

export const buildResultsWorkbookBuffer = (rows: ExportRow[]): Buffer => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};
