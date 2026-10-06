import { MousePointer2, Save, RotateCcw } from "lucide-react";
import Button from "../common/Button";
import { cellType } from "../../utils/storage";
export default function GridEditorToolbar({
  tool,
  onTool,
  dirty,
  busy,
  onSave,
  onReset,
}) {
  return (
    <div className="editor-toolbar">
      <div className="editor-tools">
        {[
          "select",
          "walkway",
          "rack",
          "door",
          "floor_storage",
          "wall",
          "blocked",
        ].map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => onTool(type)}
            className={`editor-tool ${tool === type ? "active" : ""}`}
          >
            {type === "select" ? (
              <MousePointer2 size={16} />
            ) : (
              <i className={`tool-color cell-${type}`} />
            )}
            <span>{type === "select" ? "Select" : cellType(type)}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onReset} disabled={!dirty}>
          <RotateCcw size={16} />
          Reset
        </Button>
        <Button onClick={onSave} loading={busy} disabled={!dirty}>
          <Save size={16} />
          Save layout
        </Button>
      </div>
    </div>
  );
}
