import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  getAttempt,
  getAttemptState,
  getAttemptTimer,
  listStudentAttempts,
  saveAttemptAnswers,
  sendAttemptHeartbeat,
  submitAttempt,
} from "../../lib/api";
import type { AttemptPayload } from "../../types/api";
import { LoadingState } from "../../components/common/LoadingState";

function toClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function LiveExamPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const attemptIdFromQuery = params.get("attemptId");
  const attemptIdFromState =
    (location.state as { attemptId?: string } | undefined)?.attemptId ?? null;
  const [resolvedAttemptId, setResolvedAttemptId] = useState<string | null>(
    attemptIdFromQuery || attemptIdFromState,
  );
  const [attempt, setAttempt] = useState<AttemptPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dirtyAnswers, setDirtyAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (attemptIdFromQuery || attemptIdFromState) {
      setResolvedAttemptId(attemptIdFromQuery || attemptIdFromState);
      return;
    }

    const findLatestAttempt = async () => {
      try {
        const attempts = await listStudentAttempts();
        const latestInProgress = [...attempts]
          .filter((item) => item.status === "in_progress")
          .sort(
            (a, b) =>
              new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
          )[0];

        if (latestInProgress?._id) {
          setResolvedAttemptId(latestInProgress._id);
        } else {
          setLoading(false);
          setError("No active attempt found. Start an exam from the portal.");
        }
      } catch {
        setLoading(false);
        setError("Could not resolve an active attempt. Start from the portal.");
      }
    };

    void findLatestAttempt();
  }, [attemptIdFromQuery, attemptIdFromState]);

  useEffect(() => {
    if (!resolvedAttemptId) {
      return;
    }

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [data, timer, state] = await Promise.all([
          getAttempt(resolvedAttemptId),
          getAttemptTimer(resolvedAttemptId).catch(() => null),
          getAttemptState(resolvedAttemptId).catch(() => null),
        ]);

        setAttempt(data);
        setRemainingSeconds(
          timer?.remainingSeconds ?? data.durationSeconds ?? null,
        );

        if (
          typeof state?.currentQuestionIndex === "number" &&
          state.currentQuestionIndex >= 0 &&
          state.currentQuestionIndex < (data.questions?.length ?? 0)
        ) {
          setCurrent(state.currentQuestionIndex);
        }
      } catch {
        setError("Could not load exam attempt. Please start again.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [resolvedAttemptId]);

  useEffect(() => {
    const id = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remainingSeconds === null) {
      return;
    }

    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) {
          return prev;
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [remainingSeconds]);

  useEffect(() => {
    if (!resolvedAttemptId) {
      return;
    }

    const id = setInterval(() => {
      void sendAttemptHeartbeat(resolvedAttemptId);
    }, 20000);

    return () => clearInterval(id);
  }, [resolvedAttemptId]);

  useEffect(() => {
    if (!resolvedAttemptId || !attempt || !dirtyAnswers) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        await saveAttemptAnswers(
          resolvedAttemptId,
          attempt.questions
            .filter((question) => answers[question.questionId])
            .map((question) => ({
              questionId: question.questionId,
              selectedOptionId: answers[question.questionId],
            })),
        );
        setDirtyAnswers(false);
      } catch {
        // keep dirty flag true so we retry on next answer update
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [answers, attempt, resolvedAttemptId, dirtyAnswers]);

  const currentQuestion = useMemo(
    () => attempt?.questions[current],
    [attempt, current],
  );

  const onChoose = (questionId: string, selectedOptionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOptionId }));
    setDirtyAnswers(true);
  };

  const onSubmit = async () => {
    if (!resolvedAttemptId || !attempt) {
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      answers: attempt.questions
        .filter((question) => answers[question.questionId])
        .map((question) => ({
          questionId: question.questionId,
          selectedOptionId: answers[question.questionId],
        })),
    };

    try {
      if (dirtyAnswers) {
        await saveAttemptAnswers(resolvedAttemptId, payload.answers);

        setDirtyAnswers(false);
      }
      const result = await submitAttempt(resolvedAttemptId, payload);
      navigate(`/student/result?attemptId=${resolvedAttemptId}`, {
        state: result,
      });
    } catch {
      setError("Could not submit exam. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!attempt || submitting || autoSubmitted) {
      return;
    }

    if (remainingSeconds === 0) {
      setAutoSubmitted(true);
      void onSubmit();
    }
  }, [attempt, remainingSeconds, submitting, autoSubmitted]);

  if (loading) {
    return <LoadingState label="Loading exam form..." />;
  }

  if (!attempt || !resolvedAttemptId) {
    return (
      <div className="panel stack">
        <h2>No active attempt found</h2>
        <p className="muted">
          {error || "Start an exam from the student portal."}
        </p>
        <Link className="button" to="/student">
          Back to portal
        </Link>
      </div>
    );
  }

  if (!attempt.questions.length) {
    return (
      <div className="panel stack">
        <h2>Attempt loaded but no questions were returned</h2>
        <p className="muted">
          This usually means the backend response shape changed or the exam form
          was not generated correctly.
        </p>
        <Link className="button" to="/student">
          Back to portal
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="panel inline-row inline-row--space live-exam-header">
        <div>
          <h2>Form {attempt.formCode ?? "-"}</h2>
          <p className="muted">
            Question {current + 1} of {attempt.questions.length}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          {remainingSeconds !== null && (
            <p style={{ margin: 0, fontWeight: 800 }}>
              Time left: {toClock(remainingSeconds)}
            </p>
          )}
          <strong>Solving time: {toClock(seconds)}</strong>
        </div>
      </section>

      {error && (
        <section className="panel">
          <p className="error">{error}</p>
        </section>
      )}

      <div className="live-exam-layout">
        <aside className="panel live-exam-matrix">
          <h3 style={{ marginTop: 0 }}>Question Matrix</h3>
          <div className="live-exam-matrix__grid">
            {attempt.questions.map((question, index) => {
              const isCurrent = index === current;
              const isAnswered = Boolean(answers[question.questionId]);
              return (
                <button
                  key={question.questionId}
                  type="button"
                  className={`live-exam-matrix__item${isCurrent ? " live-exam-matrix__item--current" : ""}${isAnswered ? " live-exam-matrix__item--answered" : ""}`}
                  onClick={() => setCurrent(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="stack">
          {currentQuestion && (
            <section className="panel">
              <h3>{currentQuestion.text}</h3>

              {currentQuestion.imageUrl && (
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question reference"
                  style={{
                    width: "100%",
                    maxHeight: 280,
                    objectFit: "contain",
                    background: "#f8fafc",
                    padding: 8,
                    borderRadius: 12,
                    border: "1px solid rgba(195,198,215,0.6)",
                    margin: "0.85rem 0",
                  }}
                />
              )}

              <div className="stack">
                {currentQuestion.options.map((option, index) => (
                  <label key={option.optionId} className="option-card">
                    <input
                      type="radio"
                      name={currentQuestion.questionId}
                      checked={
                        answers[currentQuestion.questionId] === option.optionId
                      }
                      onChange={() =>
                        onChoose(currentQuestion.questionId, option.optionId)
                      }
                    />
                    <span>
                      {String.fromCharCode(65 + index)}. {option.text}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          <section className="panel inline-row inline-row--space">
            <button
              className="button button--secondary"
              type="button"
              disabled={current === 0}
              onClick={() => setCurrent((prev) => prev - 1)}
            >
              Previous
            </button>

            {current < attempt.questions.length - 1 ? (
              <button
                className="button"
                type="button"
                onClick={() => setCurrent((prev) => prev + 1)}
              >
                Next
              </button>
            ) : (
              <button
                className="button"
                type="button"
                onClick={onSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit exam"}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
