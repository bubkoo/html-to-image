# Current native relative-paint observation

The output contract is each current browser's live-page appearance, explicitly selected by the user. PR #637 is merged at `5b456a17627548c04d71db1cbf573a0a750ad3f0`. This observation reruns the former redirect fixture against that built runtime. It is not a fix or a new iPhone verdict.

Run the archived `observe.mjs.txt` as an `.mjs` file with Node from the repository root, after building the ESM package. Set `HTI_REPO_ROOT` if the file is outside the checkout. It uses the installed Playwright engines, creates a unique path per browser, serves only its own fixtures and the local ESM package on loopback port 4493, then closes its browsers and server in `finally` blocks. Results are written to ignored `output/playwright/svg-redirect-current`.

Each source has four 20 by 20 columns: redirected relative paint, direct relative paint, flat green external symbol and yellow HTML control. Full native source screenshots are taken before and after capture. Source markup and both source screenshots remain unchanged in every engine. The generated native screenshots are retained verbatim; the JSON records exported ImageData center pixels and HTTP paths separately before and during capture.

Native Chrome is white/white/green/yellow; Firefox and desktop WebKit are green/green/green/yellow. The current export is white/white/green/yellow in all three. Thus the earlier pre-#637 red/green export is historical; current Firefox and WebKit still fail the live-page contract.

The HTTP trace establishes that native Chrome resolves `sprite.svg` and `direct.svg` from the containing page directory (`/probe/`), while Firefox and WebKit resolve them from the external SVG directory, including its redirect destination. In current capture, all three also request the wrong page-directory paths. The resource loader returns a Blob and discards `Response.url`; style evaluation stages the imported tree in a private document whose base is the page URL. Both bases need accounting for. Merely resolving every value against the final response URL would alter Chrome's observed page appearance.

A separate exploratory hit-test control is not an output oracle: Firefox and WebKit can return a `<use>` hit even when a missing paint server leaves white pixels. An `xml:base` staging experiment also did not restore the external document base. No engine-name switch, pixel tolerance, source mutation or speculative runtime change has been introduced. Further work must preserve the distinct native URL-resolution behaviors and the existing resource-resolver/security boundaries.

See `observations.json` for exact versions, requests, source/capture centers and SHA256 digests. The previous real-iPhone observation remains historical; it has not been repeated for this finding.
