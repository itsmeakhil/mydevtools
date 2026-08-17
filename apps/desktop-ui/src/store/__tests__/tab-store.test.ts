import { useTabStore } from '../tab-store'

const paths = ['/app/a', '/app/b', '/app/c']

beforeEach(() => {
  useTabStore.setState({ tabs: paths.map(path => ({ path })), activeTabPath: '/app/a' })
})

const order = () => useTabStore.getState().tabs.map(t => t.path)

describe('moveTab', () => {
  it('moves a tab forward', () => {
    useTabStore.getState().moveTab('/app/a', '/app/c')
    expect(order()).toEqual(['/app/b', '/app/c', '/app/a'])
  })

  it('moves a tab backward', () => {
    useTabStore.getState().moveTab('/app/c', '/app/a')
    expect(order()).toEqual(['/app/c', '/app/a', '/app/b'])
  })

  it('ignores unknown or identical paths', () => {
    useTabStore.getState().moveTab('/app/a', '/app/a')
    useTabStore.getState().moveTab('/app/a', '/app/nope')
    expect(order()).toEqual(paths)
  })
})
