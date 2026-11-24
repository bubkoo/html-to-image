// Every nesting selector inherits the maximum specificity of the complete
// parent list. Keeping that list inside :is() lets the native selector parser
// apply its matching and specificity rules after the snapshot is flattened.
export function resolveNestedSelector(
  selector: string,
  parent: string,
): string {
  const scope = `:is(${parent})`
  const selectors: string[] = []
  let branch = ''
  let nested = false
  let token = false
  let quote = ''
  let brackets = 0
  let parentheses = 0
  const finish = () => {
    selectors.push(nested || !token ? branch : `${scope} ${branch}`)
    branch = ''
    nested = false
    token = false
  }
  for (let offset = 0; offset < selector.length; offset += 1) {
    const char = selector[offset]
    if (char === '\\') {
      branch += char
      if (offset + 1 < selector.length) branch += selector[++offset]
      token = true
      continue
    }
    if (quote) {
      branch += char
      if (char === quote) quote = ''
      continue
    }
    if (char === '/' && selector[offset + 1] === '*') {
      const end = selector.indexOf('*/', offset + 2)
      const next = end < 0 ? selector.length : end + 2
      branch += selector.slice(offset, next)
      offset = next - 1
      continue
    }
    if (char === '"' || char === "'") quote = char
    if (char === '[') brackets += 1
    else if (char === ']') brackets -= 1
    else if (!brackets && char === '(') parentheses += 1
    else if (!brackets && char === ')') parentheses -= 1
    if (!brackets && !parentheses && char === ',') {
      finish()
    } else if (!brackets && char === '&') {
      branch += scope
      nested = true
      token = true
    } else {
      branch += char
      if (!/[ \t\r\n\f]/.test(char)) token = true
    }
  }
  finish()
  return selectors.join(',')
}
