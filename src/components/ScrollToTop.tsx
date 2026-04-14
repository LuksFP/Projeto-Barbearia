import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [pathname]);

  return null;
};

export default ScrollToTop;
