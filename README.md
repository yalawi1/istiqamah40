# Istiqamah

A fixed-window discipline challenge for two people (round two: Nov 20 to Dec 31, 2026, 42 days). Every daily item must be checked before the next Fajr or the day is a miss: the streak resets and $20 goes into the pool. Each week needs one fast and allows one rest day that excuses music, the workout, and the sugar rule. Fewest misses at the end wins.

The round's dates live in the settings row (`startDate`, `endDate`). Check-ins are stored per date, so earlier rounds stay in the table and reappear if the dates are moved back.

- **Site:** `index.html`, hosted on GitHub Pages at https://yalawi1.github.io/istiqamah40/ (open it with the `?k=` link key; the key is remembered by the browser after the first visit).
- **Data:** Supabase project `dogwqotaagjmytffitlj`, tables `istiqamah_settings`, `istiqamah_checkins` and `istiqamah_comments` (RLS on, no anon policies).
- **API:** Supabase Edge Function `istiqamah40` (`api/index.ts`). The deployed copy has the link key inlined; this file has it redacted because the repo is public.

To change the checklist, edit the `ITEMS` array in `index.html` and push to `main`. Pages redeploys in about a minute.
