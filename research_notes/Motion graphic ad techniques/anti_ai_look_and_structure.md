# Avoiding the "AI-generated / templated" look, and structuring a 45–60s product ad (TillText)

Research date: 2026-11-26. Note on method: direct WebFetch was blocked by the session network for most hosts (ads.tiktok.com, news.gallup.com, creativeboom.com, cmswire.com), so primary pages were read via the Firecrawl scraper instead. Items marked "secondhand" were seen only in search-result summaries or third-party guides, not on the primary page.

---

## 1. What visual and audio cues make ads feel AI-generated, templated or soulless (2025–2026)?

### Takeaway
Audiences now see AI-looking ads all the time and mostly dislike them. 79% of US adults saw one in the past 30 days, and 49% view AI-made ads negatively. Synthetic people and voices are the least accepted use. Creatives say the 2026 "tell" is less about broken fingers and more about frictionless polish, sameness and a lack of specificity. The concrete tells are purple-blue gradients, glass and bubbles, four-point "AI sparkle" stars, symmetrical centered layouts, cinematic haze and glow, identical fade-ins on every element, robotic or cloned voiceover, and headlines that could belong to anyone.

### Cited Findings
**Audience data**
- Bentley University–Gallup survey (fielded May 4–11, 2026; n=3,270 US adults; published Aug 19, 2026): 79% saw ads in the past 30 days that "looked like they were made using AI". 49% view businesses' use of AI to create ads negatively, 19% positively and 32% are neutral. Negativity is highest among 18–29-year-olds (66%). — [Gallup](https://news.gallup.com/poll/713222/americans-aren-sold-businesses-using-ai-advertising.aspx)
- Same survey: 62% say using AI to create *people or voices* in ads is unacceptable even when clearly disclosed (73% among 18–29s). Using AI to brainstorm or draft ads with disclosure is acceptable to 75% (secondhand figure for the 75%). — [Gallup](https://news.gallup.com/poll/713222/americans-aren-sold-businesses-using-ai-advertising.aspx); 75% figure via [search summary of the same Gallup release](https://news.gallup.com/poll/713222/americans-sold-businesses-sold-ai-advertising.aspx)
- The Harris Poll, as cited by CMSWire (Nov 2026): 78% of consumers globally say AI makes ads "feel less authentic", and 73% are "less likely to trust an ad" when they merely *suspect* AI was used. CMSWire's point is that brands that never used AI can still pay this penalty if their work *looks* AI-made. — [CMSWire](https://www.cmswire.com/digital-marketing/synthetic-content-has-a-trust-crisis-your-brand-could-catch-it/)
- Human Clarity Institute (2025, via CMSWire): 86% of adults say AI media makes them less certain what is real, and 48% sometimes avoid content because they do not know what to believe. — [CMSWire](https://www.cmswire.com/digital-marketing/synthetic-content-has-a-trust-crisis-your-brand-could-catch-it/)
- Attest data via eMarketer: 46% of consumers were "not OK" with AI in ads in 2025, down slightly from 49% in 2024 (secondhand). — [eMarketer](https://www.emarketer.com/content/consumers-demanding-ai-disclosures-ads-transparency-remains-challenge)
- Detection is poor. In a Magic Hour test, 85% were at least slightly confident they could spot AI ads, but only 1.4% classified all four images correctly. This is vendor data, so treat it with caution. The implication is that *perceived* AI-ness, not actual detection, drives the trust penalty. — [Magic Hour](https://magichour.ai/blog/ai-generated-ads-survey)

**Creative-community commentary on visual tells**
- Creative Boom reader survey, "10 trends creatives are so over in 2026" (Apr 21, 2026). The list: (1) AI slop, "polished with AI and templates but lack any sense of intention or perspective" and "this overused yellow hue"; (2) AI caricatures and portraits; (3) glassmorphism and liquid glass ("glass everything", "holo and bubbles"); (4) gradients ("Four-pointed star for AI logos and gradients for everything. Give it a rest."); (5) lazy minimalism ("minimalism without soul"); (6) lazy maximalism; (7) Canva and template culture ("safe, inoffensive, templated designs… I can tell you just used Shopify and Canva"; "flesh/beige Canva stuff"); (8) Y2K nostalgia; (9) bento grids; (10) "motion for motion's sake". — [Creative Boom](https://www.creativeboom.com/insight/10-trends-creatives-are-so-over-in-2026/)
- Creativepool, "How to avoid making creative work that looks like AI" (Benjamin Hiorns, Sep 14, 2026). The lasting tells are now *conceptual*, not anatomical: "frictionless polish", "glowing skin, the symmetrical composition, the elaborate cinematic lighting… peculiarly enthusiastic amount of atmospheric haze", "tiny decorative details that don't quite add up to an actual idea", work that "looks expensive without necessarily looking distinctive" and "the most statistically persuasive answer… rather than the most interesting one". The core diagnosis is "the absence of specificity". He also warns: "You can put film grain over a cliché. It remains a cliché." — [Creativepool](https://creativepool.com/bhiorns/articles/how-to-avoid-making-creative-work-that-looks-like-ai.35166)
- UI designer Kosta Canatselis, "Spot the Slop" (Jul 23, 2026), says he spots slop "in about three seconds". The tells: Inter or other "typography with no opinion", a purple-to-blue gradient hero, the same corner radius everywhere ("uniform everything"), headlines that could belong to anyone, and "motion that's absent or identical". — [world.hey.com/kostac](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)
- A practitioner guide (secondhand, search summary) names the default AI motion as "a fade-up with staggered timing" on everything, and recommends one or two deliberately chosen motion patterns with proper easing. — [Anti AI slop ban list (GitHub wiki)](https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list.md)
- Artlist (Dec 18, 2025; updated Mar 2026) lists these video-specific slop cues: saturated colors, uncanny or warped faces, odd textures, "dull stock clips or AI visuals that don't fit the story", made-up facts, and **"robotic voiceovers, cloned voices"**. — [Artlist](https://artlist.io/blog/what-is-ai-slop-and-why-it-matters-for-video-creators/)
- Creative Bloq reports designers on Instagram and YouTube publicly "fixing" AI-made small-business flyers, and calling out their cheap generic look as something that may put customers off (secondhand). — [Creative Bloq](https://creativebloq.com/design/graphic-design/graphic-designers-are-trying-to-fix-peoples-terrible-ai-flyers)

**Case study: Coca-Cola's AI holiday ads (2024 and 2025)**
- The 2024 "Holidays Are Coming" AI remake was called "soulless", "devoid of any actual creativity" and "less festive, more creepy". Critics said AI "sucked the warmth" out of it, and commenters suspected it was made to cut costs, which hurt perceived authenticity. — [AdWeek](https://www.adweek.com/creativity/how-coca-colas-ai-holiday-ad-went-from-praise-to-rage/); [HuffPost UK](https://huffingtonpost.co.uk/amp/entry/coca-cola-holidays-are-coming-christmas-ad-ai_uk_673b29d7e4b0142f9b11ac61)
- The 2025 follow-up had better craft ("fewer uncanny humans"). It still drew backlash and some boycott calls. Coca-Cola's head of generative AI said, "Last year people criticized the craftsmanship. But this year the craftsmanship is ten times better." The lesson is that polish does not fix the problem. — [TechRadar](https://www.techradar.com/ai-platforms-assistants/coca-cola-faces-backlash-again-for-missing-the-spirit-of-the-holidays-with-another-ai-slop-ad); [VnExpress](https://e.vnexpress.net/news/tech/enterprises/coca-cola-slammed-again-for-soulless-ai-generated-christmas-ad-4960752.html)

### Inferences
- For TillText the risk is doubled, because the product *is* AI. If the ad also looks AI-made (glowing AI orb, sparkle-star icon, purple gradient, robotic TTS), it confirms the fear that the bot will be generic or untrustworthy. The ad should look human-made and show the AI doing narrow, concrete, verifiable work.
- **Editor's "AI-look" removal checklist** (synthesized from the sources above):
  - Visual
    - Purple/blue/teal mesh gradients, floating blurred blobs, glass cards with blur, holographic sheen.
    - The four-point sparkle star or a glowing orb used to mean "AI".
    - Everything dead-center and symmetrical, with every card the same size and radius.
    - Atmospheric haze, lens glow, bloom and drop shadows on everything.
    - A yellow/amber "trend" grade.
    - Generic stock emoji (🚀✨🔥) as decoration.
    - Generic stock people (smiling barista with laptop), AI-rendered humans or shops.
    - A fake or invented UI that doesn't match the real product.
    - Default fonts (Inter/Poppins/Montserrat) with no typographic hierarchy.
    - Bento-grid feature montages.
  - Motion
    - The same fade-up plus stagger on every element.
    - The same ease (easeInOut) and the same duration on every move.
    - Constant gentle float or parallax.
    - Every transition the same whoosh-slide.
    - Motion with no meaning ("motion for motion's sake").
  - Audio
    - Robotic or cloned TTS voice with flat, even pacing.
    - A generic uplifting corporate ukulele or "inspiring" stock track.
    - Swoosh SFX on every cut.
    - No real-world sound (no kitchen, shop or phone sounds).
  - Copy
    - "Revolutionize", "seamless", "unlock", "elevate", "game-changer", "powered by AI".
    - Headlines that any SaaS could use.
    - Unverifiable superlatives.

### Gaps
- I found no peer-reviewed or platform study isolating *specific motion-graphics* cues (easing uniformity, centering) as drivers of perceived AI-ness. Those items are practitioner opinion.
- I found no survey data specifically on TTS voice detection in ads beyond Gallup's "AI people or voices" acceptability figure.
- Reddit/Twitter threads were not retrieved because of tool limits and blocked hosts.

---

## 2. What do professionals do to add "human craft"?

### Takeaway
The consensus is that surface roughness (grain, wonky type) does not fix a generic idea. What works is **specificity and real material**: real people, real products and UI, real places and customer language. Add deliberate hierarchy instead of uniformity, motion only where it carries meaning, a distinctive type and color system, humor or story, and a human voice. Platforms (Google, TikTok) independently recommend featuring people and showing real product use.

### Cited Findings
- **Have the idea before the image. Feed in real material.** "Feed the creative process actual brand history, product details, customer language… local references, real photography." A human photographer shoots "*that* café, at 7:43 on a wet Tuesday morning, with condensation on the windows and a handwritten sign… because the card reader has broken again." "Specificity creates texture." — [Creativepool](https://creativepool.com/bhiorns/articles/how-to-avoid-making-creative-work-that-looks-like-ai.35166)
- **Put friction back in and make the edit matter more than the generation.** Restrict the palette, work in black and white first, force an awkward constraint, combine references that shouldn't belong together, move between analogue and digital. "Generate, reject, crop, composite, redraw, rephotograph… Use AI for background elements but photograph the hero object." The work needs "fingerprints": humor, restraint, awkwardness, recurring obsessions. — [Creativepool](https://creativepool.com/bhiorns/articles/how-to-avoid-making-creative-work-that-looks-like-ai.35166)
- **Caveat on fake imperfection.** "A hand-drawn line isn't inherently more human than a generated one. Grain isn't authenticity." — [Creativepool](https://creativepool.com/bhiorns/articles/how-to-avoid-making-creative-work-that-looks-like-ai.35166)
- **Concrete design fixes.** Change the font first ("single highest-leverage move against slop"). Use color *semantically*, not decoratively (a color means action, warning or success). Rewrite every line so "our founder would actually say this out loud". Break uniformity on purpose by making the primary thing "bigger, closer, heavier" and letting secondary things recede. Delete anything that moves purely for decoration. — [Kosta Canatselis](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)
- **Build a style bible.** Artlist recommends a creative framework covering palette and grade, framing and composition, "motion pacing and transitions", and voice tone and sound-design notes. It also recommends blending AI with "real footage, textures, or sound" and hiring voice talent or licensed voices instead of cloned ones. — [Artlist](https://artlist.io/blog/what-is-ai-slop-and-why-it-matters-for-video-creators/)
- **Google ABCD, "Connection".** "Humanize the story: Feature people… Lean into emotional levers… humor, surprise, and intrigue." For Shorts: "show talent using the product… Give real people a real stage to share their own POV… Fine tune for a more fun tone." — [Google Ads Help](https://support.google.com/google-ads/answer/14783551)
- **TikTok.** "Feature people such as creators, employees, or customers", and lean into trends, memes or challenges (page updated June 2025). — [TikTok Ads Help](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)
- **Provenance as a signal.** Creativepool notes the rise of "Made by Humans" as a marketing signal: "The attraction isn't necessarily purity. It's provenance… whether the person in it exists." — [Creativepool](https://creativepool.com/bhiorns/articles/how-to-avoid-making-creative-work-that-looks-like-ai.35166)

### Inferences
**Human-craft toolkit for the TillText ad** (applied from the findings above):
1. **Real UI, not mock UI.** Use actual WhatsApp chat screens: green bubbles, ticks, voice-note waveform, a typed-with-typos customer message. Show the actual TillText dashboard with real-looking order rows (item, qty, the shop's price, time). Crop tight and zoom with purpose rather than floating the whole phone in space.
2. **Specific, local detail.** Name a fictional but specific shop ("Mama Ade's Kitchen, Surulere", "Patel Pharmacy"). Use real menu items and prices in the local currency. Show a customer message in Hinglish, Pidgin or Spanish, and a 0:07 voice note. Put timestamps on messages (e.g. 9:47 pm) to dramatize after-hours orders.
3. **People.** Film real shop owners or staff (phone footage is fine) at the counter, a hand holding the phone, a delivery bag going out. Gallup data says do NOT use AI-generated people or voices.
4. **Hierarchy and rhythm.** One hero element per frame. Use off-center compositions on a grid and vary scale. Mix hard cuts, a few snappy overshoot moves and a held still moment. Give each motion a meaning: a message pops in like WhatsApp, an order "slides" into the dashboard column, and the price *locks* with a stamp-like hit to show it isn't invented.
5. **Brand system.** Use one distinctive typeface pairing, a two- or three-color palette with semantic roles (e.g. WhatsApp green = customer, brand color = TillText, neutral = dashboard), and one recurring graphic device such as a receipt-paper edge, a till-roll strip or a handwritten price tag. Avoid gradients, glass and sparkle icons.
6. **Hand-made accents in moderation.** A marker circle around the price, a hand-drawn arrow to "same number", a scribbled crossed-out "$??" with "price from your menu". Use these only where they make a point.
7. **Audio.** Use a human VO, or a carefully directed licensed voice with natural pauses. Add real foley: WhatsApp notification ping, kitchen sizzle, shop bell, receipt printer. Choose a music bed with character (local percussion or a lo-fi groove), not generic corporate uplift.
8. **Humor or tension.** A relatable beat: the owner juggling a frying pan and three pinging phones, or a customer asking "how much is jollof?" for the fifth time tonight.

### Gaps
- I found no quantitative A/B data comparing "hand-drawn accents" vs clean motion graphics for SaaS ads. The recommendation rests on practitioner consensus.
- It was not verified whether showing WhatsApp's interface in ads has brand-usage restrictions (Meta brand guidelines). The editor should check WhatsApp brand resources before using its logo or UI prominently.

---

## 3. Best-practice structure for a 45–60s ad; platform guidance (hook, sections, captions, sound, safe zones, length)

### Takeaway
All three platforms agree on these points:
- Hook and value proposition in the first 2–3 seconds.
- Brand or product shown early and often, with sound used and a VO mention of the brand.
- Real people.
- On-screen text and captions inside safe zones.
- A clear CTA said aloud and shown on screen.

No platform gives an official "ideal length". Engagement rate falls as length grows, so a 45–60s ad must earn every beat. Plan cutdowns (6s, 15s, 30s) as well.

### Cited Findings
**TikTok (official, updated June 2025)**
- "Introduce your content proposition in the first 3 seconds", and prioritize the hook within the first 6 seconds. 9:16, at least 720p. Keep content inside the UI safe zone. Use sound or music. Use captions or text overlays (the page cites "5–10 words per second when using text"). Feature people: creators, employees, customers. End with a strong CTA. Run 3–5 creatives per ad group. No length recommendation is given. — [TikTok Ads Help](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)
- TikTok's SMB Creative Playbook widens the hook window to 3–6 seconds (secondhand; the PDF could not be retrieved). A Creative Center research note says ideal length is "less definitive" but the first two seconds are crucial (secondhand). — [TikTok SMB Creative Playbook](https://ads.tiktok.com/business/library/SMB_Creative_Playbook.pdf)
- Third-party blogs suggest 15–30s for conversion ads. These are unsupported rules of thumb, not TikTok data. — [Stackmatix](https://www.stackmatix.com/blog/tiktok-ad-creative-best-practices-2026)

**Meta / Instagram Reels (official developer blog, Nov 2024 — older than 2025, flag)**
- 9:16 vertical. Put key messages inside the Reels safe zone, where you "invite your audience in with a 'hook' or land your CTA". "Over 75% of Reels views on Instagram are sound on." Include VO, music, ASMR or SFX. Campaigns that use Reels ads see 14% higher average and 24% higher median brand lift than business-as-usual campaigns. Following the Reels creative essentials gives 2x higher delivery to the Reels placement. 61% say Reels ads led them to further consider a brand. — [Meta for Developers](https://developers.facebook.com/blog/post/2024/11/07/unlock-the-power-of-reel-ads/)
- Safe-zone margins: **14% top, 35% bottom, 6% sides**, attributed to Meta's Ads Guide (secondhand). Conservative teams treat the full bottom 35% (≈896px of 1920) as a danger zone because caption length shifts the UI. Ads Manager has a "Safe zone guardrail" overlay. Meta specs call sound "strongly recommended" and captions "recommended", and Ads Manager can auto-generate captions. — [Billo](https://billo.app/blog/meta-ads-safe-zones); [Madgicx](https://madgicx.com/answers/meta-ad-creative-safe-zone); [Jon Loomer](https://www.jonloomer.com/tiktok-instagram-reels-safe-zones-templates/)

**YouTube / Google ABCD (official Google Ads Help)**
- ABCD-aligned ads give up to a 30% lift in short-term sales likelihood and a 17% lift in long-term brand contribution (Google/Kantar, Apr 2021, an older source; Google says the data is correlational). — [Google Ads Help](https://support.google.com/google-ads/answer/14783551)
- Attention: "Jump in… engaging pacing and tight framing", support with audio and supers, "avoid competing elements", bright high-contrast visuals.
- Branding: "Introduce your brand or product from the start and maintain that presence". Audio brand mentions boost on-screen brand visuals.
- Connection: feature people, "keep messaging… focused and simple", humor, surprise, intrigue.
- Direction: a specific CTA reinforced by VO.
- Shorts: "announce yourself with audio", "be unavoidable", tight framing, show talent using the product, real POV, fun tone.
- For Action objectives: "Make the product the ad", "Be exact and tangible", "Present the ask after the context is set".
- For full funnel: "Use CTAs throughout your ad, and be more direct as you go." — [Google Ads Help](https://support.google.com/google-ads/answer/14783551)
- Think with Google playbook: use a hook in the first 5 seconds with tight framing (secondhand). — [Think with Google YouTube playbook](https://business.google.com/uk/think/search-and-video/youtube-marketing-success-playbook/)

**Length and retention data**
- Wistia 2026 State of Video (13M videos): "the shorter the video, the higher the engagement rate", though longer videos get more total watch time (secondhand summary). The 2025 report (14M videos, 100k businesses) found overall engagement down 7% vs 2023. — [Wistia State of Video](https://www.wistia.com/state-of-video); [Wistia 2025 insights](https://wistia.com/learn/marketing/top-7-insights-state-of-video-report-2)
- Wistia's length data is for hosted marketing videos (mostly website), not in-feed social ads, so it is only indirectly relevant.

### Inferences
**Recommended 9:16 structure, about 50s (flexes to 45 or 60).** The timing table below is the researcher's synthesis of the guidance above, not a platform-published template.

| # | Time | Beat | Purpose (framework) | Visual (TillText) | VO / on-screen text |
|---|---|---|---|---|---|
| 1 | 0:00–0:03 | **Hook** | Attention + proposition in 3s (TikTok); brand early (ABCD) | Tight close-up of a real phone buzzing with stacked WhatsApp notifications at 9:47pm; owner's floury hand in frame. TillText logo or wordmark small in a corner by 0:02. | "Your WhatsApp just got 14 orders. You're still frying." Text: "14 new messages" |
| 2 | 0:03–0:10 | **Problem / agitation** | Relatable tension, people (Connection) | Quick cuts: missed message, "how much is the large?", a voice note in another language, a typo'd order. Owner looks overwhelmed (humor). | "Prices, questions, voice notes, three languages… and you've got one pair of hands." |
| 3 | 0:10–0:15 | **Reveal** | Brand + product named in audio | Hard cut / snap to clean frame: the same chat, now TillText answering. Brand name said aloud. | "Meet TillText. It answers your WhatsApp for you, on your own number." |
| 4 | 0:15–0:22 | **Demo 1: real prices** | Product is the ad, be exact (ABCD Action) | Customer: "2 jollof + 1 chicken?" → bot replies with the shop's real menu prices; price "locks" with a stamp hit; hand-drawn circle. | "It quotes your real menu prices. Never makes one up." |
| 5 | 0:22–0:29 | **Demo 2: any language, voice notes** | Differentiator | Voice-note waveform plays (real audio snippet) → transcribed order appears; second customer in Hindi/Spanish/Pidgin gets a reply in kind. | "Voice notes, any language, it understands." |
| 6 | 0:29–0:37 | **Demo 3: one dashboard** | Outcome / relief | Orders slide into a single dashboard column with time, items and total; owner glances at a tablet and nods. | "Every order lands on one dashboard. Nothing gets lost in the chat." |
| 7 | 0:37–0:42 | **Trust / objection handling** | Reduce risk | Simple card: "Takes no payments. Uses your existing number." Shown with the real shop counter. | "No new number. It doesn't take payments, you stay in control." |
| 8 | 0:42–0:47 | **Social proof / payoff** | People, emotion | Real owner to camera (one line), or a customer-count / hours-saved stat **only if true**. Delivery bag handed over. | Owner: "I stopped answering 'how much' at midnight." |
| 9 | 0:47–0:52 | **CTA** | Direction, VO plus on-screen, inside the safe zone | Logo + URL/handle + "Try it on your WhatsApp" button-like card; keep above the bottom 35%. | "Put TillText on your WhatsApp today. Link below." |

- For **45s**: merge beats 5+6 and drop beat 8 to a 2s super.
- For **60s**: extend the problem with a second humor beat, add a fourth demo (e.g. restock or grocery-list order, pharmacy refill), and use a longer owner testimonial.
- **Pacing.** Average shot length is around 1–2.5s in the hook and problem beats (rapid). Hold 3–4s on each demo so viewers can read the chat. Use one deliberate "breath" (silence or a still) before the reveal at 0:10. Vary rhythm and don't cut uniformly on every beat.
- **Pattern interrupts** roughly every 5–8s: scale change, color-field switch, sound hit or new face. This is inferred from the "jump in / engaging pacing" guidance.
- **Hook types to test** (3–5 variants, per TikTok's 3–5 creatives guidance):
  1. Relatable problem POV ("POV: it's 9pm and your WhatsApp won't stop").
  2. Bold specific number ("14 orders while I was cooking").
  3. Question to the target ("Run a shop that takes orders on WhatsApp?").
  4. Before/after split (chaotic chat vs clean dashboard).
  5. Voice-note sound as the audio hook (the ping is a native "announce yourself with audio" cue).
  6. A myth-buster objection ("No, it won't make up your prices").
- **Text safe zones (9:16, 1080×1920)**:
  - Keep all text and logos within roughly y = 270–1250px (14% top ≈ 269px; 35% bottom ≈ 672px of usable height lost; some guides say 896px) and x = 65–1015px (6% sides).
  - Keep the right-hand ~120px clear of key content on TikTok because of the like/comment/share rail. This is common guidance; I could not reach the official TikTok spec page to confirm exact pixels.
- **Captions.** Burn in short caption chunks (2–5 words, high contrast) for sound-off viewers, even though over 75% of Reels views are sound-on. Upload with captions enabled as well.

**16:9 cut (YouTube in-stream / web / LinkedIn)**
- Keep the same beats. Re-compose so the phone UI sits off-center (left or right third), with the dashboard or owner on the other side, which suits the wider frame for side-by-side "chat → dashboard" cause-and-effect.
- Brand by 0:05, inside the skippable window (inferred from ABCD "brand early"). Make the first 5s work standalone as a pre-skip message.
- Text can be smaller and there is no bottom UI, but keep the title-safe 90% area. Make the end card 5s with URL and CTA, and say the CTA aloud.

### Gaps
- I could not retrieve TikTok's official pixel safe-zone spec or its SMB Playbook PDF (fetch blocked or unsupported). The 14/35/6% Meta figures are secondhand.
- I found no 2025–2026 platform-published data on retention curves specifically for 45–60s in-feed ads, or an "optimal" length for them. Most data favors shorter ads, so the 45–60s length should be tested against 15s and 30s cutdowns.
- The TikTok "5–10 words per second" text figure was reported as given; it seems high for on-screen reading and may refer to caption display rates. Verify before relying on it.

---

## 4. Script and copy guidance (tone, words per minute, sentence length, specificity)

### Takeaway
Write at about 140–150 words per minute with roughly 10% headroom. That is about 105–120 words for a 50s spot and at most about 135–145 for 60s. Use a conversational, founder-voice register rather than an announcer. Short sentences, concrete nouns and numbers, and one idea per line. Avoid AI-buzzword copy. Say the brand and CTA aloud.

### Cited Findings
- Commercial VO pacing is about 2.3–2.5 words per second (about 150 wpm). A 30s spot is around 70–75 words, with a ceiling near 80 (Voices.com "80 words or less"). Leave about 10% headroom for emphasis and pauses. Two-voice dialogue fits about 65–70 words per 30s. Time an actual read before recording. — [Voicebros](https://voicebros.com/en/blog/how-to-write-a-commercial-voice-over-script); [Speechify](https://speechify.com/en/blog/words-in-30-second-radio-audio-ad); [Killer Spots](https://killerspots.com/blog/radio-script-timer-how-long-is-a-30-second-script) (secondhand summaries)
- About 60s of explainer VO equals roughly 140–160 words, a figure commonly cited by explainer studios (secondhand). — [Bread n Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/)
- "Rewrite every line in a real person's voice. Ask: would our founder actually say this out loud?" — [Kosta Canatselis](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)
- Google ABCD: "Keep messaging and language focused and simple." For Action objectives, "Be exact and tangible". Reinforce the CTA with VO. — [Google Ads Help](https://support.google.com/google-ads/answer/14783551)
- Aesthetic adjectives ("premium", "cinematic", "futuristic", "minimal") pull toward the "cultural average". Specificity is the antidote. — [Creativepool](https://creativepool.com/bhiorns/articles/how-to-avoid-making-creative-work-that-looks-like-ai.35166)
- Artlist flags "made-up 'facts' from unverified sources" as a slop cue, so fact-check every claim. — [Artlist](https://artlist.io/blog/what-is-ai-slop-and-why-it-matters-for-video-creators/)
- 62% find AI-created *voices* unacceptable even when disclosed. If you use TTS, it must not sound synthetic. Prefer human VO, or use the shop owner's own voice for a testimonial line. — [Gallup](https://news.gallup.com/poll/713222/americans-aren-sold-businesses-using-ai-advertising.aspx)

### Inferences
**Word budget table** (at about 145 wpm with 10% headroom):

| Cut | VO words (target) | Hard max |
|---|---|---|
| 15s | 30–35 | 38 |
| 30s | 65–72 | 78 |
| 45s | 95–105 | 112 |
| 50s | 105–115 | 125 |
| 60s | 125–135 | 145 |

**Copy rules for TillText**
- Use second person, present tense, contractions: "you're", "it's".
- Keep most lines at 4–10 words, and vary them: one long line followed by a punchy three-word line breaks the robotic cadence.
- Use concrete nouns and numbers: "9:47pm", "2 jollof, 1 chicken", "your menu prices", "voice notes", "your same WhatsApp number". Avoid "streamline operations".
- **Ban list:**
  - Verbs and adjectives: revolutionize, transform, seamless, unlock, elevate, supercharge, game-changing, cutting-edge, next-gen, effortless, empower.
  - "AI-powered" as a headline. Lead with the job done, not the tech.
  - Openers like "In today's fast-paced world…".
- Make claims verifiable and true to the product: "never invents prices", "takes no payments", "works with your existing number". Don't imply payments, delivery or integrations it doesn't do. No fake stats or testimonials.
- Read it aloud. If a line needs a breath mid-sentence, split it. Script pauses with "…" and line breaks for the VO artist.
- Direct the VO for "a friend who runs a shop explaining it", warm and slightly informal, with natural pitch variation. Not announcer-style "big voice".

### Gaps
- I found no 2025–2026 controlled data comparing conversational vs announcer VO performance for social ads. The recommendation rests on platform "authentic/real people" guidance and practitioner consensus.
- The words-per-minute figures come from VO-industry blogs, not academic sources.

---

## 5. Examples of well-regarded small-business SaaS ads and what they do

### Takeaway
I found little reliable creative-review coverage of specific 2025–2026 Shopify, Square, Toast, Wix, Mailchimp or WhatsApp Business ads within the tool budget. What surfaced suggests these brands lead with a functional, outcome-focused message plus an emotional undertone of small-business growth, using light, fun execution.

### Cited Findings
- Motion's ad-library breakdown of a Mailchimp ad: positioning is "primarily functional (performance, automation, data-driven selling) with an underlying emotional appeal of business growth and success" (secondhand summary). — [Motion ad library: Intuit Mailchimp](https://library.motionapp.com/intuit-mailchimp)
- Digiday on Mailchimp's paid-social small-business push: an agency exec describes it as pairing "a serious, timely message with a light, fun execution" (secondhand; article date not confirmed). — [Digiday](https://digiday.com/?p=465384)
- A Shopify ad in Motion's library opens with the line "Turn conversations into checkouts", an outcome-first hook relevant to conversational commerce (secondhand). — [Motion library: Shopify](https://motionapp.com/library/shopify)

### Inferences
- The "Turn conversations into checkouts" framing is a close analogue to TillText's promise. The pattern to borrow is a short, benefit-verb headline about the merchant's outcome, not about the AI ("Turn WhatsApp chats into orders", "Every WhatsApp order, one dashboard").
- From general industry knowledge, not verified in this session: Square, Toast and Shopify brand work typically features real named merchants in their actual shops, product UI shown in context, and warm documentary footage. The editor should confirm by watching current spots on each brand's YouTube channel or the Meta Ad Library before citing.

### Gaps
- I did not retrieve specific 2025–2026 ads from Square, Toast, Wix or WhatsApp Business (Meta), or any creative reviews of them, because of the tool-call budget and blocked hosts. Recommended follow-up: search the Meta Ad Library (facebook.com/ads/library) for "Square", "Toast POS", "Shopify" and "WhatsApp Business", and TikTok Creative Center Top Ads filtered to "Business Services/Software", to pull 3–5 reference spots with timings.
- No performance data (CTR, CPA) for those brands' ads is publicly available in the sources found.
