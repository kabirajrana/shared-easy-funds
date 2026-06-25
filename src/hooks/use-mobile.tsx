import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const getMatches = React.useCallback(
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches,
    [],
  );
  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window === "undefined" ? false : getMatches(),
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      const next = mql.matches;
      setIsMobile((current) => (current === next ? current : next));
    };
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [getMatches]);

  return isMobile;
}
