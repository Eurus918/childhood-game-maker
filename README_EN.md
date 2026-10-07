# Childhood Game Maker

> Talk for a minute. Get a playable version of your own childhood.

Tell it where you grew up, what was outside your door, what you did all summer,
and how your family called you home for dinner. It turns your answers into a small
game you can play — and send to someone.

No code. No art skills.

[中文文档](README.md)

**Play online: https://eurus918.github.io/childhood-game-maker/**

It's also an **installable PWA**: open the link on a phone or desktop browser and
choose "Add to Home Screen / Install". You get a full-screen app icon that
**works offline**. Same link, both a web page and an app.

---

## Run it

```bash
git clone https://github.com/Eurus918/childhood-game-maker.git
cd childhood-game-maker
npm start
# open http://localhost:5173
```

**Zero dependencies — no `npm install` needed.** There is no build step;
the source *is* the artifact. Edit anything in `src/` or `content/` and refresh.

> Don't open `index.html` directly. The project uses native ES Modules,
> which browsers refuse to load over `file://`.

---

## How it works

1. Answer 6 questions. The world grows on the right as you answer.
2. Click **Play**. Arrow keys to move, space to interact (**step onto a doorway and
   press space to change scene**), `TAB` to skip to the next season, `R` to restart.
   On touch: tap the ground to walk, tap the button at the bottom-right to interact.
3. **Copy share link** — your whole childhood gets encoded into a URL.
   Anyone who opens it can play it. No backend, no login, no storage.
4. **Export save** — a JSON file you can import later.

### Five scenes, connected by doors

Northern rural China is the only "full" region: yard, indoors, orchard, the stream
and the field path are each their own painting. Walk to a doorway, press space.
Your grandmother stands in the yard — walk up to her and press space, and she'll
call you home for dinner using the exact words you typed.

### Stay until dark

There is a day/night cycle. Fish and catch cicadas during the day —
**but cicada nymphs only crawl out of the ground after sunset.**
That's deliberate: waiting is the game. Some things only show up after dark.

### Four seasons: a longer wait

Each season lasts 90 seconds (a full year is 6 minutes) and advances on its own —
press `TAB` to skip ahead. **Out-of-season activities are locked**, and the game
tells you when to come back: grasshoppers in spring, fishing and cicadas in
summer, fruit picking in autumn, roasting eggs on the kang in winter.

---

## Three design decisions

**1. The moat is the content library, not the generation tech.**
Existing tools fail not because generation is slow or ugly, but because
the "countryside" they produce is an *American* farm — barns, tractors, cornfields —
not the mud walls, wheat stacks and cicadas of a Chinese village.
So the real asset here is `content/`: a library of real, local childhood details.

**2. The engine is 100% fixed; the surface is 100% personal.**
Map coordinates, collision and game mechanics are hardcoded. The model never
touches them. Users (and AI) can only change palette, objects, dialogue and story.
The cost: every world looks structurally similar. The benefit: it always runs,
and you can always reach everything.

**3. It is not meant to be replayable.**
It's a memory object, not a game you grind. Its value is the one minute where
something comes back to you. So the north-star metric isn't DAU — it's
"finished it" × "someone actually played what you sent them."

---

## Contributing

**Your own childhood is the contribution we want most.**

Adding a hometown to `content/` takes five minutes and requires no coding.
See [`content/README.md`](content/README.md).

```bash
npm test
```

One test is unusual: a BFS **reachability check** — run once per scene. It verifies
every activity spot and every doorway can be walked to, and that no door overlaps an
activity spot (otherwise pressing space teleports you away instead of doing the thing).
Moving a tree can silently block a player from ever reaching an activity spot —
invisible on screen, only catchable by test.

---

## License

- **Code**: MIT
- **`content/`**: CC BY 4.0 — use it commercially, just credit it.

They're split because memory isn't code. We don't require derivatives to be
open source; we want these childhoods to travel further.
