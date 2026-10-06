import { useState } from "react";
export default function useScanner() {
  const [value, setValue] = useState(""),
    [open, setOpen] = useState(false);
  return {
    value,
    setValue,
    open,
    setOpen,
    onScan: (code) => {
      setValue(code);
      setOpen(false);
    },
  };
}
