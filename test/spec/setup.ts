import { clean } from './helper'

beforeAll(() => {
  process.env.devicePixelRatio = '1'
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
})

afterAll(() => {
  delete process.env.devicePixelRatio
  clean()
})
