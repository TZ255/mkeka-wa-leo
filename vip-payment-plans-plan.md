# Plan: VIP Payment Plans

**Generated**: 2026-06-05
**Estimated Complexity**: Medium

## Overview
Add day, week, and month VIP choices to `views/8-vip-paid/partials/paywall-card.ejs` while keeping all trusted pricing and subscription duration decisions on the server.

The recommended flow is:

1. User selects a Bootstrap tab in the paywall.
2. The CTA calls `/api/pay-form?plan=day|week|month`.
3. `/api/pay-form` validates the plan key and renders `views/zz-fragments/htmx-form.ejs` with the selected plan details.
4. The payment form posts only the plan key to `/api/pay?plan=...` or as a hidden field.
5. `/api/pay` validates the plan key again, resolves the amount from a server-side map, then sends that amount and the plan key to the correct gateway.
6. For ClickPesa, Baruakazi receives `/payment/process/waleo`, initiates ClickPesa, stores the Waleo plan in its own `PaymentBin`, then includes `plan` when it forwards the Waleo webhook back to this server.
7. For Snippe, this server sends the amount directly to Snippe and includes the plan key in Snippe metadata so the forwarded Snippe webhook can return it.
8. This server receives the webhook with `plan` and grants the mapped subscription type. If `plan` is missing, it falls back to the current weekly behavior and sends an admin alert.

Do not pass `price` through query strings. A browser can change it. Passing the plan key is fine because the server treats it as an enum and calculates the actual amount.

## Prerequisites
- Keep the existing Express/EJS/HTMX flow.
- Baruakazi is the server that initiates ClickPesa and owns the ClickPesa `PaymentBin`.
- Do not depend on this repo's `model/PaymentBin.js` for ClickPesa plan correlation.
- Snippe has no fee deduction problem, so Snippe charges the customer-facing amount.
- ClickPesa uses reduced charge amounts because Mkeka Wa Leo bears fees.

## Sprint 1: Server Plan Map And Payment Correlation
**Goal**: Make selected plans trustworthy and available during webhook confirmation.
**Demo/Validation**:
- Starting payment with `?plan=day`, `?plan=week`, and `?plan=month` resolves the expected server amount.
- Webhook with the generated `order_id` grants the correct duration.

### Task 1.1: Add A Shared VIP Payment Plan Map
- **Location**: `utils/payments/common.js` or a new `utils/payments/plans.js`
- **Description**: Add a single server-side plan map with gateway-specific charge amounts:
  - `day`: display `5999`, ClickPesa charge `5419`, Snippe charge `5999`, grant key `one`, label `Siku 1`
  - `week`: display `12500`, ClickPesa charge `11580`, Snippe charge `12500`, grant key `auto_gold`, label `Siku 7`
  - `month`: display `35000`, ClickPesa charge `33850`, Snippe charge `35000`, grant key `gold2`, label `Mwezi 1`
- **Dependencies**: None
- **Acceptance Criteria**:
  - Exports `getVipPaymentPlan(planKey)` that returns `week` for missing/invalid input or returns `null` if callers need to reject invalid input explicitly.
  - Exports a list/object safe for rendering paywall tabs.
  - Amounts are integers in TZS, not formatted strings.
- **Validation**:
  - Run `node -c utils/payments/common.js` or the new plan file.

### Task 1.2: Let Gateway Helpers Accept Amount And Plan
- **Location**: `utils/payments/clickpesa.js`, `utils/payments/snippe.js`
- **Description**: Change `initializeClickPesaPayment` and `initializeSnippeGatewayPayment` to accept `amount` and `planKey` arguments instead of reading only `PRICE.gold`.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Admin/test user override to `1000` is preserved if desired.
  - Non-admin amount comes from the validated server plan and selected gateway.
  - ClickPesa receives the reduced charge amount.
  - Snippe receives the displayed/customer-facing amount.
  - ClickPesa payload to Baruakazi includes `plan: planKey`.
  - Snippe payload includes `metadata.plan = planKey`.
- **Validation**:
  - Run syntax checks for both files.

### Task 1.3: Update Baruakazi PaymentBin For Waleo Plan
- **Location**: `/home/shemdoe/Programming/Sites/baruakazi/models/PaymentBin.js`, `/home/shemdoe/Programming/Sites/baruakazi/routes/payment.js`
- **Description**: Add an optional `plan` field to Baruakazi `PaymentBin`, then store it only when `/payment/process/:server` receives `server === 'waleo'`.
- **Dependencies**: Tasks 1.1, 1.2
- **Acceptance Criteria**:
  - `plan` is optional so Baruakazi's own payments and other servers are not required to send it.
  - Only accepted Waleo values are `day`, `week`, and `month`; invalid or missing values become `week`.
  - `mtips` and `uhakika` request bodies remain compatible and do not need changes.
  - Baruakazi's own `/payment/process` flow remains untouched.
- **Validation**:
  - Run syntax checks in Baruakazi for `routes/payment.js` and `models/PaymentBin.js`.
  - Manually inspect that existing `PaymentBin.create` calls outside `/payment/process/:server` still satisfy the schema.

### Task 1.4: Forward Plan From Baruakazi To Waleo
- **Location**: `/home/shemdoe/Programming/Sites/baruakazi/routes/payment.js`, `/home/shemdoe/Programming/Sites/baruakazi/utils/mikekaTipsPayment.js`
- **Description**: When ClickPesa confirms a `WALEO...` order, pass `pymnt.plan` into `waLeoPaymentWebhook`. Update that helper to include `plan` in the payload sent to `https://mkekawaleo.com/api/payment-webhook`.
- **Dependencies**: Task 1.3
- **Acceptance Criteria**:
  - `mikekaTipsPaymentWebhook` and `yaUhakikaTipsPaymentWebhook` signatures and payloads are unchanged.
  - `waLeoPaymentWebhook` accepts an optional fifth `plan` argument.
  - Waleo payload contains `{ order_id, payment_status, email, phone, reference, plan }`.
  - If `pymnt.plan` is missing, Baruakazi sends `plan: 'week'` or omits it and lets Waleo default to week.
- **Validation**:
  - Inspect the Waleo branch only: `String(orderReference).startsWith('WALEO')`.
  - Confirm MTIPS and UHAKIKA forwarding code paths still call their helpers with the original arguments.

### Task 1.5: Grant Waleo Subscription From Webhook Plan
- **Location**: `routes/payment.js`
- **Description**: In the ClickPesa webhook, read `req.body.plan`, map it to a grant key, and call `grantSubscription(email, grantKey, phone)`. In the Snippe webhook, read `req.body.data.metadata.plan` and use the same map.
- **Dependencies**: Tasks 1.1, 1.2, 1.4
- **Acceptance Criteria**:
  - ClickPesa day grants `one`.
  - ClickPesa week grants `auto_gold`.
  - ClickPesa month grants `gold2`.
  - Snippe day grants `one`.
  - Snippe week grants `auto_gold` or a Snippe-specific equivalent only if you intentionally need separate analytics.
  - Snippe month grants `gold2`.
  - Missing or invalid webhook plan defaults to week and sends a Telegram/admin notification containing the `order_id`.
- **Validation**:
  - Use local webhook-shaped objects to verify grant key selection without calling external gateways.

## Sprint 2: HTMX Form And Paywall UI
**Goal**: Add the plan selection UI and carry only the plan key through HTMX.
**Demo/Validation**:
- The week tab is selected by default.
- Clicking each plan opens the same payment modal, but the modal reflects the selected plan.

### Task 2.1: Render Three Bootstrap Paywall Tabs
- **Location**: `views/8-vip-paid/partials/paywall-card.ejs`
- **Description**: Replace the single price block with Bootstrap tabs for `day`, `week`, and `month`. Keep the week tab active by default.
- **Dependencies**: Task 1.1 if rendering plans from data; otherwise hardcode UI labels while the server remains source of truth.
- **Acceptance Criteria**:
  - Each tab has its own plan card content, price, period, and CTA.
  - CTA uses `hx-get="/api/pay-form?plan=day|week|month"`.
  - All CTAs target `#paymentModalBody` and open `#globalPaymentModal`.
  - Existing `#paywall-card` anchor and global modal continue to work.
- **Validation**:
  - Manual page check at `/mkeka/vip` as an unpaid user.

### Task 2.2: Update Paywall Styles For Tabs
- **Location**: `views/8-vip-paid/partials/style.ejs`
- **Description**: Add scoped styles under `.vip-paywall-component` for compact Bootstrap tabs and plan cards without breaking the locked-content overlay.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - No text overlap on small screens.
  - Cards/tabs fit inside the existing `max-width: 600px` paywall.
  - The week/default plan is visually clear without relying only on color.
- **Validation**:
  - Check mobile-width and desktop-width rendering.

### Task 2.3: Pass Selected Plan Into The Payment Form
- **Location**: `routes/payment.js`, `views/zz-fragments/htmx-form.ejs`
- **Description**: `GET /api/pay-form` reads `req.query.plan`, validates it against the plan map, and renders the form with `paymentPlan`.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Form shows selected plan label and customer-facing price.
  - Form posts the plan key via `hx-post="/api/pay?plan=<key>"` or a hidden `<input name="plan" value="<key>">`.
  - Form never posts amount/price as a trusted field.
  - Invalid or missing plan defaults to week.
- **Validation**:
  - Request `/api/pay-form?plan=day`, `/api/pay-form?plan=week`, `/api/pay-form?plan=month`, and `/api/pay-form?plan=bad` while authenticated and verify rendered output.

### Task 2.4: Use Selected Plan In Payment Initiation
- **Location**: `routes/payment.js`
- **Description**: In `POST /api/pay`, read `req.query.plan || req.body.plan`, validate against the plan map, then pass gateway-specific amount and `planKey` to the selected gateway helper.
- **Dependencies**: Tasks 1.1, 1.2, 1.3
- **Acceptance Criteria**:
  - Tampered plan values cannot create arbitrary prices.
  - ClickPesa day/week/month sends `5419`, `11580`, and `33850`.
  - Snippe day/week/month sends `5999`, `12500`, and `35000`.
  - The Telegram initiation notification includes plan key, display amount, gateway amount, gateway, email, phone, and network.
  - `payment-initiated.ejs` can optionally show the selected plan and displayed price.
- **Validation**:
  - Simulate POST bodies with each plan and verify selected amount in the gateway payload path.

## Sprint 3: Subscription Metadata And Existing Plan Names
**Goal**: Keep subscription duration, analytics, and admin messages consistent with the new plans.
**Demo/Validation**:
- Manual/admin grants and webhook grants still produce clear subscription messages.

### Task 3.1: Align Grant Subscription Metadata
- **Location**: `routes/fns/grantVIP.js`
- **Description**: Confirm or update `SUBSCRIPTION_TYPES` for:
  - `one`: 1 day, Gold Plan, amount matching chosen accounting rule
  - `AUTO_GOLD`: 7 days, Gold Plan, amount matching chosen accounting rule
  - `SNIPPE_GOLD`: either keep for legacy/manual compatibility or stop using it for new webhooks if one unified week grant key is enough
  - `GOLD2`: 1 month, Gold Plan, amount matching chosen accounting rule
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Month still uses calendar-month extension logic.
  - Existing manual `/post/grant-vip` still accepts `one`, `auto_gold`, and `gold2`.
  - Notification text remains accurate in Swahili.
- **Validation**:
  - Render or log `grantSubscription` result for each grant key in a controlled environment.

### Task 3.2: Decide Revenue Amount Source
- **Location**: `routes/fns/grantVIP.js`, `utils/payments/plans.js`
- **Description**: Decide whether `affAnalyticsModel.vip_revenue` should count customer-facing price, provider charge amount, or old subscription amount.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - The chosen rule is documented in a short code comment or constant name.
  - Month analytics no longer accidentally uses the old `25000` if the intended value is `35000` or `33850`.
- **Validation**:
  - Inspect the `$inc` amount for each grant key.

## Testing Strategy
- Syntax check changed JS files with `node -c`.
- Render-check EJS fragments with `ejs.render` for each plan key.
- Route-level manual checks:
  - `/api/pay-form?plan=day`
  - `/api/pay-form?plan=week`
  - `/api/pay-form?plan=month`
  - `/api/pay-form?plan=invalid`
- Payment initiation checks:
  - ClickPesa day sends amount `5419`.
  - ClickPesa week sends amount `11580`.
  - ClickPesa month sends amount `33850`.
  - Snippe day sends amount `5999`.
  - Snippe week sends amount `12500`.
  - Snippe month sends amount `35000`.
  - Admin/test override still sends `1000` if preserved.
- Webhook checks:
  - Baruakazi `PaymentBin` stores `plan` for Waleo ClickPesa orders.
  - Baruakazi forwards ClickPesa Waleo webhook with `plan`.
  - Waleo ClickPesa webhook with day/week/month grants `one`/`auto_gold`/`gold2`.
  - Waleo Snippe webhook with day/week/month grants the same.
  - Missing webhook plan falls back to weekly and sends an alert.

## Potential Risks & Gotchas
- **Query-string price tampering**: Avoid by never trusting a posted/query `price`.
- **Webhook does not include plan**: For ClickPesa, solve in Baruakazi by storing `PaymentBin.plan` and forwarding it to Waleo. For Snippe, include `metadata.plan`.
- **Snippe email uses user id**: Snippe webhook currently reconstructs real user email from `${user._id}@tanzabyte.com`; keep that behavior, but get plan from `data.metadata.plan`.
- **Baruakazi shared routes**: `/payment/process/:server` supports `mtips`, `uhakika`, and `waleo`. Make the `plan` field optional and Waleo-scoped.
- **Gateway amount difference**: ClickPesa receives reduced fee-bearing amounts; Snippe receives customer-facing amounts.
- **Snippe forwarding**: Baruakazi's Snippe route currently forwards the raw Snippe webhook. Ensure Snippe metadata contains `plan`; Baruakazi does not need to parse or mutate it.
- **Manual grants**: Existing admin/manual grant route uses grant keys, not plan keys. Do not rename those keys unless all callers are updated.

## Rollback Plan
- Revert paywall tabs to the previous single CTA.
- Keep `/api/pay-form` defaulting to week so old links continue to work.
- If webhook plan parsing causes issues, temporarily force `grantSubscription(email, 'auto_gold', phone)` while keeping Baruakazi `PaymentBin.plan` data for investigation.
