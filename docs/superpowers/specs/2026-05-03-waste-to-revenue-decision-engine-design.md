# Waste-to-Revenue Decision Engine Design

Date: 2026-05-03
Product Area: Wastage Prevention
Primary User: Store manager
Scope: Production-ready enhancement of the existing Wastage Prevention flow for same-day action on at-risk stock

## 1. Goal

Transform the current Wastage Prevention page into a store-manager decision surface that helps staff identify at-risk stock for today, understand the best next action, and execute that action quickly with an auditable trail.

The page should answer:

- What items need action right now?
- Which item should be handled first?
- What action should the manager take?
- How much stock and revenue can still be recovered?
- What actions were already taken today?

## 2. Product Direction

The feature will use an action-queue-first layout rather than a dashboard-first or workflow-first design.

This means the page is optimized for fast daily intervention:

- A compact command summary appears at the top
- The main surface is a prioritized queue of at-risk items
- Each item includes one clear recommended next action
- Managers can apply an action with explicit confirmation
- Recent action history remains visible for operational traceability

The page is not designed as a deep analyst workspace in this phase. Reporting remains secondary to action-taking.

## 3. In-Scope Experience

### 3.1 Command Summary

The top section should present a concise operational summary for the current store and current day:

- Items needing action today
- Estimated value at risk
- Estimated recoverable revenue
- Actions completed today

These metrics should help a manager assess store urgency in a few seconds without leaving the queue.

### 3.2 Prioritized Action Queue

The core UI is a ranked list of today’s at-risk items. Each row should communicate:

- Product identity
- Risk level
- Why the item is at risk
- Recommended next action
- Expected units saved
- Expected revenue recovered
- One-click path to apply the action

The queue order should prioritize items by urgency and recovery opportunity, not just by expiry date alone.

### 3.3 Recent Action History

A secondary panel or section should show actions already taken today and recent past actions. This gives the manager confidence that the page is live and prevents duplicate action-taking.

Each history record should display:

- Product
- Action type
- Time applied
- Discount or execution detail
- Expected recovery at time of action
- Execution status

## 4. Decision Logic

### 4.1 Backend-Owned Recommendation

The recommended action for each item must be generated in the backend. The frontend should render the recommendation, but should not contain business decision logic beyond display formatting and UX state.

This keeps production behavior consistent, testable, and reusable.

### 4.2 Inputs Used for Recommendation

Each recommendation should combine the following operational signals:

- Days to expiry
- Remaining live stock
- Today’s sell-through or same-day demand proxy
- Margin or cost-to-price relationship
- Estimated recoverable revenue

Where live same-day sales are available, the system should reduce stale snapshot stock using today’s sold units before calculating urgency.

### 4.3 Recommended Action Types

The initial production action taxonomy should remain intentionally simple:

- Promote now
- Bundle or spotlight
- Donate or clear
- Monitor

Decision intent:

- `Promote now` when discounting is still expected to recover revenue while preserving acceptable margin
- `Bundle or spotlight` when urgency is moderate and the item can still move with softer intervention
- `Donate or clear` when expiry is too close and commercial recovery is unlikely
- `Monitor` only when the item is risky but not yet strong enough for action

### 4.4 Required Recommendation Output

Each recommended queue item should return structured fields for:

- Risk level
- Risk reason
- Recommended action
- Recommended discount or execution detail when relevant
- Expected units saved
- Expected revenue recovered
- Action priority score
- Action readiness flag
- Missing-data reason when execution should be blocked

## 5. Execution Model

### 5.1 Apply Flow

Applying an action must feel immediate, but remain controlled.

Execution flow:

1. Manager reviews the recommended action
2. Manager confirms the action manually
3. Backend records the action and returns the saved record
4. UI updates queue state and action history

The first production version should avoid fully automatic execution. The manager remains the human approval step.

### 5.2 Auditability

Each applied action should persist:

- Store ID
- Product or SKU
- Product snapshot details used at execution time
- Action type
- Discount percent or execution parameters
- Expected units saved
- Expected revenue recovered
- Timestamp
- Source of recommendation
- Execution status

This ensures the system supports later reconciliation and manager accountability.

### 5.3 Safe Degradation

Execution should be disabled when required business inputs are missing, especially pricing or cost data needed to justify a promotion decision.

If smart recommendation logic or model-backed pricing logic is unavailable:

- The queue should still load
- A rule-based fallback recommendation may be shown where safe
- The UI should clearly explain the fallback state
- Unsupported actions should remain blocked rather than silently guessed

## 6. Data and API Changes

### 6.1 Dashboard Response

The existing wastage dashboard endpoint should be upgraded to support the action-queue-first experience. It should return:

- Summary KPIs for the page header
- Ranked risk items with recommendation payloads
- Recent action history
- Optional chart-ready aggregates only if already cheap to compute

The API should avoid forcing the frontend to assemble cross-source logic from multiple calls for the primary queue.

### 6.2 Action Recording

The existing action endpoint should be enhanced to save enough information for:

- Audit history
- Immediate UI refresh
- Future reporting

The endpoint should validate:

- Product identity
- Store identity
- Allowed action types
- Required execution fields by action type
- Missing-data safety conditions

### 6.3 Recommendation Consistency

If smart discount analysis exists separately, it should feed or align with the same recommendation output contract used by the queue so the manager sees one consistent answer per item.

## 7. Frontend Changes

The frontend implementation should refactor the current page toward a clearer production layout:

- Preserve the current route and existing integration points where possible
- Simplify the visual hierarchy around the action queue
- Reduce decorative content that competes with operational decisions
- Surface clearer states for loading, fallback, blocked action, apply success, and apply failure

Primary UI blocks:

- Header summary
- Action queue
- Confirm-and-apply interaction
- Recent actions panel

The page should remain responsive and usable on common laptop widths used in stores.

## 8. Backend Changes

The backend should:

- Centralize action recommendation logic in the wastage route or a dedicated service
- Return ranked queue items from the main dashboard endpoint
- Strengthen validation for action application
- Persist richer action metadata for audit history

If the current route file grows too large, the recommendation and serialization logic should be split into service helpers so the rules remain maintainable.

## 9. Testing Strategy

The implementation should be developed with test-first coverage around the new decision behavior.

Minimum backend coverage:

- Recommendation action selection by expiry and stock conditions
- Priority ordering for queue items
- Safe fallback behavior when data is missing
- Validation failures for unsafe action execution
- Action recording response shape

Minimum frontend coverage:

- Summary rendering from dashboard payload
- Queue rendering with recommended action details
- Disabled apply state for blocked items
- Successful action application updating UI state
- Error handling and fallback messaging

## 10. Production Boundaries for Phase 1

To keep the first production-ready release focused, this implementation will include:

- Single-store flow
- Today-focused action queue
- Manual manager confirmation before apply
- Recent action history

It will explicitly avoid:

- Full background automation
- Multi-store control center workflows
- Long-horizon forecasting or analyst-heavy trends as primary page content
- Complex approval chains

## 11. Success Criteria

This enhancement is successful when a store manager can open the page and, within a few seconds:

- See what stock needs immediate intervention
- Understand the most valuable next action
- Apply that action safely
- Confirm that the action was recorded

From a system perspective, success also means:

- Decision logic is backend-owned and testable
- Actions are auditable
- Fallback behavior is explicit
- The experience is robust enough for production use without relying on hidden manual interpretation
