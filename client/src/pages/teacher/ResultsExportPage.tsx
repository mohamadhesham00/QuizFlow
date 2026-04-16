import { useEffect, useState } from "react";
import { exportResults, listExams, getExamResults } from "../../lib/api";
import type { Exam } from "../../types/api";

interface ExamResultsExamMeta {
  id?: string;
  title?: string;
  isPublished?: boolean;
}

interface ExamResultRow {
  attemptId?: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  examTitle?: string;
  formNumber?: number;
  status?: string;
  score?: number;
  totalQuestions?: number;
  solvingTimeSeconds?: number;
  startedAt?: string;
  submittedAt?: string;
}

interface ExamResultsPayload {
  exam?: ExamResultsExamMeta;
  results?: ExamResultRow[];
}

export function ResultsExportPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [viewingResultsExamId, setViewingResultsExamId] = useState<
    string | null
  >(null);
  const [resultsData, setResultsData] = useState<unknown>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState("");

  useEffect(() => {
    const run = async () => {
      setExams(await listExams());
    };
    void run();
  }, []);

  const onExport = async (exam: Exam) => {
    setDownloading(exam._id);
    try {
      const file = await exportResults(exam._id);
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${exam.title.replace(/\s+/g, "_").toLowerCase()}_results.xlsx`;
      a.click();
      URL.revokeObjectURL(href);
    } finally {
      setDownloading(null);
    }
  };

  const onViewResults = async (exam: Exam) => {
    setViewingResultsExamId(exam._id);
    setLoadingResults(true);
    setResultsError("");
    setResultsData(null);

    try {
      const data = await getExamResults(exam._id);
      setResultsData(data);
    } catch {
      setResultsError("Could not load results. Please try again.");
    } finally {
      setLoadingResults(false);
    }
  };

  const formatResults = (data: unknown): string => {
    if (typeof data === "object" && data !== null) {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  };

  const asResultsPayload = (data: unknown): ExamResultsPayload | null => {
    if (!data || typeof data !== "object") {
      return null;
    }

    const record = data as Record<string, unknown>;
    const exam =
      record.exam && typeof record.exam === "object"
        ? (record.exam as ExamResultsExamMeta)
        : undefined;

    const results = Array.isArray(record.results)
      ? (record.results as ExamResultRow[])
      : undefined;

    if (!exam && !results) {
      return null;
    }

    return { exam, results };
  };

  const payload = asResultsPayload(resultsData);
  const resultRows = payload?.results || [];

  const formatDateTime = (value?: string): string => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const formatDuration = (seconds?: number): string => {
    if (typeof seconds !== "number" || seconds < 0) {
      return "—";
    }

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <section className="panel">
      <h2>Export student results</h2>
      <p className="muted">Download Excel exports for each exam.</p>
      <ul className="list">
        {exams.map((exam) => (
          <li key={exam._id} className="list-item">
            <div>
              <p>{exam.title}</p>
              <small className="muted">
                {exam.description || "No description"}
              </small>
            </div>
            <div className="inline-row" style={{ gap: 8 }}>
              <button
                className="button button--secondary"
                onClick={() => onViewResults(exam)}
                type="button"
              >
                View Results
              </button>
              <button
                className="button"
                onClick={() => onExport(exam)}
                type="button"
                disabled={downloading === exam._id}
              >
                {downloading === exam._id ? "Exporting..." : "Export xlsx"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {viewingResultsExamId && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Exam results"
          onClick={() => setViewingResultsExamId(null)}
        >
          <article
            className="modal-panel panel panel--soft"
            style={{
              width: "min(92vw, 800px)",
              maxHeight: "88vh",
              overflow: "auto",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="inline-row inline-row--space"
              style={{ marginBottom: 8 }}
            >
              <h4 style={{ margin: 0 }}>
                {exams.find((e) => e._id === viewingResultsExamId)?.title} -
                Results
              </h4>
              <button
                type="button"
                className="icon-button"
                onClick={() => setViewingResultsExamId(null)}
                aria-label="Close results"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {resultsError && <p style={{ color: "#b91c1c" }}>{resultsError}</p>}
            {loadingResults && <p>Loading results...</p>}
            {!loadingResults && resultsData !== null && payload && (
              <div className="stack" style={{ gap: 12 }}>
                <div
                  className="panel panel--nested"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                  }}
                >
                  <div>
                    <small className="muted">Exam</small>
                    <p style={{ margin: "4px 0 0" }}>
                      {payload.exam?.title || "Untitled exam"}
                    </p>
                  </div>
                  <div>
                    <small className="muted">Status</small>
                    <p style={{ margin: "4px 0 0" }}>
                      {payload.exam?.isPublished ? "Published" : "Draft"}
                    </p>
                  </div>
                  <div>
                    <small className="muted">Attempts</small>
                    <p style={{ margin: "4px 0 0" }}>{resultRows.length}</p>
                  </div>
                  <div>
                    <small className="muted">Average Score</small>
                    <p style={{ margin: "4px 0 0" }}>
                      {resultRows.length
                        ? `${(
                            resultRows.reduce(
                              (acc, row) =>
                                acc +
                                (typeof row.score === "number" ? row.score : 0),
                              0,
                            ) / resultRows.length
                          ).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                </div>

                {resultRows.length === 0 ? (
                  <p className="muted">No attempt results yet for this exam.</p>
                ) : (
                  <div
                    style={{
                      border: "1px solid rgba(195,198,215,0.6)",
                      borderRadius: 12,
                      overflow: "auto",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: 840,
                      }}
                    >
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th
                            style={{ padding: "10px 12px", textAlign: "left" }}
                          >
                            Student
                          </th>
                          <th
                            style={{ padding: "10px 12px", textAlign: "left" }}
                          >
                            Email
                          </th>
                          <th
                            style={{ padding: "10px 12px", textAlign: "left" }}
                          >
                            Form
                          </th>
                          <th
                            style={{ padding: "10px 12px", textAlign: "left" }}
                          >
                            Status
                          </th>
                          <th
                            style={{ padding: "10px 12px", textAlign: "left" }}
                          >
                            Score
                          </th>
                          <th
                            style={{ padding: "10px 12px", textAlign: "left" }}
                          >
                            Time Spent
                          </th>
                          <th
                            style={{ padding: "10px 12px", textAlign: "left" }}
                          >
                            Submitted At
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultRows.map((row, index) => (
                          <tr
                            key={row.attemptId || `${row.studentId}-${index}`}
                            style={{
                              borderTop: "1px solid rgba(195,198,215,0.45)",
                            }}
                          >
                            <td style={{ padding: "10px 12px" }}>
                              {row.studentName || "—"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {row.studentEmail || "—"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {typeof row.formNumber === "number"
                                ? row.formNumber
                                : "—"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span
                                className="badge"
                                style={{
                                  background:
                                    row.status === "submitted"
                                      ? "rgba(16, 185, 129, 0.15)"
                                      : "rgba(107, 114, 128, 0.15)",
                                  color:
                                    row.status === "submitted"
                                      ? "#065f46"
                                      : "#374151",
                                }}
                              >
                                {row.status || "unknown"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {typeof row.score === "number" &&
                              typeof row.totalQuestions === "number"
                                ? `${row.score} / ${row.totalQuestions}`
                                : "—"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {formatDuration(row.solvingTimeSeconds)}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {formatDateTime(row.submittedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!loadingResults && resultsData !== null && !payload && (
              <pre
                style={{
                  background: "#f8fafc",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(195,198,215,0.6)",
                  fontSize: "0.85em",
                  overflow: "auto",
                }}
              >
                {formatResults(resultsData)}
              </pre>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
