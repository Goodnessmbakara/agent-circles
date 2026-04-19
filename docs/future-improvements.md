# Future improvements

Backlog of non-blocking enhancements we intend to make later. Not committed dates; use for planning and handoffs.

## Planned

1. **Switch pool discovery and reads to indexers** — Today the app keeps a small file-backed registry of contract IDs (`data/registry.json`) and loads live state via Soroban RPC. Moving to a Stellar indexer (or CDP-style pipeline) would improve discovery (e.g. factory / deployment events), scale read paths as the pool list grows, and reduce per-pool RPC load. Off-chain metadata (display names, etc.) may still live in a thin store or separate service.

2. **Add items here** — e.g. caching layer, richer analytics, mobile, etc.

---

*Add new items as numbered entries; keep each line a short title plus optional sub-bullets for rationale or links.*
