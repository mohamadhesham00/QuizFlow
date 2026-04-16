interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div className="panel" style={{ textAlign: "center", padding: "2rem" }}>
      <p>{label}</p>
    </div>
  );
}
