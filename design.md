Your task is to implement a new route on /dashboard, following the design + development brief below. Implement thoroughly, in a step-by-step manner, and use built-in, standard Tailwind CSS design tokens instead of hardcoding values.

For colors and font families, use the defined values present in
@tailwind.config.js, e.g. 'bg-primary-500' etc. instead of the hardcoded primary/secondary values in the JSON brief. For one-off colors/grays etc. the JSON values are acceptable.

**Requirements**

- responsive (full width bg with centered content on larger screens)
- theme aware components with light and dark mode support (you can toggle with @ThemeSwitch.tsx; make sure to include that in the menu bar)
  - update @data/config/colors.js to match the colors in the design brief
  - *important* make sure to include light and dark mode colors by using Tailwind's dark mode classes (dark:)
  - all components must adapt to theme changes
- *do not use* magic strings, hex values, or px values. Replace all with Tailwind classes if possible.
- split reusable or complex parts of the UI into components so the code is maintainable and easy to understand.
- if any sample data is generated, place it in a separate file to keep the code clean.

**Note**

- the app is already running a dev server at port 6006

**Assignment brief**

Implement a clean, modern customer-support dashboard interface with a three-column layout: a navigation sidebar, a customer information panel, and a primary ticket workspace. The design should feel calm, professional, and highly readable, using a restrained color system with one green primary palette and one blue secondary palette supported by neutral grays and status accents. Surfaces are light with subtle elevation, rounded corners, and soft dividers. Navigation uses clear active states, pills, and badges. Tables are flat with hover highlighting and colored priority indicators. Dark mode mirrors the structure using deep neutral backgrounds, reduced shadows, and consistent brand colors. Ensure spacing, typography hierarchy, and interaction states remain consistent across breakpoints, with side panels collapsing gracefully on smaller screens. Use only the defined design tokens for color, spacing, radius, and motion, and avoid introducing additional visual styles.

**Design specification**

{
  // =========================================================
  // FIKRI — TICKETING APP UI SPEC (DESIGN → DEV HANDOFF)
  // =========================================================

  "meta": {
    "product": "Fikri — Customer Support Ticketing",
    "ui_style": "Modern SaaS dashboard",
    "density": "Comfortable",
    "aesthetic": "Clean, soft, rounded, low-contrast enterprise UI",
    "corner_radius": "8–12px global",
    "icon_style": "Outline, 1.5–2px stroke",
    "shadow_style": "Soft, subtle elevation only on panels"
  },

  // =========================================================
  // LAYOUT
  // =========================================================

  "layout": {
    "structure": "Three-column application shell",
    "columns": [
      {
        "name": "primary_sidebar",
        "width": "260px",
        "behavior": "Sticky, full height",
        "content": [
          "App branding",
          "Search",
          "Main navigation",
          "Conversation shortcuts",
          "Favorites",
          "Pinned tickets",
          "Support footer"
        ]
      },
      {
        "name": "customer_panel",
        "width": "320px",
        "behavior": "Scrollable independently",
        "content": [
          "Customer header",
          "Contact actions",
          "Customer details",
          "Tags & metadata"
        ]
      },
      {
        "name": "main_content",
        "width": "Fluid",
        "behavior": "Primary workspace",
        "content": [
          "Ticket header",
          "Stats bar",
          "Controls (search/filter)",
          "Ticket table"
        ]
      }
    ]
  },

  // =========================================================
  // RESPONSIVE (Tailwind default breakpoints)
  // =========================================================

  "responsive": {
    "breakpoints": {
      "sm": "640px",
      "md": "768px",
      "lg": "1024px",
      "xl": "1280px",
      "2xl": "1536px"
    },

    "behavior": {
      "<md": {
        "sidebar": "Hidden → slide-over drawer",
        "customer_panel": "Hidden → accessible from header",
        "main_content": "Full width",
        "table": "Condensed columns"
      },

      "md–lg": {
        "sidebar": "Collapsed (icon-only ~72px)",
        "customer_panel": "Overlay or collapsible",
        "main_content": "Primary"
      },

      "lg+": {
        "sidebar": "Full width",
        "customer_panel": "Visible",
        "main_content": "Fluid"
      }
    }
  },

  // =========================================================
  // COLOR SYSTEM
  // =========================================================

  "color_system": {

    "primary_palette": {
      "50": "#ECFDF5",
      "100": "#D1FAE5",
      "200": "#A7F3D0",
      "300": "#6EE7B7",
      "400": "#34D399",
      "500": "#10B981",   // PRIMARY BRAND COLOR
      "600": "#059669",
      "700": "#047857",
      "800": "#065F46",
      "900": "#064E3B"
    },

    "secondary_palette": {
      "50": "#EFF6FF",
      "100": "#DBEAFE",
      "200": "#BFDBFE",
      "300": "#93C5FD",
      "400": "#60A5FA",
      "500": "#3B82F6",   // ACTION BLUE
      "600": "#2563EB",
      "700": "#1D4ED8",
      "800": "#1E40AF",
      "900": "#1E3A8A"
    },

    "neutral_grays": {
      "0": "#FFFFFF",
      "50": "#F9FAFB",
      "100": "#F3F4F6",
      "200": "#E5E7EB",
      "300": "#D1D5DB",
      "400": "#9CA3AF",
      "500": "#6B7280",
      "600": "#4B5563",
      "700": "#374151",
      "800": "#1F2937",
      "900": "#111827"
    },

    "status_accents": {
      "success": "#22C55E",
      "warning": "#F59E0B",
      "danger": "#EF4444",
      "info": "#38BDF8"
    }
  },

  // =========================================================
  // DARK MODE
  // =========================================================

  "dark_mode": {
    "background": "#0F172A",
    "panel": "#111827",
    "panel_alt": "#1F2937",
    "border": "#374151",
    "text_primary": "#F9FAFB",
    "text_secondary": "#D1D5DB",
    "hover": "#1F2937",

    "rules": [
      "Primary/secondary palettes remain identical",
      "Reduce contrast of status colors by ~10%",
      "Shadows become minimal or removed",
      "Use borders for separation instead of elevation"
    ]
  },

  // =========================================================
  // SIDEBAR
  // =========================================================

  "primary_sidebar": {
    "background": "neutral_grays.50",
    "dark_background": "panel",

    "sections": [
      {
        "type": "brand",
        "elements": [
          "Circular logo avatar",
          "Product name",
          "User role label"
        ]
      },
      {
        "type": "search",
        "style": "Rounded input with icon"
      },
      {
        "type": "navigation",
        "items": [
          "Dashboard",
          "Inbox",
          "Notification",
          "Ticket",
          "Knowledge Base",
          "Customer (active)",
          "Forum",
          "Report"
        ],
        "active_style": {
          "background": "primary_palette.50",
          "text": "primary_palette.700",
          "indicator": "Left bar or pill"
        }
      },
      {
        "type": "conversation",
        "items": ["Call", "Side Conversation"]
      },
      {
        "type": "favorites_pinned",
        "style": "List with icons and counters"
      },
      {
        "type": "footer",
        "content": "Help & Support + vendor mark"
      }
    ]
  },

  // =========================================================
  // CUSTOMER PANEL
  // =========================================================

  "customer_panel": {
    "header": {
      "elements": [
        "Avatar",
        "Customer name",
        "Organization badge"
      ]
    },

    "actions": [
      "Call",
      "Email",
      "Notifications",
      "Message"
    ],

    "details": [
      "Source",
      "Phone",
      "Email(s)",
      "Location",
      "Languages",
      "Timezone",
      "Response status",
      "Organization",
      "Description"
    ],

    "chips": {
      "style": "Rounded pill",
      "status_colors": "status_accents"
    }
  },

  // =========================================================
  // MAIN CONTENT
  // =========================================================

  "main_content": {

    "header": {
      "left": "Ticket owner info",
      "right": "Primary action button",
      "button_style": {
        "background": "primary_palette.500",
        "text": "white",
        "radius": "10px"
      }
    },

    "tabs": [
      "Ticket (active)",
      "Activity",
      "Attachment",
      "Notes"
    ],

    "stats_bar": {
      "style": "Card strip",
      "items": [
        "Tickets count",
        "Overdue tickets",
        "Avg response time",
        "Total response time"
      ]
    },

    "controls": [
      "Search field",
      "Filter button",
      "Date picker"
    ]
  },

  // =========================================================
  // TABLE
  // =========================================================

  "ticket_table": {
    "style": "Flat, row-divider layout",

    "columns": [
      "Select",
      "Ticket ID",
      "Subject",
      "Priority",
      "Type",
      "Request Date"
    ],

    "row_states": {
      "default": "White",
      "hover": "neutral_grays.100",
      "selected": "primary_palette.50"
    },

    "priority_badges": {
      "high": "danger",
      "medium": "warning",
      "low": "success"
    }
  },

  // =========================================================
  // TYPOGRAPHY
  // =========================================================

  "typography": {
    "font_style": "Neutral sans-serif",
    "weights": {
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },

    "scale": {
      "xs": "12px",
      "sm": "13px",
      "base": "14px",
      "md": "16px",
      "lg": "18px",
      "xl": "20px"
    }
  },

  // =========================================================
  // SPACING
  // =========================================================

  "spacing": {
    "base_unit": 4,
    "common": [4, 8, 12, 16, 20, 24, 32]
  },

  // =========================================================
  // INTERACTION
  // =========================================================

  "interaction": {
    "transitions": "120–180ms ease",
    "focus": "Primary outline ring",
    "hover": "Background tint only",
    "disabled": "Opacity 40% + no shadow"
  }
}