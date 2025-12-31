# Component Creation Plan

## Component 1: About Us Section
**File:** `components/landing-page/about-us-section.tsx`

**Structure:**
- Left side: Image (`/images/girl.png`)
- Right side content:
  - Sub tag: "About Us"
  - Heading: "Where Little Dreams Grow" (word "Grow" in blue/secondary color)
  - Paragraph: 3-4 lines of lorem ipsum text
  - Orange "Read More" button (rounded-md)
  - Additional div with:
    - Blue phone icon
    - Phone number text
    - Flex with items-center

**Styling:**
- Use Tailwind classes consistent with project
- Primary color (#F15F25) for orange button
- Secondary color (#04B0D6) for blue elements
- Font-heading for headings

## Component 2: Nursery Cards Section
**File:** `components/landing-page/nursery-cards-section.tsx`

**Structure:**
- Three cards in a row
- Each card:
  - Position relative
  - Background image (feature-1.png, feature-2.png, feature-3.png)
  - Overlay content:
    - Heading (sample nursery names)
    - Rating: 5 stars + number (4.5, 4.8, 4.2)
    - Description paragraph
    - "View All Branches" button (blue text, transparent bg, with arrow icon)
- Bottom section:
  - Orange "Search All Group" button

**Styling:**
- Card layout with relative positioning
- Star icons for ratings
- ArrowRight icon for branch button
- Consistent with existing component patterns

## Implementation Steps:
1. Switch to Code mode
2. Create first component with proper imports and structure
3. Create second component with card layout
4. Test components render correctly
5. Verify styling matches project theme