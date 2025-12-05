import express from 'express'
import { TaxTemplateController } from '../controllers/TaxTemplateController.js'

const router = express.Router()

router.get('/', TaxTemplateController.getAll)
router.get('/:id', TaxTemplateController.getById)
router.post('/', TaxTemplateController.create)
router.put('/:id', TaxTemplateController.update)
router.delete('/:id', TaxTemplateController.delete)
router.post('/:id/items', TaxTemplateController.addTaxItem)
router.delete('/:id/items/:itemId', TaxTemplateController.removeTaxItem)

export default router
