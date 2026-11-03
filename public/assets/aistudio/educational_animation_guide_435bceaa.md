# The Warm Paper Style: Design System for Educational Explainer Videos

*Written for someone new to design: every design term is explained in the glossary at the end. Updated 29 Oct 2026 (v2.2: works for any topic, with full sound design).*

## 1. The short version

**The one-sentence style:** a beautifully printed picture book that happens to move. Warm cream paper, hand-inked lines, a handful of flat colors, one clear subject per scene, almost no words on screen. Only the spark (the idea in motion) is allowed to glow.

**Mood words:** warm, calm, handmade. **Not:** techy, dark, busy, glowing.

**The eight rules (cheat sheet):**

1. The background is light cream paper in every scene, except at most one optional Night scene (section 3).
2. Use only the palette in section 3. Colors have fixed roles; each topic decides what those roles mean (section 2).
3. One idea and one hero (the main thing to look at) per scene.
4. Almost no text on screen: at most 1 headline, 3 tiny labels, plus the spoken captions.
5. Hand-drawn lines with a slight wobble, flat fills, no gradients, no neon.
6. Simple cartoon characters, never realistic, reused from one character sheet.
7. Calm motion: one thing moves at a time, and things are drawn on rather than popped in.
8. Sound is designed, not added: a voice, a quiet music bed and tiny effects timed to the picture (section 12).

## 2. The Topic Sheet: apply the style to any subject

**The style never changes; only the Topic Sheet does.** Everything in sections 3 to 18 (palette, lines, layout, motion, sound) works for any subject: history, biology, money, space, software, health. What changes per video is a one-page Topic Sheet, filled in before anything is drawn. Paste it under the master prompt in section 18.

| Field | What to write | Example (why the Moon shows one face) |
| --- | --- | --- |
| Topic and takeaway | The subject, plus the one sentence a viewer should remember | The Moon spins once per orbit, so the same side always faces us |
| Audience and length | Who it is for; 30, 60 or 90 seconds | Curious beginners, 45 s |
| Fact sheet | Every name, date, number and label that will appear, each with a source | Rotation period equals orbital period; link to a NASA or textbook page |
| Color roles | What Amber, Vermilion, Teal and Dusty Blue mean in this video (section 3) | Amber: sunlight; Vermilion: the face toward Earth; Teal: Earth; Blue: space |
| Symbols | The eight symbol slots (section 10) | Hero: the Moon; flow: its orbit path; change: the spin locks |
| Metaphor | Only if the subject cannot be seen: one picture to use throughout | Not needed |
| Cast | Who appears, each with one signature trait (section 5) | A small guide character with a flashlight |
| Dark scene | Which scene, if any, uses the Night color | Scene 1, space |
| Voice, music and images | One narrator and one music mood, reused across the series; the voice source (text-to-speech tool, your own recording, or none); whether images are allowed (default: no) | Warm, measured voice from a text-to-speech tool; soft bells; no images |
| Scene plan | One row per scene: template, picture, narration line, sound cue | See below |

**Example scene plan (4 scenes, about 30 seconds):**

| # | Template | Picture | Narration (12 words max) | Sound cue |
| --- | --- | --- | --- | --- |
| 1 | Hook | A moon with one face turned to a small Earth | The Moon always shows us the same face. Why? | Bell motif, one soft tick |
| 2 | Process | The Moon walks once around Earth, turning once | It spins exactly once for every trip around Earth. | Pencil scratch as the path draws |
| 3 | Cutaway | Earth's pull on a bulge of the Moon, slowing its spin | Long ago, Earth's pull slowed the Moon until the two matched. | Rising sweep as the spin locks |
| 4 | Payoff | The near side lit, the far side hidden | So we only ever see one side. | Chord swell with the closing image |

## 3. Color system

| Name | Hex | Role (the same in every video) |
| --- | --- | --- |
| Paper | #F4EDDF | Background (every scene except the optional Night scene) |
| Paper Deep | #E7DCC5 | Ground, panels, flat shadows |
| Ink | #2A2520 | Outlines, headlines, caption band |
| Soft Ink | #6B6154 | Small labels, faint guide lines |
| Amber | #E3A33B | The spark: the energy, idea or thing in motion the video is about |
| Vermilion | #D5472F | Look here: the single most important thing in the scene, the payoff or the moment of change |
| Teal | #2F8478 | The machinery: parts, structure, mechanism |
| Dusty Blue | #7FA6BD | The setting: water, sky, calm surroundings (soft, never saturated) |
| Night (rare) | #232C2F | One dark scene per video at most (night, deep sea, space, inside a body) |

**Roles are fixed; meanings change per topic.** Decide them in the Topic Sheet and keep them for the whole video:

| Topic | Amber (the spark) | Vermilion (look here) | Teal (machinery) | Dusty Blue (setting) |
| --- | --- | --- | --- | --- |
| Laser history | Light | The laser beam | Atoms, mirrors | Sea, sky |
| Photosynthesis | Sunlight | The sugar being made | Leaf cells | Sky, air |
| How money moves | Coins and payments | The bottleneck or the change | Banks and institutions | The town |
| The internet | Data packets | The destination, or the failure | Cables, servers | Ocean, sky |
| Ancient history | The key decision | The turning point | Armies, buildings | Land, sea |

**Rules**

- **70 / 20 / 10:** about 70% paper tones, 20% ink and teal and blue, 10% amber and vermilion.
- **One vermilion thing per scene.** It tells the viewer's eye where to look.
- **Skin tones:** keep a set of 4 or 5 flat, warm-toned skin tones from light to deep (they sit outside the palette table) and reuse them. Hair and clothing use palette colors or flat tints of them. No shading.
- **Never use:** pure black, pure white, navy backgrounds, saturated cyan, magenta or purple, gradient backgrounds.
- **Glow:** only a soft amber halo around the spark (a real light source, or whatever carries the idea) (40px blur at most, 40% opacity at most). Nothing else glows.
- **Contrast:** Ink on Paper is very high contrast and is the default for text. Amber is never used for text. Vermilion and Teal are about 3.8:1 against Paper, so use them for big text and shapes only, not small labels.
- **The one dark scene:** if the story needs night (a deep ocean, a city at night, outer space, the inside of a body), use Night with Paper-colored lines and amber glows. Not navy, not neon. Once per video at most.

## 4. Line, shape and texture

- **Outlines:** Ink, about 4px on a 1080px-wide frame, round line ends. Nothing perfectly geometric: circles slightly off, straight lines very slightly bowed (1 to 2px).
- **Fills:** flat color, nudged 3 to 6px away from the outline, like a slightly misaligned print. This single trick gives the handmade, elegant look.
- **Shadows:** a flat Paper Deep shape under objects. No blur shadows.
- **Paper grain:** one static texture over everything at 4 to 6% opacity. Very faint vignette (10% at most). Do not animate the grain.
- **Line boil:** outlines re-wobble 8 to 10 times per second, amplitude 1 to 2px. Fills and text stay still. It reads as "someone is drawing this" without being distracting.
- **Shape language:** rounded, chunky, simplified. If you cannot recognize an object when it is thumbnail-sized, simplify it.
- **Backgrounds:** mostly empty paper plus a ground line. Maximum three background objects per scene. Full-bleed painted backgrounds only for one "world" scene per video.

## 5. Characters

**Rules**

- Simplified cartoon proportions: large head (about a quarter to a third of body height), simple body, 2 or 3 flat colors per outfit.
- Faces: dot eyes, small eyebrows, one nose line, simple mouth. No teeth, no wrinkles, no shading. Expression comes from eyebrows and posture.
- **One signature trait per recurring person** that works as a silhouette (hair, glasses, hat, tool). These are design devices, not likenesses.
- **Never realistic.** No photographic faces, no 3D renders, no skin texture.
- Draw each character once as layered parts (head, torso, arms, props) so the code can animate them, and reuse the same drawing in every scene.
- Add small side characters for life: a cashier, a fish, a student. They make scenes feel inhabited.

**Example cast (laser story):**

| Person | Signature trait |
| --- | --- |
| Einstein | Cloud of white hair, bushy mustache, rolled-up sleeves |
| Townes | Round glasses, dark hair |
| Basov | Swept brown hair, tie |
| Prokhorov | Gray hair, cardigan |
| Maiman | Rolled sleeves, a ruby rod in hand |

**Casting for any topic**

- **Historical figures:** stylized with one signature trait, respectful rather than caricature, never a photo likeness.
- **Everyday people:** invent a small recurring cast (a curious student, a shopkeeper, a doctor) with fixed outfits. Vary age, skin tone and body type.
- **Non-human heroes:** an animal, object or idea (a coin, a virus, a planet) gets dot eyes and one signature trait, and stays the same in every scene.
- **Pure abstractions:** use one guide character who points and reacts, rather than inventing a new mascot each scene.
- **Avoid** real living people and real brand logos unless you have permission.

**If you use AI image generation:** use it only if the Topic Sheet allows images (default: no). Keep them small and embedded in the file, and use them for paper textures, props and background details, never for faces. Suggested wording:

> flat vector illustration, hand-inked outline, limited palette of cream, ink brown, amber, vermilion, teal, subtle paper grain, no gradients, simple friendly shapes, lots of empty space

**Negative wording:** no photorealism, no 3D render, no neon, no glow, no navy background, no text, no realistic faces, no clutter.

## 6. Typography

Use three fonts for four roles, and nothing else: Fraunces, Caveat and DM Sans. All are free Google Fonts and should be embedded inside the file so they work offline.

| Role | Font | Used for | Size (vertical 1080 wide) |
| --- | --- | --- | --- |
| Headline | Fraunces (Bold or SemiBold) | Scene headline, title card | 88 to 100px, max 2 lines |
| Caption | Fraunces (Regular) | Spoken captions | 56 to 64px |
| Handwritten note | Caveat | Annotations with an arrow, max 2 per scene | 56 to 72px |
| Tiny label | DM Sans (SemiBold), uppercase, spaced | Names of parts ("mirror", "atom") | 34 to 40px |

- Nothing on screen is smaller than 34px in a 1080-wide frame (28px in a 1920-wide horizontal frame).
- Allowed text pairs: Ink on Paper or Paper Deep; Paper on Ink or Night; Soft Ink for small labels on Paper; Vermilion or Teal only for large text (56px or more, such as handwritten notes). Never place text directly over busy art.
- Left-align or center consistently within a video. Do not mix.

## 7. Layout and composition

**Vertical frame (1080 x 1920), starting values to tune on a real phone:**

| Zone | Y range | Contents |
| --- | --- | --- |
| Platform-UI keep-out (top) | 0 to 220 | Background only |
| Headline zone | 240 to 460 | Optional headline |
| Hero zone | 480 to 1150 | The main drawing |
| Caption zone | 1180 to 1420 | Spoken captions on an Ink band |
| Platform-UI keep-out (bottom) | 1500 to 1920 | Background only |

Keep 60px clear on the left and 140px on the right (buttons live there). The caption band spans x = 60 to 940 so it clears the right-hand buttons.

**Horizontal (1920 x 1080):** 96px margins; caption band along the bottom 200px.

**Composition rules**

- **The hero rule:** one clearly dominant subject, taking up at least half the frame width. Small diagrams floating in a big empty frame make the weakest scenes.
- **Eye path:** headline, then hero, then one label. Never more than three stops.
- **Squint test:** blur your eyes; you should still see one obvious focal point.
- **Vary the shot** from scene to scene: wide, medium, close-up, top-down, over-the-shoulder. This is what makes it feel like a film.
- **Empty space is good,** but only around a big subject, not instead of one.
- Never let art enter the caption zone.

## 8. Text budget (hard limits)

| Element | Limit per scene |
| --- | --- |
| Headline | 1, max 5 words on max 2 lines |
| Tiny labels | Max 3, each max 3 words |
| Handwritten notes | Max 2, each max 6 words |
| Equations | Max 1, drawn big |
| Spoken captions | Max 2 lines, max 12 words visible at a time |
| Dates, tags, scene counters, fake data readouts | None |

If you are tempted to add text, draw it instead. Exception: chart values and category names do not count toward the label limit (max 5 of each, 34px or larger).

## 9. Motion

**Principles**

- **One thing moves at a time.** The eye follows motion, so use it deliberately.
- **Draw things on.** Lines and equations are drawn stroke by stroke, not faded in all at once.
- **Ease everything** (slow in, slow out). Nothing starts or stops abruptly.
- **Slow camera.** A gentle push-in of 3 to 5% over a scene. No shaking, no spinning.
- **The spark is the exception:** the thing carrying the idea (a photon, a coin, a signal) can move faster than anything else, which makes it feel special.

**Timing guide (30 frames per second)**

| Action | Duration |
| --- | --- |
| Object enters | 0.5 to 0.8 s |
| Line or equation draws on | 0.8 to 1.5 s |
| Pause before the next beat | 0.3 to 0.5 s |
| Scene transition | 0.5 s soft cross-fade or page-slide, one type per series |
| Final hold on last image | 1 s |

**Never use:** bounce-zoom text, glitch effects, particle explosions, lens flares, spinning icons, floating dust everywhere, screen shake.

## 10. The visual dictionary (consistent symbols)

Define symbols once and reuse them in every video so viewers learn your visual language. Example for the laser topic (the eight slots below work for any subject):

| Concept | Drawing | Color |
| --- | --- | --- |
| Photon | A short wavy line with a small round head | Amber |
| Twin photons | Two identical waves side by side, labeled x2 | Amber |
| Laser beam | A straight, thick line with a soft halo | Vermilion |
| Atom | Cluster of 3 to 5 circles with one thin ring | Teal and Amber |
| Energy levels | Two horizontal lines, one above the other | Soft Ink |
| Mirror | A thin vertical bar | Teal |
| Equation | Handwritten on a chalkboard, drawn on stroke by stroke | Paper on a Night-colored board |
| Time passing | A calendar page or a book gathering dust | Paper Deep |

**For any new topic,** fill these eight slots before drawing anything, and keep them fixed for the whole video and the whole series:

| Slot | Question | Laser | Photosynthesis | Money |
| --- | --- | --- | --- | --- |
| Hero object | What is it about, as one drawable thing? | A photon | A leaf | A coin |
| Mechanism | What does it work through? | Atoms and mirrors | Chloroplasts | A bank |
| Flow | What moves? Draw it as a line with a head | Wavy light | Light, water and carbon dioxide becoming sugar | Money passing hands |
| Change | What is the moment of transformation? | One photon becomes two | Light energy is stored in sugar | A loan becomes new money |
| Time | How do you show time passing? | Calendar page, dusty shelf | Sun crossing the sky | Calendar, growing coin pile |
| Place | Where does it happen? | Desk, lab, sea | A field | A town |
| Scale | How do you show big or small? | Zoom into an atom | Zoom into a cell | Zoom out to a country |
| People | Who is in it? | Einstein and the builders | A guide character | A shopkeeper and a banker |

**When the subject cannot be seen** (economics, memory, fairness), pick one visual metaphor and keep it for the whole video: a river for cash flow, a seesaw for trade-offs. Name it in the Topic Sheet and never switch it mid-video.

## 10A. Scene templates for any topic

Plan each video as a sequence of these templates, and never use the same one twice in a row.

| Template | What it shows | Typical length |
| --- | --- | --- |
| Hook | A striking image plus a question headline | 3 to 5 s |
| Close-up | The hero object large in frame, one label | 4 to 6 s |
| Cutaway | A zoom-in or inside view that shows the mechanism | 5 to 8 s |
| Process | Three steps along one path, drawn on one by one | 6 to 9 s |
| Compare | Split frame with a divider; one difference in Vermilion | 5 to 7 s |
| Time passes | Calendar page, shelf or sun arc; the year written big by hand | 4 to 6 s |
| People | Portraits in a row with simple name plates | 5 to 7 s |
| Data | One simple hand-drawn chart (see below) | 5 to 7 s |
| Examples | Three small tiles that appear one by one | 6 to 8 s |
| Payoff | Before and after, joined by the spark | 5 to 7 s |

**Charts and maps in this style:** ink-outlined bars or points with flat fills in one color, with a single Vermilion bar as the point. At most five bars or points; write values directly on them; no gridlines or legends; bars draw up one at a time. Maps: simplified shapes on Paper Deep, only the places that matter, one Vermilion pin.

## 11. Story structure for social video

**Length:** 45 to 60 seconds for short-form (about one scene per 7 seconds; scenes run 3 to 9 seconds, and a hook scene runs 3 to 5). Two minutes is too long for a first social run.

**Beat sheet for a 50-second video**

| Time | Beat | Purpose |
| --- | --- | --- |
| 0 to 5 s | Hook | A question or surprising claim plus a striking image |
| 5 to 12 s | Setup | Who, when, what was the idea |
| 12 to 38 s | 3 or 4 core beats | One idea per beat, each with its own picture |
| 38 to 46 s | Payoff | The result, shown big (for the laser story: the beam lighting up the world) |
| 46 to 50 s | Close | One line to remember; image that could loop back to the start |

**Narration rules**

- Short sentences, 12 words or fewer (so each fits one caption), one fact each. If a sentence will not fit two lines at 56px or more, shorten the sentence; never shrink the caption.
- Plain words. Say "light" before you say "electromagnetic radiation".
- Roughly 130 to 150 spoken words per minute, so a 50-second video is about 110 to 125 words.
- Leave a breath (0.3 to 0.5 s) between sentences. Picture leads the voice by about half a second.
- Captions burned into the video, because many people watch with sound off. The story must still make sense on mute.

**Hook patterns (any topic):** a surprising fact, a contradiction, a question the viewer cannot answer, or a "what if". Examples: "Einstein never built a laser. So who did?" · "The Moon always shows us the same face. Why?" · "Your heart beats about 100,000 times a day. How does it keep time?"

## 12. Sound design

**Sound is designed in three layers, planned scene by scene, and mixed from the same timeline as the picture.** For scale, a well-built 51-second video with 7 scenes had seven narration clips on the timeline, a soft synthesized music bed, and 19 tiny effects, roughly one every 2.7 seconds. Sound is a required block in the master prompt (section 18), because agents skip anything the prompt does not ask for.

| Layer | What it is | Level and behavior |
| --- | --- | --- |
| 1. Narration | One voice per series; each scene's clip starts about 0.5 s after its scene starts, and the scene runs at least 0.5 s past the end of the clip (so the swish and cross-fade fall in silence) | The loudest layer, and the reference for everything else |
| 2. Music bed | Warm, soft chords changing slowly; a sparse three-note bell motif; optional low drone. Fades in over about 2.4 s and out over about 3 s | Quiet. Ducked by roughly half whenever the voice speaks, so speech always wins |
| 3. Effects | Tiny sounds tied to picture events | So soft they are felt more than heard. Starting point: about 20 to 30 dB under the voice, then tune by ear. If you can name the sound on first listen it is too loud; if it is inaudible on a phone speaker it is too quiet |

**Your sonic signature:** use the same key and the same bell motif in every video of a series. Play it at the start and the end, and viewers will recognize you by sound alone.

**Effects dictionary (works for any topic):**

| Picture event | Sound | How it is built |
| --- | --- | --- |
| A line or equation draws on | Pencil scratch | Low-passed noise with a gentle 11 Hz flutter, riding the pen tip |
| Scene change | Paper swish | Soft low-passed noise burst of about 0.7 s, starting 0.4 s before the cross-fade, panned slightly to one side |
| An item appears (list, tile, label) | Soft tick | Short sine blip of about 90 ms at 880, 1100, 1320 Hz; step the pitch up for each item |
| Transformation or reveal ("it doubles") | Rising sweep | Sine gliding 420 to 940 Hz over about 1.2 s, with a little reverb |
| Something lands or arrives | Low thump | 95 Hz sine with a fast decay of about 0.3 s |
| A lamp or machine switches on | Soft flash | Low-passed noise burst with a quick decay |
| Something launches or leaves | Falling sweep | Sine gliding 900 to 380 Hz, with reverb |
| A bounce, repeat or step | Tiny click | 1.5 kHz click of about 70 ms, panned a little further each time |
| The payoff or closing image | Chord swell | Four-note chord for about 5 s with long reverb, starting as the image appears |
| A problem or setback (suggested addition) | Low muted thud | 70 to 90 Hz, short and soft; never a harsh buzzer |

**Timing rules**

- Land each effect on its picture beat, within about 40 ms. Swishes and swells may start up to 0.4 s early.
- Every scene gets at least one cue, and every transition gets a swish.
- Never stack two effects at once, and keep them in the gaps between sentences so they never fight a key word.
- Silence is a tool: thin the music for one beat before the payoff.
- Many people watch muted, so sound is decoration. The story must still work with sound off.

**The cue sheet:** every video ships with a cue sheet listing time, scene, sound, and the picture beat it is synced to. Embed it as inert text inside the HTML (a script tag of type text/plain).

**Single source of truth:** define each beat once in the timeline (for example "flash: 1.45 s into scene 2") and let both the drawing code and the sound code read it. Typing cue times once in the picture code and again in the mix script lets them drift apart.

**Making and delivering the sound**

- Synthesize everything from oscillators, noise and filters. No samples and no stock music means no licensing worries and a tiny file.
- Mix offline from the timeline (a script plus ffmpeg) into one soundtrack file, aiming for about -16 to -14 LUFS with a true peak under -1.5 dB. The same file goes into the MP4.
- **Never ship silent by accident.** A page that plays without its audio file should say so on screen rather than play mute. Either embed the audio or show a visible "audio file missing" warning.
- Embed large files (audio, fonts) with a build script, never by typing base64 into the model's output. Embedded media is also very expensive to paste or upload into an AI chat (roughly a million tokens for a 51-second soundtrack), so make a separate review build, below.
- If your tool cannot run code, synthesize the same cues live with the Web Audio API, driven by the same timeline.

**Two builds, two jobs:** the final build embeds the fonts and the soundtrack, and is the one you play and post. The review build strips them out (leaving the timeline, scene code and cue sheet), so it is small enough to upload to an AI chat for feedback without burning tokens. The tool should produce both automatically.

**Voice:** one narrator per series. If using text-to-speech, pick a premium voice, write for the ear (short sentences, commas where you want pauses), and listen to the whole thing before rendering. Mixing one clip per scene keeps picture and voice in sync.

## 13. Formats and export

| Format | Size | Use |
| --- | --- | --- |
| Vertical | 1080 x 1920 | TikTok, Reels, Shorts (primary) |
| Feed | 1080 x 1350 | Instagram feed |
| Horizontal | 1920 x 1080 | YouTube, website |

- **Vertical is the primary layout.** Everything important sits in the headline zone (y 240 to 460), hero zone (480 to 1150) and caption zone (1180 to 1420), so a 4:5 feed version can be cropped from it (about y 160 to 1510). Horizontal is not a crop: a 16:9 slice of a vertical frame is only about 608px tall. Render it with its own layout (section 7), which is easy because everything is drawn by code.
- 30 fps, MP4 (H.264), audio AAC, captions burned in.
- Always check on a real phone before posting.

## 14. Build spec for your AI tool

Ask your tool to build it this way:

1. **One self-contained HTML file** drawn with code (Canvas 2D or SVG). Fonts embedded as base64. No external requests.
2. **Everything is a pure function of time:** `renderAt(t)` draws the exact frame for time t, with seeded randomness (no `Math.random()` at draw time). That makes scrubbing perfect and export exact.
3. **Timeline as data:** a list of scenes with start, duration, narration text and a draw function. Durations come from the audio files, not guesses: scene length = clip length + 0.5 s lead-in + at least 0.5 s tail.
4. **Audio-driven clock** during playback so picture and voice stay locked.
5. **Start with a tap.** Show a big "tap to play" button. Never autoplay with a pause icon showing while the audio is silently blocked.
6. **Reusable component library:** `wobbleLine`, `flatFill`, `paperGrain`, `character`, `chalkboard`, `caption`, `label`, `arrow`, `flowLine`, `spark`. Topic-specific pieces (a photon, a leaf, a coin) are built from the Topic Sheet's symbol slots and then saved to the library. Every new video reuses these so the series stays consistent.
7. **Export pipeline:** a headless browser steps through `renderAt(t)` at 30 fps and saves frames, then ffmpeg joins the frames with the audio into an MP4.
8. **Captions on by default,** drawn by the same code (so they export).
9. **Pre-render the paper grain** as a static tile rather than generating noise every frame.

**Deliverables:** the HTML, the exported MP4 (if your tool can run a headless browser and ffmpeg), the soundtrack file, the cue sheet, the fact sheet, a QA report with a contact sheet of stills, and a lightweight review build (no embedded audio or fonts) for sharing with an AI for feedback. The sound pipeline rules (offline mix, one timeline for picture and sound, cue sheet, embedding) are in section 12.

**If your tool lacks a capability:**

- **No text-to-speech:** use your own recording, or build a captions-only video with estimated durations (about 2.3 words per second, plus the padding in section 12) and re-time it when the audio arrives.
- **No code execution (no ffmpeg, no headless browser):** deliver the HTML with its render mode, synthesize the sound live with the Web Audio API, and say plainly that no MP4 was exported.
- **No network (cannot download fonts):** fall back to Georgia for headlines and captions, a system handwriting font for notes and a system sans for labels, and say so in the QA report.

## 15. Fact-checking rules

- Write a **fact sheet** with sources before drawing anything. Every name, date and place that appears on screen is on the sheet. Only cite a source you actually opened. If your tool cannot browse, label each fact "unverified" and list it for the user to check; never invent a source or a figure.
- **Check labels separately from narration.** The voice can be right while an on-screen label is wrong (for example, a label saying Bern where the voice says Berlin).
- **Hedge honestly:** "some scanners", "many mice", "symbolic colors". Do not overclaim.
- **No fake math.** Either use a real equation or none. Sloppy symbols (like an atom count that grows) teach the wrong thing.
- Put sources in the post caption or pinned comment.

**Health, legal, financial and safety topics:** use primary sources (health agencies, regulators, official statistics), give no personal advice, hedge claims, add "general information, not advice" to the post caption, and have a qualified person check the script before posting.

## 16. Pre-flight checklist

Run before posting. Items 1 to 3 catch most problems.

1. **Contact-sheet test:** export stills at 25%, 50%, 75% and 100% of every scene and look at all of them.
2. **Collision test:** compute the bounding box of every text label and fail on any overlap with other text, the art, the caption zone or the frame edge. Eyeballing misses overlapping labels.
3. **Clipping test:** nothing is cut off at an edge or sitting in the wrong place.
4. **Safe-zone test:** everything important is inside the zones in section 7.
5. **Contrast test:** every text and background color pair is one of the allowed pairs in section 6.
6. **Text-budget test:** counts match section 8.
7. **Mute test:** is the story clear with no sound?
8. **Freeze test:** pause on a random frame; is there a clear hero?
9. **Squint test:** one focal point?
10. **Phone test:** watch on a real phone at arm's length.
11. **Facts test:** every name, date and place checked against the fact sheet.
12. **Sound test:** listen once on headphones and once on a phone speaker. Audio starts on tap and stays in sync, the voice always wins, effects are felt but not nameable, nothing clips.
13. **Cue test:** every scene has at least one cue, every transition has a swish, and the cue times match the picture beats.
14. **Topic test:** the Topic Sheet is complete and the color roles are used consistently.

## 17. The anti-slop list

If any of these appear, rework the scene:

- Dark navy or black backgrounds with cyan, magenta or purple glow
- Gradient mesh backgrounds, frosted-glass panels
- HUD brackets, fake telemetry, tiny monospace labels everywhere
- Stacked effects: grain plus vignette plus bloom plus lens flare
- Floating dust or particles in every scene
- Every scene having a title, subtitle, tag, date stamp and caption
- Clone characters with only a different pair of glasses
- Paragraphs of text on screen
- Photoreal or uncanny AI faces
- The same centered symmetrical layout in every scene
- Decorative frames, sparkles, emoji-style icons

**Sound slop to avoid:**

- Stock cinematic risers and booms, or a whoosh on every movement
- Music that never ducks under the voice, or is louder than the voice
- Effects you can clearly name, or two effects at once
- Sound as the only way to follow the story
- Copyrighted or royalty-unclear music

## 18. Paste-ready master prompt

Copy this into your AI tool and then paste your filled-in Topic Sheet (section 2) after it.

```
Produce a short educational video as ONE self-contained HTML file drawn with code (Canvas 2D; no images unless the Topic Sheet allows them, and then only small embedded ones for textures and props, never faces), plus its soundtrack, in the "Warm Paper" style below. The TOPIC SHEET at the end of this message gives the subject, facts, cast, symbols, color roles and scene plan. Follow everything exactly. If something is missing from the Topic Sheet, make a sensible choice and state it in one line, except for facts: never invent facts or sources (see FACTS at the end).

LOOK
- A light cream paper background (#F4EDDF) with a faint static grain (5%) in every scene, except at most one optional Night scene. Never navy, pure black, neon or gradient backgrounds.
- Palette ONLY: Paper #F4EDDF, Paper Deep #E7DCC5, Ink #2A2520, Soft Ink #6B6154, Amber #E3A33B, Vermilion #D5472F, Teal #2F8478, Dusty Blue #7FA6BD, and Night #232C2F (one dark scene per video at most, with paper-colored lines and amber glow). Exceptions to the palette: 4 or 5 flat skin tones from light to deep, and flat tints of palette colors for hair and clothing.
- Color ROLES (the Topic Sheet says what they mean for this topic): Amber = the spark (the energy, idea or thing in motion); Vermilion = look here (the single most important thing in the scene; max one per scene); Teal = the machinery (parts, structure, mechanism); Dusty Blue = the setting (water, sky, surroundings).
- Lines: Ink outlines about 4px at 1080 wide, round ends, slightly imperfect; flat color fills offset 3-6px from the outlines; flat shadows; no gradients except a soft amber halo (max 40px blur, 40% opacity) around the spark. Re-wobble outlines 8-10 times per second; fills and text stay still.
- Characters: simple flat cartoon, large head, dot eyes, one signature trait each, never realistic, drawn once as layered parts and reused. Vary skin tones, ages and body types. Add small side characters for life. No real brand logos; avoid real living people.
- Fonts (embedded): Fraunces for headlines and captions, Caveat for handwritten notes (max 2 per scene), DM Sans (uppercase, spaced) for tiny labels. Nothing smaller than 34px at 1080 wide.

LAYOUT (1080x1920 vertical is primary; a 4:5 version can be cropped from it; horizontal 1920x1080 gets its own layout)
- Keep 220px clear at top, 420px clear at bottom, 60px left, 140px right.
- Headline zone y 240-460 (max 2 lines, 88-100px). Hero zone y 480-1150: one dominant subject at least half the frame width. Caption zone y 1180-1420: Paper text, 56-64px, on an Ink band spanning x 60-940, max 2 lines. Art and labels never enter the caption zone.
- Use the scene templates from the Topic Sheet (hook, close-up, cutaway, process, compare, time passes, people, data, examples, payoff) and never repeat one twice in a row. Vary the shot between scenes.

TEXT BUDGET PER SCENE
- Max 1 headline (5 words, 2 lines), 3 tiny labels (3 words each), 2 handwritten notes, 1 equation or chart (chart values and category names are exempt from the label limit: max 5 of each, 34px or larger). No dates, tags, counters or fake data readouts. Labels must never overlap anything. Allowed text colors: Ink on Paper, Paper on Ink or Night, Soft Ink for small labels, Vermilion or Teal only for large text (56px or more).

MOTION
- One thing moves at a time. Draw lines and equations on stroke by stroke. Ease everything. Camera push-in 3-5% per scene. 0.5s soft cross-fade between scenes. No bounce, glitch, particles, flares or shake.

STRUCTURE
- 45-60 seconds unless the Topic Sheet says otherwise, about one scene per 7 seconds, each 3-9s (a hook scene runs 3-5s). A hook in the first 3 seconds. One idea per scene. End on a strong closing image and one memorable line.
- Narration: short sentences (12 words max, so each fits one caption), plain words, about 130-150 words per minute, burned-in captions on by default. The story must still make sense on mute.

SOUND (required, not optional)
- Three layers on one timeline: (1) narration clips placed about 0.5s after each scene starts; (2) a quiet music bed: warm soft chords, a sparse three-note bell motif, optional low drone, fade in 2.4s and out 3s, ducked by about half whenever the voice speaks; (3) tiny effects timed to picture events.
- Effects: at least one cue per scene, roughly one every 2-4 seconds, never two at once, so soft they are felt more than heard (start about 20-30 dB under the voice, then tune by ear). Dictionary: line draws on = pencil scratch; scene change = paper swish starting 0.4s before the cross-fade; item appears = soft tick (pitch steps up per item); transformation = rising sweep; something lands = low thump; lamp or machine on = soft flash; launch or leave = falling sweep; bounce or step = tiny click; payoff = chord swell as the closing image appears.
- Synthesize every sound from oscillators, noise and filters. No samples, no stock music. Final mix about -16 to -14 LUFS, true peak under -1.5 dB.
- Define each beat ONCE in the timeline data and let both the drawing code and the sound code read it. Embed a cue sheet (time, scene, sound, picture beat) as inert text inside the HTML.

BUILD
- Everything is a pure function of time: window.renderAt(t) with seeded randomness. Timeline as data; scene length = narration clip length + 0.5s lead-in + at least 0.5s tail, so swishes and cross-fades fall in silence (with no text-to-speech available, estimate 2.3 words per second and say so). Fonts embedded as base64. No external requests.
- Show a big "tap to play" button; never autoplay silently. Build the soundtrack offline from the timeline (script plus ffmpeg) into one file and play it. The HTML must EITHER embed the audio OR show a visible warning if the audio file is missing. Embed fonts and audio with a build script; never type base64 yourself. If you cannot run code, synthesize the same cues live with the Web Audio API.
- Include a render mode so frames can be exported at 30fps and joined with the soundtrack via ffmpeg.

DELIVERABLES
1) the HTML file, 2) the soundtrack file, 3) the cue sheet, 4) the fact sheet, 5) a QA report with a contact sheet of stills, 6) a lightweight REVIEW build of the HTML with fonts and audio stripped out (small enough to paste into an AI chat), keeping the timeline and cue sheet, 7) the exported MP4 (1080x1920, 30fps, H.264 video, AAC audio) if you can run a headless browser and ffmpeg; if you cannot, say so plainly.

QA BEFORE YOU FINISH
- Render stills at 25/50/75/100% of every scene. Run an AUTOMATED check on the bounding boxes of all text and labels: fail on any overlap with other text, the art, the caption zone or the frame edge. Also check contrast, safe zones, the text budget, that every on-screen name, date and place is on the fact sheet, and that every scene has a sound cue. Fix everything you find, then list what you fixed. FACTS: cite only sources you actually opened; if you cannot browse, label each fact unverified and list it for the user to check; never invent a source or a figure; hedge honestly (some, many); no made-up equations; for health, legal, financial or safety topics give no advice and use primary sources.

TOPIC SHEET (paste below)
[Topic and takeaway] [Audience and length] [Fact sheet] [Color roles] [Symbols] [Metaphor, if needed] [Cast] [Dark scene] [Voice, music and images] [Scene plan table]
```

## 19. Glossary (design terms in plain English)

- **Palette:** the fixed set of colors you allow yourself.
- **Hierarchy:** which thing the viewer should look at first, second, third.
- **Hero / focal point:** the main subject in a scene.
- **Negative space (whitespace):** empty area that gives the subject room to breathe.
- **Scrim / caption band:** a solid or semi-solid strip behind text so it stays readable over any picture.
- **Contrast:** how strongly text stands out from what is behind it.
- **Easing:** making movement start and stop gradually instead of abruptly.
- **Line boil:** the gentle wobble of hand-drawn lines in traditional animation, caused by redrawing each frame.
- **Misregistration:** printed color slightly offset from its outline; gives a handmade look.
- **Safe zone:** the part of a vertical video not covered by app buttons and captions.
- **Pure function of time:** the picture at any moment depends only on the clock, so you can jump anywhere and get the exact frame.
- **Slop (as in AI slop):** generic, over-effected, template-looking output with no point of view.
- **Topic Sheet:** the one-page set of choices (facts, color roles, symbols, cast, scene plan) that adapts the style to a subject.
- **Music bed:** quiet background music under the narration.
- **Ducking:** automatically lowering the music while the voice speaks.
- **Cue:** one sound effect placed at a precise moment; a cue sheet lists them all.
- **Sonic signature:** a short, recognizable sound (like a three-note motif) used in every video of a series.
- **LUFS:** a unit for overall loudness; social platforms are commonly targeted around -16 to -14.
- **Synthesize:** generate sound from math (tones and noise) instead of using recorded samples.
