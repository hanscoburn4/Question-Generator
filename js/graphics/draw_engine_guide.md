# Draw Engine Guide for `question_bank.json`

## Overview
Use the `draw` object on a question to render a rectangular or polar graph.
The engine supports:
- Relation graphing (`y = ...`, `x = ...`, and polar `r = ...`)
- Inequality graphing (`y > ...`, `y <= ...`, `x < ...`, `x >= ...`) with boundary styling and shading
- Point plotting (`point` / `points`)
- Per-item visibility in question vs answer

## Minimal Quick-Start (Copy/Paste)

Use this as a starter `draw` block in any question:

```json
"draw": {
  "window": { "xMin": -8, "xMax": 8, "yMin": -8, "yMax": 8 },
  "gridStep": 1,
  "eq1": { "relation": "y = x + 1" },
  "points": [
    { "x": 2, "y": 3, "label": "A" },
    [0, 1, "Y-int"]
  ]
}
```

Quick edit checklist:
- Change the relation in `eq1.relation`.
- Add/remove points in `points`.
- Use `showInQuestion` / `showInAnswer` on any relation or point when needed.

## Formatting Guidelines

### 1) Variable schema
- For fixed values, use `values` (array), not `value`.
- Numeric placeholders like `{a}` are supported in draw config strings.

```json
"variables": {
  "a": { "min": -6, "max": 6 },
  "b": { "min": -6, "max": 6 },
  "xmin": { "values": [-8] },
  "xmax": { "values": [8] }
}
```

### 2) Draw object shape
- Put graph config under `"draw": { ... }`.
- Use `window` (or `plane`) for rectangular bounds.
- Use `type: "polar"` for polar graphs.

```json
"draw": {
  "window": { "xMin": "{xmin}", "xMax": "{xmax}", "yMin": -8, "yMax": 8 },
  "gridStep": 1,
  "showGrid": true
}
```

### 3) Relation formatting
- Rectangular relations can use:
- `y = expression`, `x = expression`
- `y > expression`, `y >= expression`, `y < expression`, `y <= expression`
- `x > expression`, `x >= expression`, `x < expression`, `x <= expression`
- Provide relations using any supported style:
- `eq1`, `eq2`, ...
- `equations: []`
- `relations: []`
- `relation` / `equation` / `expression` (single relation)
- Optional per-relation fields:
- `domain` for `y = f(x)`
- `range` for `x = g(y)`
- `color`, `lineWidth`
- `boundaryStyle`: `solid` or `dotted` (strict inequalities default to dotted; inclusive/equality default to solid)
- `boundaryDash`: custom dash pattern array, e.g. `[2, 6]`
- `shade`: `true`/`false` (inequalities shade by default)
- `shadeOpacity`: number from `0` to `1` (default `0.18`)
- `shadeColor`: fill color (defaults to the relation `color`)
- `showInQuestion`, `showInAnswer`

### 4) Point formatting
- Use `point` (single point) or `points` (array).
- Supported point coordinate forms:
- Cartesian object: `{ "x": ..., "y": ... }`
- Cartesian shorthand array: `[x, y, "OptionalLabel"]`
- Polar object: `{ "r": ..., "theta": ..., "angleUnit": "degrees|radians" }`
- Optional point fields:
- `pointRadius`, `color`, `fillColor`, `strokeColor`, `outlineWidth`
- `label`, `labelColor`, `labelOffsetX`, `labelOffsetY`
- `showInQuestion`, `showInAnswer`

### 5) Polar formatting
- Set `type` to `"polar"`.
- Polar relations should be `r = ...` in terms of `theta`.
- Defaults: radians, `theta` from `0` to `2*pi`.
- Optional graph-level polar fields:
- `rMax`, `radialStep`, `angleStepDeg`, `thetaMin`, `thetaMax`, `angleUnit`

## Complete Example (Relations + Points)

```json
{
  "id": "ALG1-GRAPH-POINTS-EXAMPLE",
  "type": "template",
  "objective": "Graph a line and plot key points",
  "difficulty": "basic",
  "variables": {
    "m": { "min": -3, "max": 3, "exclude": [0] },
    "b": { "min": -5, "max": 5 },
    "x1": { "values": [-2] },
    "x2": { "values": [3] },
    "y1": { "formula": "m*x1 + b" },
    "y2": { "formula": "m*x2 + b" }
  },
  "question": "Graph \\(y = {m}x + {b}\\) and plot points A and B.",
  "answer": "Line \\(y = {m}x + {b}\\), with A\\(({x1}, {y1})\\) and B\\(({x2}, {y2})\\).",
  "draw": {
    "window": { "xMin": -8, "xMax": 8, "yMin": -8, "yMax": 8 },
    "gridStep": 1,
    "eq1": {
      "relation": "y = {m}x + {b}",
      "showInQuestion": true,
      "showInAnswer": true
    },
    "points": [
      {
        "x": "{x1}",
        "y": "{y1}",
        "label": "A",
        "color": "#c0392b",
        "pointRadius": 5,
        "showInQuestion": true,
        "showInAnswer": true
      },
      {
        "x": "{x2}",
        "y": "{y2}",
        "label": "B",
        "color": "#2980b9",
        "pointRadius": 5,
        "showInQuestion": false,
        "showInAnswer": true
      },
      [0, "{b}", "Y-int"]
    ]
  }
}
```

## Inequality Example (Dotted + Shading)

```json
"draw": {
  "window": { "xMin": -10, "xMax": 10, "yMin": -10, "yMax": 10 },
  "gridStep": 1,
  "eq1": {
    "relation": "y > -0.5*x + 2",
    "color": "#e74c3c",
    "showInQuestion": false,
    "showInAnswer": true
  },
  "eq2": {
    "relation": "y <= 0.75*x - 1",
    "color": "#2980b9",
    "showInQuestion": false,
    "showInAnswer": true
  }
}
```

Notes:
- `>` and `<` draw dotted boundaries by default.
- `>=` and `<=` draw solid boundaries by default.
- Each inequality shades its half-plane using the same color, so overlap is visible automatically.

## Notes
- Relations and points can be mixed in the same `draw` block.
- Existing relation capabilities remain unchanged.
- `showInQuestion` / `showInAnswer` works independently for each relation and point.
