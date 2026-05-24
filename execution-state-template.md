# Execution State Template

```md
---
project: <project-id>
level: <level-id>
current_zone: <zone-id-or-none>
current_capability: <capability-id-or-none>
current_task: <task-id-or-none>
phase: active | paused | blocked | done
last_updated_at: <ISO-8601>
---

## Progress Tree

- [ ] zone-01-<slug>
  - [ ] capability-01-<slug>
    - [ ] task-01-<slug>
    - current(active): task-02-<slug>
- [ ] zone-02-<slug>
  - [ ] capability-01-<slug>

## Current Situation

- <当前真实情况>
- <当前阻塞或状态说明>

## Capability Status

- Evidence:
  - <ready | partial | missing>
- Stability:
  - <stable | unstable | unknown>
- Self Acceptance:
  - <confirmed | pending | rejected>

## Current Session Plan

- <本次 30-90 分钟即时动作 1>
- <本次 30-90 分钟即时动作 2>
- <本次 30-90 分钟即时动作 3>

## Next Action

- <下次恢复时的唯一下一步>

## Practice Feedback

- Observed Problem:
  - <实践中暴露的问题>
  - Spec Impact: <instance | template | model | unknown>
  - Proposed Fix: <建议修正>
  - Status: <open | evaluating | fixed | rejected>

## Notes

- <补充说明>
```
