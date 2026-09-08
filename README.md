# Hengrui Zhang — academic homepage

Public site: https://zhr.xyz/

This is the `gh-pages` deployment branch of `iHengRui/iHengRui.github.io`. GitHub Pages serves these static files directly. No dependency installation or build step is needed.

## Editing

- `index.html`: biography, interests, featured project, publications, education, experience, honors, and a short writing section.
- `assets/site.css`: shared OptBound-inspired dark and light palettes, responsive layout, and article typography.
- `assets/theme.js` and `assets/site.js`: persistent theme preference and navigation highlighting. All content and links work without JavaScript.
- `blog/index.html`: writing index.
- `2024/08/10/real_analysis/index.html`: original Real Analysis notes, inside the shared reading layout. Preserve the article body and embedded MathJax SVGs when editing its shell.
- `files/Hengrui_Zhang_CV_20260908.pdf`: current English CV.
- `files/Hengrui_Zhang_CV_ZH_20260908.pdf`: current Chinese CV.
- Publish CV revisions under new filenames and update the homepage links to avoid stale PDF previews. Keep the undated PDF copies in sync for existing bookmarks.

The CVs are supplied PDF snapshots; this repository does not regenerate them. Replace them when a new version is ready. The publication list and author contributions follow the owner's September 2026 CV. Homepage status labels use “Preprint” until a publication decision is confirmed.

OptBound currently uses HTTP because its custom domain's HTTPS certificate was not valid when this page was updated. The project card distinguishes the live decentralized suite from planned stochastic suites. Recheck the certificate before changing those links to HTTPS.

The Google Scholar link in the profile area uses the owner's confirmed profile: https://scholar.google.com/citations?user=48njd3kAAAAJ&hl=en.

## Preview and publication

Preview this branch with any static HTTP server. Commit the intended files, then push to `gh-pages`; Pages publishes that branch's root. Keep `CNAME` set to `zhr.xyz` and preserve existing article, archive, category, and tag URLs. Avoid publishing an older Hexo export over this branch because it would replace the new homepage.
