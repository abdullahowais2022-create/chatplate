# Sound Design & Music Editing for Motion-Graphics Product Ads (2024–2026)

Research note scope: concrete rules for SFX and music in a 45–60s motion-graphics product ad built with Epidemic Sound (music + SFX library, track-length Adapt/edit tool) and an ElevenLabs VO. The previous cut over-sounded: a vibration, a ping on every chat bubble, a whoosh on every transition, impacts on the logo, a receipt printer and UI pops.

Method and limits: In this session, WebFetch could not reach several hosts (epidemicsound.com, developers.epidemicsound.com, krotosaudio.com, schoolofmotion.com, medium.com). I reached some pages through Firecrawl scrape instead. The Krotos "6 tips" page and the Epidemic "How to use Adapt" page came back without body text, so their contents are unverified. I also queried the Epidemic Sound SFX catalogue directly through the connected Epidemic Sound MCP on 2026-11-26. Those results are primary observations, not web pages. Many of the web sources found are vendor blogs; treat their numbers as practitioner starting points, not standards. Items marked "Inference" come from craft convention or reasoning and are not directly sourced.

---

## 1. Principles of SFX in motion design (what gets a sound, over-sounding, layering, variation, sync, stereo)

### Takeaway
Pros pick a few hero moments to sound in detail and let everything else sit as a quiet bed under the music. They build sounds from the motion's physics (acceleration, contact, settling) rather than dropping a generic effect on every transition. Sounds that fire often (UI taps, bubbles) should be the shortest, softest and warmest in the mix.

### Cited Findings
- Sono Sanctus (Trevor, School of Motion podcast) on choosing hero moments: "I kind of picked several moments that would stand out and then let the rest be more abstract… I focus on creating interesting sounds for those moments where the rest of the soundscape is definitely more secondary sitting underneath the music." He also says the hero beats "lined out pretty well with the music." — [School of Motion: Sound in Motion podcast with Sono Sanctus](https://schoolofmotion.com/blog/sono-sanctus-podcast-podcast)
- Sono Sanctus on layering: a simple pencil sound "ended up being several layers" to give it "a character and life that's a little bit bigger than would actually be in reality." Layer elements should be "not too big on their own so that they can serve a specific purpose." — [School of Motion / Sono Sanctus](https://schoolofmotion.com/blog/sono-sanctus-podcast-podcast)
- Sono Sanctus on whooshes: their go-to transition whooshes are "really wonderful, soft, whoosh sounds that are slightly textural, but also not overwhelming… super neutral." — [School of Motion / Sono Sanctus](https://schoolofmotion.com/blog/sono-sanctus-podcast-podcast)
- Sono Sanctus on sync: steady-state sounds (e.g. a pencil scraping) "will very easily sound out of place if it doesn't match the timing of exactly what you're seeing." They re-performed the motion (Foley-style) to match it. — [School of Motion / Sono Sanctus](https://schoolofmotion.com/blog/sono-sanctus-podcast-podcast)
- Sono Sanctus on music and SFX working together: when SFX are responsive to picture and blend ("mush") with the music, "the music is much more responsive to the picture than it actually is." — [School of Motion / Sono Sanctus](https://schoolofmotion.com/blog/sono-sanctus-podcast-podcast)
- Wesley Slover (Sono Sanctus): "These days I'll often mix lots of sounds, but at a quieter level" so the viewer feels the piece more than hears it. (This came from a search-result summary of a Sono Sanctus interview; I could not fetch the full text.) — [Medium: Creativity& Sound — Sono Sanctus](https://medium.com/creativityand/creativity-sound-sono-sanctus-2b20dfe37cdb)
- "Build sound around motion, acceleration, contact, and settling rather than placing a generic effect on every graphic transition." — [Pippit: sound design for motion graphics](https://www.pippit.ai/blog/sound-design-for-motion-graphics)
- Whooshes belong where an element travels across the screen or a transition introduces a new section. — [Pippit](https://www.pippit.ai/blog/sound-design-for-motion-graphics)
- "Gentle whooshes reinforce transitions between screens, while tiny interface sounds confirm actions without becoming distracting." — [Motion The Agency: sound design examples](https://www.motiontheagency.com/blog/sound-design-examples-before-after-in-motion)
- Put a sound accent at the moment the animation lands, which signals it "has reached its intended conclusion." — [Pixflow: cinematic transition sounds](https://pixflow.net/blog/enhancing-motion-graphics-with-cinematic-transition-sounds/)
- UX sound rule: "the more frequently a sound occurs… the more subtle, shorter, and warmer it needs to be." — [Toptal UX sounds guide](https://www.toptal.com/designers/ux/ux-sounds-guide)
- UI sound philosophy: give "prioritized sounds over a meaningless barrage of beeps." — [A Sound Effect: sci-fi UI sound effects](https://asoundeffect.com/sci-fi-ui-sound-effects/)
- Sono Sanctus's studio motto: "Don't let audio be an afterthought." — (via search summary of [School of Motion podcast listing](https://www.everand.com/podcast/448011882/Episode-71-Sound-in-Motion-with-Sono-Sanctus-Good-sound-design-can-set-an-animation-apart-from-the-rest-of-the-pack-We-may-be-pushing-pixels-left-a))

### Inferences
- **Hero-moment budget for a 45–60s ad (Inference):** sound roughly 4–7 hero moments in detail, e.g. (1) the problem moment, (2) the first product reveal, (3) one or two key feature "aha" interactions, (4) the payoff/result, (5) the logo/end card. Everything else gets either nothing or a very low "texture" layer (-30 dBFS or quieter, felt rather than heard). This follows the Sono Sanctus approach of choosing hero beats over sounding every move.
- **Applied to the previous cut (Inference):**
  - A ping on every chat bubble is the "barrage of beeps" failure. Sound only the first bubble, or the bubble carrying the key message, plus at most one more. Let later bubbles ride the music, or give them a near-inaudible soft tick at -8 to -12 dB below the first one.
  - A whoosh on every transition makes the edit feel stock. Keep whooshes for moves that actually travel (camera pushes, big screen swipes, scene changes on a musical downbeat). Use about 3–5 in the whole spot, and alternate between 2–3 different soft or airy whooshes.
  - Logo impact: swap the cinematic hit for a soft tonal "bloom" or music-driven button (see section 3). Use at most one gentle low-end thump layered under a soft shimmer.
  - Phone vibration and receipt printer are literal Foley. Keep one only if it is a story beat (e.g. the vibration as the opening hook). Keep it short (under 0.5s), low in level, and never repeated.
- **Layering recipe (Inference, standard craft):** a hero sound = transient (click or tap, 5–30 ms) + body (tonal pluck or soft thump that matches the music's key, 100–300 ms) + tail (airy whoosh, short reverb or shimmer, 0.3–1s). Cut the body and tail on secondary moves and keep only the transient.
- **Variation for repeated sounds (Inference):** if a UI sound repeats, use different takes from a "Variations" file (Epidemic has many, see section 4), or shift pitch by ±1–2 semitones and level by ±1–3 dB per instance. A rising pitch sequence across a run of bubbles or list items (e.g. up a scale) reads as intentional and "musical."
- **Sync offsets (Inference, common practitioner convention, unsourced in this session):** put a transient exactly on the contact or "land" frame (Pixflow's "accent when the animation completes" supports this). Start whooshes so their peak lands on the cut or moment of fastest motion, which usually means starting 4–10 frames earlier. Start risers so they peak at, or cut off just before, the downbeat or reveal. A transient 1 frame early tends to feel tight; one late feels sloppy.
- **Stereo (Inference):** keep VO and hero hits centered. Pan UI sounds gently (about 10–30%) toward where the element sits on screen. Let whooshes move L→R or R→L with the motion. Check in mono, since most social viewing is on phone speakers.

### Gaps
- I could not get a 2024–2026 source with an explicit frame offset (e.g. "2 frames early") for SFX sync. Krotos' "Sound Effects for Motion Graphics – 6 Tips" (Ryan Hobler, Apr 2023) loaded without body text.
- I found no sourced stereo-placement rule specific to motion-graphics ads.
- No interviews with Antfood, Mutato or Wesley Slover from 2024–2026 were reachable. The Sono Sanctus podcast is from 2019 but is still the most concrete practitioner source found.

---

## 2. Premium palette for tech/product ads vs. what to avoid

### Takeaway
"Premium" means soft, short, clean and often tonal: dry woody or glassy clicks, soft round plucks, airy breathy whooshes, short tonal risers, and an occasional gentle low-end thump. Cheesy comes from cartoon or video-game pops, loud cinematic braams and hits, and the same generic whoosh on every cut.

### Cited Findings
- Sono Sanctus favours "soft, whoosh sounds that are slightly textural, but also not overwhelming… super neutral" and layerable elements "not too big on their own." — [School of Motion / Sono Sanctus](https://schoolofmotion.com/blog/sono-sanctus-podcast-podcast)
- Frequent sounds should be "subtle, shorter, and warmer." — [Toptal](https://www.toptal.com/designers/ux/ux-sounds-guide)
- Epidemic Sound titles that match a premium palette (observed via Epidemic Sound MCP SearchSoundEffects, 2026-11-26; no public URL):
  - "User Interface, Click, Button, Short, Soft, Click, Mid, Dry, Woody" (2.7s file)
  - "User Interface, Click, Select, Soft Round Pluck, Short, Reverb"
  - "User Interface, Click, Select, Smartphone, Short 02/03"
  - "User Interface, Click, Menu Tone 02/03" (tonal)
  - "User Interface, Click, Software, Interface, Pop Up, New Message" / "…Pop Up, Notification, Positive"
  - "User Interface, Alert, Notification, Message, Text 01–05" (some only 200–330 ms)
  - "Swooshes, Whoosh, Soft, Clean"; "Designed, Whoosh, Soft Airy" (0.9s); "Swooshes, Whoosh, Designed, Generic, Air" (0.55s); "Swooshes, Whoosh, Airy, Soft Wind, Breeze, Variations"; "Swooshes, Whoosh, Soft Hit, Short"
  - "Designed, Riser, Transition, Short, Fast, Tonal, Musical"; "Designed, Riser, Very Short, Tonal, Rumble" (1.0s); "Designed, Riser, Transition, Fast, Short, Clean 01"
- Epidemic results that tend toward the cheesy end, judged by their titles (same MCP query): "User Interface, Click, Digital, Video Game, Select, Positive…", "UI Buttons, Bubbly, Option", "Button, Press, Click, Video Game, Variations", "Designed, Riser… Dramatic / Suspense / Eerie / Tonal Creep". — Epidemic Sound MCP observation

### Inferences
- **Premium list (Inference):** dry soft clicks (woody/glass), soft round plucks in key, breathy airy whooshes under 1s, short tonal risers of 1–2s (not 8s cinematic ones), soft "bloom" or shimmer hits, gentle sub thumps on 1–2 moments, subtle paper or texture Foley only where the story needs it.
- **Avoid list (Inference):** "video game", "bubbly", "cartoon", "8-bit", "arcade" UI sounds; "dramatic", "epic", "braam", "trailer", "cinematic impact" hits; "eerie" or "suspense" risers (wrong emotion for an upbeat SaaS ad); long risers that build tension the VO doesn't pay off; stock "swoosh" on every cut; literal phone ringtone or iMessage-style dings (familiar and cheap-sounding, and they make viewers check their phones).
- **Tonal matching (Inference):** prefer files tagged "Tonal"/"Musical", or use plucks and tones and pitch-shift them to the music's key (or a fifth). They then blend into the score (the Sono Sanctus "mush with the music" effect).

### Gaps
- No 2024–2026 article was found with an explicit "premium tech ad palette" list. The lists above are inferred from practitioner quotes and catalogue observation.

---

## 3. Music selection and editing for ads (genre/tempo, beat cuts, structure, VO space, endings)

### Takeaway
Choose music first, and choose a track with a clear beat and a real ending. Cut and edit on downbeats at phrase ends. Use the track's structure so the drop or hook lands on the product reveal. Leave the mids clear for VO by ducking 18–24 dB under speech, or by carving EQ. End on the track's natural ending or a downbeat with a reverb tail, never a fade over the last bar.

### Cited Findings
- Cut "right on that final downbeat so the chord resolves properly"; "cutting on a tap—or a downbeat—will almost always lead to a seamless transition"; downbeats show as waveform spikes; "cut on beat at the end of a chord progression to avoid interrupting it." — [Storyblocks: cutting music without a sudden stop](https://www.storyblocks.com/resources/tutorials/3-techniques-cutting-music-without-sudden-stop) (page images dated 2026)
- If no usable ending exists, add reverb to the final note "so the cut reads as an ending instead of a break." Beginners "fade out over the very end of the music and assume that counts as smooth." Pros often choose the music first to set emotion and tempo. A track "with no clear beat and no proper ending leaves you fighting the audio." — [Storyblocks](https://www.storyblocks.com/resources/tutorials/3-techniques-cutting-music-without-sudden-stop)
- When cutting from earlier in a track to its ending, as is common in commercials, check that a key change hasn't happened in between. — [Film Editing Pro: 4 Tricks for Shortening & Extending Music](https://www.filmeditingpro.com/4-tricks-for-shortening-extending-music-cues/) (2020; snippet only)
- Commercial music is conventionally delivered as 60/30/15s cutdowns. — [YouTube: How to do 60, 30 and 15 second music edits for commercial spots](https://www.youtube.com/watch?v=-J1alGICK44)
- Sono Sanctus composer Wesley Slover on arranging music for sound design: "I want to remove things more than I want to add more stuff… to make sure there's enough room for the sound design." — [School of Motion / Sono Sanctus](https://schoolofmotion.com/blog/sono-sanctus-podcast-podcast)
- Ducking alternative: "aggressively EQ the music track, carving out the primary frequencies" of the voice. Dynamic-EQ or sidechain ducking does this automatically. — [VI-Control thread](https://vi-control.net/community/threads/ducking-music-volume-to-make-way-for-voice-narration-is-there-a-better-way-than-side-chaining.83139/); [Waves: sidechaining tips](https://www.waves.com/what-is-sidechain-compression-5-top-sidechaining-tips)
- Auto-ducking is "the single biggest time saver in audio mixing." — (search summary of [Pixflow: mixing dialogue, music & SFX in Premiere](https://pixflow.net/blog/audio-mixing-premiere-pro/))

### Inferences
- **Genre/tempo for upbeat SaaS/small-business ads in 2025–26 (Inference, no sourced trend data):** warm, light electronic or indie-pop, "corporate-modern" without the ukulele/glockenspiel cliché. Good fits: lo-fi house, future-garage-lite, minimal tech-house, chill-pop with claps or snaps, plucky synth-pop. Tempo around 100–124 BPM. Use instrumental tracks only; vocal tracks clash with the VO. Epidemic search ideas: "upbeat tech", "modern corporate", "minimal electronic", "positive pop instrumental", "chill house", "startup". Filter for tracks with stems and a clear ending.
- **Structure map for a 45–60s spot (Inference):**
  - 0–5s: intro or sparse hook (the problem, VO starts).
  - 5–15s: verse or low-energy groove under explanation.
  - About 15–20s: small lift or filter sweep into the product reveal. The riser is the music's own build where possible; otherwise add a 1–2s tonal riser.
  - 20–45s: main groove or "drop" at reduced density under feature VO.
  - Last 5–8s: lift to the brightest section for the payoff and logo.
  - Final 1–2s: musical "button", the last downbeat hit with a natural ring-out.
- **Cut on the music (Inference):** put the big visual changes (scene changes, reveals) on bar downbeats. Put small accents (UI taps, text pops) on snares or claps (beats 2 and 4) or on 8th notes. Never time a hero SFX against the beat.
- **Music density under VO (Inference):** pick tracks whose mid-range (about 1–4 kHz) is light during verses. Use stems (drop the lead melody or vocal chop) under VO and bring them back in VO gaps. A 2–4 dB dip around 2–4 kHz on the music bus while VO plays is a gentle carve.
- **Ending (Inference):** prefer the track's real ending, placed with Epidemic's edit tool (see section 4) so it lands exactly on the logo frame. Put the logo appearance on the final downbeat, then hold 1–2s of ring-out or silence before the cut to black.

### Gaps
- I found no authoritative 2025–2026 data on which music genres or tempos perform best in SaaS ads. The genre suggestions are inference.
- I found no source with a specific frequency range for EQ-carving music under VO. The 2–4 kHz figure is inference from standard speech-intelligibility practice.

---

## 4. Epidemic Sound specifics (search terms, SFX taxonomy, track-length editing)

### Takeaway
Epidemic's SFX titles follow a "Category, Subcategory, descriptors" scheme with tag slugs such as `user-interface--click`, `user-interface--alert`, `swooshes--whoosh`, `designed--whoosh` and `designed--riser`. Add adjectives like "soft", "airy", "clean", "tonal", "short", "dry" to get premium results. The track-length tools (web "Adapt" and the API/MCP "EditRecording") create edits to a target length, keep required regions at set offsets, and output stems.

### Cited Findings
- **SFX taxonomy and search terms (Epidemic Sound MCP SearchSoundEffects, 2026-11-26; no public URL):**
  - Query "user interface click soft" → 4,707 results, top hits tagged `user-interface--click` (e.g. "Soft, Dry, Woody", "Soft Round Pluck", "Menu Tone", "Tech Button 02–08").
  - Query "whoosh soft air" → 8,263 results, tags `swooshes--whoosh` and `designed--whoosh` (e.g. "Soft, Clean", "Soft Airy", "Airy, Soft Wind, Breeze, Variations").
  - Query "riser short tonal" → 10,000+ results, tag `designed--riser` (e.g. "Short, Fast, Tonal, Musical", "Very Short, Tonal, Rumble", "Fast, Short, Clean 01").
  - Query "notification message pop" → 4,152 results, tags `user-interface--alert` and `user-interface--click` (e.g. "Software, Interface, Pop Up, New Message", "Alert, Notification, Message, Text 01–05").
  - Many file durations far exceed the sound itself (e.g. a click file of 2.7–10s, often several takes or a reverb tail). Expect to trim, and to use the multi-take "Variations" files to avoid repetition.
  - The search API supports filters on duration (ms) and tag slugs with ALL/ANY/NOT_ANY matching. Excluding tags (e.g. NOT_ANY on video-game-style tags) is possible.
- **Web "Adapt" tool:** length presets of 15, 30 and 60s, or a custom length up to 5 minutes; can be made loopable; length adaptations don't use credits; the song's structure can be rearranged to fit pacing. — [Epidemic Sound: How to use Adapt](https://www.epidemicsound.com/blog/how-to-use-adapt) / [Adapt tutorial](https://www.epidemicsound.com/tools/adapt/tutorial/) (via search summary; the scrape returned no body text)
- **API "create versions" differs from web Adapt:** edit versions "only adjust the track's duration; they do not change the mood, energy, or musical characteristics." — [Epidemic Sound developer docs: create versions](https://developers.epidemicsound.com/docs/create-versions/) (via search summary; direct fetch blocked)
- **EditRecording (MCP/API) parameters (from the Epidemic Sound MCP tool schema):**
  - `targetDurationMs` (max 300,000 ms)
  - `forceDuration` (exact length)
  - `loopable`
  - `maxResults` (several candidate edits)
  - `preferenceRegions` (PREFER/AVOID source time ranges)
  - `requiredRegionsAtOffsets` (force a source region, e.g. the drop or the ending, to land at a given ms offset in the edit)
  - `skipStems` (stems are generated unless skipped)
  - `downloadAudioFormat` MP3/WAV

  It runs as an async job (PENDING/IN_PROGRESS/COMPLETED/FAILED), polled with PollEditRecordingJob.
- Adapt was covered as a new AI tool in Sept 2025. — [We Rave You (Sept 2025)](https://weraveyou.com/2025/09/this-new-ai-tool-helps-creators-adapt-music-to-their-content/)

### Inferences
- **Workflow (Inference):**
  1. Lock the VO and animation timing first.
  2. Choose a track and mark the source times of its best drop or hook and its natural ending.
  3. Call EditRecording with `targetDurationMs` = ad length, `forceDuration: true`, `requiredRegionsAtOffsets` to place the drop at the product-reveal time and the ending so its last downbeat hits the logo frame, and `preferenceRegions` AVOID for vocal or busy sections.
  4. Request `maxResults` 3–5, audition them, download WAV with stems for ducking and arrangement.
- **Recommended search strings (Inference, informed by the observed titles):**
  - "user interface click soft", "soft round pluck", "menu tone", "glass tap", "dry woody click"
  - "pop up new message" (use sparingly)
  - "whoosh soft airy", "whoosh clean short", "breeze variations"
  - "riser short tonal musical", "riser clean"
  - "soft hit", "bloom", "shimmer", "sub drop" (for the logo)
  - "paper", "receipt printer" (only if story-critical)
  - Filter durations under about 1.5s for UI sounds.
  - Avoid results titled "video game", "bubbly", "cartoon", "dramatic", "eerie", "suspense", "trailer".

### Gaps
- I couldn't read the full Adapt tutorial or the developer "create versions" doc (blocked host, or a JS-rendered page with no body text), so the details on how Adapt rearranges sections and whether it adds or keeps endings are unconfirmed.
- I did not verify whether Epidemic offers curated "UI / motion graphics SFX packs" as named collections. The MCP search only returns individual effects.

---

## 5. Mix levels and loudness targets

### Takeaway
VO is the anchor. Put music about 18–24 dB under VO while speech is present and let it rise in the gaps. Keep SFX below the VO except for one or two intentional moments. Deliver online or social at about -14 LUFS integrated with peaks at or below -1 dBTP. Broadcast is -23 LUFS (EBU R128) or -24 LKFS (ATSC A/85).

### Cited Findings
- YouTube, Spotify and most streaming services normalize to around -14 LUFS. Broadcast TV uses -23 LUFS (EBU R128) or -24 LUFS (ATSC A/85). — (search summary of [Descript: audio levels for video](https://www.descript.com/blog/article/how-to-set-the-perfect-audio-levels-for-video) and [Adorama: mastering audio levels](https://www.adorama.com/alc/mastering-audio-levels/))
- Background music should start roughly 18–24 dB quieter than the voice during speech. Another guide gives about -18 to -25 dB so music sits clearly under the voice. Music alone can come up closer to -10 dB. — [Overseer OS: background music volume under voiceover](https://www.overseeros.com/blog/background-music-volume-under-voiceover); [Storyblocks: balancing audio in Premiere](https://www.storyblocks.com/resources/tutorials/how-to-balance-audio-premiere-pro) (both via search summary)
- SFX: "usually -12 dB to -18 dB… never louder than your dialogue unless a big, intentional moment calls for it." Another guide gives -10 to -20 dBFS. — (search summary of [Storyblocks](https://www.storyblocks.com/resources/tutorials/how-to-balance-audio-premiere-pro) / [Pixflow](https://pixflow.net/blog/audio-mixing-premiere-pro/))
- Descript (page modified Nov 2026): peaks around -6 dB, dialogue averaging near -16 LUFS, dialogue between -6 and -12 dB peak for platforms like YouTube. — [Descript: audio levels for video](https://www.descript.com/blog/article/how-to-set-the-perfect-audio-levels-for-video)
- US TV commercial loudness is governed by the CALM Act (ATSC A/85). Older ITU guidance for commercials restricted post-mix compression to a 2:1 slope with onset at -12 dBFS. — [ITU-R BS.2054](https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2054-2005-PDF-E.pdf)
- Caveat: the sources mix peak (dBFS) and loudness (LUFS) references and disagree on exact ranges. — (same search set)

### Inferences
- **Practical targets for this ad (Inference, built from the ranges above):**
  - VO: about -16 LUFS short-term while speaking (dialogue-normalized), peaks around -6 dBFS before the master limiter.
  - Music under VO: 18–22 dB below the VO in perceived loudness (roughly -34 to -38 LUFS short-term), lifted by 6–10 dB in VO gaps and for the end-card button.
  - UI clicks and taps: 10–20 dB under the VO, short.
  - Whooshes and risers: 8–15 dB under the VO.
  - Hero hit or logo: up to about VO level for one moment, ideally in a VO gap.
  - Master: -14 LUFS integrated, ≤ -1 dBTP true peak, for YouTube, Instagram, TikTok and LinkedIn.
- **Quality checks (Inference):** listen on phone speakers and in mono. Mute the SFX track and ask whether the ad loses anything; if not, cut more SFX. Watch with the sound off to confirm the visual timing carries itself. Check that no SFX lands on top of a key VO word (move it into a VO gap or reduce it 6 dB under the word).
- **ElevenLabs VO (Inference):** add light compression and a high-pass filter around 80 Hz. Small de-essing if needed. Avoid heavy reverb so it matches a clean, close, "premium" product tone.

### Gaps
- I found no authoritative platform spec (Meta, TikTok, LinkedIn) for ad loudness in 2024–2026. The -14 LUFS figure is the streaming normalization convention, not an ad-platform requirement.
- The relative-level figures come from vendor tutorials (Storyblocks, Pixflow, Overseer, Descript), not from standards bodies or named mix engineers.
