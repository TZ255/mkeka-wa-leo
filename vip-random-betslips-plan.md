# Plan: VIP Random Betslips

**Generated**: 2026-05-31
**Estimated Complexity**: Medium

## Overview
Promote the working random `SUPER_STRONG` mega tips theory into the VIP workflow. Admins generate four VIP betslips from 12 random tips, save them to the existing `betslip` collection as `vip_no` 1-4, manage booking codes/providers, and paid users consume the saved slips on `/mkeka/vip`. Public/unpaid pages show only locked betslip cards, not match details.

## Sprint 1: VIP Data Flow
**Goal**: Preview, edit, then save four VIP slips reliably.
**Demo/Validation**:
- Admin opens `/mkeka/vip/admin/random-betslips?date=YYYY-MM-DD`.
- Admin previews four draft slips, edits them, then explicitly saves results.

### Task 1.1: Add VIP helper functions
- **Location**: `routes/fns/vip-betslips.js`
- **Description**: Normalize date, provider metadata, odds totals, countdowns, masking, and VIP slip grouping.
- **Dependencies**: None
- **Acceptance Criteria**: Existing `betslip` docs are grouped into four normalized slip objects.
- **Validation**: Render `/mkeka/vip` and admin page without template errors.

### Task 1.2: Add admin route file
- **Location**: `routes/vip-betslips.js`, `index.js`
- **Description**: Add admin-only GET/POST routes for random preview, explicit save, booking-code update, tip update, and result update.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**: Non-admins receive 403; admins can preview, edit, save, and update via HTMX.
- **Validation**: `node --check routes/vip-betslips.js`.

## Sprint 2: Paid VIP UI
**Goal**: Paid users see the four generated VIP slips.
**Demo/Validation**:
- Paid user opens `/mkeka/vip`.
- Four slips render with booking code/provider and average confidence/accuracy summary.

### Task 2.1: Update `/mkeka/vip`
- **Location**: `routes/get4-auth.js`
- **Description**: Fetch `vip_no` 1-4, booking metadata, and normalized `vipSlips`.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**: Paid, unpaid, and admin branches still render.
- **Validation**: Live route returns 200.

### Task 2.2: Add paid slip partial
- **Location**: `views/8-vip-paid/partials/vip-slips.ejs`
- **Description**: Render four Bootstrap-style betslips, hiding per-tip confidence and showing slip-level average accuracy.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**: No duplicated old three-slip UI required for normal paid user flow.
- **Validation**: EJS render checks.

## Sprint 3: Locked Teasers
**Goal**: Public/unpaid pages sell the VIP product without revealing matches.
**Demo/Validation**:
- Home, `/mkeka/betslip-ya-leo`, and unpaid `/mkeka/vip` show locked betslip cards.

### Task 3.1: Add locked betslip partial
- **Location**: `views/zz-fragments/vip-locked-betslips.ejs`
- **Description**: Cards show total odds, countdown/Expired, masked booking code, CTA, and 15,000 TZS stake summary.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**: No match names or picks appear in locked cards.
- **Validation**: Inspect rendered HTML for hidden match text absence in teaser cards.

### Task 3.2: Wire public pages
- **Location**: `routes/get.js`, `views/1-home/partials/betslip.ejs`, `views/3-landing/partials/betslip.ejs`, `views/8-vip-paid/partials/unpaid-pro.ejs`
- **Description**: Pass `vipShowcaseSlips` and replace old match teaser rows.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**: Pages render with locked slip summaries.
- **Validation**: Curl pages locally.

## Testing Strategy
- Syntax checks with `node --check`.
- EJS render checks for new partials.
- Live curl checks for admin route and public pages.

## Potential Risks & Gotchas
- Existing mobile API still returns three slips; update separately if mobile must expose VIP #4.
- Existing old admin partials may remain available for legacy use but should not be the primary admin flow.
- Booking-code provider fields rely on `strict: false` today; schema will be updated for clarity.

## Rollback Plan
- Remove `routes/vip-betslips.js` mount from `index.js`.
- Restore the old paid includes in `views/8-vip-paid/landing.ejs`.
- Restore old locked teaser partials.
