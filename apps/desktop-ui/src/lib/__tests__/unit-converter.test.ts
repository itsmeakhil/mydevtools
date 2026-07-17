import { convert, UNIT_CATEGORIES, getCategoryKeys, getUnitKeys } from '../unit-converter'

describe('unit-converter', () => {
  it('converts factor-based units (length)', () => {
    expect(convert(1, 'm', 'ft', UNIT_CATEGORIES.length)).toBeCloseTo(3.28084, 4)
    expect(convert(1609.344, 'm', 'mi', UNIT_CATEGORIES.length)).toBeCloseTo(1, 10)
  })

  it('converts absolute temperature with offsets', () => {
    const temp = UNIT_CATEGORIES.temperature
    expect(convert(0, 'degC', 'degF', temp)).toBeCloseTo(32, 6)
    expect(convert(100, 'degC', 'degF', temp)).toBeCloseTo(212, 6)
    expect(convert(32, 'degF', 'K', temp)).toBeCloseTo(273.15, 6)
    expect(convert(0, 'K', 'degC', temp)).toBeCloseTo(-273.15, 6)
    expect(convert(0, 'K', 'degR', temp)).toBeCloseTo(0, 6)
  })

  it('temperature intervals stay offset-free', () => {
    expect(convert(1, 'degC', 'degF', UNIT_CATEGORIES.temperature_interval)).toBeCloseTo(1.8, 6)
  })

  it('returns NaN for unknown units', () => {
    expect(convert(1, 'nope', 'm', UNIT_CATEGORIES.length)).toBeNaN()
  })

  it('every category has at least two units and a valid base unit', () => {
    for (const key of getCategoryKeys()) {
      const cat = UNIT_CATEGORIES[key]
      const units = getUnitKeys(key)
      expect(units.length).toBeGreaterThanOrEqual(2)
      expect(cat.units[cat.baseUnit]).toBeDefined()
      expect(cat.units[cat.baseUnit].factor).toBe(1)
    }
  })
})
