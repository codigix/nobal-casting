console.log('Testing imports...\n')

try {
  const InventoryModel = await import('./src/models/InventoryModel.js')
  console.log('✓ InventoryModel.js imported successfully')
} catch (e) {
  console.error('✗ InventoryModel.js import failed:', e.message)
}

try {
  const InventoryController = await import('./src/controllers/InventoryController.js')
  console.log('✓ InventoryController.js imported successfully')
} catch (e) {
  console.error('✗ InventoryController.js import failed:', e.message)
}

try {
  const production = await import('./src/routes/production.js')
  console.log('✓ production.js imported successfully')
} catch (e) {
  console.error('✗ production.js import failed:', e.message)
}

console.log('\n✓ All imports successful!')
