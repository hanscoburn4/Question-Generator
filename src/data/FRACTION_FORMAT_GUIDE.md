# Fraction Simplification and Format Control Guide

## Overview

The question generator now supports **explicit control** over how numeric variables are displayed, with automatic fraction simplification, radical detection, and configurable output formats.

## Quick Start

### Basic Usage (Auto Format - Default)

```json
{
  "variables": {
    "a": { "min": 1, "max": 5 },
    "b": { "min": 1, "max": 10 },
    "result": { "formula": "a/b" }
  }
}
```

**Output**: Automatically displays as a simplified fraction like `\frac{2}{5}` or as an integer if applicable.

---

## Format Options

Add a `format` property to any variable constraint to control its display:

### 1. **Auto Format** (Default)

```json
"h": { "formula": "-b/(2*a)" }
// OR explicitly:
"h": { "formula": "-b/(2*a)", "format": "auto" }
```

**Behavior**:
- Automatically detects the best representation
- Priority: Integer → Exact Fraction → Radical → Approximate Fraction → Decimal

**Example Outputs**:
- `5` (integer)
- `\frac{3}{4}` (exact fraction)
- `2\sqrt{3}` (simplified radical)
- `0.866025403784` (decimal fallback)

---

### 2. **Fraction Format**

```json
"h": { "formula": "-b/(2*a)", "format": "fraction" }
```

**Behavior**:
- Forces fraction display (exact or approximate)
- Uses GCD-based simplification
- Falls back to approximate fraction using continued fractions

**Example Outputs**:
- `\frac{-3}{4}` (negative fraction)
- `\frac{7}{2}` (improper fraction)
- `5` (displays as integer if denominator is 1)

**Use When**:
- You need exact fractional answers
- Working with rational number problems
- Avoiding decimal approximations

---

### 3. **Decimal Format**

```json
"h": { "formula": "-b/(2*a)", "format": "decimal" }
```

**Behavior**:
- Forces decimal representation
- Removes trailing zeros
- Suitable for calculator approximations

**Example Outputs**:
- `-0.75` (instead of `\frac{-3}{4}`)
- `3.875` (instead of `\frac{31}{8}`)
- `1.414213562373` (instead of `\sqrt{2}`)

**Use When**:
- Problems require calculator approximations
- Decimal precision is more appropriate
- Working with measurements or applied problems

---

### 4. **Radical Format**

```json
"distance": { "formula": "Math.sqrt(dx*dx + dy*dy)", "format": "radical" }
```

**Behavior**:
- Attempts to detect simplified radical forms
- Handles forms like `k√m` and `(p/q)√m`
- Falls back to decimal if no radical detected

**Example Outputs**:
- `2\sqrt{3}` (simplified radical)
- `\frac{1}{2}\sqrt{5}` (fractional coefficient with radical)
- `5` (perfect square simplifies to integer)

**Use When**:
- Geometry problems (distances, areas)
- Trigonometry with special angles
- Problems requiring exact radical expressions

---

## Complete Examples

### Example 1: Quadratic Vertex (Fractions)

```json
{
  "id": "ALG2-3.1-I1",
  "type": "template",
  "objective": "Graphing Quadratic Functions",
  "difficulty": "intermediate",
  "variables": {
    "a": { "min": -3, "max": 3, "exclude": [0, 1, -1] },
    "b": { "min": -6, "max": 6, "exclude": [0, 1, -1] },
    "c": { "min": -8, "max": 8, "exclude": [0, 1, -1] },
    "h": { "formula": "-b/(2*a)", "format": "fraction" },
    "k": { "formula": "a*h*h + b*h + c", "format": "fraction" }
  },
  "question": "Find the vertex of \\( f(x) = {a}x^2 {b|signedCoef}x {c|sign} \\) in exact form.",
  "answer": "Vertex: \\( ({h}, {k}) \\)"
}
```

**Sample Output** (with a=2, b=3, c=5):
```
Question: Find the vertex of f(x) = 2x² + 3x + 5 in exact form.
Answer: Vertex: (\frac{-3}{4}, \frac{31}{8})
```

---

### Example 2: Mixed Formats (Exact and Approximate)

```json
{
  "id": "TRIG-1.1-A1",
  "type": "template",
  "objective": "Trigonometric Values",
  "difficulty": "advanced",
  "variables": {
    "angle": { "values": [30, 45, 60] },
    "sin_exact": { "formula": "Math.sin(angle * Math.PI / 180)", "format": "radical" },
    "sin_approx": { "formula": "Math.sin(angle * Math.PI / 180)", "format": "decimal" },
    "ratio": { "formula": "angle / 90", "format": "fraction" }
  },
  "question": "For angle {angle}°, find sin({angle}°) in exact and decimal form.",
  "answer": "Exact: \\( \\sin({angle}°) = {sin_exact} \\); Decimal: \\( \\approx {sin_approx} \\); Ratio: \\( {ratio} \\)"
}
```

**Sample Output** (with angle=60):
```
Question: For angle 60°, find sin(60°) in exact and decimal form.
Answer: Exact: sin(60°) = \frac{\sqrt{3}}{2}; Decimal: ≈ 0.866025403784; Ratio: \frac{2}{3}
```

---

### Example 3: Distance Formula (Radicals)

```json
{
  "id": "GEOM-2.1-I1",
  "type": "template",
  "objective": "Distance Formula",
  "difficulty": "intermediate",
  "variables": {
    "x1": { "min": 0, "max": 5 },
    "y1": { "min": 0, "max": 5 },
    "x2": { "min": 6, "max": 10 },
    "y2": { "min": 6, "max": 10 },
    "dx": { "formula": "x2 - x1" },
    "dy": { "formula": "y2 - y1" },
    "distance_exact": { "formula": "Math.sqrt(dx*dx + dy*dy)", "format": "radical" },
    "distance_decimal": { "formula": "Math.sqrt(dx*dx + dy*dy)", "format": "decimal" }
  },
  "question": "Find the distance between ({x1}, {y1}) and ({x2}, {y2}).",
  "answer": "Exact: \\( {distance_exact} \\); Approximate: \\( {distance_decimal} \\)"
}
```

---

## Technical Implementation

### Fraction Simplification Algorithm

1. **Exact Integer Division Detection**
   - Parses formulas like `(a*d + c)/b`, `a/b`, `(x+1)/(y-2)`
   - Evaluates numerator and denominator separately
   - Only triggers if both are integers

2. **GCD-Based Simplification**
   - Uses Euclidean algorithm
   - Reduces fractions to lowest terms
   - Handles negative numbers correctly

3. **Continued Fractions (Approximate)**
   - For non-exact rational approximations
   - Configurable max denominator (default: 1000)
   - Precision threshold: 1e-12

### Radical Simplification

1. **Detection Range**: Tests radicands from 2 to 200
2. **Factor Extraction**: Removes perfect squares from radicand
3. **Coefficient Simplification**: Reduces fractional coefficients
4. **Forms Supported**:
   - `k√m` where k is integer
   - `(p/q)√m` where p/q is simplified fraction

---

## Backward Compatibility

✅ **Fully Compatible**: All existing questions work without modification

- Default behavior is `format: "auto"` (existing intelligent detection)
- No breaking changes to existing JSON structure
- New `format` property is optional

---

## Best Practices

### When to Use Each Format

| Format    | Use Case | Example Problems |
|-----------|----------|------------------|
| `auto`    | General purpose, intelligent detection | Most algebra, precalculus |
| `fraction`| Exact rational answers required | Vertex form, rational functions, fraction arithmetic |
| `decimal` | Calculator approximations needed | Applied problems, measurements, numerical methods |
| `radical` | Exact irrational answers required | Geometry (distances), special angle trig, Pythagorean theorem |

### Performance Considerations

- Exact fraction detection is fast (O(1) for simple divisions)
- Radical detection scans up to 200 radicands (still very fast)
- Approximate fraction uses continued fractions (efficient convergence)

### Edge Cases Handled

✅ Negative fractions: `\frac{-3}{4}` (not `\frac{3}{-4}`)
✅ Improper fractions: `\frac{7}{2}` (not converted to mixed numbers)
✅ Zero denominators: Returns string representation
✅ NaN/Infinity: Returns string representation
✅ Perfect squares under radicals: Simplifies to integers

---

## Testing Your Questions

### Validation Checklist

- [ ] Variables with formulas have appropriate `format` specified
- [ ] Fractions are simplified correctly
- [ ] Negative signs are in the numerator
- [ ] Radicals are fully simplified
- [ ] Decimals have reasonable precision (no excessive trailing digits)
- [ ] LaTeX formatting is correct: `\frac{a}{b}`, `\sqrt{n}`

### Debug Mode

The `generateQuestionVariables` function logs:
- Final numeric values (`vars`)
- Display strings (`displayVars`)

Check browser console to see actual vs. display values.

---

## Migration Guide

### Updating Existing Questions

**Before** (Auto-detected, sometimes gives decimals):
```json
"h": { "formula": "-b/(2*a)" }
```

**After** (Guaranteed fraction):
```json
"h": { "formula": "-b/(2*a)", "format": "fraction" }
```

### Common Patterns

```json
// Force fractions for vertex coordinates
"h": { "formula": "-b/(2*a)", "format": "fraction" },
"k": { "formula": "a*h*h + b*h + c", "format": "fraction" }

// Force decimals for applied problems
"height": { "formula": "v0*t - 0.5*g*t*t", "format": "decimal" }

// Force radicals for geometry
"diagonal": { "formula": "Math.sqrt(w*w + h*h)", "format": "radical" }

// Mix exact and approximate
"exact_value": { "formula": "Math.sqrt(2)", "format": "radical" },
"approx_value": { "formula": "Math.sqrt(2)", "format": "decimal" }
```

---

## Support and Troubleshooting

### Common Issues

**Issue**: Fraction not displaying
**Solution**: Check if `formula` property exists (only formula vars get exact detection in auto mode)

**Issue**: Radical not detected
**Solution**: Value might be too complex. Try `format: "radical"` to force detection

**Issue**: Too many decimal places
**Solution**: Trailing zeros are removed automatically. If still too long, consider rounding in formula

**Issue**: Negative denominator
**Solution**: Algorithm automatically moves negative to numerator

---

## Summary

The enhanced question generator provides:

✅ **Automatic fraction simplification** using GCD algorithm
✅ **Explicit format control** per variable (`auto`, `fraction`, `decimal`, `radical`)
✅ **Exact fraction detection** from integer division formulas
✅ **Simplified radical expressions** for square roots
✅ **Backward compatibility** with all existing questions
✅ **Flexible configuration** for mixed format requirements

Use these features to create questions with precise mathematical formatting that matches your curriculum's requirements.
