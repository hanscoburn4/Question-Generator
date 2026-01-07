# Question Formatting Quick Reference Guide

## Variable Formatters

### 1. `{variable|coef}` - Coefficient Formatter
**Use for**: Coefficients of terms that should omit 1 and show only the sign for -1

**Examples:**
```
a = 1  → ""
a = -1 → "-"
a = 2  → "2"
a = -3 → "-3"
```

**Usage:**
```json
"question": "Graph \\( f(x) = {a|coef}x^2 \\)"
```

**Output:**
- When a=1: `f(x) = x^2`
- When a=-1: `f(x) = -x^2`
- When a=2: `f(x) = 2x^2`

---

### 2. `{variable|sign}` - Sign Formatter
**Use for**: Adding or subtracting constants with automatic sign handling

**Examples:**
```
b = 5  → "+5"
b = -3 → "-3"
b = 0  → "+0"
```

**Usage:**
```json
"question": "Simplify \\( x {b|sign} \\)"
```

**Output:**
- When b=5: `x + 5`
- When b=-3: `x - 3`

---

### 3. `{variable|signedCoef}` - Signed Coefficient Formatter
**Use for**: Coefficients that need explicit signs for addition/subtraction

**Examples:**
```
b = 0  → "+0"
b = 1  → "+"
b = -1 → "-"
b = 2  → "+2"
b = -3 → "-3"
```

**Usage:**
```json
"question": "Expand \\( {a|coef}x^2 {b|signedCoef}x {c|signedCoef} \\)"
```

**Output:**
- When a=1, b=2, c=-3: `x^2 + 2x - 3`
- When a=2, b=-1, c=5: `2x^2 - x + 5`

---

## Format Control for Computed Variables

### 1. `format: "auto"` (Default)
Automatically detects best representation

```json
"h": { "formula": "-b/(2*a)" }
// Same as:
"h": { "formula": "-b/(2*a)", "format": "auto" }
```

**Priority:** Integer → Exact Fraction → Radical → Approximate Fraction → Decimal

---

### 2. `format: "fraction"`
Forces fraction display

```json
"h": { "formula": "-b/(2*a)", "format": "fraction" }
```

**Output:** `\frac{-3}{4}` instead of `-0.75`

---

### 3. `format: "decimal"`
Forces decimal display

```json
"h": { "formula": "-b/(2*a)", "format": "decimal" }
```

**Output:** `-0.75` instead of `\frac{-3}{4}`

---

### 4. `format: "radical"`
Attempts radical simplification

```json
"distance": { "formula": "Math.sqrt(13)", "format": "radical" }
```

**Output:** `\sqrt{13}` instead of `3.60555...`

---

## Common Patterns

### Pattern 1: Quadratic Function Display
```json
"question": "Graph \\( f(x) = {a|coef}x^2 {b|signedCoef}x {c|signedCoef} \\)"
```
**Output:** `f(x) = 2x^2 - 3x + 5`

---

### Pattern 2: Vertex Form
```json
"question": "Graph \\( g(x) = {a|coef}(x - {h})^2 {k|sign} \\)"
```
**Output:** `g(x) = 2(x - 3)^2 + 4`

---

### Pattern 3: Linear Function
```json
"question": "Find intercepts of \\( y = {m}x {b|sign} \\)"
```
**Output:** `y = 2x + 5` or `y = 2x - 3`

---

### Pattern 4: Exact Fraction Answers
```json
"variables": {
  "xIntercept": { "formula": "-b/m", "format": "fraction" }
},
"answer": "\\( x \\)-intercept: \\( ({xIntercept}, 0) \\)"
```
**Output:** `x-intercept: (\frac{5}{2}, 0)`

---

### Pattern 5: Mixed Format (Exact + Approximate)
```json
"variables": {
  "h_exact": { "formula": "-b/(2*a)", "format": "fraction" },
  "h_approx": { "formula": "-b/(2*a)", "format": "decimal" }
},
"answer": "Exact: \\( {h_exact} \\); Approximate: \\( {h_approx} \\)"
```
**Output:** `Exact: \frac{3}{4}; Approximate: 0.75`

---

## Graph Instruction Pattern

Replace graph rendering with:
```json
"question": "Use a graphing calculator to view the graph of \\( f(x) = ... \\). [Original question text]"
```

**Examples:**
```json
// Domain and Range
"question": "Use a graphing calculator to view the graph of \\( f(x) = {a}x^2 - {b} \\). Find the domain and range of the function."

// Intercepts
"question": "Use a graphing calculator to view the graph of \\( y = {m}x {b|sign} \\). Find the x-intercept and y-intercept."

// Transformations
"question": "Given the parent function \\( f(x) = x^2 \\), use a graphing calculator to graph the transformed function \\( g(x) = (x - {h})^2 {k|sign} \\). Describe the transformations applied."
```

---

## Answer Field Conversion

### From answerExpression to answer

**Before:**
```json
"answerExpression": "`{ xIntercept: -b/m, yIntercept: b }`"
```

**After:**
```json
"variables": {
  "xIntercept": { "formula": "-b/m", "format": "fraction" },
  "yIntercept": { "formula": "b" }
},
"answer": "\\( x \\)-intercept: \\( ({xIntercept}, 0) \\); \\( y \\)-intercept: \\( (0, {yIntercept}) \\)"
```

---

## Best Practices

### 1. Use Formatters Consistently
- Always use `|coef` for leading coefficients
- Always use `|signedCoef` for middle terms
- Always use `|sign` for constant terms

### 2. Specify Format for Computed Variables
- Use `format: "fraction"` for exact rational answers
- Use `format: "decimal"` for approximate answers
- Use `format: "auto"` when either is acceptable

### 3. LaTeX Formatting
- Use `\\( ... \\)` for inline math
- Use `\\[ ... \\]` for display math
- Use `\\frac{num}{den}` for fractions
- Use `\\sqrt{...}` for radicals

### 4. Variable Naming
- Use descriptive names: `xIntercept`, `yIntercept`, `vertex_h`, `vertex_k`
- Keep computed variables separate from input variables

### 5. Answer Templates
- Be specific: include coordinate notation `({x}, {y})`
- Use proper mathematical notation
- Provide clear, complete sentences

---

## Common Mistakes to Avoid

❌ **Don't** hardcode signs:
```json
"question": "Simplify \\( x + {b} \\)"  // Wrong if b is negative
```

✅ **Do** use formatters:
```json
"question": "Simplify \\( x {b|sign} \\)"  // Correct
```

---

❌ **Don't** use type-specific question types:
```json
"type": "linearGraph"  // Old approach
```

✅ **Do** use template type:
```json
"type": "template"  // Current approach
```

---

❌ **Don't** include graph rendering properties:
```json
"draw": "parabola",
"showGraphInQuestion": true  // Remove these
```

✅ **Do** use text instructions:
```json
"question": "Use a graphing calculator to view the graph of ..."
```

---

❌ **Don't** use answerExpression:
```json
"answerExpression": "`{ xIntercept: -b/m, yIntercept: b }`"
```

✅ **Do** use computed variables and answer field:
```json
"variables": {
  "xIntercept": { "formula": "-b/m", "format": "fraction" }
},
"answer": "x-intercept: \\( ({xIntercept}, 0) \\)"
```

---

## Formula Syntax

### Basic Operations
```json
"formula": "a + b"       // Addition
"formula": "a - b"       // Subtraction
"formula": "a * b"       // Multiplication
"formula": "a / b"       // Division
"formula": "a * a"       // Squaring
```

### Functions
```json
"formula": "Math.sqrt(x)"       // Square root
"formula": "Math.abs(x)"        // Absolute value
"formula": "Math.pow(x, 3)"     // Power
"formula": "Math.sin(x)"        // Sine
"formula": "Math.PI"            // Pi constant
```

### Complex Formulas
```json
"formula": "-b/(2*a)"                           // Vertex x-coordinate
"formula": "a*h*h + b*h + c"                    // Vertex y-coordinate
"formula": "Math.sqrt(dx*dx + dy*dy)"           // Distance
"formula": "-(b * slopeDen) / slopeNum"         // x-intercept with fraction slope
```

---

## Summary Checklist

When creating or updating questions:

✅ Use `type: "template"` for all questions
✅ Use `|coef`, `|sign`, `|signedCoef` formatters appropriately
✅ Specify `format` for computed variables when needed
✅ Include "Use a graphing calculator..." instruction
✅ Remove all graph rendering properties
✅ Use proper LaTeX formatting in questions and answers
✅ Test with sample values to ensure correct display
✅ Validate JSON syntax

---

This reference ensures consistency across all questions in the question bank.
