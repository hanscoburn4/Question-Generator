/*
  DrawingEngine v2
  Goal: Allow each question to declaratively specify graph behavior via a `graph` object
  Example question config supported:

  graph: {
    type: "function",
    functionType: "quadratic",
    equation: "y = {a}(x - {h})^2 + {k}",
    parameters: { a: 1, h: 0, k: 0 },
    window: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    showGrid: true
  }
*/

class DrawingEngine {
  constructor() {
    this.defaultWidth = 420;
    this.defaultHeight = 260;
    this.defaultScale = 20;
  }

  /* =========================
     COORDINATE SYSTEM
     ========================= */

  setupCanvas(canvas, window) {
    if (!canvas.width) canvas.width = this.defaultWidth;
    if (!canvas.height) canvas.height = this.defaultHeight;

    const { xMin, xMax, yMin, yMax } = window;

    return {
      ctx: canvas.getContext("2d"),
      xMin,
      xMax,
      yMin,
      yMax,
      xScale: canvas.width / (xMax - xMin),
      yScale: canvas.height / (yMax - yMin)
    };
  }

  xToPixel(x, env) {
    return (x - env.xMin) * env.xScale;
  }

  yToPixel(y, env) {
    return (env.yMax - y) * env.yScale;
  }

  /* =========================
     GRID & AXES
     ========================= */

  drawGrid(env, step = 1) {
    const { ctx, xMin, xMax, yMin, yMax } = env;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;

    for (let x = Math.ceil(xMin); x <= xMax; x += step) {
      const px = this.xToPixel(x, env);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, ctx.canvas.height);
      ctx.stroke();
    }

    for (let y = Math.ceil(yMin); y <= yMax; y += step) {
      const py = this.yToPixel(y, env);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(ctx.canvas.width, py);
      ctx.stroke();
    }

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;

    if (xMin < 0 && xMax > 0) {
      const px = this.xToPixel(0, env);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, ctx.canvas.height);
      ctx.stroke();
    }

    if (yMin < 0 && yMax > 0) {
      const py = this.yToPixel(0, env);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(ctx.canvas.width, py);
      ctx.stroke();
    }
  }

  /* =========================
     FUNCTION EVALUATORS
     ========================= */

  evaluate(x, graph) {
    const p = graph.parameters || {};
    switch (graph.functionType) {
      case "linear":
        return (p.m ?? 1) * x + (p.b ?? 0);
      case "quadratic":
        return (p.a ?? 1) * (x - (p.h ?? 0)) ** 2 + (p.k ?? 0);
      case "absoluteValue":
        return (p.a ?? 1) * Math.abs(x - (p.h ?? 0)) + (p.k ?? 0);
      case "squareRoot":
        return x - (p.h ?? 0) >= 0
          ? (p.a ?? 1) * Math.sqrt(x - (p.h ?? 0)) + (p.k ?? 0)
          : null;
      case "exponential":
        return (p.a ?? 1) * (p.base ?? 2) ** (x - (p.h ?? 0)) + (p.k ?? 0);
      default:
        return null;
    }
  }

  /* =========================
     FUNCTION DRAWER
     ========================= */

  drawFunction(env, graph) {
    const { ctx, xMin, xMax } = env;
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    const step = (xMax - xMin) / ctx.canvas.width;

    for (let x = xMin; x <= xMax; x += step) {
      const y = this.evaluate(x, graph);
      if (y === null || isNaN(y)) {
        started = false;
        continue;
      }

      const px = this.xToPixel(x, env);
      const py = this.yToPixel(y, env);

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  /* =========================
     MAIN ENTRY POINT
     ========================= */

  drawFromGraphConfig(canvas, graph) {
    if (!graph || graph.type !== "function") return;

    const env = this.setupCanvas(canvas, graph.window);

    if (graph.showGrid !== false) {
      this.drawGrid(env, graph.gridStep || 1);
    }

    this.drawFunction(env, graph);
  }
}

window.DrawingEngine = new DrawingEngine();
export default window.DrawingEngine;
