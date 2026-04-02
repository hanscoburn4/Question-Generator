# Before/After: Fraction Format Control

## Overview
This document demonstrates the actual behavior changes with concrete examples showing numeric values and their display representations.

---

## Example 1: Quadratic Vertex Calculation

### Question Template
```json
{
  "id": "ALG2-3.1-I1",
  "variables": {
    "a": { "min": -3, "max": 3, "exclude": [0,1,-1] },
    "b": { "min": -6, "max": 6, "exclude": [0,1,-1] },
    "c": { "min": -8, "max": 8, "exclude": [0,1,-1] },
    "h": { "formula": "-b/(2*a)" },
    "k": { "formula": "a*h*h + b*h + c" }
  },
  "question": "Find the vertex of f(x) = {a}x² {b|signedCoef}x {c|sign}.",
  "answer": "Vertex: ({h}, {k})"
}
```

### Sample Values: a=2, b=3, c=5

#### BEFORE (Auto Detection):
```
Numeric Values:
  a = 2
  b = 3
  c = 5
  h = -0.75
  k = 3.875

Display Values:
  h = "\frac{-3}{4}"  (auto-detected as exact fraction)
  k = "\frac{31}{8}"  (auto-detected as exact fraction)

Rendered Answer:
  Vertex: (\frac{-3}{4}, \frac{31}{8})
```

**Result**: ✅ Already works! Auto-detection finds exact fractions from `-b/(2*a)`.

---

### NOW WITH EXPLICIT CONTROL:

#### Option 1: Force Fraction Format
```json
"h": { "formula": "-b/(2*a)", "format": "fraction" },
"k": { "formula": "a*h*h + b*h + c", "format": "fraction" }
```

**Output** (a=2, b=3, c=5):
```
Display: h = "\frac{-3}{4}", k = "\frac{31}{8}"
Rendered: Vertex: (\frac{-3}{4}, \frac{31}{8})
```

---

#### Option 2: Force Decimal Format
```json
"h": { "formula": "-b/(2*a)", "format": "decimal" },
"k": { "formula": "a*h*h + b*h + c", "format": "decimal" }
```

**Output** (a=2, b=3, c=5):
```
Display: h = "-0.75", k = "3.875"
Rendered: Vertex: (-0.75, 3.875)
```

---

#### Option 3: Mixed Format (Exact + Approximate)
```json
"h_exact": { "formula": "-b/(2*a)", "format": "fraction" },
"h_approx": { "formula": "-b/(2*a)", "format": "decimal" },
"k_exact": { "formula": "a*h*h + b*h + c", "format": "fraction" },
"k_approx": { "formula": "a*h*h + b*h + c", "format": "decimal" }
```

**Output** (a=2, b=3, c=5):
```
Display:
  h_exact = "\frac{-3}{4}"
  h_approx = "-0.75"
  k_exact = "\frac{31}{8}"
  k_approx = "3.875"

Rendered:
  Exact: (\frac{-3}{4}, \frac{31}{8})
  Approximate: (-0.75, 3.875)
```

---

## Example 2: Trigonometric Values

### Question Template
```json
{
  "variables": {
    "angle": { "values": [30, 45, 60] },
    "sin_value": { "formula": "Math.sin(angle * Math.PI / 180)" }
  }
}
```

### Sample: angle = 60

#### Auto Format (Default):
```
Numeric: sin_value = 0.8660254037844387
Display: sin_value = "\frac{\sqrt{3}}{2}"  (auto-detected radical!)
```

#### Force Radical Format:
```json
"sin_value": { "formula": "Math.sin(angle * Math.PI / 180)", "format": "radical" }
```
```
Display: "\frac{\sqrt{3}}{2}"
```

#### Force Decimal Format:
```json
"sin_value": { "formula": "Math.sin(angle * Math.PI / 180)", "format": "decimal" }
```
```
Display: "0.866025403784"
```

#### Force Fraction Format:
```json
"sin_value": { "formula": "Math.sin(angle * Math.PI / 180)", "format": "fraction" }
```
```
Display: "\frac{866025403784}{1000000000000}" (approximate fraction - not ideal!)
Better to use "radical" for trig values.
```

---

## Example 3: Integer Results

### Sample: a=2, b=4, c=-5
```
h = -b/(2*a) = -4/(2*2) = -1.0
```

#### All Formats Produce Same Output:
```
Auto:     h = "-1"
Fraction: h = "-1"
Decimal:  h = "-1"
Radical:  h = "-1"
```

**Note**: Integers are always displayed as integers regardless of format setting.

---

## Example 4: Distance Formula

### Question Template
```json
{
  "variables": {
    "x1": 0, "y1": 0,
    "x2": 3, "y2": 4,
    "distance": { "formula": "Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1))" }
  }
}
```

### Sample: Points (0,0) to (3,4)

#### Auto Format:
```
Numeric: distance = 5.0
Display: "5" (perfect square detected)
```

### Sample: Points (0,0) to (2,3)

#### Auto Format:
```
Numeric: distance = 3.605551275463989
Display: "\sqrt{13}" (simplified radical detected!)
```

#### Force Radical:
```json
"distance": { "formula": "Math.sqrt(13)", "format": "radical" }
```
```
Display: "\sqrt{13}"
```

#### Force Decimal:
```json
"distance": { "formula": "Math.sqrt(13)", "format": "decimal" }
```
```
Display: "3.605551275464"
```

---

## Example 5: Complex Fractions

### Sample: h = 7/6

#### Auto Format:
```
Numeric: 1.1666666666666667
Display: "\frac{7}{6}" (exact fraction from formula)
```

#### Decimal Format:
```
Display: "1.166666666667"
```

---

## Example 6: Improper Fractions

### Sample: h = -5/2

#### Auto & Fraction Format:
```
Display: "\frac{-5}{2}"
```

**Note**: NOT converted to mixed numbers. Stays as improper fraction.

---

## Comparison Table

| Scenario | Numeric Value | Auto | Fraction | Decimal | Radical |
|----------|---------------|------|----------|---------|---------|
| -3/4 | -0.75 | `\frac{-3}{4}` | `\frac{-3}{4}` | `-0.75` | `-0.75` |
| 31/8 | 3.875 | `\frac{31}{8}` | `\frac{31}{8}` | `3.875` | `3.875` |
| sqrt(3)/2 | 0.866... | `\frac{\sqrt{3}}{2}` | `\frac{866...}{1000...}` | `0.866025403784` | `\frac{\sqrt{3}}{2}` |
| sqrt(13) | 3.605... | `\sqrt{13}` | `\frac{18}{5}` | `3.605551275464` | `\sqrt{13}` |
| 5.0 | 5 | `5` | `5` | `5` | `5` |
| π | 3.14159... | `\frac{22}{7}` | `\frac{22}{7}` | `3.14159265359` | `3.14159265359` |

---

## Key Behavior Changes

### 1. Backward Compatibility
✅ **No breaking changes**: All existing questions work exactly as before.
- Default behavior is `format: "auto"`
- Auto format intelligently detects best representation

### 2. Explicit Control
✨ **New capability**: You can now force specific formats per variable.
```json
// Before: No control over format
"h": { "formula": "-b/(2*a)" }

// After: Full control
"h": { "formula": "-b/(2*a)", "format": "fraction" }  // force fraction
"h": { "formula": "-b/(2*a)", "format": "decimal" }   // force decimal
```

### 3. Mixed Formats
✨ **New capability**: Different variables can have different formats in the same question.
```json
"exact": { "formula": "Math.sqrt(2)", "format": "radical" },
"approx": { "formula": "Math.sqrt(2)", "format": "decimal" }
```

### 4. Format Priority (Auto Mode)
When `format: "auto"` (or omitted):
1. **Integer** - if exact integer
2. **Exact Fraction** - if formula is integer division like `a/b`
3. **Radical** - if sqrt of non-perfect square
4. **Approximate Fraction** - using continued fractions
5. **Decimal** - last resort

---

## Migration Examples

### Scenario 1: Force Fractions for Vertices
**Before:**
```json
"h": { "formula": "-b/(2*a)" }  // might show decimals in edge cases
```

**After (Guaranteed Fractions):**
```json
"h": { "formula": "-b/(2*a)", "format": "fraction" }
```

---

### Scenario 2: Calculator Problems Need Decimals
**Before:**
```json
"height": { "formula": "v0*t - 0.5*g*t*t" }  // might show fractions
```

**After (Guaranteed Decimals):**
```json
"height": { "formula": "v0*t - 0.5*g*t*t", "format": "decimal" }
```

---

### Scenario 3: Geometry with Exact Radicals
**Before:**
```json
"diagonal": { "formula": "Math.sqrt(w*w + h*h)" }  // auto-detects radicals
```

**After (Explicit Radical):**
```json
"diagonal": { "formula": "Math.sqrt(w*w + h*h)", "format": "radical" }
```

---

## Testing Checklist

When testing your questions:

✅ **Test with integer results** - Should display as integers in all formats
✅ **Test with simple fractions** - Auto should detect, fraction should force
✅ **Test with radicals** - Auto should detect, radical should force
✅ **Test with complex decimals** - Decimal format should show clean decimals
✅ **Test negative values** - Negatives should appear in numerator
✅ **Test improper fractions** - Should stay improper (not convert to mixed)

---

## Summary

The enhanced system provides:

1. **Automatic intelligent formatting** (default behavior - unchanged)
2. **Explicit format control** (new feature)
3. **Four format options**: `auto`, `fraction`, `decimal`, `radical`
4. **Per-variable configuration** (different vars can use different formats)
5. **Full backward compatibility** (existing questions work unchanged)

Use explicit formats when you need guaranteed output representation for specific educational requirements.
