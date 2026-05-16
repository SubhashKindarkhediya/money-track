import React from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
  containerClassName?: string;
}

const MarqueeText: React.FC<MarqueeTextProps> = ({ 
  text, 
  className = "", 
  containerClassName = "" 
}) => {
  const [isOverflow, setIsOverflow] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const spanRef = React.useRef<HTMLSpanElement>(null);

  const checkOverflow = React.useCallback(() => {
    const wrap = wrapRef.current;
    const span = spanRef.current;
    if (wrap && span) {
      span.style.animation = "none";
      span.style.transform = "translateX(0)";
      const overflow = span.scrollWidth > wrap.clientWidth;
      setIsOverflow(overflow);
      if (overflow) {
        const dist = wrap.clientWidth - span.scrollWidth;
        span.style.setProperty("--scroll-distance", `${dist}px`);
      }
      span.style.animation = "";
      span.style.transform = "";
    }
  }, [text]);

  React.useEffect(() => {
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [checkOverflow]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden min-w-0 flex ${containerClassName}`}>
      <span
        ref={spanRef}
        className={`whitespace-nowrap ${isOverflow ? "email-marquee" : ""} ${className}`}
      >
        {text}
      </span>
    </div>
  );
};

export default MarqueeText;
