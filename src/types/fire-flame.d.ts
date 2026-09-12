declare module "@9am/fire-flame" {
  export interface FireFlameOption {
    painterType?: "canvas" | "svg";
    w?: number;
    h?: number;
    x?: number;
    y?: number;
    mousemove?: boolean;
    fps?: number;
    particleFPS?: number;
    particleNum?: number;
    particleDistance?: number;
    friction?: number;
    wind?: Vector;
    innerColor?: string;
    outerColor?: string;
  }

  export class Vector {
    constructor(params: { x: number; y: number } | { m: number; d: number });
  }

  export class FireFlame {
    constructor(container: HTMLElement, option?: FireFlameOption);
    start(): void;
    stop(): void;
    destroy(): void;
  }
}
