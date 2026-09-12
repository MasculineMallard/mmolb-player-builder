"use client";

import { useEffect, useRef } from "react";

export function BattingFireEdge({ width }: { width: number }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof Path2D === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let flames: Array<InstanceType<typeof import("@9am/fire-flame").FireFlame>> = [];
    let frame = 0;
    let disposed = false;
    let visible = true;
    let rebuildGeneration = 0;

    const clearFlames = () => {
      flames.forEach((flame) => flame.destroy());
      flames = [];
      host.replaceChildren();
    };

    const rebuild = async () => {
      const generation = ++rebuildGeneration;
      clearFlames();
      const hostWidth = host.getBoundingClientRect().width;
      if (disposed || reducedMotion.matches || hostWidth < 1) return;

      const { FireFlame, Vector } = await import("@9am/fire-flame");
      if (disposed || generation !== rebuildGeneration) return;

      const emitterCount = Math.max(3, Math.ceil(hostWidth / 62));
      for (let index = 0; index < emitterCount; index += 1) {
        const emitter = document.createElement("span");
        emitter.className = "batting-fire-emitter";
        emitter.style.left = `${((index + 0.5) / emitterCount) * 100}%`;
        host.appendChild(emitter);

        const flame = new FireFlame(emitter, {
          painterType: "canvas",
          w: 84,
          h: 38,
          x: 42,
          y: 36,
          mousemove: false,
          particleNum: 9,
          particleDistance: 3,
          friction: 0.96,
          wind: new Vector({ x: ((index % 3) - 1) * 0.06, y: -0.72 }),
          innerColor: "#fff4c6",
          outerColor: index % 2 === 0 ? "#3b82f6" : "#e4b94f",
        });
        if (!visible) flame.stop();
        flames.push(flame);
      }
    };

    const scheduleRebuild = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void rebuild());
    };

    const resizeObserver = new ResizeObserver(scheduleRebuild);
    resizeObserver.observe(host);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      flames.forEach((flame) => visible ? flame.start() : flame.stop());
    });
    intersectionObserver.observe(host);
    reducedMotion.addEventListener("change", scheduleRebuild);
    scheduleRebuild();

    return () => {
      disposed = true;
      rebuildGeneration += 1;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener("change", scheduleRebuild);
      clearFlames();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-testid="batting-fire-edge"
      className="batting-fire-edge"
      style={{ width: `${width}%` }}
    />
  );
}
