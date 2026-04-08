"use client";

import { useRef, useEffect } from "react";
import { STAT_TIERS } from "@/lib/evaluator-data";
import type { PlayerRole } from "@/lib/evaluator-types";

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = SIZE / 2 - 30;

export function RadarChart({
  stats,
  role,
  targets,
  statLabels,
}: {
  stats: Record<string, number>;
  role?: PlayerRole;
  targets?: Record<string, number>;
  statLabels?: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Determine which stats to show
  let labels: string[];
  let t1Set: Set<string>;

  if (statLabels) {
    labels = statLabels;
    t1Set = role ? new Set(STAT_TIERS[role].T1) : new Set();
  } else if (role) {
    const tiers = STAT_TIERS[role];
    const t2Sorted = [...tiers.T2].sort((a, b) => (stats[b] ?? 0) - (stats[a] ?? 0));
    labels = [...tiers.T1, ...t2Sorted.slice(0, 3)];
    t1Set = new Set(tiers.T1);
  } else {
    labels = Object.keys(stats).slice(0, 8);
    t1Set = new Set();
  }

  const n = labels.length;

  // Determine max value for scaling (500 default, or max of stats+targets if higher)
  const maxVal = targets
    ? Math.max(500, ...labels.map((l) => Math.max(stats[l] ?? 0, targets[l] ?? 0)))
    : 500;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || n === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    // Draw concentric rings
    for (const frac of [0.25, 0.5, 0.75, 1.0]) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = startAngle + i * angleStep;
        const x = CX + Math.cos(angle) * RADIUS * frac;
        const y = CY + Math.sin(angle) * RADIUS * frac;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(48, 54, 61, 0.6)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw axis lines
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(angle) * RADIUS, CY + Math.sin(angle) * RADIUS);
      ctx.strokeStyle = "rgba(48, 54, 61, 0.4)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw target polygon (dashed, gold) if provided
    if (targets) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const val = Math.min(maxVal, targets[labels[i]] ?? 0) / maxVal;
        const x = CX + Math.cos(angle) * RADIUS * val;
        const y = CY + Math.sin(angle) * RADIUS * val;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 215, 0, 0.08)";
      ctx.fill();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw current stats polygon
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const val = Math.min(maxVal, stats[labels[i]] ?? 0) / maxVal;
      const x = CX + Math.cos(angle) * RADIUS * val;
      const y = CY + Math.sin(angle) * RADIUS * val;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw dots and labels
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const val = Math.min(maxVal, stats[labels[i]] ?? 0) / maxVal;

      // Dot
      const dx = CX + Math.cos(angle) * RADIUS * val;
      const dy = CY + Math.sin(angle) * RADIUS * val;
      ctx.beginPath();
      ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(59, 130, 246, 1)";
      ctx.fill();

      // Label
      const lx = CX + Math.cos(angle) * (RADIUS + 16);
      const ly = CY + Math.sin(angle) * (RADIUS + 16);
      ctx.fillStyle = t1Set.has(labels[i]) ? "#e0e0e0" : "#8B949E";
      ctx.fillText(labels[i], lx, ly);
    }
  }, [stats, targets, labels, n, maxVal, t1Set]);

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      style={{ width: SIZE, height: SIZE }}
    />
  );
}
