/*
  DrawingEngine v3
  Supports declarative graphing with:
  - Variable-aware window bounds (xmin/xmax/ymin/ymax)
  - Calculator-style relations/inequalities (y = ..., y > ..., x <= ...)
  - Systems via eq1/eq2/eq3... or equations[]
  - Per-equation restricted domains
  - Polar graphing via type: "polar" and relations like r = f(theta)
*/

class DrawingEngine {
  constructor() {
    this.defaultWidth = 420;
    this.defaultHeight = 260;
    this.defaultWindow = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
    this.defaultPolar = {
      rMax: 10,
      radialStep: 1,
      angleStepDeg: 15,
      angleUnit: "radians",
      thetaMin: 0,
      thetaMax: Math.PI * 2
    };
    this.palette = ["#e74c3c", "#2980b9", "#16a085", "#8e44ad", "#d35400"];
  }

  getNumericVariables(variables = {}) {
    const numeric = {};
    for (const [key, value] of Object.entries(variables || {})) {
      if (key === "__display" || key === "__errors") continue;
      const asNumber = Number(value);
      if (Number.isFinite(asNumber)) numeric[key] = asNumber;
    }
    return numeric;
  }

  replaceTemplateVariables(text, variables = {}) {
    if (typeof text !== "string") return text;
    return text.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\|[^{}]+)?\}/g, (match, name) => {
      if (variables[name] === undefined || variables[name] === null) return match;
      const asNumber = Number(variables[name]);
      return Number.isFinite(asNumber) ? String(asNumber) : match;
    });
  }

  resolveNumericValue(value, variables = {}, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return fallback;

    const trimmed = value.trim();
    if (!trimmed) return fallback;

    const numericVars = this.getNumericVariables(variables);

    if (numericVars[trimmed] !== undefined) return numericVars[trimmed];

    const expression = this.replaceTemplateVariables(trimmed, numericVars);

    if (window.math && typeof window.math.evaluate === "function") {
      try {
        const evaluated = window.math.evaluate(expression, numericVars);
        return Number.isFinite(Number(evaluated)) ? Number(evaluated) : fallback;
      } catch {
        return fallback;
      }
    }

    return fallback;
  }

  compileExpression(rawExpression, variables = {}) {
    const numericVars = this.getNumericVariables(variables);
    const expression = this.replaceTemplateVariables(String(rawExpression || ""), numericVars);

    if (!window.math || typeof window.math.compile !== "function") {
      throw new Error("math.js is required for graph expression parsing.");
    }

    const compiled = window.math.compile(expression);
    return (scope = {}) => {
      const value = compiled.evaluate({ ...numericVars, ...scope });
      const asNumber = Number(value);
      return Number.isFinite(asNumber) ? asNumber : NaN;
    };
  }

  normalizeWindow(windowConfig = {}, variables = {}) {
    const source = windowConfig || {};
    const xMin = this.resolveNumericValue(source.xMin ?? source.xmin, variables, this.defaultWindow.xMin);
    const xMax = this.resolveNumericValue(source.xMax ?? source.xmax, variables, this.defaultWindow.xMax);
    const yMin = this.resolveNumericValue(source.yMin ?? source.ymin, variables, this.defaultWindow.yMin);
    const yMax = this.resolveNumericValue(source.yMax ?? source.ymax, variables, this.defaultWindow.yMax);

    const fixed = {
      xMin: Math.min(xMin, xMax),
      xMax: Math.max(xMin, xMax),
      yMin: Math.min(yMin, yMax),
      yMax: Math.max(yMin, yMax)
    };

    if (fixed.xMin === fixed.xMax) {
      fixed.xMin -= 5;
      fixed.xMax += 5;
    }
    if (fixed.yMin === fixed.yMax) {
      fixed.yMin -= 5;
      fixed.yMax += 5;
    }

    return fixed;
  }

  normalizePolarConfig(drawConfig = {}, variables = {}) {
    const source = drawConfig || {};
    const windowSource = source.window || source.polar || {};

    const rMax = Math.abs(this.resolveNumericValue(
      source.rMax ?? windowSource.rMax ?? windowSource.maxR ?? windowSource.rmax,
      variables,
      this.defaultPolar.rMax
    )) || this.defaultPolar.rMax;

    const radialStep = Math.max(
      0.1,
      Math.abs(this.resolveNumericValue(
        source.radialStep ?? source.gridStep ?? windowSource.radialStep,
        variables,
        this.defaultPolar.radialStep
      )) || this.defaultPolar.radialStep
    );

    const angleStepDeg = Math.max(
      5,
      Math.abs(this.resolveNumericValue(
        source.angleStepDeg ?? windowSource.angleStepDeg,
        variables,
        this.defaultPolar.angleStepDeg
      )) || this.defaultPolar.angleStepDeg
    );

    const angleUnitRaw = String(
      source.angleUnit ?? windowSource.angleUnit ?? this.defaultPolar.angleUnit
    ).toLowerCase();
    const angleUnit = angleUnitRaw === "degrees" ? "degrees" : "radians";

    const thetaMin = this.resolveNumericValue(
      source.thetaMin ?? source.thetaDomain?.min ?? windowSource.thetaDomain?.min,
      variables,
      this.defaultPolar.thetaMin
    );
    const thetaMax = this.resolveNumericValue(
      source.thetaMax ?? source.thetaDomain?.max ?? windowSource.thetaDomain?.max,
      variables,
      this.defaultPolar.thetaMax
    );

    const defaultCommonAnglesDeg = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
    let commonAnglesDeg = defaultCommonAnglesDeg;
    if (Array.isArray(source.commonAnglesDeg)) {
      commonAnglesDeg = source.commonAnglesDeg
        .map(value => this.resolveNumericValue(value, variables, NaN))
        .filter(Number.isFinite)
        .map(angle => ((angle % 360) + 360) % 360);
    }

    const showAngleLabels = source.showAngleLabels ?? windowSource.showAngleLabels ?? false;

    return {
      rMax,
      radialStep,
      angleStepDeg,
      angleUnit,
      thetaMin: Math.min(thetaMin, thetaMax),
      thetaMax: Math.max(thetaMin, thetaMax),
      commonAnglesDeg: commonAnglesDeg.length > 0 ? commonAnglesDeg : defaultCommonAnglesDeg,
      showAngleLabels
    };
  }

  normalizeDomain(domainConfig, windowBounds, variables = {}) {
    const fallback = { min: windowBounds.xMin, max: windowBounds.xMax };
    if (!domainConfig) return fallback;

    if (Array.isArray(domainConfig) && domainConfig.length >= 2) {
      return {
        min: this.resolveNumericValue(domainConfig[0], variables, fallback.min),
        max: this.resolveNumericValue(domainConfig[1], variables, fallback.max)
      };
    }

    if (typeof domainConfig === "object") {
      const min = this.resolveNumericValue(domainConfig.min ?? domainConfig.xMin ?? domainConfig.xmin, variables, fallback.min);
      const max = this.resolveNumericValue(domainConfig.max ?? domainConfig.xMax ?? domainConfig.xmax, variables, fallback.max);
      return { min: Math.min(min, max), max: Math.max(min, max) };
    }

    return fallback;
  }

  setupCanvas(canvas, bounds) {
    if (!canvas.width) canvas.width = this.defaultWidth;
    if (!canvas.height) canvas.height = this.defaultHeight;

    const ctx = canvas.getContext("2d");
    return {
      ctx,
      xMin: bounds.xMin,
      xMax: bounds.xMax,
      yMin: bounds.yMin,
      yMax: bounds.yMax,
      xScale: canvas.width / (bounds.xMax - bounds.xMin),
      yScale: canvas.height / (bounds.yMax - bounds.yMin)
    };
  }

  xToPixel(x, env) {
    return (x - env.xMin) * env.xScale;
  }

  yToPixel(y, env) {
    return (env.yMax - y) * env.yScale;
  }

  setupPolarCanvas(canvas, polarConfig) {
    if (!canvas.width) canvas.width = this.defaultWidth;
    if (!canvas.height) canvas.height = this.defaultHeight;

    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadiusPx = Math.min(canvas.width, canvas.height) * 0.45;
    const radiusScale = maxRadiusPx / polarConfig.rMax;

    return {
      ctx,
      centerX,
      centerY,
      maxRadiusPx,
      radiusScale
    };
  }

  polarToPixel(r, thetaRad, env) {
    const x = env.centerX + r * Math.cos(thetaRad) * env.radiusScale;
    const y = env.centerY - r * Math.sin(thetaRad) * env.radiusScale;
    return { x, y };
  }

  drawCoordinateGrid(ctx, width, height, windowConfig = null, variables = null, options = {}) {
    if (!ctx) return;
    if (width) ctx.canvas.width = width;
    if (height) ctx.canvas.height = height;

    const typeFromWindow = typeof windowConfig === "object" && windowConfig ? windowConfig.type : null;
    const graphType = (options?.type || typeFromWindow) === "polar" ? "polar" : "rectangular";

    if (graphType === "polar") {
      const polarConfig = this.normalizePolarConfig(options?.drawConfig || windowConfig || {}, variables || {});
      const polarEnv = this.setupPolarCanvas(ctx.canvas, polarConfig);
      this.drawPolarGrid(polarEnv, polarConfig);
      return;
    }

    const bounds = this.normalizeWindow(windowConfig || this.defaultWindow, variables || {});
    const env = this.setupCanvas(ctx.canvas, bounds);
    this.drawGrid(env, 1);
  }

  drawGrid(env, step = 1) {
    const { ctx, xMin, xMax, yMin, yMax } = env;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const gridStep = Math.max(0.1, Number(step) || 1);
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;

    const startX = Math.ceil(xMin / gridStep) * gridStep;
    for (let x = startX; x <= xMax + 1e-9; x += gridStep) {
      const px = this.xToPixel(x, env);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, ctx.canvas.height);
      ctx.stroke();
    }

    const startY = Math.ceil(yMin / gridStep) * gridStep;
    for (let y = startY; y <= yMax + 1e-9; y += gridStep) {
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

  drawPolarGrid(env, polarConfig) {
    const { ctx, centerX, centerY, maxRadiusPx } = env;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Concentric circles
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    for (let r = polarConfig.radialStep; r <= polarConfig.rMax + 1e-9; r += polarConfig.radialStep) {
      const radiusPx = r * env.radiusScale;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radiusPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Angle spokes
    polarConfig.commonAnglesDeg.forEach(angleDeg => {
      const thetaRad = angleDeg * Math.PI / 180;
      const x = centerX + maxRadiusPx * Math.cos(thetaRad);
      const y = centerY - maxRadiusPx * Math.sin(thetaRad);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    // Polar axes
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - maxRadiusPx, centerY);
    ctx.lineTo(centerX + maxRadiusPx, centerY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - maxRadiusPx);
    ctx.lineTo(centerX, centerY + maxRadiusPx);
    ctx.stroke();

    // Common angle labels (optional)
    if (polarConfig.showAngleLabels) {
      ctx.fillStyle = "#666";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      polarConfig.commonAnglesDeg.forEach(angleDeg => {
        const thetaRad = angleDeg * Math.PI / 180;
        const labelRadius = maxRadiusPx + 12;
        const x = centerX + labelRadius * Math.cos(thetaRad);
        const y = centerY - labelRadius * Math.sin(thetaRad);
        ctx.fillText(`${angleDeg}\u00b0`, x, y);
      });
    }
  }

  extractEquationConfigs(drawConfig) {
    const equations = [];

    if (Array.isArray(drawConfig?.equations)) {
      drawConfig.equations.forEach(eq => equations.push(eq));
    }

    if (Array.isArray(drawConfig?.relations)) {
      drawConfig.relations.forEach(eq => equations.push(eq));
    }

    if (drawConfig?.system && typeof drawConfig.system === "object") {
      Object.keys(drawConfig.system)
        .filter(key => /^eq\d+$/i.test(key))
        .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")))
        .forEach(key => equations.push(drawConfig.system[key]));
    }

    Object.keys(drawConfig || {})
      .filter(key => /^eq\d+$/i.test(key))
      .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")))
      .forEach(key => equations.push(drawConfig[key]));

    if (drawConfig?.relation || drawConfig?.equation || drawConfig?.expression) {
      equations.push(drawConfig.relation || drawConfig.equation || drawConfig.expression);
    }

    if (drawConfig?.type === "piecewise" && Array.isArray(drawConfig.segments)) {
      drawConfig.segments.forEach(segment => {
        equations.push({
          relation: segment.relation || segment.equation || segment.expression,
          domain: segment.domain || segment.xDomain,
          color: segment.color
        });
      });
    }

    return equations;
  }

  normalizeEquationEntry(entry) {
    if (typeof entry === "string") {
      return {
        relation: entry,
        boundaryStyle: undefined,
        boundaryDash: undefined,
        shade: undefined,
        shadeOpacity: undefined,
        shadeColor: undefined,
        showInQuestion: true,
        showInAnswer: true
      };
    }
    if (entry && typeof entry === "object") {
      return {
        relation: entry.relation || entry.equation || entry.expression || "",
        domain: entry.domain || entry.xDomain,
        thetaDomain: entry.thetaDomain || entry.tDomain,
        thetaMin: entry.thetaMin,
        thetaMax: entry.thetaMax,
        angleUnit: entry.angleUnit,
        range: entry.range || entry.yDomain,
        color: entry.color,
        lineWidth: entry.lineWidth,
        boundaryStyle: entry.boundaryStyle || entry.lineStyle,
        boundaryDash: entry.boundaryDash,
        shade: entry.shade,
        shadeOpacity: entry.shadeOpacity,
        shadeColor: entry.shadeColor,
        showInQuestion: entry.showInQuestion !== false,
        showInAnswer: entry.showInAnswer !== false
      };
    }
    return {
      relation: "",
      boundaryStyle: undefined,
      boundaryDash: undefined,
      shade: undefined,
      shadeOpacity: undefined,
      shadeColor: undefined,
      showInQuestion: true,
      showInAnswer: true
    };
  }

  extractPointConfigs(drawConfig = {}) {
    const points = [];

    if (Array.isArray(drawConfig?.points)) {
      drawConfig.points.forEach(point => points.push(point));
    }

    if (drawConfig?.point !== undefined) {
      points.push(drawConfig.point);
    }

    return points;
  }

  normalizePointEntry(entry) {
    if (Array.isArray(entry) && entry.length >= 2) {
      return {
        x: entry[0],
        y: entry[1],
        label: entry[2],
        showInQuestion: true,
        showInAnswer: true
      };
    }

    if (!entry || typeof entry !== "object") {
      return {
        showInQuestion: true,
        showInAnswer: true
      };
    }

    const usesPolarShorthand = entry.theta !== undefined || entry.t !== undefined;
    const hasExplicitPolar = entry.r !== undefined || entry.polarR !== undefined || usesPolarShorthand;

    return {
      x: entry.x ?? entry.xCoord,
      y: entry.y ?? entry.yCoord,
      r: entry.r ?? entry.polarR ?? (usesPolarShorthand ? entry.radius : undefined),
      theta: entry.theta ?? entry.t,
      angleUnit: entry.angleUnit ?? entry.thetaUnit,
      pointRadius: entry.pointRadius ?? entry.dotRadius ?? entry.size ?? (!hasExplicitPolar ? entry.radius : undefined),
      color: entry.color ?? entry.fillColor,
      fillColor: entry.fillColor,
      strokeColor: entry.strokeColor,
      outlineWidth: entry.outlineWidth ?? entry.lineWidth,
      fill: entry.fill !== false,
      stroke: entry.stroke !== false,
      label: entry.label ?? entry.name ?? entry.text,
      labelColor: entry.labelColor,
      labelOffsetX: entry.labelOffsetX,
      labelOffsetY: entry.labelOffsetY,
      showInQuestion: entry.showInQuestion !== false,
      showInAnswer: entry.showInAnswer !== false
    };
  }

  resolvePointCoordinates(pointConfig = {}, variables = {}, defaultAngleUnit = "radians") {
    const x = this.resolveNumericValue(pointConfig.x, variables, NaN);
    const y = this.resolveNumericValue(pointConfig.y, variables, NaN);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }

    const r = this.resolveNumericValue(pointConfig.r, variables, NaN);
    const thetaValue = this.resolveNumericValue(pointConfig.theta, variables, NaN);
    if (!Number.isFinite(r) || !Number.isFinite(thetaValue)) {
      return null;
    }

    const angleUnitRaw = String(pointConfig.angleUnit || defaultAngleUnit || "radians").toLowerCase();
    const thetaRad = angleUnitRaw === "degrees"
      ? thetaValue * Math.PI / 180
      : thetaValue;

    return {
      x: r * Math.cos(thetaRad),
      y: r * Math.sin(thetaRad)
    };
  }

  drawPointMarker(ctx, px, py, pointConfig = {}, variables = {}, fallbackColor = "#e74c3c") {
    const markerRadius = Math.max(1, this.resolveNumericValue(pointConfig.pointRadius, variables, 4));
    const outlineWidth = Math.max(0, this.resolveNumericValue(pointConfig.outlineWidth, variables, 1.5));
    const labelOffsetX = this.resolveNumericValue(pointConfig.labelOffsetX, variables, markerRadius + 4);
    const labelOffsetY = this.resolveNumericValue(pointConfig.labelOffsetY, variables, -markerRadius - 2);

    const fillEnabled = pointConfig.fill !== false;
    const strokeEnabled = pointConfig.stroke !== false;

    const fillColor = pointConfig.fillColor || pointConfig.color || fallbackColor;
    const strokeColor = pointConfig.strokeColor || "#111";

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, markerRadius, 0, Math.PI * 2);

    if (fillEnabled) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    if (strokeEnabled && outlineWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = outlineWidth;
      ctx.stroke();
    }

    if (pointConfig.label !== undefined && pointConfig.label !== null && String(pointConfig.label).trim() !== "") {
      ctx.fillStyle = pointConfig.labelColor || fillColor;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(String(pointConfig.label), px + labelOffsetX, py + labelOffsetY);
    }
    ctx.restore();
  }

  drawPointOnRectangularGrid(env, pointConfig, variables = {}, color = "#e74c3c") {
    const coordinates = this.resolvePointCoordinates(pointConfig, variables, "radians");
    if (!coordinates) {
      throw new Error("Point is missing coordinates. Provide x/y or r/theta.");
    }

    const px = this.xToPixel(coordinates.x, env);
    const py = this.yToPixel(coordinates.y, env);
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      throw new Error("Point coordinates are not finite.");
    }

    this.drawPointMarker(env.ctx, px, py, pointConfig, variables, color);
    return true;
  }

  drawPointOnPolarGrid(env, pointConfig, variables = {}, color = "#e74c3c", polarConfig = this.defaultPolar) {
    const coordinates = this.resolvePointCoordinates(pointConfig, variables, polarConfig.angleUnit);
    if (!coordinates) {
      throw new Error("Point is missing coordinates. Provide x/y or r/theta.");
    }

    const px = env.centerX + coordinates.x * env.radiusScale;
    const py = env.centerY - coordinates.y * env.radiusScale;
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      throw new Error("Point coordinates are not finite.");
    }

    this.drawPointMarker(env.ctx, px, py, pointConfig, variables, color);
    return true;
  }

  parseRelation(relationText) {
    const cleaned = String(relationText || "")
      .replace(/\u2264/g, "<=")
      .replace(/\u2265/g, ">=")
      .replace(/\s+/g, "");
    if (!cleaned) return null;

    const match = cleaned.match(/^(.*?)(<=|>=|<|>|=)(.*)$/);
    if (!match) return null;

    const left = match[1];
    const operator = match[2];
    const right = match[3];
    if (!left || !right) return null;

    if (left === "y") return { type: "yOfX", expression: right, operator };
    if (right === "y") return { type: "yOfX", expression: left, operator: this.flipRelationOperator(operator) };
    if (left === "x") return { type: "xOfY", expression: right, operator };
    if (right === "x") return { type: "xOfY", expression: left, operator: this.flipRelationOperator(operator) };

    return null;
  }

  flipRelationOperator(operator = "=") {
    if (operator === "<") return ">";
    if (operator === "<=") return ">=";
    if (operator === ">") return "<";
    if (operator === ">=") return "<=";
    return "=";
  }

  isInequalityOperator(operator = "=") {
    return operator === "<" || operator === "<=" || operator === ">" || operator === ">=";
  }

  isStrictInequalityOperator(operator = "=") {
    return operator === "<" || operator === ">";
  }

  resolveBoundaryStyle(equationConfig = {}, operator = "=") {
    const explicitStyle = equationConfig.boundaryStyle ?? equationConfig.lineStyle;
    const inferredStyle = this.isStrictInequalityOperator(operator) ? "dotted" : "solid";
    const rawStyle = String(explicitStyle || inferredStyle).toLowerCase();

    if (rawStyle === "dotted" || rawStyle === "dot") return "dotted";
    if (rawStyle === "dashed" || rawStyle === "dash") return "dashed";
    return "solid";
  }

  resolveBoundaryDash(equationConfig = {}, boundaryStyle = "solid") {
    if (Array.isArray(equationConfig.boundaryDash) && equationConfig.boundaryDash.length > 0) {
      const cleanedDash = equationConfig.boundaryDash
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && value > 0);
      if (cleanedDash.length > 0) return cleanedDash;
    }

    if (boundaryStyle === "dotted") return [2, 6];
    if (boundaryStyle === "dashed") return [8, 6];
    return [];
  }

  resolveShadeOpacity(equationConfig = {}) {
    const rawOpacity = Number(equationConfig.shadeOpacity);
    if (!Number.isFinite(rawOpacity)) return 0.18;
    return Math.max(0, Math.min(1, rawOpacity));
  }

  shouldShadeInequality(equationConfig = {}, operator = "=") {
    if (!this.isInequalityOperator(operator)) return false;
    if (equationConfig.shade === false) return false;
    return true;
  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  shadeYInequality(env, fn, domain, operator, shadeColor, shadeOpacity = 0.18) {
    const { ctx } = env;
    const steps = Math.max(240, ctx.canvas.width * 2);
    const dx = (domain.max - domain.min) / steps;
    const shadeAbove = operator === ">" || operator === ">=";

    ctx.save();
    ctx.fillStyle = shadeColor;
    ctx.globalAlpha = this.clamp(shadeOpacity, 0, 1);

    for (let i = 0; i < steps; i += 1) {
      const x1 = domain.min + dx * i;
      const x2 = domain.min + dx * (i + 1);
      const y1 = fn({ x: x1 });
      const y2 = fn({ x: x2 });

      if (!Number.isFinite(y1) || !Number.isFinite(y2)) continue;

      const clampedY1 = this.clamp(y1, env.yMin, env.yMax);
      const clampedY2 = this.clamp(y2, env.yMin, env.yMax);

      const px1 = this.xToPixel(x1, env);
      const px2 = this.xToPixel(x2, env);
      const py1 = this.yToPixel(clampedY1, env);
      const py2 = this.yToPixel(clampedY2, env);

      ctx.beginPath();
      if (shadeAbove) {
        ctx.moveTo(px1, 0);
        ctx.lineTo(px2, 0);
        ctx.lineTo(px2, py2);
        ctx.lineTo(px1, py1);
      } else {
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.lineTo(px2, ctx.canvas.height);
        ctx.lineTo(px1, ctx.canvas.height);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  shadeXInequality(env, fn, range, operator, shadeColor, shadeOpacity = 0.18) {
    const { ctx } = env;
    const steps = Math.max(240, ctx.canvas.height * 2);
    const dy = (range.max - range.min) / steps;
    const shadeRight = operator === ">" || operator === ">=";

    ctx.save();
    ctx.fillStyle = shadeColor;
    ctx.globalAlpha = this.clamp(shadeOpacity, 0, 1);

    for (let i = 0; i < steps; i += 1) {
      const y1 = range.min + dy * i;
      const y2 = range.min + dy * (i + 1);
      const x1 = fn({ y: y1 });
      const x2 = fn({ y: y2 });

      if (!Number.isFinite(x1) || !Number.isFinite(x2)) continue;

      const clampedX1 = this.clamp(x1, env.xMin, env.xMax);
      const clampedX2 = this.clamp(x2, env.xMin, env.xMax);

      const px1 = this.xToPixel(clampedX1, env);
      const px2 = this.xToPixel(clampedX2, env);
      const py1 = this.yToPixel(y1, env);
      const py2 = this.yToPixel(y2, env);

      ctx.beginPath();
      if (shadeRight) {
        ctx.moveTo(px1, py1);
        ctx.lineTo(ctx.canvas.width, py1);
        ctx.lineTo(ctx.canvas.width, py2);
        ctx.lineTo(px2, py2);
      } else {
        ctx.moveTo(0, py1);
        ctx.lineTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.lineTo(0, py2);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  parsePolarRelation(relationText) {
    const withTheta = String(relationText || "").replace(/θ/g, "theta");
    const cleaned = withTheta.replace(/\s+/g, "");
    if (!cleaned) return null;

    if (!cleaned.includes("=")) {
      return { type: "rOfTheta", expression: cleaned };
    }

    const [left, ...rest] = cleaned.split("=");
    const right = rest.join("=");
    if (!left || !right) return null;

    if (left.toLowerCase() === "r") return { type: "rOfTheta", expression: right };
    if (right.toLowerCase() === "r") return { type: "rOfTheta", expression: left };
    return null;
  }

  drawRelation(env, equationConfig, variables = {}, color = "#e74c3c") {
    const parsed = this.parseRelation(equationConfig.relation);
    if (!parsed) {
      throw new Error(`Unsupported relation format: "${equationConfig.relation}"`);
    }

    const { ctx } = env;
    const boundaryColor = equationConfig.color || color;
    const boundaryStyle = this.resolveBoundaryStyle(equationConfig, parsed.operator);
    const boundaryDash = this.resolveBoundaryDash(equationConfig, boundaryStyle);
    const shadeColor = equationConfig.shadeColor || boundaryColor;
    const shouldShade = this.shouldShadeInequality(equationConfig, parsed.operator);
    const shadeOpacity = this.resolveShadeOpacity(equationConfig);

    const rangeMargin = (env.yMax - env.yMin) * 0.75;

    if (parsed.type === "yOfX") {
      const domain = this.normalizeDomain(equationConfig.domain, env, variables);
      const fn = this.compileExpression(parsed.expression, variables);

      if (shouldShade) {
        this.shadeYInequality(env, fn, domain, parsed.operator, shadeColor, shadeOpacity);
      }

      const steps = Math.max(240, ctx.canvas.width * 2);
      const dx = (domain.max - domain.min) / steps;
      let started = false;

      ctx.save();
      ctx.strokeStyle = boundaryColor;
      ctx.lineWidth = equationConfig.lineWidth || 2;
      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash(boundaryDash);
      }
      if (boundaryStyle === "dotted") {
        ctx.lineCap = "round";
      }
      ctx.beginPath();

      for (let i = 0; i <= steps; i += 1) {
        const x = domain.min + dx * i;
        const y = fn({ x });

        if (!Number.isFinite(y) || y < env.yMin - rangeMargin || y > env.yMax + rangeMargin) {
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
      ctx.restore();
    } else if (parsed.type === "xOfY") {
      const range = this.normalizeDomain(equationConfig.range, { xMin: env.yMin, xMax: env.yMax }, variables);
      const fn = this.compileExpression(parsed.expression, variables);

      if (shouldShade) {
        this.shadeXInequality(env, fn, range, parsed.operator, shadeColor, shadeOpacity);
      }

      const steps = Math.max(240, ctx.canvas.height * 2);
      const dy = (range.max - range.min) / steps;
      let started = false;

      ctx.save();
      ctx.strokeStyle = boundaryColor;
      ctx.lineWidth = equationConfig.lineWidth || 2;
      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash(boundaryDash);
      }
      if (boundaryStyle === "dotted") {
        ctx.lineCap = "round";
      }
      ctx.beginPath();

      for (let i = 0; i <= steps; i += 1) {
        const y = range.min + dy * i;
        const x = fn({ y });

        if (!Number.isFinite(x)) {
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
      ctx.restore();
    }

    return true;
  }

  drawPolarRelation(env, equationConfig, variables = {}, color = "#e74c3c", polarConfig = this.defaultPolar) {
    const parsed = this.parsePolarRelation(equationConfig.relation);
    if (!parsed || parsed.type !== "rOfTheta") {
      throw new Error(`Unsupported polar relation format: "${equationConfig.relation}"`);
    }

    const fn = this.compileExpression(parsed.expression.replace(/θ/g, "theta"), variables);

    const eqAngleUnitRaw = String(equationConfig.angleUnit || polarConfig.angleUnit || "radians").toLowerCase();
    const angleUnit = eqAngleUnitRaw === "degrees" ? "degrees" : "radians";

    const thetaMinValue = this.resolveNumericValue(
      equationConfig.thetaMin ?? equationConfig.thetaDomain?.min ?? equationConfig.domain?.min,
      variables,
      polarConfig.thetaMin
    );
    const thetaMaxValue = this.resolveNumericValue(
      equationConfig.thetaMax ?? equationConfig.thetaDomain?.max ?? equationConfig.domain?.max,
      variables,
      polarConfig.thetaMax
    );

    let thetaMin = Math.min(thetaMinValue, thetaMaxValue);
    let thetaMax = Math.max(thetaMinValue, thetaMaxValue);

    if (angleUnit === "degrees") {
      thetaMin = thetaMin * Math.PI / 180;
      thetaMax = thetaMax * Math.PI / 180;
    }

    const { ctx } = env;
    ctx.strokeStyle = equationConfig.color || color;
    ctx.lineWidth = equationConfig.lineWidth || 2;
    ctx.beginPath();

    const steps = Math.max(360, ctx.canvas.width * 3);
    const dTheta = (thetaMax - thetaMin) / steps;
    let started = false;

    for (let i = 0; i <= steps; i += 1) {
      const thetaRad = thetaMin + i * dTheta;
      const thetaInput = angleUnit === "degrees" ? (thetaRad * 180 / Math.PI) : thetaRad;
      const r = fn({ theta: thetaInput, t: thetaInput });

      if (!Number.isFinite(r) || Math.abs(r) > polarConfig.rMax * 4) {
        started = false;
        continue;
      }

      const point = this.polarToPixel(r, thetaRad, env);
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        started = false;
        continue;
      }

      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }

    ctx.stroke();
    return true;
  }

  draw(canvas, drawConfig, variables = {}, options = {}) {
    const result = {
      renderedCount: 0,
      skippedCount: 0,
      errors: []
    };

    if (!canvas || !drawConfig) return result;

    const context = options.context === "answer" ? "answer" : "question";
    const graphType = drawConfig.type === "polar" ? "polar" : "rectangular";

    if (graphType === "polar") {
      const polarConfig = this.normalizePolarConfig(drawConfig, variables);
      const polarEnv = this.setupPolarCanvas(canvas, polarConfig);
      const showGrid = drawConfig.showGrid !== false;

      if (showGrid) {
        this.drawPolarGrid(polarEnv, polarConfig);
      }

      const rawEquations = this.extractEquationConfigs(drawConfig);
      const equations = rawEquations
        .map(eq => this.normalizeEquationEntry(eq))
        .filter(eq => typeof eq.relation === "string" && eq.relation.trim().length > 0);

      equations.forEach((equation, index) => {
        const visibleInContext = context === "answer"
          ? equation.showInAnswer !== false
          : equation.showInQuestion !== false;

        if (!visibleInContext) {
          result.skippedCount += 1;
          return;
        }

        try {
          this.drawPolarRelation(polarEnv, equation, variables, this.palette[index % this.palette.length], polarConfig);
          result.renderedCount += 1;
        } catch (error) {
          result.errors.push({
            relation: equation.relation,
            message: error?.message || "Failed to draw polar relation."
          });
        }
      });

      const rawPoints = this.extractPointConfigs(drawConfig);
      const points = rawPoints
        .map(point => this.normalizePointEntry(point))
        .filter(point => {
          const hasXY = point.x !== undefined && point.y !== undefined;
          const hasPolar = point.r !== undefined && point.theta !== undefined;
          return hasXY || hasPolar;
        });

      points.forEach((point, index) => {
        const visibleInContext = context === "answer"
          ? point.showInAnswer !== false
          : point.showInQuestion !== false;

        if (!visibleInContext) {
          result.skippedCount += 1;
          return;
        }

        try {
          this.drawPointOnPolarGrid(
            polarEnv,
            point,
            variables,
            this.palette[(equations.length + index) % this.palette.length],
            polarConfig
          );
          result.renderedCount += 1;
        } catch (error) {
          result.errors.push({
            point,
            message: error?.message || "Failed to draw point."
          });
        }
      });

      return result;
    }

    const bounds = this.normalizeWindow(drawConfig.window || drawConfig.plane || this.defaultWindow, variables);
    const env = this.setupCanvas(canvas, bounds);
    const showGrid = drawConfig.showGrid !== false;
    const gridStep = drawConfig.gridStep || 1;

    if (showGrid) {
      this.drawGrid(env, gridStep);
    }

    const rawEquations = this.extractEquationConfigs(drawConfig);
    const equations = rawEquations
      .map(eq => this.normalizeEquationEntry(eq))
      .filter(eq => typeof eq.relation === "string" && eq.relation.trim().length > 0);

    equations.forEach((equation, index) => {
      const visibleInContext = context === "answer"
        ? equation.showInAnswer !== false
        : equation.showInQuestion !== false;

      if (!visibleInContext) {
        result.skippedCount += 1;
        return;
      }

      try {
        this.drawRelation(env, equation, variables, this.palette[index % this.palette.length]);
        result.renderedCount += 1;
      } catch (error) {
        result.errors.push({
          relation: equation.relation,
          message: error?.message || "Failed to draw relation."
        });
      }
    });

    const rawPoints = this.extractPointConfigs(drawConfig);
    const points = rawPoints
      .map(point => this.normalizePointEntry(point))
      .filter(point => {
        const hasXY = point.x !== undefined && point.y !== undefined;
        const hasPolar = point.r !== undefined && point.theta !== undefined;
        return hasXY || hasPolar;
      });

    points.forEach((point, index) => {
      const visibleInContext = context === "answer"
        ? point.showInAnswer !== false
        : point.showInQuestion !== false;

      if (!visibleInContext) {
        result.skippedCount += 1;
        return;
      }

      try {
        this.drawPointOnRectangularGrid(
          env,
          point,
          variables,
          this.palette[(equations.length + index) % this.palette.length]
        );
        result.renderedCount += 1;
      } catch (error) {
        result.errors.push({
          point,
          message: error?.message || "Failed to draw point."
        });
      }
    });

    return result;
  }

  drawFromGraphConfig(canvas, graphConfig, variables = {}, options = {}) {
    return this.draw(canvas, graphConfig, variables, options);
  }
}

window.DrawingEngine = new DrawingEngine();
