# Dr. Sazzad Hussan — professional portfolio

A lightweight English/Bangla portfolio focused on clinical practice, diabetes care and professional development. The audience is colleagues, medical institutions and conference communities.

**Deployment target:** [drsazzad.github.io](https://drsazzad.github.io/), with the repository `drsazzad/drsazzad.github.io`. GitHub Actions builds and publishes the English/Bangla website from the `main` branch. Local editorial notes and original photographs are excluded from the public repository.

## Work locally

Requires Node.js 22 or later. There are no packages to install.

```sh
npm run dev
```

Open `http://127.0.0.1:4173`. Changes in `content/`, `src/` and `public/` rebuild automatically; refresh the browser to see them. Restart the server after changing build scripts. Use `PORT=4174 npm run dev` if the default port is occupied. Stop with Ctrl+C.

```sh
npm run check          # Build and check links, assets and publication guard
npm run build          # Produce the static website in dist/
npm run build:publish  # Refuse drafts; build a reviewed profile
```

## Edit the profile

The English biography and shared profile facts are in `content/profile.json`:

- `name` is the professional display name; `shortName` is used in short labels. The current approved spelling is **Dr. Sazzad Hussan**.
- `experience`, `education` and `development` hold the records shown on the Experience and Credentials pages.
- `contact` holds email, phone, address and an optional LinkedIn profile.
- `portrait.src` points to the main image in `public/assets/`; `clinicalImage.src` supplies the Experience photograph, and `credentialsImage.src` supplies the Credentials photograph. Each includes alternative text and the original dimensions. Framing uses CSS, so source images remain unchanged. An empty portrait path shows the monogram.
- `cv.path` can be set to `assets/sazzad-hussan-cv.pdf` after placing the PDF in `public/assets/`. The download link is displayed only when a file is supplied.
- `siteUrl` is the final HTTPS address, ending with `/`. It can remain empty during local development.
- `draft` controls the preview notice and indexing metadata. Keep it `true` until the visible content has been reviewed. A publication build rejects a draft.
- `showEditorialNotes` controls pending-detail notes while in draft mode. It is currently `false` for a clean preview; the notes remain stored in the profile and content checklist.

The shared shell is in `src/index.html`, with page layouts in `src/pages/`; styles and mobile navigation are in `public/assets/`. The build generates all four pages in both English and Bangla (eight HTML files), so content and navigation work without JavaScript. JavaScript adds the collapsible mobile menu. The build marks the current navigation tab. Links use relative paths for both root and repository-based GitHub Pages addresses.

The original brief `starter_draft.md` is ignored by Git. All original photographs and the business card are organized in `private/source-images/`, also ignored by Git. Keep additional source scans and working notes in `private/`. Only selected visitor-facing files belong in `public/`; its contents are copied into the published website.

## English and Bangla

English is the default at `index.html`. The header's **English / বাংলা** links open the same page in the selected language, including on mobile. Bangla pages use `index.bn.html`, `experience.bn.html`, `credentials.bn.html` and `activities.bn.html`. Navigation keeps the current language; refreshes and shared links preserve it through the URL. No automatic language detection, redirect, translation service or browser storage is required.

- `content/locales/en.json` contains English interface text.
- `content/locales/bn.json` contains edited Bangla interface text and translated profile fields. Keep its record arrays aligned with `profile.json` when adding experience or qualifications.
- Phone numbers display Bangla digits in Bangla mode while the dialing links, email address, asset paths and registration identifier remain shared.
- The user requested **Dr. Sazzad Hussan** in English in both languages. The Bangla profile inherits `name` and `shortName` from the shared profile.
- Page language, titles, descriptions and image descriptions are localized. Canonical and alternate-language metadata are generated when `siteUrl` is set.

The switch and all page navigation work without JavaScript. `npm run check` validates both languages, matching-page switches, language-preserving links and shared contact targets.

## Publish on GitHub Pages

The owner is the `drsazzad` organization, administered through `Maruf001`, and the repository name is `drsazzad.github.io`. This serves the site at `https://drsazzad.github.io/`. The project uses `main` as its deployment branch.

1. Complete the content review, remove or replace incomplete records, and set `draft` to `false`.
2. Connect the `drsazzad/drsazzad.github.io` repository as the `origin` remote. The configured `siteUrl` is `https://drsazzad.github.io/`.
3. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. Commit and push the project to `main`. The included workflow checks the site, builds only `dist/`, then deploys that directory.

The workflow runs on changes to `main` or by manual dispatch. It deliberately stops before deployment while `draft` is `true`. No backend, database, appointment system or hosting secrets are needed.

GitHub Free supports Pages for public repositories; other plans also support eligible private repositories. See the official [Pages quickstart](https://docs.github.com/en/pages/quickstart) and [custom workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Project layout

```text
content/profile.json       English profile and shared facts
content/locales/            English/Bangla interface text and Bangla profile text
src/index.html             Shared header, contact section and footer
src/pages/                 Overview, Experience, Credentials and Activities layouts
public/assets/             CSS, navigation, favicon, selected photos, future CV
scripts/build.mjs          Static generator; uses only Node built-ins
scripts/localization.mjs   Locale loading, text overlays and localized filenames
scripts/check.mjs          Checks for generated output and publication readiness
scripts/serve.mjs          Local preview with automatic rebuilding
scripts/export-preview.mjs Linked portable review pages with embedded assets
.github/workflows/pages.yml GitHub Pages deployment
docs/content-checklist.md  Local content notes; excluded from Git
docs/project-direction.md Local planning notes; excluded from Git
private/source-images/    Original photographs and card; ignored by Git
visiting-cards/            Local print-ready English/Bengali cards; ignored by Git
dist/                     Generated output; ignored by Git
```

## Portable review copy

Run `node scripts/export-preview.mjs /absolute/path/to/preview-folder` to export all eight linked HTML pages with embedded assets. Open `index.html` from the exported folder; keep all eight files together for navigation. The export includes selected website images only, not private source materials.

## Visiting cards and conference photographs

The local `visiting-cards/` folder contains the English and Bengali PNG/SVG cards, bleed versions, print notes, a ZIP package and the generation source. It is excluded from Git and website deployment.

Professional Activities is available at `activities.html` and `activities.bn.html`. The page uses three selected Dubai 2024 conference photos. Descriptively named originals and the original-to-renamed filename record remain in `private/source-images/`; optimized public copies are in `public/assets/`.
