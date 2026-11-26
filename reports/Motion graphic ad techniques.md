# Rebuild the TillText ad around specifics

The best 2025–2026 product motion ads look restrained rather than busy. They start from white-on-black or flat colour fields, put the real product UI front and centre, and use type that physically does the verb it names. Colour, sound and motion appear only where they carry meaning. Above all, they are specific. Audiences now penalise anything that merely looks AI-made: in a 2026 Gallup survey, **49% of US adults viewed AI-made ads negatively**, only 19% positively, and **62% called AI-created people or voices unacceptable even when disclosed** ([Gallup](https://news.gallup.com/poll/713222/americans-aren-sold-businesses-using-ai-advertising.aspx)). That raises the stakes for TillText, whose product *is* AI. An ad that looks synthetic confirms the very fear it has to dispel. The current 31-second cut has identifiable causes for both complaints, and most of them are fixable in the existing HTML and Python pipeline:

- **The voiceover is unclear because of the mix.** A busy-restaurant ambience track plays at +4 dB under the voice for the first 8 seconds. A phone vibration and 14 message pings sit on top of the opening lines. The voice gets no EQ, compression or de-essing. The final mix is peak-normalised, so nobody ever measured how far the music sits below the voice.
- **The voice itself works against clarity.** It is a "sales rep" library voice driven by emotion tags on `eleven_v4`, a model that copies its source voice's quirks faithfully.
- **The visuals read as AI or template work.** Radial orange glow blobs, a vignette, a frosted-glass pill, stock photos, and a whoosh or ping on nearly every move are on the creative community's 2026 list of AI and template tells.

The fix for a 50–55 second version is a story-led beat structure of about 110 spoken words, real TillText UI and specific shop details, a plainer and slower voice with a proper processing chain, and a sound design that picks five or six hero moments instead of sounding everything.

## Premium motion now means restraint, embodied type and real UI

The best-documented recent reference is Apple's 35-second "Introducing Apple Creator Studio" film (2026). Two independent breakdowns describe the same grammar ([AdsTurbo](https://adsturbo.ai/explore/954), [Good Boy Ninja](https://www.goodboy.ninja/blog/post/lets-analyze-apples-creator-studio-motion-graphics-video)):

- **No voiceover.** Typography and UI "behave as physical matter" in a black void. Composition is rigidly centre-weighted.
- **Fast cuts locked to the beat.** In the montage, cuts last **0.2–0.5 seconds** and are tied to the music's percussion. The intro is deliberately the slowest part, to set the tempo first.
- **Embodied type.** The words perform their verbs: "Prompt it" disintegrates into dust, "Scrap it" crumples like paper, "Upscale it" is cut by a resolution slider.
- **White on black first.** Apple "always starts with white on black titles". It adds colour and motion only to emphasise a title's message, and "almost never" to impress.
- **Small imperfections.** In the opening sweep, panes move slightly backwards before they exit (anticipation), and their easing is deliberately inconsistent. This gives a near-handheld, analogue feel instead of uniform CSS-like motion.
- **A static close.** The film ends by holding still on the price and logo "for clear retention".

Good Boy Ninja adds a warning every designer of this ad should take seriously: "What you think isn't too fast is probably too fast", because the maker has memorised the copy ([Good Boy Ninja](https://www.goodboy.ninja/blog/post/lets-analyze-apples-creator-studio-motion-graphics-video)).

Trend reporting points the same way. Motionographer's 2025 predictions name **bold typography, negative space and curated restricted palettes** as a response to digital clutter. They also list data-driven motion, loopable micro-animations borrowed from UI, and organic, biomorphic movement ([Motionographer Pt 1](https://motionographer.com/2024/12/10/motionographers-crystal-ball-2025-motion-design-predictions-part-1/), [Pt 3](https://motionographer.com/2025/01/14/25-1-for-2025-the-motionographers-crystal-ball-motion-design-predictions-part-3)). On the character-led end of the range, Duolingo's serialised TikTok work earned a **12.63% engagement rate** on 34.8M impressions ([TikTok for Business](https://ads.tiktok.com/business/en-US/inspiration/ad-awards-duolingo-case-study)). Its 2024 animated ad was praised for using the app's own characters and visuals in everyday moments such as ordering a croissant ([Squideo](https://www.squideo.com/the-top-5-animated-ads-of-2024-and-why-they-worked)). The common thread is that the product's real interface and real situations are the hero.

Apple's grammar maps neatly onto TillText's claims as "embodied verb" beats:

- **"Never makes one up":** a price types into a bubble, then locks with a small stamp.
- **"Any language":** a word rolls like a slot machine through several scripts.
- **"Voice note":** a waveform resolves into transcribed text.
- **"One dashboard":** an order card slides out of the chat and into a dashboard column.

Note that this is a recommendation built on the Apple example, not a sourced recipe. The concrete craft values below are practitioner defaults. They are useful starting points, but no named studio has published them.

| Motion element | Starting value (30 fps) |
|---|---|
| Entrances | ease-out-expo `cubic-bezier(.19,1,.22,1)` or out-quint `(.23,1,.32,1)`; Stripe's former designer warns that the built-in CSS curves are "not strong enough" ([bendc](https://gist.github.com/bendc/ac03faac0bf2aee25b49e5fd260a727d)) |
| Moving things already on screen, camera | in-out-quart `(.77,0,.175,1)` |
| Exits | ease-in-cubic, at about 60–70% of the entrance duration |
| One "punch" per scene | back-out with 10–15% overshoot, e.g. `(0.175,0.885,0.32,1.275)` ([web.dev](https://web.dev/articles/custom-easing)) |
| Durations | UI pop 8–12 f; bubble or card slide 12–18 f; camera push 24–45 f; wipe 10–16 f |
| Stagger | letters 1–2 f, words 3–5 f, cards 3–6 f; under about 20 f per group |
| Product zooms | 150–300%, limited to 3–5 per video ([SmoothCapture](https://www.smoothcapture.app/blog/how-to-zoom-in-on-videos-pro-techniques)) |

## Why the current cut reads as AI, and what replaces it

The 2026 creative-community consensus is that the AI "tell" has moved from broken anatomy to frictionless sameness. Creativepool's Benjamin Hiorns lists:

- "frictionless polish"
- symmetrical composition
- "elaborate cinematic lighting"
- a "peculiarly enthusiastic amount of atmospheric haze"
- work that "looks expensive without necessarily looking distinctive"

His diagnosis is "the absence of specificity". He also warns: "You can put film grain over a cliché. It remains a cliché" ([Creativepool](https://creativepool.com/bhiorns/articles/how-to-avoid-making-creative-work-that-looks-like-ai.35166)).

Creative Boom's 2026 reader survey of trends creatives are "so over" covers several related looks ([Creative Boom](https://www.creativeboom.com/insight/10-trends-creatives-are-so-over-in-2026/)):

- AI slop polished with templates, and "this overused yellow hue"
- glass and "holo and bubbles"
- "gradients for everything"
- Canva and template culture
- bento grids
- "motion for motion's sake"

The UI designer Kosta Canatselis gives a short list of his own: typography "with no opinion", the same corner radius everywhere, headlines that could belong to anyone, and motion that is "absent or identical" ([Spot the Slop](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)). Artlist adds "dull stock clips" and **"robotic voiceovers, cloned voices"** to the list of video-specific cues ([Artlist](https://artlist.io/blog/what-is-ai-slop-and-why-it-matters-for-video-creators/)).

The trust penalty applies to *perceived* AI use, not just actual use. The Harris Poll, as cited by CMSWire, found that **73% of consumers are less likely to trust an ad when they merely suspect AI** was involved ([CMSWire](https://www.cmswire.com/digital-marketing/synthetic-content-has-a-trust-crisis-your-brand-could-catch-it/)). Better polish does not fix this. Coca-Cola's 2025 AI holiday ad had "ten times better" craftsmanship than the 2024 one, by its own generative-AI lead's account, and still drew backlash ([TechRadar](https://www.techradar.com/ai-platforms-assistants/coca-cola-faces-backlash-again-for-missing-the-spirit-of-the-holidays-with-another-ai-slop-ad)).

Measured against that list, the current source (`ad-video/source/index.html`) has several tells:

- two large orange radial-gradient "glow" blobs
- a full-frame radial vignette
- a `backdrop-filter: blur` pill reading "Built for every local business"
- a closing montage of Pexels stock photos

`mix.py` places a sound on nearly every move: 14 pings, a swish on each problem line, two impacts, a printer, and rows of pop-ups.

The fix is specificity, not decoration. Hiorns's advice is to feed the work real material, such as "actual brand history, product details, customer language… local references, real photography" ([Creativepool](https://creativepool.com/bhiorns/articles/how-to-avoid-making-creative-work-that-looks-like-ai.35166)). Google's ABCD guidance and TikTok's best practices both say to feature real people using the product, and to "make the product the ad" with exact, tangible detail ([Google Ads Help](https://support.google.com/google-ads/answer/14783551), [TikTok Ads Help](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)).

For TillText, that means rebuilding scenes from the real dashboard rather than invented UI. The repo already has screenshots of the overview, an Arabic voice-note order in the live inbox, an order detail and the AI playground (`docs/screenshots/`). Give the demo shop a name, a real-looking menu with local prices, timestamps that show the after-hours rush, and a customer message with a typo. Pick one distinctive type pairing instead of a default sans. Use colour semantically, so that WhatsApp-green means the customer, the TillText orange means the product and neutral means the dashboard. Delete the glow blobs, vignette and glass pill.

If any human appears, it should be real phone footage of a real owner or staff member, never an AI-rendered person; the Gallup data is decisive on this. Hand-drawn accents, such as a marker circle around a price that "locks", are worth using once or twice where they make a point. They do not make work authentic on their own ([Creativepool](https://creativepool.com/bhiorns/articles/how-to-avoid-making-creative-work-that-looks-like-ai.35166)).

Two caveats apply. First, no study isolates motion cues such as uniform easing as drivers of perceived AI-ness; that link rests on practitioner opinion. Second, showing WhatsApp's interface and name prominently should be checked against Meta's brand guidelines. An "abstracted" WhatsApp-style chat is safer than a pixel-perfect copy.

## A 52-second structure that earns its extra length

None of TikTok, Meta or Google publishes an ideal ad length. Wistia's data across millions of hosted videos shows engagement falling as length grows ([Wistia](https://www.wistia.com/state-of-video)), so every added second must carry a new beat. The platforms agree on the essentials:

- **The hook comes first.** TikTok wants the proposition in the first 3 seconds and the hook within 6 ([TikTok Ads Help](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)).
- **The brand comes early, in sound as well as picture.** Google ABCD says to introduce the brand "from the start", says audio brand mentions strengthen on-screen branding, and says to give a specific CTA reinforced by voice ([Google Ads Help](https://support.google.com/google-ads/answer/14783551)).
- **Sound matters.** Meta reports that **over 75% of Reels views are sound-on** ([Meta for Developers](https://developers.facebook.com/blog/post/2024/11/07/unlock-the-power-of-reel-ads/)).

The beat sheet below is a synthesis of that guidance, not a platform template. It is built from verified product facts in the TillText README:

- voice notes and any language
- prices validated against the database ("the model never writes prices")
- an order summary before confirmation
- a live dashboard
- "Talk to a human"
- no online payments
- setup from a photo of a menu

| Time | Beat | Picture and motion device | Sound |
|---|---|---|---|
| 0:00–0:03 | Hook | Tight on a phone at 21:47, with a stack of WhatsApp notifications climbing; an unread counter ticks up | **Hero 1:** one short vibration, then the first ping only; music sparse |
| 0:03–0:09 | Problem | Three customer bubbles on screen: "how much is the large?", a voice note in Arabic, a typo'd order; RSVP-style word swaps on the beat | Bubbles ride the music; at most one soft tick |
| 0:09–0:13 | Breath, then reveal | Half a second of near-stillness, then the chat bubble morphs into the TillText wordmark (a match cut) | Music drops out, then lifts; **Hero 2:** soft tonal bloom |
| 0:13–0:20 | Demo 1: it answers, in their language | The same Arabic voice-note waveform resolves into text; the reply arrives in Arabic; a slot-machine word roll through scripts | One soft click as the reply lands |
| 0:20–0:27 | Demo 2: real prices | Line items type in; the price **locks** with a stamp and a hand-drawn circle; caption "From your menu. Never made up." | **Hero 3:** dry woody click plus a low thump on the lock |
| 0:27–0:32 | Demo 3: confirm | An order-summary card; a "Confirm" button tap with a ripple | Single tap |
| 0:32–0:39 | Demo 4: one dashboard | The card flies out of the chat into the live dashboard column (a match cut on shape and colour); axial zoom-out from one row to the full dashboard | **Hero 4:** one airy whoosh on the travel; music at full groove |
| 0:39–0:44 | Trust | Three short type beats: "No website." "No payment links." "Wants a person? Gets one." | None; the VO and the beat carry it |
| 0:44–0:47 | Setup | A phone photo of a paper menu turns into product rows | Soft paper or camera-shutter Foley, if story-critical |
| 0:47–0:52 | CTA and end card | Logo, URL and "Try it on your WhatsApp"; a static hold of at least 2.5 s | **Hero 5:** music's own final downbeat, ringing out |

The demo shop, prices and timestamps are placeholders to replace with a specific, believable shop.

**Pacing.** Cut quickly in the hook and problem, at roughly 1–2.5 seconds per shot. Hold each demo for 3–4 seconds so viewers can read the chat. Use a pattern interrupt every 5–8 seconds: a scale change, a colour-field switch or one hero sound. Use Apple-style 0.2–0.5 s cuts only for 1–3 word titles, after the viewer has the tempo ([AdsTurbo](https://adsturbo.ai/explore/954)).

**Text holds.** Netflix caps adult reading at **20 characters per second**, with a minimum of about five-sixths of a second on screen ([Netflix Partner Help](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide), [OpenDesign](https://open-design.ai/blog/on-screen-text-duration/)). A safer working rule for a busy frame is *hold = max(0.85 s, characters ÷ 15) + 0.3 s* for the entrance to settle. At that rate, "From your menu. Never made up." needs about 2.4 s.

**Safe zones.** Third-party guides disagree on safe zones for 9:16 at 1080×1920. Use the conservative overlap ([AdaptlyPost](https://adaptlypost.com/blog/social-media-safe-zones-2026-complete-guide), [Billo](https://billo.app/blog/meta-ads-safe-zones)):

- **Top:** keep critical type below y≈270.
- **Bottom:** keep it above y≈1250–1450. TikTok ads lose about 370 px at the bottom, and Meta guidance treats the bottom 35% as risky.
- **Right:** keep about 120 px clear for the action rail.

Build the 16:9 version from the same scene graph and timing, using a left-text, right-UI split. Make sure the first 5 seconds work on their own before the skip button.

**Lengths.** For a 45-second cut, merge Demo 3 into Demo 2 and shorten the trust beat. For 60 seconds, add a second problem beat played for humour, and a non-restaurant example such as a pharmacy refill.

**Claims to check.** Run the copy past the real product before release. "Keeps your number" is true only through Meta's coexistence feature, which "isn't available in every country" (`docs/WHATSAPP_SETUP.md`). Use no invented statistics or testimonials ([Artlist](https://artlist.io/blog/what-is-ai-slop-and-why-it-matters-for-video-creators/)).

## A clearer voice comes from fewer words, plainer direction and a real processing chain

Commercial VO runs at about **2.5 words per second**. Warm reads run closer to **2.2**, and "push past 80 [words in 30 s] and the pauses disappear" ([Killerspots](https://killerspots.com/blog/radio-script-timer-how-long-is-a-30-second-script)). With music and on-screen text competing for attention, a 52-second ad should carry **105–115 words**, with a hard maximum of about 125. Slow down at the hook and the CTA, and speed up through the middle.

A draft at roughly 110 words, written in that register:

> It's nine forty-seven... and your WhatsApp won't stop. How much is the large? Do you deliver? A voice note, in Arabic. And you've got one pair of hands. Meet TillText. It answers your WhatsApp customers for you. Text or voice note, in their own language. It quotes prices straight from your menu. It never makes one up. It reads the order back, and they confirm. Then every order lands on one live dashboard. No website. No payment links. And if someone wants a person, they get one. Set it up from a photo of your menu. TillText... your WhatsApp, taking orders.

It follows the "would our founder actually say this out loud?" test ([Spot the Slop](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)). It avoids the ban list: revolutionise, seamless, unlock, "AI-powered". It spells out numbers, because ElevenLabs recommends normalising digits, symbols and URLs into words ([ElevenLabs best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)). Spell the CTA URL the same way.

On the model side, the current setup works against clarity:

- **No speed control or SSML on v4.** `eleven_v4` has only Stability and Similarity: "Style and Speed sliders are not available… and SSML is not supported" ([ElevenLabs help](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/what-is-eleven-v4)).
- **v4 copies the source voice's flaws.** It reproduces the source voice's delivery and loudness, and recurring "clipping, plosives, uneven EQ, or jumps in volume" are "very likely in the training data for that voice" ([Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)).
- **Tags are unreliable.** ElevenLabs says tags "are not perfect yet", can be misread as sound-effect requests, and land best when they "clearly describe the voice quality" ([ElevenLabs best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)).
- **Low Stability speeds the read up.** Setting Stability too low "cause[s] the character to speak too quickly" ([ElevenLabs playground docs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)).

Repeated [warm]/[happy] tags on a voice billed as a "sales rep" are therefore a probable cause of the sing-song, synthetic read. This is an inference, because the original takes were not re-auditioned here. There are two credible routes:

| | Route A: `eleven_v4` | Route B: `eleven_multilingual_v2` |
|---|---|---|
| Why | Current flagship, most emotive | Documented as "most stable", "well-suited for corporate videos" ([Models](https://elevenlabs.io/docs/overview/models)) |
| Settings | Stability about 0.55–0.7, Similarity about 0.75, Clone Strength 0% for a PVC | Stability about 0.5–0.6, Similarity 0.75, Style 0, Speaker Boost on, Speed 0.95–1.0 |
| Direction | No tags, or one plain descriptor at the start such as `[clear, friendly, conversational]` | Pauses via `<break>` tags, used sparingly; too many cause instability |
| Pacing | Punctuation and ellipses only; generate line by line and space the lines in the edit | Speed slider plus breaks |

The settings are extrapolated from ElevenLabs' generic "stability around 50, similarity around 75, style 0" advice. No official per-use-case v4 values exist. Whichever route you take:

- **Voice choice matters most.** On v4 it matters more than settings. Audition 4–6 Voice Library voices from the commercial and advertisement categories on the actual script with identical settings, and on a phone speaker. Choose the most intelligible: a clean, mid-pitched voice with no harsh sibilance, read as a calm "friend who runs a shop" rather than an announcer. Avoid Voice Design voices, which "may not… sound as good" on v4 ([Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)).
- **Generate several takes.** Make 3–5 per line and keep the best.
- **Fix the brand name.** Pin "TillText" with one consistent spelling or an IPA form such as `/ˈtɪlˌtɛkst/` on v4, so it reads the same every time.

There is an honest alternative worth stating. Gallup's finding that 62% reject AI voices suggests that a hired human VO, or one recorded line from a real shop owner, would de-risk the ad more than any TTS setting.

Processing is the other half of clarity. Phones reproduce roughly 500 Hz–4 kHz, and "the 1-4 kHz region is particularly important for intelligibility" ([Sound On Sound](https://www.soundonsound.com/techniques/mixing-mobile)). The current `mix.py` applies none of the following:

- a high-pass filter at 80–100 Hz ([iZotope](https://www.izotope.com/en/learn/how-to-eq-vocals))
- a small cut at 200–500 Hz only if the voice sounds boxy
- a 2–3 dB presence lift around 3 kHz
- de-essing in the 5–8 kHz region
- 2:1–4:1 compression
- dry, mono, centred placement with no reverb, because reverb detail collapses on phone speakers ([Sage Audio](https://www.sageaudio.com/articles/perfecting-vocals-on-modern-playback-systems))

Most of these are available as ffmpeg's `highpass`, `equalizer`, `deesser`, `acompressor` and `alimiter`.

## Professional sound picks five hero moments and makes the music the structure

Sono Sanctus, a studio known for sound in motion design, describes the craft as choosing moments: "I kind of picked several moments that would stand out and then let the rest be more abstract… sitting underneath the music." Its go-to whooshes are "soft… slightly textural, but also not overwhelming… super neutral" ([School of Motion](https://schoolofmotion.com/blog/sono-sanctus-podcast-podcast)). The UX rule for repeated sounds is that the more often a sound fires, the "more subtle, shorter, and warmer it needs to be" ([Toptal](https://www.toptal.com/designers/ux/ux-sounds-guide)). Practitioners advise building sound from the physics of motion, meaning acceleration, contact and settling, "rather than placing a generic effect on every graphic transition" ([Pippit](https://www.pippit.ai/blog/sound-design-for-motion-graphics)).

The current cut breaks all three principles. The remedy is to sound five or six hero beats in detail, as marked in the beat sheet, and leave the rest silent or nearly so. A hero sound is built in layers:

- a transient: a click or tap of 5–30 ms
- a body: a tonal pluck in the music's key
- an optional airy tail

Secondary moves get the transient at most. Keep only the first chat ping, and let later bubbles ride the music. Use 3–5 whooshes in the whole spot, rotated between two or three variants, and only on moves that genuinely travel. Replace the cinematic impacts with a soft tonal bloom. Keep the vibration only because it is the hook, play it once, and keep it under half a second. Drop the receipt printer unless a printed ticket becomes a story beat. These are craft inferences, but they follow directly from the sourced principles.

Epidemic Sound's catalogue supports a premium palette if you search with the right adjectives. A catalogue query on 2026-11-26 returned these files:

- "User Interface, Click, Button, Short, Soft, Click, Mid, Dry, Woody"
- "…Soft Round Pluck"
- "…Menu Tone"
- "Designed, Whoosh, Soft Airy" (0.9 s)
- "Designed, Riser, Transition, Short, Fast, Tonal, Musical"

Avoid titles tagged "Video Game", "Bubbly", "Dramatic", "Eerie" or "Suspense". Expect to trim, because many click files run 2.7–10 s with several takes or a reverb tail inside.

For music, choose the track first ([Storyblocks](https://www.storyblocks.com/resources/tutorials/3-techniques-cutting-music-without-sudden-stop)):

- **Pick a track with a clear beat and a real ending.** One "with no clear beat and no proper ending leaves you fighting the audio."
- **Cut on downbeats** at the ends of phrases.
- **Never fade over the last bar.** Land the logo on the final downbeat and let it ring out. If there is no usable ending, add reverb to the last note.

Pick an instrumental track at roughly 100–124 BPM with a light midrange during the verses. The genre choice is an inference; no sourced performance data favours one genre. Epidemic's EditRecording tool can force an exact length (`targetDurationMs`, `forceDuration`). It can pin the track's lift to the reveal at about 0:09 and its natural ending to the end card (`requiredRegionsAtOffsets`), and it returns stems. With stems you can pull the lead melody under the voice and bring it back in the gaps.

| Layer | Target | Basis |
|---|---|---|
| VO | about −16 LUFS short-term while speaking; dry, mono, centred | [Descript](https://www.descript.com/blog/article/how-to-set-the-perfect-audio-levels-for-video) |
| Music under VO | **18–24 LU below the VO** (measured, not by fader), plus a 2–4 dB dip around 2–4 kHz; up 6–10 dB in gaps and on the end card | [OverseerOS](https://www.overseeros.com/blog/background-music-volume-under-voiceover) |
| Ducking | 3–6 dB on top of the static offset; attack about 15 ms, release 400–700 ms | [Sound On Sound](https://www.soundonsound.com/techniques/duck-tales) |
| UI clicks | 10–20 dB under the VO, never on a key word | [Storyblocks](https://www.storyblocks.com/resources/tutorials/how-to-balance-audio-premiere-pro) |
| Whooshes and risers | 8–15 dB under the VO | practitioner range |
| Ambience | off, or about −30 dB under speech; never above the voice | inference from the current mix's failure |
| Master | −14 LUFS integrated, ≤ −1 dBTP | [iZotope](https://www.izotope.com/en/learn/mastering-for-streaming-platforms.html) |

Two numbers in that table are softer than they look. The 18–24 LU figure comes from one 2026 blog's listening test, not a standard. Reels and TikTok loudness targets conflict between third-party guides (−14 vs −16 LUFS), and neither platform publishes an official specification.

The key operational change is to measure each stem with `loudnorm print_format=summary` before deciding offsets. The current script ducks by a fixed 12 dB and then peak-normalises the whole mix, so the actual voice-to-music gap is unknown and normalisation does nothing to improve it. Sign off with three checks: listen on a phone speaker in mono, listen with the music muted, and watch with the sound off.

## Conclusion

The two complaints, "not clear" and "looks AI", are not separate problems. Both come from the same habit of adding: more effects, more sounds, more emotion tags and more glow, in place of specific content. The 2026 evidence, from Apple's restraint to Coca-Cola's polished but still rejected AI ads, shows that removing those layers and replacing them with real product detail does more than any amount of finish. For TillText this is also a product argument. An ad that shows the bot reading back a real price from a real menu in a customer's own language demonstrates trustworthiness better than any line of copy can.

Plan the extra 20 seconds as additional proof beats, not slower versions of the existing ones. Test the 52-second cut against 15- and 30-second cutdowns, because no platform data shows that 45–60 second in-feed ads outperform shorter ones. The decision with the largest effect on whether the ad reads as human is the voice. If the budget allows only one human-made element, make it the voice: a hired voice actor, or a real owner saying one line.
