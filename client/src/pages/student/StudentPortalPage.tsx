import { useEffect, useState, type FormEvent } from "react";
import {
  listAvailableStudentExams,
  listStudentAttempts,
  startExam,
} from "../../lib/api";
import type { AttemptSummary, StudentExamItem } from "../../types/api";
import { useNavigate } from "react-router-dom";

export function StudentPortalPage() {
  const [examId, setExamId] = useState("");
  const [availableExams, setAvailableExams] = useState<StudentExamItem[]>([]);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const getStudentEntryId = (exam: StudentExamItem) =>
    exam.examCode || exam.accessCode || exam.publicExamId || exam._id;

  const loadAttempts = async () => {
    const [attemptList, examList] = await Promise.all([
      listStudentAttempts(),
      listAvailableStudentExams(),
    ]);
    setAttempts(attemptList);
    setAvailableExams(examList);
  };

  useEffect(() => {
    void loadAttempts();
  }, []);

  const runStartExam = async (studentEntryId: string) => {
    setStartingId(studentEntryId);
    setError("");
    try {
      const { attemptId } = await startExam(studentEntryId);
      navigate(`/student/live?attemptId=${attemptId}`);
    } catch {
      setError(
        "Could not start exam. Verify exam entry id and publishing status.",
      );
    } finally {
      setStartingId(null);
    }
  };

  const onStart = async (event: FormEvent) => {
    event.preventDefault();
    await runStartExam(examId);
  };

  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Start exam</h2>
        <p className="muted">
          You will be assigned a random form automatically.
        </p>

        <form className="stack" onSubmit={onStart}>
          <label>
            Exam entry id
            <input
              className="input"
              placeholder="Paste exam entry id"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              required
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button
            className="button"
            type="submit"
            disabled={Boolean(startingId)}
          >
            {startingId === examId ? "Starting..." : "Start exam"}
          </button>
        </form>

        {availableExams.length > 0 && (
          <div className="stack" style={{ marginTop: 16 }}>
            <h3 style={{ margin: 0 }}>Available exams</h3>
            <ul className="list">
              {availableExams.map((exam) => {
                const entryId = getStudentEntryId(exam);
                return (
                  <li key={exam._id} className="list-item">
                    <div>
                      <p>{exam.title}</p>
                      <small className="muted">
                        Entry ID: <strong>{entryId}</strong>
                      </small>
                    </div>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => void runStartExam(entryId)}
                      disabled={startingId === entryId}
                    >
                      {startingId === entryId ? "Starting..." : "Start"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>My attempts</h2>
        <ul className="list">
          {attempts.map((attempt) => (
            <li key={attempt._id} className="list-item">
              <div>
                <p>Attempt #{attempt._id.slice(-6)}</p>
                <small className="muted">
                  {attempt.examTitle ? `${attempt.examTitle} • ` : ""}
                  {attempt.status} • started{" "}
                  {new Date(attempt.startedAt).toLocaleString()}
                </small>
              </div>
              <div className="inline-row" style={{ gap: 10 }}>
                <span>
                  {typeof attempt.score === "number" ? `${attempt.score}` : "-"}
                </span>
                {attempt.status === "in_progress" ? (
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() =>
                      navigate(`/student/live?attemptId=${attempt._id}`)
                    }
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() =>
                      navigate(`/student/result?attemptId=${attempt._id}`)
                    }
                  >
                    View result
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
