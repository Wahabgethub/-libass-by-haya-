import { useEffect, useState } from "react";

export function useStudioPanelRoot() {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setRoot(document.getElementById("studio-panels"));
  }, []);
  return root;
}
