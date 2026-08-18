# Position compensation change payloads

Fine-tuned `Request_Compensation_Change` requests for updating **position** compensation in Workday.

The original WSDL sample includes every optional plan type, subprocess, and placeholder. Submitting that as-is fails validation (mutual-choice conflicts and empty `?` IDs). These payloads keep only what is needed to change base pay on a position.

## Files

| File | Use when |
| --- | --- |
| `request-compensation-change-position.xml` | Set a new absolute base amount |
| `request-compensation-change-position-percent.xml` | Apply a percent change to base pay |

## What was removed (and why)

- **Unused plan blocks** — allowance, bonus, merit, commission, stock, unit, period, calculated
- **Personnel Action / budget subprocesses** — not required for a standard compensation change
- **Attachments and comment worker refs** — optional noise
- **Conflicting choices** — date *and* next-pay-period; Amount *and* Percent_Change *and* Amount_Change; primary basis amount *and* percent

## Required fields

| Element | Notes |
| --- | --- |
| `Employee_Reference` | Prefer `Employee_ID` (or `WID`) |
| `Position_Reference` | Prefer `Position_ID`; required when the worker has multiple jobs |
| `Compensation_Change_Date` **or** `Compensation_Change_On_Next_Pay_Period` | Exactly one |
| `Reason_Reference` | Tenant compensation-change reason (`General_Event_Subcategory_ID` or `WID`) |
| `Pay_Plan_Sub_Data` | Plan ref + exactly one of `Amount` / `Percent_Change` / `Amount_Change` |

## Optional but recommended

- `Currency_Reference` / `Frequency_Reference` when the plan does not default them
- `Pay_Plan_Data/@Replace="false"` to update the matching plan instead of wiping assignments
- `Business_Process_Parameters/Comment_Data` for audit trail
- `Run_Now=true` to start the BP immediately; keep `Auto_Complete=false` unless you intentionally bypass approvals

## Example filled values

```xml
<bsvc:ID bsvc:type="Employee_ID">21001</bsvc:ID>
<bsvc:ID bsvc:type="Position_ID">P-00012</bsvc:ID>
<bsvc:Compensation_Change_Date>2026-09-01</bsvc:Compensation_Change_Date>
<bsvc:ID bsvc:type="General_Event_Subcategory_ID">Request_Compensation_Change_Market_Adjustment</bsvc:ID>
<bsvc:ID bsvc:type="Compensation_Plan_ID">Salary_Plan</bsvc:ID>
<bsvc:Amount>95000</bsvc:Amount>
<bsvc:ID bsvc:type="Currency_ID">USD</bsvc:ID>
<bsvc:ID bsvc:type="Frequency_ID">Annual</bsvc:ID>
```

Reason and plan reference IDs are tenant-specific — look them up with `Get_References` / Integration IDs in your Workday tenant before go-live.
