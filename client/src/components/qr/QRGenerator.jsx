import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
const cache = new Map();
export default function QRGenerator({ value, size = 100, onReady }) {
  const key = `${value}-${size}`,
    [src, setSrc] = useState(cache.get(key) || ""),
    readyRef = useRef(onReady);
  readyRef.current = onReady;
  useEffect(() => {
    let active = true;
    if (cache.has(key)) {
      setSrc(cache.get(key));
      readyRef.current?.(value);
    } else
      QRCode.toDataURL(value, {
        width: size * 2,
        margin: 1,
        errorCorrectionLevel: "M",
      }).then((url) => {
        cache.set(key, url);
        if (active) {
          setSrc(url);
          readyRef.current?.(value);
        }
      });
    return () => {
      active = false;
    };
  }, [value, size, key]);
  return src ? (
    <img src={src} width={size} height={size} alt={`QR code for ${value}`} />
  ) : (
    <span className="qr-loading" style={{ width: size, height: size }}>
      Generating QR…
    </span>
  );
}
