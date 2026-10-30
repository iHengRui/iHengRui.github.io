# Hengrui Zhang — academic homepage

Public site: https://zhr.xyz/

This is the `gh-pages` deployment branch of `iHengRui/iHengRui.github.io`. GitHub Pages serves these static files directly. No dependency installation or build step is needed.

## Editing

- `index.html`: biography, interests, news, featured project, publications, education, experience, honors, and a short writing section.
- `assets/site.css`: shared OptBound-inspired dark and light palettes, responsive layout, and article typography.
- `assets/theme.js` and `assets/site.js`: persistent theme preference and navigation highlighting. All content and links work without JavaScript.
- `blog/index.html`: writing index.
- `2024/08/10/real_analysis/index.html`: original Real Analysis notes, inside the shared reading layout. Preserve the article body and embedded MathJax SVGs when editing its shell.
- `files/Hengrui_Zhang_CV_20261030.pdf`: current English CV.
- `files/Hengrui_Zhang_CV_ZH_20261030.pdf`: current Chinese CV.
- Publish CV revisions under new filenames and update the homepage links to avoid stale PDF previews. Keep previously published PDF download paths in sync for existing bookmarks and cached homepage links.

The current CV downloads were synchronized on 2026-10-30 from the owner-approved PDFs, without recompilation. The CVs are supplied PDF snapshots; this repository does not regenerate them. Replace them when a new version is ready. The publication order, status, and author contributions follow the owner's October 30, 2026 CV. Homepage status labels use “Preprint” until a publication decision is confirmed.

OptBound currently uses HTTP because its custom domain's HTTPS certificate was not valid when this page was updated. The project card distinguishes the live decentralized suite from planned stochastic suites. Recheck the certificate before changing those links to HTTPS.

The Google Scholar link in the profile area uses the owner's confirmed profile: https://scholar.google.com/citations?user=48njd3kAAAAJ&hl=en.

## Preview and publication

Preview this branch with any static HTTP server. Commit the intended files, then push to `gh-pages`; Pages publishes that branch's root. Keep `CNAME` set to `zhr.xyz` and preserve existing article, archive, category, and tag URLs. Avoid publishing an older Hexo export over this branch because it would replace the new homepage.

## Provisional award status

The October 2026 PKU award entry uses a descriptive English translation and must retain “provisional selection” until a final decision is verified. The official notice covers the 2026–2027 academic year and a public notice period of October 29–November 2, 2026. Do not automatically promote the status when the notice period ends.

Official source: https://grs.pku.edu.cn/jzgz/dtxx1/tzgg1/1b7994457a134261a7759537178c1f9f.htm
