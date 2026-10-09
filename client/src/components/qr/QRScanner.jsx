import { useEffect, useId, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import Button from "../common/Button";
import { ErrorMessage } from "../common/UI";
// Serialize camera ownership, including across scanner modal remounts.
let cameraQueue = Promise.resolve();
let sessionId = 0;
function scheduleCamera(task) {
  const operation = cameraQueue.then(task);
  cameraQueue = operation.catch(() => {});
  return operation;
}
export default function QRScanner({ onScan }) {
  const elementId = `reader-${useId().replace(/[^a-z0-9]/gi, "")}`,
    [error, setError] = useState(""),
    [active, setActive] = useState(false),
    [started, setStarted] = useState(false),
    callback = useRef(onScan),
    host = useRef(null);
  callback.current = onScan;
  useEffect(() => {
    if (!started) return;
    let disposed = false,
      reader = null,
      mount = null,
      readerWidth = 320;
    const stop = async () => {
      if (reader) {
        try {
          if (reader.isScanning) await reader.stop();
          reader.clear();
        } catch {
          // Release tracks even if the scanner library fails during shutdown.
          mount?.querySelectorAll("video").forEach((video) => {
            video.srcObject?.getTracks().forEach((track) => track.stop());
          });
        }
        mount?.remove();
      }
    };
    void scheduleCamera(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (disposed) return;
        // The library owns this empty child only. React owns the placeholder.
        mount = document.createElement("div");
        mount.id = `${elementId}-${++sessionId}`;
        readerWidth = host.current.clientWidth || 320;
        host.current.appendChild(mount);
        reader = new Html5Qrcode(mount.id);
        let readyTimer;
        const ready = new Promise((resolve) => {
          mount.addEventListener("playing", resolve, {
            once: true,
            capture: true,
          });
        });
        await reader.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => ({
              width: Math.max(50, Math.min(240, Math.floor(width * 0.8))),
              height: Math.max(50, Math.min(180, Math.floor(height * 0.8))),
            }),
          },
          (value) => {
            if (!disposed) {
              disposed = true;
              setStarted(false);
              setActive(false);
              callback.current(value);
              void scheduleCamera(stop);
            }
          },
          () => {},
        );
        // start() resolves before video.play(). Wait for playback before stop()
        // so closing cannot interrupt the library's unhandled play promise.
        try {
          await Promise.race([
            ready,
            new Promise((_, reject) => {
              readyTimer = setTimeout(
                () => reject(new Error("Camera playback timed out.")),
                10000,
              );
            }),
          ]);
          await new Promise((resolve) => setTimeout(resolve, 0));
        } finally {
          clearTimeout(readyTimer);
        }
        if (disposed) await stop();
        else setActive(true);
      } catch (e) {
        if (!disposed) {
          setError(
            "Camera could not start. Allow camera access, or enter a code using your scanner or keyboard.",
          );
          setStarted(false);
          setActive(false);
        }
        await stop();
      }
    });
    return () => {
      disposed = true;
      // A pending getUserMedia call cannot be cancelled. Keep its private node
      // measurable until startup settles, even after React removes the modal.
      if (mount && !mount.isConnected) {
        Object.assign(mount.style, {
          position: "fixed",
          left: "-10000px",
          top: "0",
          width: `${readerWidth}px`,
          visibility: "hidden",
          pointerEvents: "none",
        });
        document.body.appendChild(mount);
      }
      void scheduleCamera(stop);
    };
  }, [started, elementId]);
  return (
    <div className="scanner">
      <div
        id={elementId}
        className={`scanner-view ${active ? "camera-active" : ""}`}
      >
        <div ref={host} />
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
