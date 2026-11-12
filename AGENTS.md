<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store variants keep `price` as the final charge and nullable `original_price` as the comparison price; shared helpers validate discounts so legacy prices and checkout remain consistent.
- Store editor mutations invalidate the business-scoped public store query so returning to a business page shows saved changes.
- Guest store SELECT policies use only the public visibility helper; keep management helper calls in authenticated policies to avoid denied function execution for guests.
- Product search reads through the public client with normalized indexed product text and business location filters; reuse its results for autocomplete so unpublished stores stay hidden.
- Product search links use #product-<id> on the existing business page; the store opens that product after its public data loads, preserving guest checkout.
- Product size multiselections expand into individual variants using a shared helper; retain each existing identifier once so checkout and per-size stock remain compatible.
