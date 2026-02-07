# Pay402 Logo & Banner Generation Prompt

**Project:** Pay402 - Zero-Friction x402 Payments on SUI  
**Style Reference:** Stripe (professional, fintech, clean)  
**Color Palette:** #667eea (blue-purple) → #764ba2 (deep purple)  
**Theme:** Liquidity, smooth flow, seamless payments

---

## Single Unified Prompt for ChatGPT/DALL-E

Copy this ENTIRE prompt into ChatGPT and ask for BOTH outputs:

```
I need you to create TWO branded images for "Pay402" - a blockchain payment protocol. Both must share the EXACT SAME visual design language for consistency.

IMPORTANT: Please generate BOTH images and provide them as downloadable PNG files.

===========================================
SHARED DESIGN SYSTEM (applies to both)
===========================================

BRAND IDENTITY:
- Project name: "Pay402"
- Industry: Fintech / Payment infrastructure
- Style benchmark: Stripe, Linear, Notion (premium, minimal, trustworthy)
- Target feeling: Professional, modern, smooth, tech-forward

COLOR PALETTE (use ONLY these):
- Primary: #667eea (blue-purple)
- Secondary: #764ba2 (deep purple)
- Light accent: #a78bfa (for subtle elements)
- Pale accent: #e0d4f7 (for backgrounds)
- White: #FFFFFF (for text on dark backgrounds)

ICON ELEMENT (must be identical in both outputs):
- A sleek, geometric fish silhouette facing right (→)
- The fish represents "payment flow" and "liquidity"
- MODERN & MINIMAL - angular/geometric shapes, NOT organic/cute
- Gradient fill: #667eea (head/front) smoothly transitioning to #764ba2 (tail/back)
- Clean silhouette with no internal details (no scales, eyes, or fins with texture)
- Style: Like a tech company logo (Linear, Notion), NOT an aquarium mascot

TEXT ELEMENT (must be identical in both outputs):
- The word "Pay402" (one word, capital P)
- Font: Clean, modern sans-serif (Inter, Satoshi, or Geist style)
- "Pay" in regular or medium weight
- "402" in same font, can be slightly bolder
- Text color: Either white (#FFFFFF) or the primary blue-purple (#667eea)

STYLE RULES (applies to both):
- Flat design (no 3D effects, no drop shadows, no bevels)
- Clean, minimal composition with breathing room
- Professional and trustworthy aesthetic
- DO NOT include: cryptocurrency symbols (BTC, ETH, coins, $), blockchain clichés (hexagons, chains, nodes), realistic textures, busy patterns

===========================================
OUTPUT 1: SQUARE LOGO (512x512px)
===========================================

DIMENSIONS:
- 512 x 512 pixels, square (1:1 ratio)
- Output format: PNG with transparent background

LAYOUT:
- Option A: Icon above, "Pay402" text below (stacked vertical)
- Option B: Icon left, "Pay402" text right (horizontal)
- Choose whichever creates better balance at this square size

REQUIREMENTS:
- The fish icon and "Pay402" text must both be clearly visible
- Balanced composition - neither element overwhelms the other
- Must remain recognizable when scaled down to 64x64px
- Background: Transparent (PNG alpha channel)

===========================================
OUTPUT 2: WIDE BANNER (640x360px)
===========================================

DIMENSIONS:
- 640 x 360 pixels (16:9 ratio)
- Output format: PNG (can have colored background)

LAYOUT (three zones, left to right):

LEFT ZONE (~30% width):
- The fish icon (same design as in the square logo)
- Prominently sized but not overwhelming
- Positioned with some padding from the edge

CENTER ZONE (~40% width):
- The text "Pay402" (same font/style as in the square logo)
- This is the FOCAL POINT - large, bold, clearly readable
- Vertically centered

RIGHT ZONE (~30% width):
- Subtle decorative elements suggesting "flow" or "smooth movement"
- Examples: gentle curved lines, abstract wave shapes, or flowing particles
- Colors: lighter purples (#a78bfa, #c4b5fd, #e0d4f7)
- Should be atmospheric, NOT distracting

BACKGROUND:
- Smooth gradient from #667eea (left) to #764ba2 (right)
- OR solid purple with subtle overlay
- Must provide good contrast for the "Pay402" text

===========================================
DELIVERABLES
===========================================

Please generate:

1. logo-512.png (512x512, transparent background, PNG format)
2. banner-640x360.png (640x360, colored background, PNG format)

Both must share the exact same:
- Fish icon design (same shape, same gradient)
- "Pay402" text style (same font, same weight, same color)
- Color palette
- Overall aesthetic

===========================================
QUALITY CHECKS
===========================================

Before finalizing, verify:
- [ ] Fish icon looks identical in both images
- [ ] "Pay402" text uses same font in both images
- [ ] Colors match exactly (#667eea and #764ba2)
- [ ] No unwanted elements (crypto symbols, random decorations)
- [ ] Logo remains clear when imagined at 64x64px
- [ ] Banner text "Pay402" is instantly readable
- [ ] Both look professional enough for Stripe's website
```

---

## After Generation

Once ChatGPT provides the PNG files:

1. **Download both PNGs:**

   - Save logo as `logo-512.png`
   - Save banner as `banner-640x360.png`

2. **Create scaled versions of logo:**

   ```bash
   # Using ImageMagick or similar
   convert logo-512.png -resize 256x256 logo-256.png
   convert logo-512.png -resize 64x64 logo-64.png
   ```

3. **Create larger banner (for presentation):**

   ```bash
   convert banner-640x360.png -resize 1280x720 banner-1280x720.png
   ```

4. **Quality check:**
   - Open both images side by side
   - Verify fish icon looks identical
   - Verify text "Pay402" uses same font
   - Verify color consistency

---

## If AI Generation Doesn't Work

**Fallback: Manual creation in Canva/Figma**

1. **Create fish icon:**

   - Use geometric shapes (triangles, curves) to form a fish silhouette
   - Apply gradient: #667eea → #764ba2
   - Export as SVG or PNG

2. **Create logo (512x512):**

   - Import fish icon
   - Add text "Pay402" using Inter or Satoshi font
   - Arrange in balanced layout
   - Export as PNG with transparency

3. **Create banner (640x360):**
   - Same fish icon, same text
   - Add gradient background
   - Add subtle flow elements on right
   - Export as PNG

---

## File Checklist

After generation, you should have:

| File                  | Dimensions | Format           | Purpose                     |
| --------------------- | ---------- | ---------------- | --------------------------- |
| `logo-512.png`        | 512x512    | PNG, transparent | Hackathon submission logo   |
| `logo-256.png`        | 256x256    | PNG, transparent | Medium logo                 |
| `logo-64.png`         | 64x64      | PNG, transparent | Small icon                  |
| `banner-640x360.png`  | 640x360    | PNG              | Hackathon submission banner |
| `banner-1280x720.png` | 1280x720   | PNG              | Presentation header         |

---

_Created: February 5, 2026_  
_Project: Pay402 - ETH Global HackMoney January 2026_
