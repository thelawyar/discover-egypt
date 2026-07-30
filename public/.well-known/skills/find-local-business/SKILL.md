---
name: find-local-business
description: Search the "اكتشف مدينتك" Egyptian city business directory by keyword, category, or city.
---

# Find a local business

Use this skill to find businesses (clinics, shops, kiosks, factories, schools,
services) in Egyptian cities.

## Steps

1. Ask the user for the search term, and optionally the city or category.
2. Call the MCP tool `search_businesses` with `{ query, city, category, limit }`,
   or fetch `GET /api/public/md?path=/search?q=<term>&city=<city-slug>` for a
   Markdown result list.
3. Present the top results with: name, category, city, phone, and profile link
   (`https://durtown.com/<username>`).

## Notes

- Only approved businesses are public.
- Slugs for cities and categories come from `list_taxonomy` or `/llms.txt`.
- Answer in Arabic when the user writes in Arabic.
