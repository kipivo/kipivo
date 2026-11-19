import { BackToTopButton } from "@kipivo/ui/components/back-to-top-button";
import { useEffect, useState, type RefObject } from "react";
import { homeScrollBehavior } from "./scroll";

export function BackToTop({ hero }: { hero: RefObject<HTMLElement | null> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = hero.current;
    if (!section) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [hero]);

  function goToTop() {
    const behavior = homeScrollBehavior();
    document.getElementById("top")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior });
  }

  return (
    <BackToTopButton
      visible={visible}
      onClick={goToTop}
      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-20"
    />
  );
}
