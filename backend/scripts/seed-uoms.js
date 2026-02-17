import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: 'backend/.env' })

async function seedUOMs() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  })

  const uoms = [
    'Unit', 'Box', 'Pair', 'Set', 'Meter', 'Barleycorn', 'Calibre', 'Cable Length (UK)', 'Cable Length (US)', 'Cable Length', 
    'Centimeter', 'Chain', 'Decimeter', 'Ells (UK)', 'Ems(Pica)', 'Fathom', 'Foot', 'Furlong', 'Hand', 'Hectometer', 
    'Inch', 'Kilometer', 'Link', 'Micrometer', 'Mile', 'Mile (Nautical)', 'Millimeter', 'Nanometer', 'Rod', 'Vara', 
    'Versta', 'Yard', 'Arshin', 'Sazhen', 'Medio Metro', 'Square Meter', 'Centiarea', 'Area', 'Manzana', 'Caballeria', 
    'Square Kilometer', 'Are', 'Acre', 'Acre (US)', 'Hect hectare', 'Square Yard', 'Square Foot', 'Square Inch', 
    'Square Centimeter', 'Square Mile', 'Meter/Second', 'Inch/Minute', 'Foot/Minute', 'Inch/Second', 'Kilometer/Hour', 
    'Foot/Second', 'Mile/Hour', 'Knot', 'Mile/Minute', 'Mile/Second', 'Carat', 'Cental', 'Dram', 'Grain', 'Gram', 
    'Hundredweight (UK)', 'Hundredweight (US)', 'Quintal', 'Microgram', 'Milligram', 'Ounce', 'Pood', 'Pound', 
    'Slug', 'Stone', 'Tonne', 'Kip', 'Barrel(Beer)', 'Barrel (Oil)', 'Bushel (UK)', 'Bushel (US Dry Level)', 
    'Centilitre', 'Cubic Centimeter', 'Cubic Decimeter', 'Cubic Foot', 'Cubic Inch', 'Cubic Meter', 'Cubic Millimeter', 
    'Cubic Yard', 'Cup', 'Decilitre', 'Fluid Ounce (UK)', 'Fluid Ounce (US)', 'Gallon (UK)', 'Gallon Dry (US)', 
    'Gallon Liquid (US)', 'Litre', 'Millilitre', 'Peck', 'Pint (UK)', 'Pint, Dry (US)', 'Pint, Liquid (US)', 
    'Quart (UK)', 'Quart Dry (US)', 'Quart Liquid (US)', 'Tablespoon (US)', 'Teaspoon', 'Day', 'Hour', 'Minute', 
    'Second', 'Millisecond', 'Microsecond', 'Nanosecond', 'Week', 'Atmosphere', 'Pascal', 'Bar', 'Foot Of Water', 
    'Hectopascal', 'Inches Of Water', 'Inches Of Mercury', 'Kilopascal', 'Meter Of Water', 'Microbar', 'Millibar', 
    'Millimeter Of Mercury', 'Millimeter Of Water', 'Technical Atmosphere', 'Torr', 'Dyne', 'Gram-Force', 
    'Joule/Meter', 'Kilogram-Force', 'Kilopond', 'Kilopound-Force', 'Newton', 'Ounce-Force', 'Pond', 'Pound-Force', 
    'Poundal', 'Tonne-Force(Metric)', 'Ton-Force (UK)', 'Ton-Force (US)', 'Btu (It)', 'Btu (Th)', 'Btu (Mean)', 
    'Calorie (It)', 'Calorie (Th)', 'Calorie (Mean)', 'Calorie (Food)', 'Erg', 'Horsepower-Hours', 'Inch Pound-Force', 
    'Joule', 'Kilojoule', 'Kilocalorie', 'Kilowatt-Hour', 'Litre-Atmosphere', 'Megajoule', 'Watt-Hour', 'Btu/Hour', 
    'Btu/Minutes', 'Btu/Seconds', 'Calorie/Seconds', 'Horsepower', 'Kilowatt', 'Megawatt', 'Volt-Ampere', 'Watt', 
    'Centigram/Litre', 'Decigram/Litre', 'Dekagram/Litre', 'Hectogram/Litre', 'Gram/Cubic Meter', 'Gram/Cubic Centimeter', 
    'Gram/Cubic Millimeter', 'Gram/Litre', 'Grain/Gallon (US)', 'Grain/Gallon (UK)', 'Grain/Cubic Foot', 
    'Kilogram/Cubic Meter', 'Kilogram/Cubic Centimeter', 'Kilogram/Litre', 'Milligram/Cubic Meter', 
    'Milligram/Cubic Centimeter', 'Milligram/Cubic Millimeter', 'Megagram/Litre', 'Milligram/Litre', 
    'Microgram/Litre', 'Nanogram/Litre', 'Ounce/Cubic Inch', 'Ounce/Cubic Foot', 'Ounce/Gallon (US)', 
    'Ounce/Gallon (UK)', 'Pound/Cubic Inch', 'Pound/Cubic Foot', 'Pound/Cubic Yard', 'Pound/Gallon (US)', 
    'Pound/Gallon (UK)', 'Nos', 'Kg'
  ]

  try {
    console.log('Seeding UOMs...')
    for (const name of uoms) {
      await conn.execute(
        'INSERT IGNORE INTO uom (name) VALUES (?)',
        [name]
      )
    }
    console.log(`✓ ${uoms.length} UOMs seeded`)
  } catch (error) {
    console.error('Seeding failed:', error.message)
  } finally {
    await conn.end()
  }
}

seedUOMs()
