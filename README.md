# Hengrui Zhang — academic homepage

Public site: https://zhr.xyz/

This is the `gh-pages` deployment branch of `iHengRui/iHengRui.github.io`. GitHub Pages serves these static files directly. No dependency installation or build step is needed.

## Editing

- `index.html`: biography, interests, featured project, publications, education, experience, honors, and a short writing section.
- `assets/site.css`: shared OptBound-inspired dark and light palettes, responsive layout, and article typography.
- `assets/theme.js` and `assets/site.js`: persistent theme preference and navigation highlighting. All content and links work without JavaScript.
- `blog/index.html`: writing index.
- `2024/08/10/real_analysis/index.html`: original Real Analysis notes, inside the shared reading layout. Preserve the article body and embedded MathJax SVGs when editing its shell.
- `files/Hengrui_Zhang_CV_20261105.pdf`: current English CV.
- `files/Hengrui_Zhang_CV_ZH_20261105.pdf`: current Chinese CV.
- Publish CV revisions under new filenames and update the homepage links to avoid stale PDF previews. Keep previously published PDF download paths in sync for existing bookmarks and cached homepage links.

For arXiv:2602.20646, publish only the preprint status and arXiv identifier on the homepage and in both public CVs. Build the public PDFs from separate TeX copies. When syncing a new full CV, reapply the public wording, check extracted text and links in both PDFs, and update every download alias. Keep the full CV sources, PDFs, and archive separate.

OptBound currently uses HTTP because its custom domain's HTTPS certificate was not valid when this page was updated. The project card distinguishes the live decentralized suite from planned stochastic suites. Recheck the certificate before changing those links to HTTPS.

The Google Scholar link in the profile area uses the owner's confirmed profile: https://scholar.google.com/citations?user=48njd3kAAAAJ&hl=en.

## Preview and publication

Preview this branch with any static HTTP server. Commit the intended files, then push to `gh-pages`; Pages publishes that branch's root. Keep `CNAME` set to `zhr.xyz` and preserve existing article, archive, category, and tag URLs. Avoid publishing an older Hexo export over this branch because it would replace the new homepage.

## Honor formatting

Use the same concise date, award name, and institution format for all honors, including the October 2026 PKU award. The owner requested removal of the added news block and explanatory award notes from the homepage and both CVs.
