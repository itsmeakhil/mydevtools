export interface UnitDef {
  label: string
  symbol: string
  factor: number // multiplies this unit to get the base unit
  offset?: number // added after factor (absolute temperature scales)
}

export interface CategoryDef {
  label: string
  baseUnit: string
  units: Record<string, UnitDef>
}

export const UNIT_CATEGORIES: Record<string, CategoryDef> = {
  length: {
    label: 'Length',
    baseUnit: 'm',
    units: {
      km:   { label: 'Kilometer',       symbol: 'km',  factor: 1e3 },
      m:    { label: 'Meter',           symbol: 'm',   factor: 1 },
      cm:   { label: 'Centimeter',      symbol: 'cm',  factor: 1e-2 },
      mm:   { label: 'Millimeter',      symbol: 'mm',  factor: 1e-3 },
      um:   { label: 'Micrometer',      symbol: 'μm',  factor: 1e-6 },
      nm:   { label: 'Nanometer',       symbol: 'nm',  factor: 1e-9 },
      angstrom: { label: 'Angstrom',    symbol: 'Å',   factor: 1e-10 },
      in:   { label: 'Inch',            symbol: 'in',  factor: 0.0254 },
      ft:   { label: 'Foot',            symbol: 'ft',  factor: 0.3048 },
      yd:   { label: 'Yard',            symbol: 'yd',  factor: 0.9144 },
      mi:   { label: 'Mile',            symbol: 'mi',  factor: 1609.344 },
      mil:  { label: 'Mil (thou)',       symbol: 'mil', factor: 2.54e-5 },
    },
  },

  area: {
    label: 'Area',
    baseUnit: 'm2',
    units: {
      km2:  { label: 'Square Kilometer',  symbol: 'km²',  factor: 1e6 },
      m2:   { label: 'Square Meter',      symbol: 'm²',   factor: 1 },
      cm2:  { label: 'Square Centimeter', symbol: 'cm²',  factor: 1e-4 },
      mm2:  { label: 'Square Millimeter', symbol: 'mm²',  factor: 1e-6 },
      um2:  { label: 'Square Micrometer', symbol: 'μm²',  factor: 1e-12 },
      in2:  { label: 'Square Inch',       symbol: 'in²',  factor: 6.4516e-4 },
      ft2:  { label: 'Square Foot',       symbol: 'ft²',  factor: 0.09290304 },
      yd2:  { label: 'Square Yard',       symbol: 'yd²',  factor: 0.83612736 },
      mi2:  { label: 'Square Mile',       symbol: 'mi²',  factor: 2.589988e6 },
      ha:   { label: 'Hectare',           symbol: 'ha',   factor: 1e4 },
      ac:   { label: 'Acre',              symbol: 'ac',   factor: 4046.856 },
    },
  },

  volume: {
    label: 'Volume',
    baseUnit: 'm3',
    units: {
      m3:      { label: 'Cubic Meter',       symbol: 'm³',   factor: 1 },
      cm3:     { label: 'Cubic Centimeter',  symbol: 'cm³',  factor: 1e-6 },
      mm3:     { label: 'Cubic Millimeter',  symbol: 'mm³',  factor: 1e-9 },
      L:       { label: 'Liter',             symbol: 'L',    factor: 1e-3 },
      mL:      { label: 'Milliliter',        symbol: 'mL',   factor: 1e-6 },
      in3:     { label: 'Cubic Inch',        symbol: 'in³',  factor: 1.6387064e-5 },
      ft3:     { label: 'Cubic Foot',        symbol: 'ft³',  factor: 0.028316847 },
      gal_us:  { label: 'Gallon (US)',       symbol: 'gal',  factor: 3.785412e-3 },
      qt_us:   { label: 'Quart (US)',        symbol: 'qt',   factor: 9.46353e-4 },
      fl_oz:   { label: 'Fluid Ounce (US)',  symbol: 'fl oz',factor: 2.957353e-5 },
    },
  },

  mass: {
    label: 'Mass',
    baseUnit: 'kg',
    units: {
      kg:  { label: 'Kilogram',    symbol: 'kg',  factor: 1 },
      g:   { label: 'Gram',        symbol: 'g',   factor: 1e-3 },
      mg:  { label: 'Milligram',   symbol: 'mg',  factor: 1e-6 },
      ug:  { label: 'Microgram',   symbol: 'μg',  factor: 1e-9 },
      t:   { label: 'Metric Ton',  symbol: 't',   factor: 1e3 },
      lb:  { label: 'Pound',       symbol: 'lb',  factor: 0.45359237 },
      oz:  { label: 'Ounce',       symbol: 'oz',  factor: 0.028349523 },
      ton_us: { label: 'Short Ton (US)', symbol: 'ton', factor: 907.18474 },
      grain:  { label: 'Grain',    symbol: 'gr',  factor: 6.47989e-5 },
    },
  },

  density: {
    label: 'Density',
    baseUnit: 'kg_m3',
    units: {
      kg_m3:    { label: 'Kilogram/Cubic Meter',  symbol: 'kg/m³',   factor: 1 },
      g_cm3:    { label: 'Gram/Cubic Centimeter', symbol: 'g/cm³',   factor: 1e3 },
      g_mL:     { label: 'Gram/Milliliter',       symbol: 'g/mL',    factor: 1e3 },
      kg_L:     { label: 'Kilogram/Liter',        symbol: 'kg/L',    factor: 1e3 },
      lb_ft3:   { label: 'Pound/Cubic Foot',      symbol: 'lb/ft³',  factor: 16.018463 },
      lb_in3:   { label: 'Pound/Cubic Inch',      symbol: 'lb/in³',  factor: 27679.905 },
      lb_gal:   { label: 'Pound/Gallon (US)',     symbol: 'lb/gal',  factor: 119.8264 },
    },
  },

  pressure: {
    label: 'Pressure / Stress',
    baseUnit: 'Pa',
    units: {
      Pa:    { label: 'Pascal',             symbol: 'Pa',    factor: 1 },
      kPa:   { label: 'Kilopascal',         symbol: 'kPa',   factor: 1e3 },
      MPa:   { label: 'Megapascal',         symbol: 'MPa',   factor: 1e6 },
      GPa:   { label: 'Gigapascal',         symbol: 'GPa',   factor: 1e9 },
      bar:   { label: 'Bar',                symbol: 'bar',   factor: 1e5 },
      mbar:  { label: 'Millibar',           symbol: 'mbar',  factor: 1e2 },
      atm:   { label: 'Atmosphere',         symbol: 'atm',   factor: 101325 },
      mmHg:  { label: 'Millimeter of Mercury (Torr)', symbol: 'mmHg', factor: 133.322 },
      psi:   { label: 'Pound-force/Sq Inch', symbol: 'psi',  factor: 6894.757 },
      ksi:   { label: 'Kilopound-force/Sq Inch', symbol: 'ksi', factor: 6.894757e6 },
      torr:  { label: 'Torr',               symbol: 'Torr',  factor: 133.322 },
    },
  },

  force: {
    label: 'Force',
    baseUnit: 'N',
    units: {
      N:    { label: 'Newton',         symbol: 'N',    factor: 1 },
      kN:   { label: 'Kilonewton',     symbol: 'kN',   factor: 1e3 },
      MN:   { label: 'Meganewton',     symbol: 'MN',   factor: 1e6 },
      mN:   { label: 'Millinewton',    symbol: 'mN',   factor: 1e-3 },
      uN:   { label: 'Micronewton',    symbol: 'μN',   factor: 1e-6 },
      dyn:  { label: 'Dyne',           symbol: 'dyn',  factor: 1e-5 },
      kgf:  { label: 'Kilogram-force', symbol: 'kgf',  factor: 9.80665 },
      gf:   { label: 'Gram-force',     symbol: 'gf',   factor: 9.80665e-3 },
      lbf:  { label: 'Pound-force',    symbol: 'lbf',  factor: 4.44822 },
      ozf:  { label: 'Ounce-force',    symbol: 'ozf',  factor: 0.278014 },
    },
  },

  energy: {
    label: 'Energy',
    baseUnit: 'J',
    units: {
      J:    { label: 'Joule',                symbol: 'J',    factor: 1 },
      kJ:   { label: 'Kilojoule',            symbol: 'kJ',   factor: 1e3 },
      MJ:   { label: 'Megajoule',            symbol: 'MJ',   factor: 1e6 },
      mJ:   { label: 'Millijoule',           symbol: 'mJ',   factor: 1e-3 },
      cal:  { label: 'Calorie (thermochemical)', symbol: 'cal', factor: 4.184 },
      kcal: { label: 'Kilocalorie',          symbol: 'kcal', factor: 4184 },
      BTU:  { label: 'British Thermal Unit', symbol: 'BTU',  factor: 1055.06 },
      eV:   { label: 'Electron Volt',        symbol: 'eV',   factor: 1.60218e-19 },
      kWh:  { label: 'Kilowatt-hour',        symbol: 'kWh',  factor: 3.6e6 },
      erg:  { label: 'Erg',                  symbol: 'erg',  factor: 1e-7 },
      ftlbf: { label: 'Foot-pound-force',    symbol: 'ft·lbf', factor: 1.35582 },
    },
  },

  molar_energy: {
    label: 'Molar Energy',
    baseUnit: 'J_mol',
    units: {
      J_mol:    { label: 'Joule/Mole',         symbol: 'J/mol',    factor: 1 },
      kJ_mol:   { label: 'Kilojoule/Mole',     symbol: 'kJ/mol',   factor: 1e3 },
      cal_mol:  { label: 'Calorie/Mole',       symbol: 'cal/mol',  factor: 4.184 },
      kcal_mol: { label: 'Kilocalorie/Mole',   symbol: 'kcal/mol', factor: 4184 },
      BTU_mol:  { label: 'BTU/Mole',           symbol: 'BTU/mol',  factor: 1055.06 },
      eV_mol:   { label: 'Electron Volt/Mole', symbol: 'eV/mol',   factor: 1.60218e-19 },
    },
  },

  temperature: {
    label: 'Temperature',
    baseUnit: 'K',
    units: {
      K:    { label: 'Kelvin',            symbol: 'K',  factor: 1 },
      degC: { label: 'Degree Celsius',    symbol: '°C', factor: 1,     offset: 273.15 },
      degF: { label: 'Degree Fahrenheit', symbol: '°F', factor: 5 / 9, offset: 459.67 * 5 / 9 },
      degR: { label: 'Degree Rankine',    symbol: '°R', factor: 5 / 9 },
    },
  },

  temperature_interval: {
    label: 'Temperature Interval',
    baseUnit: 'K',
    units: {
      K:    { label: 'Kelvin (interval)',          symbol: 'ΔK',   factor: 1 },
      degC: { label: 'Degree Celsius (interval)',  symbol: 'Δ°C',  factor: 1 },
      degF: { label: 'Degree Fahrenheit (interval)', symbol: 'Δ°F', factor: 5 / 9 },
      degR: { label: 'Degree Rankine (interval)',  symbol: 'Δ°R',  factor: 5 / 9 },
    },
  },

  time: {
    label: 'Time',
    baseUnit: 's',
    units: {
      ns:   { label: 'Nanosecond',  symbol: 'ns',  factor: 1e-9 },
      us:   { label: 'Microsecond', symbol: 'μs',  factor: 1e-6 },
      ms:   { label: 'Millisecond', symbol: 'ms',  factor: 1e-3 },
      s:    { label: 'Second',      symbol: 's',   factor: 1 },
      min:  { label: 'Minute',      symbol: 'min', factor: 60 },
      h:    { label: 'Hour',        symbol: 'h',   factor: 3600 },
      day:  { label: 'Day',         symbol: 'd',   factor: 86400 },
      week: { label: 'Week',        symbol: 'wk',  factor: 604800 },
      year: { label: 'Year (Julian)', symbol: 'yr', factor: 31557600 },
    },
  },

  frequency: {
    label: 'Frequency',
    baseUnit: 'Hz',
    units: {
      Hz:   { label: 'Hertz',      symbol: 'Hz',   factor: 1 },
      kHz:  { label: 'Kilohertz',  symbol: 'kHz',  factor: 1e3 },
      MHz:  { label: 'Megahertz',  symbol: 'MHz',  factor: 1e6 },
      GHz:  { label: 'Gigahertz',  symbol: 'GHz',  factor: 1e9 },
      rpm:  { label: 'Revolutions/Minute', symbol: 'rpm', factor: 1 / 60 },
      rps:  { label: 'Revolutions/Second', symbol: 'rps', factor: 1 },
    },
  },

  viscosity_dynamic: {
    label: 'Viscosity (Dynamic)',
    baseUnit: 'Pa_s',
    units: {
      Pa_s:   { label: 'Pascal·Second',    symbol: 'Pa·s',  factor: 1 },
      mPa_s:  { label: 'Millipascal·Second', symbol: 'mPa·s', factor: 1e-3 },
      P:      { label: 'Poise',            symbol: 'P',     factor: 0.1 },
      cP:     { label: 'Centipoise',       symbol: 'cP',    factor: 1e-3 },
      dyn_s_cm2: { label: 'Dyne·s/cm²',   symbol: 'dyn·s/cm²', factor: 0.1 },
      lbf_s_ft2: { label: 'lbf·s/ft²',    symbol: 'lbf·s/ft²', factor: 47.8803 },
      lbm_ft_s:  { label: 'lb/(ft·s)',     symbol: 'lb/(ft·s)', factor: 1.48816 },
    },
  },

  viscosity_kinematic: {
    label: 'Viscosity (Kinematic)',
    baseUnit: 'm2_s',
    units: {
      m2_s:  { label: 'Square Meter/Second',      symbol: 'm²/s',  factor: 1 },
      cm2_s: { label: 'Stoke (cm²/s)',            symbol: 'St',    factor: 1e-4 },
      mm2_s: { label: 'Centistoke (mm²/s)',       symbol: 'cSt',   factor: 1e-6 },
      ft2_s: { label: 'Square Foot/Second',       symbol: 'ft²/s', factor: 0.0929 },
      in2_s: { label: 'Square Inch/Second',       symbol: 'in²/s', factor: 6.4516e-4 },
    },
  },

  intrinsic_viscosity: {
    label: 'Intrinsic Viscosity',
    baseUnit: 'm3_kg',
    units: {
      m3_kg:  { label: 'Cubic Meter/Kilogram', symbol: 'm³/kg', factor: 1 },
      mL_g:   { label: 'mL/g (dL/g × 0.1)',   symbol: 'mL/g',  factor: 1e-3 },
      dL_g:   { label: 'dL/g',                 symbol: 'dL/g',  factor: 1e-1 },
      L_g:    { label: 'L/g',                  symbol: 'L/g',   factor: 1 },
    },
  },

  thermal_conductivity: {
    label: 'Thermal Conductivity',
    baseUnit: 'W_mK',
    units: {
      W_mK:      { label: 'W/(m·K)',              symbol: 'W/(m·K)',      factor: 1 },
      mW_mK:     { label: 'mW/(m·K)',             symbol: 'mW/(m·K)',     factor: 1e-3 },
      W_cmK:     { label: 'W/(cm·K)',             symbol: 'W/(cm·K)',     factor: 100 },
      kcal_hmK:  { label: 'kcal/(h·m·K)',         symbol: 'kcal/(h·m·K)', factor: 1.163 },
      BTU_hftF:  { label: 'BTU/(h·ft·°F)',        symbol: 'BTU/(h·ft·°F)', factor: 1.73073 },
      BTU_in_hft2F: { label: 'BTU·in/(h·ft²·°F)', symbol: 'BTU·in/(h·ft²·°F)', factor: 0.144228 },
    },
  },

  specific_heat: {
    label: 'Specific Heat Capacity',
    baseUnit: 'J_kgK',
    units: {
      J_kgK:     { label: 'J/(kg·K)',          symbol: 'J/(kg·K)',   factor: 1 },
      kJ_kgK:    { label: 'kJ/(kg·K)',         symbol: 'kJ/(kg·K)',  factor: 1e3 },
      J_gK:      { label: 'J/(g·K)',           symbol: 'J/(g·K)',    factor: 1e3 },
      cal_gK:    { label: 'cal/(g·K)',         symbol: 'cal/(g·K)',  factor: 4184 },
      BTU_lbF:   { label: 'BTU/(lb·°F)',       symbol: 'BTU/(lb·°F)', factor: 4186.8 },
      kcal_kgK:  { label: 'kcal/(kg·K)',       symbol: 'kcal/(kg·K)', factor: 4184 },
    },
  },

  molar_heat_capacity: {
    label: 'Molar Heat Capacity',
    baseUnit: 'J_molK',
    units: {
      J_molK:    { label: 'J/(mol·K)',        symbol: 'J/(mol·K)',   factor: 1 },
      kJ_molK:   { label: 'kJ/(mol·K)',       symbol: 'kJ/(mol·K)',  factor: 1e3 },
      cal_molK:  { label: 'cal/(mol·K)',      symbol: 'cal/(mol·K)', factor: 4.184 },
      BTU_molF:  { label: 'BTU/(mol·°F)',     symbol: 'BTU/(mol·°F)', factor: 1899.11 },
    },
  },

  heat_flux: {
    label: 'Heat Flux',
    baseUnit: 'W_m2',
    units: {
      W_m2:       { label: 'W/m²',              symbol: 'W/m²',          factor: 1 },
      kW_m2:      { label: 'kW/m²',             symbol: 'kW/m²',         factor: 1e3 },
      mW_cm2:     { label: 'mW/cm²',            symbol: 'mW/cm²',        factor: 10 },
      W_cm2:      { label: 'W/cm²',             symbol: 'W/cm²',         factor: 1e4 },
      BTU_hft2:   { label: 'BTU/(h·ft²)',       symbol: 'BTU/(h·ft²)',   factor: 3.15459 },
      kcal_hm2:   { label: 'kcal/(h·m²)',       symbol: 'kcal/(h·m²)',   factor: 1.163 },
    },
  },

  cte: {
    label: 'Thermal Expansion (CTE)',
    baseUnit: '1_K',
    units: {
      '1_K':    { label: '1/K (or K⁻¹)',       symbol: '1/K',   factor: 1 },
      '1_degC': { label: '1/°C',               symbol: '1/°C',  factor: 1 },
      '1_degF': { label: '1/°F',               symbol: '1/°F',  factor: 9 / 5 },
      ppm_K:    { label: 'ppm/K',              symbol: 'ppm/K', factor: 1e-6 },
    },
  },

  electrical_conductivity: {
    label: 'Electrical Conductivity',
    baseUnit: 'S_m',
    units: {
      S_m:    { label: 'Siemens/Meter',       symbol: 'S/m',   factor: 1 },
      mS_m:   { label: 'Millisiemens/Meter',  symbol: 'mS/m',  factor: 1e-3 },
      S_cm:   { label: 'Siemens/Centimeter',  symbol: 'S/cm',  factor: 100 },
      mS_cm:  { label: 'Millisiemens/Centimeter', symbol: 'mS/cm', factor: 0.1 },
      uS_cm:  { label: 'Microsiemens/Centimeter', symbol: 'μS/cm', factor: 1e-4 },
    },
  },

  electrical_resistivity: {
    label: 'Electrical Resistivity',
    baseUnit: 'Ohm_m',
    units: {
      Ohm_m:    { label: 'Ohm·Meter',        symbol: 'Ω·m',   factor: 1 },
      Ohm_cm:   { label: 'Ohm·Centimeter',   symbol: 'Ω·cm',  factor: 1e-2 },
      kOhm_m:   { label: 'Kilohm·Meter',     symbol: 'kΩ·m',  factor: 1e3 },
      MOhm_m:   { label: 'Megohm·Meter',     symbol: 'MΩ·m',  factor: 1e6 },
      MOhm_cm:  { label: 'Megohm·Centimeter', symbol: 'MΩ·cm', factor: 1e4 },
      GOhm_cm:  { label: 'Gigohm·Centimeter', symbol: 'GΩ·cm', factor: 1e7 },
    },
  },

  electric_field: {
    label: 'Electric Field Strength',
    baseUnit: 'V_m',
    units: {
      V_m:    { label: 'Volt/Meter',       symbol: 'V/m',   factor: 1 },
      kV_m:   { label: 'Kilovolt/Meter',   symbol: 'kV/m',  factor: 1e3 },
      MV_m:   { label: 'Megavolt/Meter',   symbol: 'MV/m',  factor: 1e6 },
      V_cm:   { label: 'Volt/Centimeter',  symbol: 'V/cm',  factor: 100 },
      kV_cm:  { label: 'Kilovolt/Centimeter', symbol: 'kV/cm', factor: 1e5 },
      V_mil:  { label: 'Volt/Mil',         symbol: 'V/mil', factor: 39370.1 },
    },
  },

  dipole_moment: {
    label: 'Dipole Moment',
    baseUnit: 'C_m',
    units: {
      C_m:    { label: 'Coulomb·Meter',  symbol: 'C·m',  factor: 1 },
      D:      { label: 'Debye',          symbol: 'D',    factor: 3.33564e-30 },
      mD:     { label: 'Millidebye',     symbol: 'mD',   factor: 3.33564e-33 },
      C_cm:   { label: 'Coulomb·Centimeter', symbol: 'C·cm', factor: 1e-2 },
    },
  },

  magnetic_flux_density: {
    label: 'Magnetic Flux Density',
    baseUnit: 'T',
    units: {
      T:   { label: 'Tesla',     symbol: 'T',  factor: 1 },
      mT:  { label: 'Millitesla', symbol: 'mT', factor: 1e-3 },
      uT:  { label: 'Microtesla', symbol: 'μT', factor: 1e-6 },
      G:   { label: 'Gauss',     symbol: 'G',  factor: 1e-4 },
      mG:  { label: 'Milligauss', symbol: 'mG', factor: 1e-7 },
    },
  },

  absorbed_dose: {
    label: 'Absorbed Dose (Radiation)',
    baseUnit: 'Gy',
    units: {
      Gy:   { label: 'Gray',       symbol: 'Gy',   factor: 1 },
      mGy:  { label: 'Milligray',  symbol: 'mGy',  factor: 1e-3 },
      kGy:  { label: 'Kilogray',   symbol: 'kGy',  factor: 1e3 },
      MGy:  { label: 'Megagray',   symbol: 'MGy',  factor: 1e6 },
      rad:  { label: 'Rad',        symbol: 'rad',  factor: 0.01 },
      krad: { label: 'Kilorad',    symbol: 'krad', factor: 10 },
      Mrad: { label: 'Megarad',    symbol: 'Mrad', factor: 1e4 },
    },
  },

  activity: {
    label: 'Radioactivity',
    baseUnit: 'Bq',
    units: {
      Bq:   { label: 'Becquerel',        symbol: 'Bq',  factor: 1 },
      kBq:  { label: 'Kilobecquerel',    symbol: 'kBq', factor: 1e3 },
      MBq:  { label: 'Megabecquerel',    symbol: 'MBq', factor: 1e6 },
      GBq:  { label: 'Gigabecquerel',    symbol: 'GBq', factor: 1e9 },
      Ci:   { label: 'Curie',            symbol: 'Ci',  factor: 3.7e10 },
      mCi:  { label: 'Millicurie',       symbol: 'mCi', factor: 3.7e7 },
      uCi:  { label: 'Microcurie',       symbol: 'μCi', factor: 3.7e4 },
    },
  },

  surface_tension: {
    label: 'Surface Tension',
    baseUnit: 'N_m',
    units: {
      N_m:     { label: 'Newton/Meter',        symbol: 'N/m',    factor: 1 },
      mN_m:    { label: 'Millinewton/Meter',   symbol: 'mN/m',   factor: 1e-3 },
      dyn_cm:  { label: 'Dyne/Centimeter',     symbol: 'dyn/cm', factor: 1e-3 },
      erg_cm2: { label: 'Erg/cm²',             symbol: 'erg/cm²', factor: 1e-3 },
      mJ_m2:   { label: 'Millijoule/m²',       symbol: 'mJ/m²',  factor: 1e-3 },
      lbf_ft:  { label: 'lbf/ft',              symbol: 'lbf/ft', factor: 14.5939 },
    },
  },

  diffusion_coefficient: {
    label: 'Diffusion Coefficient',
    baseUnit: 'm2_s',
    units: {
      m2_s:   { label: 'm²/s',   symbol: 'm²/s',  factor: 1 },
      cm2_s:  { label: 'cm²/s',  symbol: 'cm²/s', factor: 1e-4 },
      mm2_s:  { label: 'mm²/s',  symbol: 'mm²/s', factor: 1e-6 },
      cm2_min: { label: 'cm²/min', symbol: 'cm²/min', factor: 1e-4 / 60 },
    },
  },

  gas_permeability: {
    label: 'Gas Permeability',
    baseUnit: 'barrer',
    units: {
      barrer:      { label: 'Barrer',                       symbol: 'Barrer',       factor: 1 },
      mbarrer:     { label: 'Millibarrer',                  symbol: 'mBarrer',      factor: 1e-3 },
      mol_msPa:    { label: 'mol·m/(m²·s·Pa)',              symbol: 'mol·m/(m²·s·Pa)', factor: 3.348e22 },
      cm3_cmcmHg:  { label: 'cm³(STP)·cm/(cm²·s·cmHg)',    symbol: 'cm³·cm/(cm²·s·cmHg)', factor: 7.5006e5 },
    },
  },

  gas_permeance: {
    label: 'Gas Permeance',
    baseUnit: 'GPU',
    units: {
      GPU:       { label: 'GPU (Gas Permeation Unit)', symbol: 'GPU',    factor: 1 },
      mGPU:      { label: 'milli-GPU',                 symbol: 'mGPU',   factor: 1e-3 },
      mol_m2sPa: { label: 'mol/(m²·s·Pa)',             symbol: 'mol/(m²·s·Pa)', factor: 3.348e16 },
    },
  },

  flow_rate: {
    label: 'Flow Rate (Volumetric)',
    baseUnit: 'm3_s',
    units: {
      m3_s:    { label: 'm³/s',           symbol: 'm³/s',   factor: 1 },
      m3_h:    { label: 'm³/h',           symbol: 'm³/h',   factor: 1 / 3600 },
      L_s:     { label: 'L/s',            symbol: 'L/s',    factor: 1e-3 },
      L_min:   { label: 'L/min',          symbol: 'L/min',  factor: 1e-3 / 60 },
      L_h:     { label: 'L/h',            symbol: 'L/h',    factor: 1e-3 / 3600 },
      mL_s:    { label: 'mL/s',           symbol: 'mL/s',   factor: 1e-6 },
      mL_min:  { label: 'mL/min',         symbol: 'mL/min', factor: 1e-6 / 60 },
      ft3_min: { label: 'ft³/min (CFM)',  symbol: 'ft³/min', factor: 4.71947e-4 },
      gal_min: { label: 'gal/min (GPM)',  symbol: 'gal/min', factor: 6.30902e-5 },
    },
  },

  molar_concentration: {
    label: 'Molar Concentration',
    baseUnit: 'mol_m3',
    units: {
      mol_m3:  { label: 'mol/m³',   symbol: 'mol/m³',  factor: 1 },
      mol_L:   { label: 'mol/L (M)', symbol: 'mol/L',   factor: 1e3 },
      mmol_L:  { label: 'mmol/L (mM)', symbol: 'mmol/L', factor: 1 },
      umol_L:  { label: 'μmol/L (μM)', symbol: 'μmol/L', factor: 1e-3 },
      nmol_L:  { label: 'nmol/L (nM)', symbol: 'nmol/L', factor: 1e-6 },
      mol_cm3: { label: 'mol/cm³',   symbol: 'mol/cm³', factor: 1e6 },
    },
  },

  mass_fraction: {
    label: 'Mass Fraction / Concentration',
    baseUnit: 'kg_kg',
    units: {
      kg_kg:   { label: 'kg/kg (dimensionless)', symbol: 'kg/kg',  factor: 1 },
      g_g:     { label: 'g/g',                   symbol: 'g/g',    factor: 1 },
      wt_pct:  { label: 'Weight percent (wt%)',  symbol: 'wt%',    factor: 0.01 },
      ppm:     { label: 'Parts per million (ppm)', symbol: 'ppm',  factor: 1e-6 },
      ppb:     { label: 'Parts per billion (ppb)', symbol: 'ppb',  factor: 1e-9 },
      ppt:     { label: 'Parts per trillion (ppt)', symbol: 'ppt', factor: 1e-12 },
    },
  },

  wavenumber_q: {
    label: 'Wavenumber / Scattering Vector q',
    baseUnit: '1_m',
    units: {
      '1_m':    { label: '1/m (m⁻¹)',      symbol: 'm⁻¹',   factor: 1 },
      '1_cm':   { label: '1/cm (cm⁻¹)',    symbol: 'cm⁻¹',  factor: 100 },
      '1_mm':   { label: '1/mm (mm⁻¹)',    symbol: 'mm⁻¹',  factor: 1e3 },
      '1_um':   { label: '1/μm (μm⁻¹)',    symbol: 'μm⁻¹',  factor: 1e6 },
      '1_nm':   { label: '1/nm (nm⁻¹)',    symbol: 'nm⁻¹',  factor: 1e9 },
      '1_ang':  { label: '1/Å (Å⁻¹)',      symbol: 'Å⁻¹',   factor: 1e10 },
      rad_m:    { label: 'rad/m',           symbol: 'rad/m', factor: 1 },
      rad_nm:   { label: 'rad/nm',          symbol: 'rad/nm', factor: 1e9 },
      rad_ang:  { label: 'rad/Å',           symbol: 'rad/Å', factor: 1e10 },
    },
  },

  power: {
    label: 'Power',
    baseUnit: 'W',
    units: {
      W:      { label: 'Watt',                symbol: 'W',    factor: 1 },
      kW:     { label: 'Kilowatt',            symbol: 'kW',   factor: 1e3 },
      MW:     { label: 'Megawatt',            symbol: 'MW',   factor: 1e6 },
      mW:     { label: 'Milliwatt',           symbol: 'mW',   factor: 1e-3 },
      uW:     { label: 'Microwatt',           symbol: 'μW',   factor: 1e-6 },
      hp:     { label: 'Horsepower (mech.)',  symbol: 'hp',   factor: 745.7 },
      BTU_h:  { label: 'BTU/hour',           symbol: 'BTU/h', factor: 0.293071 },
      cal_s:  { label: 'cal/s',              symbol: 'cal/s', factor: 4.184 },
      kcal_h: { label: 'kcal/h',             symbol: 'kcal/h', factor: 1.163 },
    },
  },

  torque: {
    label: 'Torque',
    baseUnit: 'N_m',
    units: {
      N_m:     { label: 'Newton·Meter',          symbol: 'N·m',    factor: 1 },
      N_cm:    { label: 'Newton·Centimeter',     symbol: 'N·cm',   factor: 0.01 },
      kN_m:    { label: 'Kilonewton·Meter',      symbol: 'kN·m',   factor: 1e3 },
      mN_m:    { label: 'Millinewton·Meter',     symbol: 'mN·m',   factor: 1e-3 },
      kgf_m:   { label: 'Kilogram-force·Meter',  symbol: 'kgf·m',  factor: 9.80665 },
      kgf_cm:  { label: 'Kilogram-force·Centimeter', symbol: 'kgf·cm', factor: 0.0980665 },
      lbf_ft:  { label: 'Pound-force·Foot',      symbol: 'lbf·ft', factor: 1.35582 },
      lbf_in:  { label: 'Pound-force·Inch',      symbol: 'lbf·in', factor: 0.113 },
      ozf_in:  { label: 'Ounce-force·Inch',      symbol: 'ozf·in', factor: 0.00706155 },
    },
  },

  fracture_energy: {
    label: 'Fracture Energy / Toughness',
    baseUnit: 'J_m2',
    units: {
      J_m2:     { label: 'J/m²',              symbol: 'J/m²',     factor: 1 },
      mJ_m2:    { label: 'mJ/m²',             symbol: 'mJ/m²',    factor: 1e-3 },
      kJ_m2:    { label: 'kJ/m²',             symbol: 'kJ/m²',    factor: 1e3 },
      erg_cm2:  { label: 'erg/cm²',           symbol: 'erg/cm²',  factor: 1e-3 },
      ftlbf_in2: { label: 'ft·lbf/in²',       symbol: 'ft·lbf/in²', factor: 2101.52 },
      inlbf_in2: { label: 'in·lbf/in²',       symbol: 'in·lbf/in²', factor: 175.127 },
    },
  },

  impact_strength: {
    label: 'Impact Strength (Notched)',
    baseUnit: 'J_m',
    units: {
      J_m:      { label: 'J/m',        symbol: 'J/m',       factor: 1 },
      kJ_m:     { label: 'kJ/m',       symbol: 'kJ/m',      factor: 1e3 },
      J_cm:     { label: 'J/cm',       symbol: 'J/cm',      factor: 100 },
      mJ_mm:    { label: 'mJ/mm',      symbol: 'mJ/mm',     factor: 1 },
      ftlbf_in: { label: 'ft·lbf/in',  symbol: 'ft·lbf/in', factor: 53.3787 },
      inlbf_in: { label: 'in·lbf/in',  symbol: 'in·lbf/in', factor: 4.44822 },
    },
  },

  solubility_parameter: {
    label: 'Solubility Parameter',
    baseUnit: 'Pa05',
    units: {
      Pa05:        { label: 'Pa^0.5',                   symbol: 'Pa^0.5',           factor: 1 },
      MPa05:       { label: 'MPa^0.5',                  symbol: 'MPa^0.5',          factor: 1e3 },
      kPa05:       { label: 'kPa^0.5',                  symbol: 'kPa^0.5',          factor: 31.6228 },
      cal05_cm1p5: { label: '(cal/cm³)^0.5 (Hildebrand)', symbol: '(cal/cm³)^0.5', factor: 2045.2 },
    },
  },

  linear_density: {
    label: 'Linear Density (Fiber)',
    baseUnit: 'kg_m',
    units: {
      kg_m:    { label: 'kg/m',     symbol: 'kg/m',  factor: 1 },
      g_m:     { label: 'g/m',      symbol: 'g/m',   factor: 1e-3 },
      g_km:    { label: 'g/km (tex)', symbol: 'tex',  factor: 1e-6 },
      mg_m:    { label: 'mg/m',     symbol: 'mg/m',  factor: 1e-6 },
      denier:  { label: 'Denier (g/9km)', symbol: 'den', factor: 1.111e-7 },
      tex:     { label: 'Tex (g/km)', symbol: 'tex',  factor: 1e-6 },
    },
  },

  velocity: {
    label: 'Velocity',
    baseUnit: 'm_s',
    units: {
      m_s:   { label: 'Meter/Second',      symbol: 'm/s',  factor: 1 },
      km_h:  { label: 'Kilometer/Hour',    symbol: 'km/h', factor: 1 / 3.6 },
      mph:   { label: 'Miles/Hour',        symbol: 'mph',  factor: 0.44704 },
      ft_s:  { label: 'Foot/Second',       symbol: 'ft/s', factor: 0.3048 },
      knot:  { label: 'Knot',              symbol: 'kn',   factor: 0.514444 },
      cm_s:  { label: 'Centimeter/Second', symbol: 'cm/s', factor: 0.01 },
      mm_s:  { label: 'Millimeter/Second', symbol: 'mm/s', factor: 1e-3 },
    },
  },

  angle: {
    label: 'Angle',
    baseUnit: 'rad',
    units: {
      rad:    { label: 'Radian',           symbol: 'rad',    factor: 1 },
      deg:    { label: 'Degree',           symbol: '°',      factor: Math.PI / 180 },
      grad:   { label: 'Gradian',          symbol: 'grad',   factor: Math.PI / 200 },
      arcmin: { label: 'Arcminute',        symbol: "'",      factor: Math.PI / 10800 },
      arcsec: { label: 'Arcsecond',        symbol: '"',      factor: Math.PI / 648000 },
      rev:    { label: 'Revolution/Turn',  symbol: 'rev',    factor: 2 * Math.PI },
    },
  },
}

export function convert(value: number, fromKey: string, toKey: string, category: CategoryDef): number {
  const from = category.units[fromKey]
  const to   = category.units[toKey]
  if (!from || !to) return NaN
  const base = value * from.factor + (from.offset ?? 0)
  return (base - (to.offset ?? 0)) / to.factor
}

export function getCategoryKeys(): string[] {
  return Object.keys(UNIT_CATEGORIES)
}

export function getUnitKeys(categoryKey: string): string[] {
  return Object.keys(UNIT_CATEGORIES[categoryKey]?.units ?? {})
}
