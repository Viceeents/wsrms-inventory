import { useLayoutEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
export default function BarcodeGenerator({ value }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    JsBarcode(ref.current, value, {
      format: "CODE128",
      width: 1.5,
      height: 42,
      displayValue: false,
      margin: 0,
    });
  }, [value]);
  return (
    <svg
      ref={ref}
      role="img"
      aria-label={`Barcode for ${value}`}
      className="barcode"
    />
  );
}
