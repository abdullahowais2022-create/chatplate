# Clear, Natural AI Voiceover for a Short Ad (ElevenLabs, 2025–2026) and Mixing It Over Music

Research date: 2026-11-26. ElevenLabs docs were read through Firecrawl, because plain WebFetch could not resolve elevenlabs.io from this sandbox. ffmpeg option names and defaults come from the locally installed ffmpeg 6.1.1 (`ffmpeg -h filter=...`).

Context: the earlier attempt used `eleven_v4`, the library voice "May – clear & engaging sales rep" and tags like [warm]/[happy]. The user said it was "not clear" and "sounds AI". Music was ducked about 12 dB under speech, and the final mix was −14 LUFS.

## 1. Which ElevenLabs model, voice settings and known issues give the clearest commercial read?

### Takeaway
`eleven_v4` (launched 2026-09-28) is ElevenLabs' current flagship and the recommended default. It has only two settings, Stability and Similarity, plus Clone Strength for PVCs. It has no Speed or Style slider and no SSML. It reproduces the source voice very faithfully, flaws included, so a poor library voice or heavy tagging can sound worse on v4. For a plain, controllable commercial read, `eleven_multilingual_v2` is the main alternative. It is documented as "most stable", has a Speed control (0.7–1.2) and supports break tags. The documented starting settings are Stability ~50, Similarity ~75, Style 0.

### Cited Findings
**Model line-up (as of Nov 2026)**
- Current flagship TTS models: Eleven v4 ("most emotive, high quality", 90+ languages, 100,000-character limit), Eleven v4 Turbo (real-time, ~100 ms), Eleven v3 ("dramatic delivery and performance", 5,000-character limit), Eleven Multilingual v2 ("Lifelike, consistent quality… Most stable on long-form generations", 10,000 chars) and Flash v2.5 (fast and cheap, ~100 ms) — [ElevenLabs Models](https://elevenlabs.io/docs/overview/models)
- The model guide's "Quality" requirement says: "Use `eleven_v4` or `eleven_multilingual_v2`… Best for high-fidelity audio output with rich emotional expression" — [ElevenLabs Models](https://elevenlabs.io/docs/overview/models)
- `eleven_turbo_v2`/`v2_5` are deprecated as "functionally equivalent" to Flash but with higher latency. Flash and Turbo are built for latency, not ad quality — [ElevenLabs Models](https://elevenlabs.io/docs/overview/models)
- Multilingual v2 is described as "Well-suited for corporate videos and e-learning… Produces consistent, high-quality audio output" — [ElevenLabs Models](https://elevenlabs.io/docs/overview/models)
- v4 launched September 28, 2026 with a Turbo variant. Coverage: [TechCrunch](https://techcrunch.com/2026/09/28/elevenlabs-new-v4-speech-model-supports-more-expression-control-and-90-languages/), [ElevenLabs blog](https://elevenlabs.io/blog/eleven-v4)
- ElevenLabs says v4 "is a net upgrade over Eleven v3, delivering better results in almost every case", but "a few edge cases may call for a different fit" — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)

**v4 settings and constraints**
- "Both variants use two voice settings: Stability and Similarity." Lower stability gives "more expressive, varied delivery". Higher similarity enforces adherence "which can come at the cost of some naturalness" — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)
- "Style and Speed sliders are not available in Eleven v4, and SSML is not supported." — [What is Eleven v4?](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/what-is-eleven-v4)
- With a Professional Voice Clone, v4 adds a Clone Strength slider. Lower values smooth the voice slightly and add "performance flexibility, which often sounds better overall". "For most voices, start at 0%." — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)
- v4 reproduces the source voice's "accent, delivery, loudness, and other distinctive qualities". ElevenLabs warns that recurring "clipping, plosives, uneven EQ, or jumps in volume… are very likely in the training data for that voice. The Eleven v4 model just captured them." Its showcase audio has "no EQ, compression, normalization, de-essing, plosive removal" — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)
- Existing PVCs have to be fine-tuned for v4. In My Voices you hover over the voice and click "+" next to Eleven v4 — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)
- "Voice Design voices work with Eleven v4, but they may not be as performative or sound as good as with earlier models." — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)
- "Eleven v4 is under active, continuous development… its behavior may shift over time." ElevenLabs recommends re-testing periodically — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)

**Audio tags on v4/v3**
- Tags "are not perfect yet". Because v4 also generates sound effects, "a tag can occasionally be interpreted as a request for a sound effect rather than a delivery instruction". ElevenLabs recommends tags that "clearly describe the voice quality you want (e.g. `[low, gravelly voice]`…)" — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- "Tags land more readily when the delivery is already in the voice's training data." — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- A third-party guide suggests "one clear cue per clause" and a library voice rather than a designed voice for the final read. This is unverified secondary advice — summarized via search of [Morphic v4 guide](https://morphic.com/resources/how-to/eleven-v4-guide) / [OrcaRouter](https://www.orcarouter.ai/blog/eleven-v4-audio-tags-and-instant-voice-cloning)
- PVCs "are not fully optimized for Eleven v3", so ElevenLabs suggests v4 for PVCs and Voice Library voices — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)

**Generic settings guidance (v2-era sliders; also useful for reading v4 Stability)**
- "The most common setting is stability around 50, similarity around 75, and keeping style at 0, with minimal changes thereafter." — [ElevenLabs TTS playground docs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)
- Setting Stability "too low may result in odd performances that are overly random and cause the character to speak too quickly". Too high "can lead to a monotonous voice" — [ElevenLabs TTS playground docs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)
- Similarity: with a poor-quality original voice and similarity "set too high, the AI may reproduce artifacts or background noise" — [ElevenLabs TTS playground docs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)
- Style exaggeration "has shown to make the model slightly less stable… we recommend keeping this setting at 0 at all times." — [ElevenLabs TTS playground docs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)
- Speaker Boost: differences "generally rather subtle", with some extra latency. It is not available on v3 — [ElevenLabs TTS playground docs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)
- Speed: default 1.0, range 0.7–1.2. "Extreme values may affect the quality." — [ElevenLabs TTS playground docs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)
- "The AI is non-deterministic… sliders function more as a range". ElevenLabs suggests generating several takes, especially at low stability — [ElevenLabs TTS playground docs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)
- "Pacing… is highly influenced by the audio used to create the voice." Voices trained on short samples can come out "unnaturally fast" — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)

### Inferences
- Likely causes of the "not clear / sounds AI" result:
  - Emotion tags ([warm], [happy]) on a "sales rep" voice probably pushed an over-acted, sing-song read. Vague emotion words can also be misread on v4.
  - v4 faithfully copies any sibilance, EQ or loudness quirks from the library voice's source recordings.
  - With no Speed slider on v4, a fast-trained voice stays fast.
  - Possibly too low a Stability setting, which ElevenLabs links to speaking "too quickly".
- Recommended approach for an ad:
  - **Option A, `eleven_v4`:**
    - Set Stability medium-high (about 0.55–0.7) for a consistent, grounded read, and Similarity ~0.75.
    - Use Clone Strength 0% if it is a PVC.
    - Use no tags, or at most one plain descriptive tag at the start (e.g. `[clear, friendly, conversational announcer]`). Do not tag every line.
  - **Option B, `eleven_multilingual_v2`:**
    - Set Stability ~0.5–0.6, Similarity ~0.75, Style 0, Speaker Boost on, Speed 0.95–1.0.
    - This gives speed control and break tags, and the docs call it the most stable option.
  - Generate 3–5 takes per line in either case and pick the best.
- Choose a voice whose v4 training exists and whose preview already sounds clean and unprocessed. With v4, voice choice matters more than settings.

### Gaps
- I found no official per-use-case numbers for v4 Stability or Similarity (e.g. "ads: 0.6"). The values above are my extrapolation from the generic docs.
- I found no independent A/B tests of v4 vs multilingual_v2 for commercial clarity, and no Reddit or user reports on v4 mumbling or artifacts. Searches surfaced only vendor material.
- I could not verify the public settings or training status of the "May – clear & engaging sales rep" voice.

## 2. How should you choose a voice for clarity, and which library voices are recommended for commercials?

### Takeaway
On v4, the voice's source recording sets the quality ceiling. Pick a clean, mid-pitched, neutral-accent voice whose preview has no harsh "s" sounds, no plosives and no level jumps. Prefer a Voice Library or PVC voice over a Voice Design voice. ElevenLabs' own commercial category highlights a few voices, but there is no reliable ranking.

### Cited Findings
- v4 captures "EQ, quality, volume, and any other minor details and imperfections in the audio, such as plosives, harsh sibilance, and volume fluctuation" from the source. Listen to the Voice Library preview first — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)
- Voice Design voices may "not… sound as good" on v4 — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)
- For PVC training on v4, ElevenLabs recommends "sticking to a single speaking style in your training audio". Clear, clean training audio matters "more than ever" — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)
- When the generation language matches the voice's language, v4 preserves the accent. A different language gets a native-sounding accent instead — [Eleven v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)
- ElevenLabs' commercial voice-library page highlights "Hale" (confident, friendly, expressive American male), "Bryan" (polished and measured), "Allison" (fun millennial female) and "Jerry B." (upbeat promos). These are summarized from search results, not independently auditioned — [ElevenLabs Voice Library: Commercial](https://elevenlabs.io/voice-library/commercial); also [Advertisement](https://elevenlabs.io/voice-library/advertisement), [TV commercial](https://elevenlabs.io/voice-library/tv-commercial)
- Phone speakers favour roughly 500 Hz–4 kHz, and "1‑4 kHz region is particularly important for intelligibility" — [Sound On Sound, Mixing For Mobile](https://www.soundonsound.com/techniques/mixing-mobile)
- "Many cell phone speakers begin to drop off around 800 Hz" — [Waves, small speakers](https://www.waves.com/tips-for-great-mixes-on-small-speakers)

### Inferences
- A very deep male voice loses its body on phones, because the fundamental and lower harmonics sit below the phone's roll-off. A very breathy or high voice can turn thin or sibilant.
- A mid-range voice with strong 1–4 kHz articulation translates best on phones. That can be a male baritone-tenor or an alto-to-mezzo female.
- Gender matters less than diction, a clean source and a steady level.
- A "sales rep" voice with energetic, uptalk-style delivery tends to sound more synthetic than a calm, conversational "friend telling you about it" read.
- Practical shortlist method:
  - Filter the Voice Library by Commercial/Advertisement, English, and the accent you want.
  - Audition 4–6 voices on the actual ad script with identical settings.
  - Play each on a phone speaker and pick the most intelligible, not the most "exciting".

### Gaps
- I found no verified, independent 2026 ranking of the best ElevenLabs ad voices. Third-party "best voices" blogs ([example](https://theplanettools.ai/blog/best-elevenlabs-voices-deep-dive-2026)) look unreliable.
- I found no controlled study on male vs female voice intelligibility on phone speakers specifically.

## 3. How should the script be written and formatted so ElevenLabs reads it naturally?

### Takeaway
On v4/v3, punctuation and sentence structure are the main controls. Ellipses add weight and pauses, CAPS add emphasis, and short sentences give rhythm. SSML `<break>` does not work on v4/v3. Normalize numbers, symbols and URLs into words. Fix brand pronunciation with IPA in slashes on v4, or with alias/pronunciation dictionaries and phonetic respelling on v2. Generate line by line and assemble the lines in the edit.

### Cited Findings
- "Eleven v4 and Eleven v3 do not support SSML break tags. Use audio tags, punctuation (ellipses), and text structure to control pauses and pacing." — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- v4 punctuation: "Ellipses (...) add pauses and weight; Capitalization increases emphasis; Standard punctuation provides natural speech rhythm." Also: "Text structure strongly influences output with v4." — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- On v2/Flash, `<break time="x.xs" />` gives pauses up to 3 s. "Using too many break tags in a single generation can cause instability. The AI might speed up, or introduce additional noises or audio artifacts." Dashes and ellipses are alternatives but "less consistent" — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- v4 understands IPA wrapped in forward slashes, e.g. `"/ˌsænfrənˈsɪskoʊ/"`. Include the stress marks ˈ ˌ, apply IPA selectively, and "generate more than once and select the best result" — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- SSML phoneme tags work only with `eleven_flash_v2`. On other models ElevenLabs suggests "writing words more phonetically", using capitals, dashes or apostrophes, or alias tags in pronunciation dictionaries (e.g. Claughton → "Cloffton"). Dictionaries are case-sensitive — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- Narrative or emotional descriptor text ("she said, trembling") may be spoken aloud and has to be cut in post — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- Text normalization:
  - Phone numbers, currency, dates, times, URLs, units and symbols are commonly misread.
  - The docs suggest spelling them out: "$42.50" → "forty-two dollars and fifty cents", "100%" → "one hundred percent", "elevenlabs.io/docs" → "eleven labs dot io slash docs".
  - Multilingual v2 normalizes better than Flash, and normalization is on by default.
  - [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices); [ElevenLabs Models](https://elevenlabs.io/docs/overview/models)
- ElevenLabs suggests "Layered outputs": generate speech in segments and assemble them in an audio editor — [ElevenLabs TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)

### Inferences
- Brand name "TillText":
  - The risks are "Til-text" run together, "till text" with odd stress, or "TILL-tekst".
  - Test these variants: `TillText`, `Till Text`, `Till-Text`, and on v4 an IPA form like `"/ˈtɪlˌtɛkst/"` (draft; check it with an IPA dictionary).
  - Keep whichever variant reads consistently across 3 takes. Use the same spelling in every line so the timbre and stress match.
- Formatting pattern for ad lines:
  - One idea per sentence, 6–12 words.
  - A full stop rather than a comma at the end of each beat.
  - An ellipsis only before the payoff or CTA, e.g. "Meet TillText... receipts, sorted."
  - At most one CAPS word per line for emphasis.
  - No exclamation marks on every line, because they push a shouty, salesy read.
- Generate each line, or each 1–2 sentences, separately, with the same voice, settings and context. Pick the best take of each and leave about 150–400 ms of natural silence between lines in the edit.
  - This gives full control of pacing on v4, which lacks a Speed slider.
  - The risk is inconsistent tone between lines. To reduce it, generate pairs of adjacent lines together, or keep the preceding sentence in the text and trim it off.
  - Caveat: the ElevenLabs API has `previous_text`/`next_text` request-stitching parameters, but I did not re-verify them for v4 in this session.
- If a slower read is needed on v4, `atempo=0.95` in ffmpeg can slow it about 5% while keeping pitch. Larger changes will start to sound processed. This is an inference, not tested here.

### Gaps
- I did not verify whether `previous_text`/`next_text` and seeds are supported on v4 for consistency across separately generated lines.
- I could not find guidance specific to how hyphens and em dashes behave on v4, beyond the v2-era note that they are "less consistent".

## 4. What pacing gives a clear ad voiceover?

### Takeaway
Plan on about 2.5 words per second (~150 wpm): roughly 38 words for a 15 s spot, 75 for 30 s and 150 for 60 s. Warmer reads run nearer 2.2 wps (~130 wpm). Cramming words in removes the pauses that make lines land, and listeners hear that as amateur and unclear.

### Cited Findings
- "Conversational English… runs at roughly 2.5 words per second… energetic, upbeat reads can push closer to 3… warm, contemplative reads might land closer to 2.2." — [Killerspots, radio script timer](https://killerspots.com/blog/radio-script-timer-how-long-is-a-30-second-script)
- Word budgets: 15 s = 35–40 words, 30 s = 70–80 ("Push past 80 and the pauses disappear"), 60 s = 140–160 — [Killerspots](https://killerspots.com/blog/radio-script-timer-how-long-is-a-30-second-script)
- Talent "can compress a read by maybe 10 to 15 percent before the audio quality starts dropping… The listener registers the rush." — [Killerspots](https://killerspots.com/blog/radio-script-timer-how-long-is-a-30-second-script)
- "Long brand names… eat time". Scripts with music beds that need room "have less time for words" — [Killerspots](https://killerspots.com/blog/radio-script-timer-how-long-is-a-30-second-script)
- Vary pace: "slower at the hook, faster through the middle, slowing again at the call to action" — [Killerspots](https://killerspots.com/blog/radio-script-timer-how-long-is-a-30-second-script)
- Other sources (via search) give professional VO at 120–160 wpm, and about 2.3 wps / ~70 words for 30 s. These are from search summaries, e.g. [Voices.com](https://www.voices.com/blog/?p=18207), [Debbie Grattan](https://www.debbiegrattan.com/blog/how-to-write-a-voice-over-script/)
- Low stability in ElevenLabs can "cause the character to speak too quickly" — [ElevenLabs TTS playground docs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)

### Inferences
- For a motion-graphics ad with on-screen text and music, aim lower than radio: about 130–150 wpm, so 30–35 words per 15 s and 65–70 per 30 s.
- Measure the actual ElevenLabs output. If it runs above ~160 wpm, cut words, raise Stability, add sentence breaks, or switch to multilingual_v2 with Speed 0.9–0.95.

### Gaps
- I found no study linking TTS speaking rate to intelligibility on phone speakers specifically. The figures above come from human-VO industry practice.

## 5. How should the VO be post-processed and mixed so it stays clear over music on phone speakers?

### Takeaway
Clean and shape the VO:
- High-pass at 80–100 Hz.
- Cut mud gently at 200–500 Hz only if the voice sounds boxy.
- Add a modest presence lift in the 1–5 kHz range, since 1–4 kHz is the phone-critical band.
- De-ess at 5–8 kHz.
- Use 2:1–4:1 compression so the level stays steady.

Then make sure the music is far enough below the voice: about 15–24 LU below the VO while it speaks, plus 3–6 dB of ducking. Carve a dip around 1–4 kHz in the music. Keep the VO mono and centred, check the mix in mono and on a phone, and deliver at −14 LUFS integrated, −1 dBTP (−16 LUFS is a safe alternative for Reels/TikTok).

### Cited Findings
**EQ**
- High-pass "below 80–100 Hz" to remove rumble — [iZotope, How to EQ vocals](https://www.izotope.com/en/learn/how-to-eq-vocals)
- Warmth/mud sits at 200–500 Hz: "small broad cut if congested" — [DaVinci Resolve Club, Fairlight dialogue EQ](https://davinciresolveclub.com/fairlight-eq-dialogue.md)
- iZotope Neutron places boxiness at 500–900 Hz and dialogue presence boosts at 3–7 kHz — [iZotope Neutron EQ manual](https://s3.amazonaws.com/izotopedownloads/docs/neutron2/equalizer/index.html)
- iZotope's vocal guide ties presence/intelligibility to 5–8 kHz and sibilance to roughly 8–12 kHz, and treats de-essing as a separate step — [iZotope, How to EQ vocals](https://www.izotope.com/en/learn/how-to-eq-vocals)
- Note: sources disagree on exact bands. Presence is given as 3–7 kHz (Neutron) vs 5–8 kHz (iZotope blog), and mud as 200–500 vs 500–900 Hz.
- For small speakers, "approximately 500Hz to 4kHz dominates our perception… for vocals the 1‑4 kHz region is particularly important for intelligibility" — [Sound On Sound](https://www.soundonsound.com/techniques/mixing-mobile)

**Music level and ducking**
- Start the music "roughly 18 to 24 dB quieter than the voice while someone is speaking". Dense information 22–30 dB, sparse emotional scoring 15–20 dB. Their blind-listening benchmark settled on "music 18 LU below the narration" — [OverseerOS](https://www.overseeros.com/blog/background-music-volume-under-voiceover) (blog, published 2026-10-20, not a standard)
- Measure in LUFS rather than with sliders. Example: VO −18 LUFS, music −38 LUFS = 20 LU. A heavily mastered track (−10 LUFS) starts about 18 LU louder than a quiet ambient one (−28 LUFS) at the same fader — [OverseerOS](https://www.overseeros.com/blog/background-music-volume-under-voiceover)
- "If the static music bed already sounds good, try lowering it by another 3–6 dB while narration is active." Music tracks with vocals, bright lead synths, constant cymbals or heavy midrange guitars compete with speech — [OverseerOS](https://www.overseeros.com/blog/background-music-volume-under-voiceover)
- Accessibility guidance has used about 20 dB of speech-to-background separation as an example of strong contrast (as cited by OverseerOS). Academic work measures the speech-to-background "Loudness Difference" with BS.1770 and finds the preferred balance varies by listener and context — [OverseerOS](https://www.overseeros.com/blog/background-music-volume-under-voiceover); [Salford repository](https://salford-repository.worktribe.com/OutputFile/1489990)
- Ducking parameters across sources (via search):
  - Vindral docs: 10 ms attack, 200 ms release, 4:1, "−6 to −12 dB is a gentle dip" — [Vindral sidechain ducking](https://composer-docs.vindral.com/operators/operators-sidechain-ducking.html)
  - Sound On Sound: low ratio ~2:1, attack 15–20 ms, slow release 600–700 ms. "A couple of dB of ducking can make a real difference" — [Sound On Sound, Duck Tales](https://www.soundonsound.com/techniques/duck-tales)
  - DaVinci guide: 6–10 dB gain reduction — [Hollyland](https://store.hollyland.com/blogs/creator-hub/do-audio-ducking-in-davinci-resolve)

**Mono and phones**
- "Many small speaker systems are either mono… checking your mix in mono is critical" — [Waves](https://www.waves.com/tips-for-great-mixes-on-small-speakers)
- Vocal reverb, delay and chorus details are lost on phone speakers, while the dry mono vocal survives — [Sage Audio](https://www.sageaudio.com/articles/perfecting-vocals-on-modern-playback-systems)
- Test by muting the music to check the words alone. "Turning the whole mix up doesn't make words easier to understand" — [Pippit](https://www.pippit.ai/blog/dialogue-intelligibility-on-phone-speakers) (commercial blog)

**Loudness delivery**
- YouTube normalizes to about −14 LUFS with a −1 dBTP true-peak ceiling and does not boost quieter audio — [iZotope, mastering for streaming](https://www.izotope.com/en/learn/mastering-for-streaming-platforms.html); [vloggingpro](https://vloggingpro.com/tools/audio-loudness/)
- Instagram and TikTok targets conflict between sources. Some say −14 LUFS ([Wubble technical standards](https://wubble.ai/docs/studio-tools/brand-kit/technical-standards), [dev.to](https://dev.to/arthurvalle1_a2586dd2b4bc/mastering-for-reels-tiktok-and-youtube-shorts-the-lufs-14-standard-2ck5)). Others say −16 LUFS ([TikTok/Reels guide](https://d1lex0gkhzvix9.cloudfront.net/tiktok-instagram-reels-loudness)). None of these are official platform documents. Keep peaks ≤ −1 dBTP because re-encoding can cause inter-sample clipping.

**ffmpeg filter facts (local ffmpeg 6.1.1, `ffmpeg -h filter=X`)**
- `acompressor` / `sidechaincompress`:
  - threshold is linear, 0.000976563–1, default 0.125 (≈ −18 dBFS).
  - ratio 1–20 (default 2), attack 0.01–2000 ms (default 20), release 0.01–9000 ms (default 250).
  - makeup 1–64 (linear), knee default 2.83, detection rms/peak, link average/maximum.
  - `sidechaincompress` compresses the first input using the second input as the key.
- `deesser`: i (intensity 0–1, default 0), m (max de-essing 0–1, default 0.5), f (frequency, normalized 0–1, default 0.5), s (output mode).
- `loudnorm`: i (−70 to −5, default −24), lra (1–50, default 7), tp (−9 to 0, default −2), measured_i/lra/tp/thresh, offset, linear (default true; only linear when measured_* values are supplied = 2-pass), dual_mono (default false; set true for mono files).
- `alimiter`: limit 0.0625–1 (linear), attack 0.1–80 ms (default 5), release 1–8000 ms (default 50), level (auto-level, default true; set level=disabled to avoid gain jumps).
- `equalizer`: f, t (h/q/o/s/k), w, g (dB). `highpass`: f (default 3000), poles 1–2 (default 2 = 12 dB/oct), w default 0.707.

### Inferences
**Why the previous mix was unclear**
- A 12 dB duck sounds like a lot, but if the music was a loud mastered track it may still have sat only about 6–12 LU under the VO. The sources point to about 15–24 LU of separation for clear narration.
- Measure both stems with `ebur128` or `loudnorm print_format=summary` before deciding the offset.
- Normalizing the final mix to −14 LUFS does not change the VO-to-music ratio.

**Suggested ffmpeg chain** (starting values to tune by ear)
```bash
# 1) VO clean-up (mono): HPF 90 Hz, gentle mud cut, presence lift, de-ess, compress, light limit
ffmpeg -i vo_raw.wav -af "\
aformat=channel_layouts=mono,\
highpass=f=90:poles=2,\
equalizer=f=250:t=q:w=1.0:g=-2.5,\
equalizer=f=3000:t=q:w=0.9:g=2.5,\
equalizer=f=5500:t=q:w=1.5:g=1.0,\
deesser=i=0.4:m=0.5:f=0.55,\
acompressor=threshold=0.1:ratio=3:attack=5:release=60:knee=2.8:makeup=2,\
alimiter=limit=0.89:attack=5:release=50:level=disabled" vo_proc.wav
#   threshold 0.1 ≈ -20 dBFS; limit 0.89 ≈ -1 dBFS; makeup 2 ≈ +6 dB (check levels)

# 2) Measure loudness of each stem (no output)
ffmpeg -i vo_proc.wav  -af loudnorm=print_format=summary -f null -
ffmpeg -i music.wav    -af loudnorm=print_format=summary -f null -

# 3) Mix: music EQ carve + static offset + sidechain duck keyed by VO, then 2-pass loudnorm
ffmpeg -i vo_proc.wav -i music.wav -filter_complex "\
[0:a]asplit=2[vo][key];\
[1:a]highpass=f=40,equalizer=f=2500:t=q:w=1.0:g=-4,equalizer=f=300:t=q:w=1.0:g=-2,volume=-8dB[mus];\
[mus][key]sidechaincompress=threshold=0.03:ratio=4:attack=15:release=400:knee=4:link=average:detection=rms[ducked];\
[vo]pan=stereo|c0=c0|c1=c0[vost];\
[vost][ducked]amix=inputs=2:normalize=0:duration=first[mix];\
[mix]loudnorm=I=-14:TP=-1.5:LRA=9:print_format=summary" -ar 48000 mix.wav
#   threshold 0.03 ≈ -30 dBFS. Adjust the music volume so it sits about 15-24 LU below the VO
#   during speech. The duck should add about 3-6 dB on top of that (raise ratio or lower
#   threshold for more).
#   For true 2-pass loudnorm, run once with print_format=json, then pass measured_I/TP/LRA/thresh
#   and offset with linear=true.

# 4) Mono check
ffmpeg -i mix.wav -af "pan=mono|c0=0.5*c0+0.5*c1" mix_mono_check.wav
```

**Other recommendations**
- Choose or edit music without vocals or busy lead melodies under the speech sections. Bring the music up 3–6 dB in gaps and the end card.
- Keep the VO dry: no reverb or stereo widening.
- Deliver −14 LUFS / −1 to −1.5 dBTP for YouTube and Reels/TikTok, or −16 LUFS if prioritizing headroom.
- Before signing off, check on a phone speaker at mid volume with the music on, and once with the music muted.

### Gaps
- I found no official Instagram, TikTok or Meta loudness specification. Their numbers come from third-party guides that disagree (−14 vs −16 LUFS).
- I found no authoritative ad-industry standard for VO-to-music LU separation. The 18–24 LU figure is from a 2026 blog's own listening test. Broadcast specs (e.g. EBU R128 or ATSC A/85 dialogue-gated loudness) were not checked in this session.
- iZotope's guidance on exact de-essing and presence bands differs between its own articles, so treat the frequencies as starting points.
- The ffmpeg chain above was not run on the project's actual audio here. Parameter names and ranges were checked against the local ffmpeg 6.1.1 help output.
