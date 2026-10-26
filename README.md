# Sterling Bishop — portfolio

A Jekyll site for GitHub Pages. Four practices — **Engineer**, **LED Installation & Prop
Design**, **Fire Performer**, **Fabrication & Stagecraft** — on a dark theme whose visuals are drawn in canvas as
long-exposure light trails.

## Deploy to GitHub Pages

1. Create a repository. Name it `<your-username>.github.io` to serve the site at
   `https://<your-username>.github.io/`. Any other name serves it at
   `https://<your-username>.github.io/<repo-name>/`, and that works too: asset paths
   adjust automatically.
2. Push this folder to the `main` branch.
3. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose
   **GitHub Actions**.

The workflow in `.github/workflows/pages.yml` builds the site with the same Jekyll version
and plugins GitHub Pages uses, then publishes it. Each push to `main` redeploys in about a
minute. If a build fails, the **Actions** tab shows the error.

To use your own domain, add it under **Settings → Pages → Custom domain**.

## Edit the content

All the content is in Markdown and YAML. You shouldn't need to touch HTML.

| What | Where |
| --- | --- |
| Name, site description, email | `_config.yml` |
| Hero text, status line, photo | `index.md` (front matter for the details, body for the intro paragraph) |
| A practice's intro paragraph | the body of `_practices/01-software.md`, `02-light.md`, `03-fire.md`, `04-fabrication.md` |
| Roles, dates, tags | the front matter of those same files |
| Videos | `_data/videos.yml` |
| LinkedIn / Instagram / YouTube links | `_data/links.yml` |
| Hero photo | `assets/img/swords.jpg` |

A role looks like this. Use `summary` for a sentence, or `bullets` for a list. Both accept
Markdown, so `[links](https://…)` and `**bold**` work.

```yaml
- years: 2025 — Present
  where: Oakland, CA
  title: Senior Engineer
  org: Somewhere Good
  bullets:
    - Shipped the thing
    - Made the other thing [faster](https://example.com)
```

Roles show in the order you list them. Practices sort by their `order:` value.

To add a practice, copy any file in `_practices/`, give it the next `order:`, a `slug:`
(used in the nav and the `#anchor`), and a `hue:` of `sky`, `flux`, `ember` or `spike`. It
appears in the page and the hero nav automatically.

### Still to add

- **LED installation projects.** `_practices/02-light.md` has a `TODO` comment where they
  go. Add each one as a role with its title, venue or event, year, and a few bullets.
- **Photos of that work.** Put images in `assets/img/` and tell me which projects they
  belong to, and I'll add them to the layout.

### Your email

`_config.yml` has `email: jsterlingbishop@gmail.com`, which shows in the contact list. On
a public site that address will attract some spam. Change it to a dedicated address, or
delete the line to hide the email row.

## Run it locally (optional)

You need Ruby 3.x and Bundler.

```bash
bundle install
bundle exec jekyll serve
# → http://127.0.0.1:4000
```

## How the visuals work

`assets/js/light-trails.js` holds the whole visual identity. Each prop has a parametric
path; tracing it over time with additive blending draws the figure that prop makes in a
long-exposure photo.

- The **hero** field accumulates live: one figure each for software, light, and fire. It pauses when it's
  offscreen or the tab is hidden, and shows a still under `prefers-reduced-motion`.
- **Section plates** and **video cards** are drawn once.
- **Videos** load nothing from YouTube until someone presses play. Then a
  privacy-enhanced (`youtube-nocookie.com`) player swaps in. Without JavaScript, each card
  is a plain link to YouTube.

Available props for `videos.yml`: `poi`, `doublestaff`, `dragonstaff`, `ropedart`,
`sword`, `contact`. For `poi`, an odd `seed` draws the five-petal antispin flower.

## Design tokens

Defined at the top of `assets/css/main.css`.

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#07070A` | Page ground |
| `--sky` | `#5CC8FA` | Engineering |
| `--flux` | `#EA86FB` | LED work |
| `--ember` | `#FF9A4D` | Fire |
| `--spike` | `#6EE7A0` | Fabrication (spike-tape green) |

Type: **Syne** (display), **Chivo** (body), **IBM Plex Mono** (dates and metadata).

Text contrast measured on `#07070A`: body 11.8:1, muted 7.4:1, smallest grey 5.5:1,
accents 8.9–10.6:1. All pass WCAG AA.

## What was checked

The real Jekyll build happens in GitHub Actions. Before handoff, the templates were
rendered with LiquidJS, the same template language Jekyll uses, with Jekyll's filters
stood in, and checked for:

- no horizontal overflow at 360, 390, 768, 1024, and 1440 px
- no unrendered Liquid in the output
- all roles and videos present
- the play button swapping in the correct embed

No JavaScript errors. The first Actions run is the one check that couldn't be done ahead
of time.
