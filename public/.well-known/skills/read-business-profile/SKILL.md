---
name: read-business-profile
description: Read the full public profile of a business listed in "اكتشف مدينتك".
---

# Read a business profile

## Steps

1. Get the business handle (username) or id — usually from a search result or a
   `durtown.com/<username>` link.
2. Call the MCP tool `get_business` with `{ handle }`, or fetch
   `GET /<username>.md` (Markdown content negotiation).
3. Summarise: description, category, city/governorate, address, phone, WhatsApp,
   website, products/services, and coordinates when available.

## Notes

- Contacting the business happens through the phone/WhatsApp/contact form on the
  page — the directory does not process orders or payments.
