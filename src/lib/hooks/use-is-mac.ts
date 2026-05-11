"use client";

import { useEffect, useState } from "react";

export function useIsMac() {
  const [isMac, setIsMac] = useState(true); // SSR default — Mac is the common dev case
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(/Mac|iPhone|iPod|iPad/i.test(navigator.platform));
  }, []);
  return isMac;
}
