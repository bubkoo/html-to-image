## [1.11.13](https://github.com/bubkoo/html-to-image/compare/v1.11.12...v1.11.13) (2025-02-14)


### Bug Fixes

* **mask:** add support for -webkit-mask and -webkit-mask-image ([#382](https://github.com/bubkoo/html-to-image/issues/382)) ([5bdfda7](https://github.com/bubkoo/html-to-image/commit/5bdfda75cc41248f4e161ea434bbfc535e72f95e))

## [1.11.12](https://github.com/bubkoo/html-to-image/compare/v1.11.11...v1.11.12) (2025-02-12)


### Bug Fixes

* add possibility to use own handling of onerror which will not en… ([#453](https://github.com/bubkoo/html-to-image/issues/453)) ([04160c3](https://github.com/bubkoo/html-to-image/commit/04160c3e77f55e95082cbd4879847d0afda92883))
* ensure images are totally prcoessed before using them (ios) ([#478](https://github.com/bubkoo/html-to-image/issues/478)) ([51fb98f](https://github.com/bubkoo/html-to-image/commit/51fb98f69b6eef6c391a5a7859711a5f0601f467))
* Fix `fontEmbedCSS ` incorrect sizing ([#422](https://github.com/bubkoo/html-to-image/issues/422)) ([7020162](https://github.com/bubkoo/html-to-image/commit/702016256cc03b5637e75645f3d70131ddd0e45f))


### Performance Improvements

* embed only used fonts ([#476](https://github.com/bubkoo/html-to-image/issues/476)) ([09bee44](https://github.com/bubkoo/html-to-image/commit/09bee442c27bde2af06442417f4269e763e6b6cd))
* svg cloning optimized using deep clone ([#462](https://github.com/bubkoo/html-to-image/issues/462)) ([9aac2fd](https://github.com/bubkoo/html-to-image/commit/9aac2fd11333ca302d10f2c438cd16be07a1429d))

## [1.11.11](https://github.com/bubkoo/html-to-image/compare/v1.11.10...v1.11.11) (2023-02-01)

## [1.11.10](https://github.com/bubkoo/html-to-image/compare/v1.11.9...v1.11.10) (2023-02-01)


### Bug Fixes

* revert the change in the pre-install hook ([ed7db4d](https://github.com/bubkoo/html-to-image/commit/ed7db4d090c600da632c2c7ef9319ed033d9c3e5)), closes [#365](https://github.com/bubkoo/html-to-image/issues/365)

## [1.11.9](https://github.com/bubkoo/html-to-image/compare/v1.11.8...v1.11.9) (2023-01-31)


### Bug Fixes

* use "secrets.GITHUB_TOKEN" to publish to GPR ([2652288](https://github.com/bubkoo/html-to-image/commit/2652288af04f6a4775cf107981f3292b0a231973))

## [1.11.8](https://github.com/bubkoo/html-to-image/compare/v1.11.7...v1.11.8) (2023-01-31)


### Bug Fixes

* specify plugins ([d90ec23](https://github.com/bubkoo/html-to-image/commit/d90ec23daca23cda0d515cd7dda8d80cdf75546b))

## [1.11.7](https://github.com/bubkoo/html-to-image/compare/v1.11.6...v1.11.7) (2023-01-30)

## [1.11.6](https://github.com/bubkoo/html-to-image/compare/v1.11.5...v1.11.6) (2023-01-30)


### Bug Fixes

* clone iframe nodes better ([#352](https://github.com/bubkoo/html-to-image/issues/352)) ([bc6b865](https://github.com/bubkoo/html-to-image/commit/bc6b8652f0504cf5be19ed77f9c88b986e7aaeed))

## [1.11.5](https://github.com/bubkoo/html-to-image/compare/v1.11.4...v1.11.5) (2023-01-30)


### Bug Fixes

* **cloneCSSStyle:** rounded values of d attr fix ([#358](https://github.com/bubkoo/html-to-image/issues/358)) ([6d28bdb](https://github.com/bubkoo/html-to-image/commit/6d28bdb96f15877666b222067bfb082da300f355)), closes [#357](https://github.com/bubkoo/html-to-image/issues/357)
* include source in npm package ([#316](https://github.com/bubkoo/html-to-image/issues/316)) ([b609415](https://github.com/bubkoo/html-to-image/commit/b6094151fb199fad699e74d93a8cef14089dda71))
* switch lazy loading images to eager ([#359](https://github.com/bubkoo/html-to-image/issues/359)) ([f7c311b](https://github.com/bubkoo/html-to-image/commit/f7c311b5285d4ca8383c5fe7c3dfb0c9fbc6f630))

## [1.11.4](https://github.com/bubkoo/html-to-image/compare/v1.11.3...v1.11.4) (2023-01-01)

## [1.11.3](https://github.com/bubkoo/html-to-image/compare/v1.11.2...v1.11.3) (2022-12-16)

## [1.11.2](https://github.com/bubkoo/html-to-image/compare/v1.11.1...v1.11.2) (2022-12-13)


### Bug Fixes

* fallback to `poster` when `currentSrc` of video is null ([5d79666](https://github.com/bubkoo/html-to-image/commit/5d7966691a0dae64de8fb2bf9e56be7d274cef83))
* use frames for video capture & add iframes ([#346](https://github.com/bubkoo/html-to-image/issues/346)) ([e316c61](https://github.com/bubkoo/html-to-image/commit/e316c610364d6a774b736e36e310be79d0085d60))

## [1.11.1](https://github.com/bubkoo/html-to-image/compare/v1.11.0...v1.11.1) (2022-12-05)


### Bug Fixes

* clone svg symbols ([#344](https://github.com/bubkoo/html-to-image/issues/344)) ([aec6fa1](https://github.com/bubkoo/html-to-image/commit/aec6fa1573d0f64be6e2879e54a8e4d7e9e300ac))

# [1.11.0](https://github.com/bubkoo/html-to-image/compare/v1.10.10...v1.11.0) (2022-12-05)


### Features

* support webp format ([#343](https://github.com/bubkoo/html-to-image/issues/343)) ([09d4810](https://github.com/bubkoo/html-to-image/commit/09d4810ce3084e43f039c63efd65ba500451b9df)), closes [#326](https://github.com/bubkoo/html-to-image/issues/326)

## [1.10.10](https://github.com/bubkoo/html-to-image/compare/v1.10.9...v1.10.10) (2022-12-03)


### Bug Fixes

* build script ([db7d435](https://github.com/bubkoo/html-to-image/commit/db7d43507c9419fb84ee126b8c334ffa1655b8b3))
* type errors ([b516783](https://github.com/bubkoo/html-to-image/commit/b516783244e9aa847c89cd3ca3b8114bc6157934))

## [1.10.9](https://github.com/bubkoo/html-to-image/compare/v1.10.8...v1.10.9) (2022-12-01)

## [1.10.8](https://github.com/bubkoo/html-to-image/compare/v1.10.7...v1.10.8) (2022-09-01)

## [1.10.7](https://github.com/bubkoo/html-to-image/compare/v1.10.6...v1.10.7) (2022-09-01)


### Bug Fixes

* handle 404 status of fetch ([ecfdbcc](https://github.com/bubkoo/html-to-image/commit/ecfdbcc189771c3fe212ee2ce6f641495b0d650a))

## [1.10.6](https://github.com/bubkoo/html-to-image/compare/v1.10.5...v1.10.6) (2022-08-26)


### Bug Fixes

* apply skipFonts option ([6b7e923](https://github.com/bubkoo/html-to-image/commit/6b7e923ca6a82dddb409a8ab2cda24c469640014)), closes [#93](https://github.com/bubkoo/html-to-image/issues/93) [#310](https://github.com/bubkoo/html-to-image/issues/310)

## [1.10.5](https://github.com/bubkoo/html-to-image/compare/v1.10.4...v1.10.5) (2022-08-26)

## [1.10.4](https://github.com/bubkoo/html-to-image/compare/v1.10.3...v1.10.4) (2022-08-16)

## [1.10.3](https://github.com/bubkoo/html-to-image/compare/v1.10.2...v1.10.3) (2022-08-16)

## [1.10.2](https://github.com/bubkoo/html-to-image/compare/v1.10.1...v1.10.2) (2022-08-15)

## [1.10.1](https://github.com/bubkoo/html-to-image/compare/v1.10.0...v1.10.1) (2022-08-15)


### Bug Fixes

* node version ([13a6989](https://github.com/bubkoo/html-to-image/commit/13a6989d00440984ea631bb92cb484d3bedbfb02))

# [1.10.0](https://github.com/bubkoo/html-to-image/compare/v1.9.0...v1.10.0) (2022-08-11)


### Bug Fixes

* 🐛 cloneCSSStyle: copy transformOriginProp ([#297](https://github.com/bubkoo/html-to-image/issues/297)) ([76b978a](https://github.com/bubkoo/html-to-image/commit/76b978a943ee11ad78ef09f9b3363377baebcbb3))
* 🐛 font format could be without qoutation ([#217](https://github.com/bubkoo/html-to-image/issues/217)) ([2a96149](https://github.com/bubkoo/html-to-image/commit/2a9614966f636636be133d3e16d8fe93cf26db0d))
* 🐛 set selected attribute on option to draw it ([#280](https://github.com/bubkoo/html-to-image/issues/280)) ([caf97c8](https://github.com/bubkoo/html-to-image/commit/caf97c80a3b6ef6f7205d12ab59ef42c5ab2f071))
* 🐛 text breaks on the last word ([#270](https://github.com/bubkoo/html-to-image/issues/270)) ([062c98a](https://github.com/bubkoo/html-to-image/commit/062c98ab3491fb731d660780b1a0408e1f53549a))
* test specs ([c7a664e](https://github.com/bubkoo/html-to-image/commit/c7a664e8148bfa813391e124e33ba44c60e1cdae))


### Features

* ✨ add 'fetchRequestInit' option ([#210](https://github.com/bubkoo/html-to-image/issues/210)) ([c51da3a](https://github.com/bubkoo/html-to-image/commit/c51da3a5cc7421c530ffb7cbaa7b5009c677c2d8))
* ✨ added includeQueryParams flag ([#260](https://github.com/bubkoo/html-to-image/issues/260)) ([259d71e](https://github.com/bubkoo/html-to-image/commit/259d71e431445ba0c32bc081d9164fa094b4da32))

# [1.9.0](https://github.com/bubkoo/html-to-image/compare/v1.8.5...v1.9.0) (2021-10-09)


### Bug Fixes

* Large Dom sizes failing to be drawn correctly into canvas when exporting to PNG ([#197](https://github.com/bubkoo/html-to-image/issues/197)) ([1ee2e7f](https://github.com/bubkoo/html-to-image/commit/1ee2e7f366ccbaf247caefdcf479f52a2abd22bb))


### Features

* ✨ add svg image with href support ([#198](https://github.com/bubkoo/html-to-image/issues/198)) ([cb6f916](https://github.com/bubkoo/html-to-image/commit/cb6f91692fd0ff06852bf83751e0606df841f429))

## [1.8.5](https://github.com/bubkoo/html-to-image/compare/v1.8.4...v1.8.5) (2021-09-15)


### Bug Fixes

* 🐛 config changelog ([297b17f](https://github.com/bubkoo/html-to-image/commit/297b17f6e213c2278e7655dec3fd2444a3e705bf))
