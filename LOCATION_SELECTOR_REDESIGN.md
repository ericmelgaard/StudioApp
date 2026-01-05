# Location Selector Redesign - Dual Navigation System

## Overview
Implemented a dual navigation system for CCGS that provides both quick navigation and full hierarchical tree view capabilities.

## Two Navigation Patterns

### 1. Quick Navigation (QuickLocationNav)
**Purpose**: Fast, contextual navigation for common workflows
**Location**: Inline in HeaderNavigation component

#### Desktop (≥ 768px)
- Compact 360px dropdown
- Shows only immediate child locations based on current context
- Location name truncated to 200px max width
- Click-outside to close
- Search/filter for locations

#### Mobile (< 768px)
- Full-screen modal takeover
- Touch-optimized with 44x44px minimum tap targets
- Larger icons (20x20px) and spacing
- Breadcrumb trail showing hierarchy
- Body scroll locking when open

### 2. Full Navigation (LocationSelector)
**Purpose**: Complete organizational overview with hierarchical tree
**Location**: Opened via Map button in header or from dashboards

#### Features
- Full hierarchical tree view (Concept > Company > Store)
- Expand/collapse navigation with chevron icons
- Visual hierarchy with indentation and colors
- Shows counts (companies per concept, stores per company)
- Deep search that filters entire tree
- Responsive modal (max-w-5xl, 85vh height)
- Auto-expands to show current selection
- Select at any level (concept, company, or store)

## Component Architecture

### Files
1. **QuickLocationNav.tsx** - Quick inline navigation
2. **LocationSelector.tsx** - Full hierarchical tree modal
3. **HeaderNavigation.tsx** - Wrapper that uses QuickLocationNav + Map button

### Usage Patterns

#### In Headers (Quick Nav)
```tsx
<HeaderNavigation
  userConceptId={user.concept_id}
  userCompanyId={user.company_id}
  userStoreId={user.store_id}
  onOpenFullNavigator={() => setShowFullNav(true)}
  actionButton={<SomeButton />}
/>
```

#### In Modals (Full Nav)
```tsx
{showFullNav && (
  <LocationSelector
    onClose={() => setShowFullNav(false)}
    onSelect={(location) => {
      setLocation(location);
      setShowFullNav(false);
    }}
    selectedLocation={currentLocation}
  />
)}
```

## Design Decisions

### Why Two Patterns?

1. **Quick Nav** - Most users navigate within their scope (e.g., store operators switching between stores in their company). Quick nav optimizes for this common case.

2. **Full Nav** - Power users and admins need to see the complete organizational structure and navigate across boundaries. The tree view provides this visibility.

### Space Efficiency
- Header space is precious - quick nav is compact
- Full nav appears only when needed as a modal
- Map button clearly indicates "more navigation options available"

### Mobile Optimization
- Quick nav mobile view feels native and touch-friendly
- Full nav modal also responsive and mobile-ready
- Both patterns work seamlessly on any screen size

### User Permissions
Quick nav respects user scope:
- Store users: See sibling stores only
- Company users: See child stores or sibling companies
- Concept users: See child companies
- Admins: See all concepts

Full nav shows complete tree with:
- Visual hierarchy
- Counts and structure
- Search that reveals all matches

## Technical Details

### QuickLocationNav Features
- Automatic mobile/desktop detection
- Window resize listener
- Click-outside detection (desktop)
- Body scroll management (mobile)
- Context-aware data loading
- Parent navigation ("Go Up")
- Proper cleanup on unmount

### LocationSelector Features
- Paginated store loading (1000 per page)
- Three-level hierarchy display
- Expand/collapse state management
- Deep search filtering
- Selection highlighting at all levels
- Responsive modal with flex layout
- Icon color coding (blue=concept, green=company, red=store)

## Testing Recommendations

### Quick Nav
1. Test dropdown on desktop (click-outside, keyboard nav)
2. Test mobile modal (touch targets, scroll locking)
3. Verify context switching (concept → company → store)
4. Test parent navigation buttons
5. Verify search/filter functionality

### Full Nav
1. Test expand/collapse at all levels
2. Verify selection highlighting
3. Test search across hierarchy
4. Verify pagination with large datasets
5. Test modal responsiveness on mobile
6. Verify current location auto-expansion

## Backward Compatibility
- All existing props and functionality preserved
- No breaking changes to parent components
- Map button maintains familiar access point
- Dashboard implementations unchanged

## Benefits

1. **Speed**: Quick nav is instant for common tasks
2. **Visibility**: Full nav shows complete structure when needed
3. **Mobile**: Both patterns work great on touch devices
4. **Space**: Header remains compact and uncluttered
5. **Flexibility**: Users can choose their preferred pattern
6. **Discovery**: Tree view helps users understand organization
7. **Search**: Both patterns support filtering
8. **Permissions**: Properly scoped for all user types
