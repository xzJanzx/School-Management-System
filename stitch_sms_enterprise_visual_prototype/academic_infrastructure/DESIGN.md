---
name: Academic Infrastructure
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#434655'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006780'
  on-secondary: '#ffffff'
  secondary-container: '#76dcff'
  on-secondary-container: '#006077'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#b7eaff'
  secondary-fixed-dim: '#6cd3f7'
  on-secondary-fixed: '#001f28'
  on-secondary-fixed-variant: '#004e61'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-default:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-dense:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  arabic-body:
    fontFamily: Tajawal
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 24px
  sidebar-width: 260px
---

## Brand & Style

The design system is engineered for high-density administrative environments, specifically for School Management Systems (SMS). It prioritizes utility, data density, and long-term legibility over decorative trends. The aesthetic is rooted in **Modern Corporate** principles: systematic, structured, and reliable.

The interface is designed to evoke a sense of calm authority and institutional stability. It utilizes a neutral, low-distraction canvas to allow complex data sets—such as student records, grade books, and schedules—to remain the focal point. Visual hierarchy is established through strict grid alignment and purposeful color application rather than depth or texture.

## Colors

This design system uses a specialized high-contrast palette for administrative clarity.
- **Primary (#2563eb):** Reserved for core functional actions and navigation states.
- **Secondary/Accent (#0891b2):** Specifically utilized for table headers and data categorization to differentiate informational zones from action zones.
- **Neutral Dark (#1e293b):** Applied to sidebars and persistent navigation to ground the application.
- **Workspace Canvas (#f8fafc):** A cool-toned neutral that reduces eye strain during prolonged administrative sessions.
- **Semantic Palette:** Green, Amber, and Red are used strictly for status indicators (Attendance, Grades, Payment Status) and destructive actions.

## Typography

The typography system is optimized for high information density. **Inter** is the primary typeface for English interfaces, chosen for its exceptional legibility in small sizes and technical clarity. For RTL and Arabic support, **Tajawal** is integrated to maintain a professional, geometric consistency with the English text.

Scale is intentionally compact to maximize the visible data on a standard 1080p display. Use `body-dense` for large data tables and `body-default` for general form inputs. `display` levels should be used sparingly for page titles and dashboard overviews.

## Layout & Spacing

This design system employs a **fixed-fluid hybrid grid** with a 4px baseline rhythm. 
- **Sidebar:** A fixed 260px sidebar anchored to the right (in RTL) or left (in LTR).
- **Workspace:** A fluid main area that expands to fill the viewport, utilizing a 12-column grid for dashboard modules.
- **RTL-First:** All layouts must be mirrored by default. The sidebar, icons, and text alignment prioritize Arabic reading patterns.
- **Density:** Spacing between table rows and list items is compressed (`8px` or `4px`) to ensure administrators can view multiple records without excessive scrolling.

## Elevation & Depth

To maintain a "Serious and Practical" aesthetic, the design system avoids traditional shadows. Depth is communicated through **Tonal Layering** and **Low-Contrast Outlines**.

- **Level 0 (Surface):** The `#f8fafc` workspace background.
- **Level 1 (Card/Container):** White (#FFFFFF) surfaces with a 1px border (#e2e8f0). No shadow.
- **Level 2 (Dropdowns/Modals):** White surfaces with a fine, neutral 1px border and a very subtle, tight ambient blur (4px blur, 5% opacity) to provide minimal separation from the workspace.
- **Active State:** Elements in focus or active selection use the Primary Blue border (1px or 2px) rather than a shadow "glow."

## Shapes

The design system uses a **Soft (0.25rem)** roundedness level. This subtle rounding provides a modern feel without sacrificing the professional, structured appearance required for enterprise software. 

- **Inputs & Small Buttons:** 4px (0.25rem) radius.
- **Cards & Data Panels:** 8px (0.5rem) radius.
- **Badges:** Fully rounded (pill) for status indicators to distinguish them from interactive buttons.
- **Icons:** Modern, line-based icons with a 2px stroke weight to match the typography's visual weight.

## Components

### Data Tables
Tables are the core of this system. Headers use the Secondary Teal background with white text. Rows should alternate with a very light gray stripe (`#f1f5f9`) for readability. Cell padding is tight (8px vertical).

### Buttons
- **Primary:** Solid `#2563eb` with white text.
- **Secondary:** White background with a `#cbd5e1` border and `#1e293b` text.
- **Action Icons:** 32x32px hit area with 16px icons for high-density layouts.

### Input Fields
Inputs use a white background, 1px `#cbd5e1` border, and 14px text. On focus, the border transitions to Primary Blue. Labels are always positioned above the input for clarity in both RTL and LTR.

### Semantic Badges
Status badges (e.g., "Present", "Late", "Paid") use a light tinted background of the semantic color with high-contrast text of the same hue (e.g., Success green text on a 10% opacity green background).

### Search & Filter Panels
Persistent horizontal bars above data tables. They should include a primary search field and 2-3 essential dropdown filters (e.g., Grade, Section, Academic Year) to allow for rapid data drill-downs.