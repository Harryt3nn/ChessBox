# {{Project}}: decisions (why it's built this way)

The record of design choices, the features added and dropped, and the reasons. Read it when writing the README or a write-up, or when explaining the project. **Claude keeps it current without being asked** (CLAUDE.md §4).

**Rules:** facts only. A number appears only if it was measured or comes from a named source; otherwise `TBD (measure in <where>)`. **Status** is `Planned` · `Built` · `Verified` (measured, numbers filled in) · `Dropped` (kept, with the reason). Never delete an entry.

**Entry format**
```
### D<n> · <area> · <short title>: Status: <Planned|Built|Verified|Dropped> · Updated: <YYYY-MM-DD HH:MM>
- **Decision:** what was chosen (by whom, if not the builder).
- **Why:** the reasoning, tied to a goal or a measured fact.
- **Alternatives rejected:** what else, and why not.
- **Trade-off / risk:** what it costs, and the fallback.
- **Revisit if:** the condition that would change this.
- **Evidence:** numbers and source, or `TBD (...)`.
- **One-liner:** one sentence someone else could repeat.
```

---
