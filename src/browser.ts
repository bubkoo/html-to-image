export const isSafari = () => {
  const platform = navigator.platform.toLowerCase()
  if (platform.includes('linux') || platform.includes('win')) {
    return false
  }
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}
