import { useEffect, useId, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import Button from "../common/Button";
import { ErrorMessage } from "../common/UI";
export default function QRScanner({ onScan }) {
  const elementId = `reader-${useId().replace(/[^a-z0-9]/gi, "")}`,
    [error, setError] = useState(""),
    [active, setActive] = useState(false),
    [started, setStarted] = useState(false),
    callback = useRef(onScan);
  callback.current = onScan;
  useEffect(() => {
    if (!started) return;
    let disposed = false,
      reader = null;
    const stop = async () => {
      if (reader) {
        try {
          if (reader.isScanning) await reader.stop();
          reader.clear();
        } catch {
          /* Camera may already be stopped. */
        }
      }
    };
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (disposed) return;
        reader = new Html5Qrcode(elementId);
        await reader.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 180 } },
          (value) => {
            if (!disposed) {
              disposed = true;
              callback.current(value);
              void stop();
            }
          },
          () => {},
        );
        if (disposed) await stop();
        else setActive(true);
      } catch (e) {
        if (!disposed) {
          setError(
            "Camera could not start. Allow camera access, or enter a code using your scanner or keyboard.",
          );
          setStarted(false);
        }
      }
    })();
    return () => {
      disposed = true;
      void stop();
    };
  }, [started, elementId]);
  return (
    <div className="scanner">
      <div
        id={elementId}
        className={`scanner-view ${active ? "camera-active" : ""}`}
      >
        {!started && (
          <div className="scanner-placeholder">
            <ScanLine size={52} strokeWidth={1} />
            <strong>Scan a parcel label</strong>
            <p>Point your camera at its QR code or barcode.</p>
          </div>
        )}
      </div>
      <ErrorMessage message={error} />
      {!started && (
        <Button
          variant="secondary"
          onClick={() => {
            setError("");
            setStarted(true);
          }}
        >
          <Camera size={17} />
          Enable camera
        </Button>
      )}
      {started && (
        <Button
          variant="secondary"
          onClick={() => {
            setStarted(false);
            setActive(false);
          }}
        >
          Stop camera
        </Button>
      )}
      <small>Camera access requires localhost or HTTPS.</small>
    </div>
  );
}
