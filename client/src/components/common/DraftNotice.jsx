import Button from "./Button";
export default function DraftNotice({
  draft,
  label = "Unfinished work found",
}) {
  if (draft.pending)
    return (
      <div className="alert draft-notice" role="status">
        <div>
          <strong>{label}</strong>
          <p>
            Last saved:{" "}
            {new Date(draft.pending.saved_at).toLocaleString("en-PH", {
              timeZone: "Asia/Manila",
            })}
          </p>
        </div>
        <Button type="button" onClick={draft.restore}>
          Restore draft
        </Button>
        <Button type="button" variant="secondary" onClick={draft.discard}>
          Discard
        </Button>
      </div>
    );
  return (
    <p className="draft-status" role="status">
      {draft.error || (draft.saved ? "Draft saved ✓" : "")}
    </p>
  );
}
