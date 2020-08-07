interface Window {
  imagediff: {
    equal: (
      a: HTMLImageElement,
      b: HTMLImageElement,
      tolerance?: number,
    ) => boolean
  }
}
