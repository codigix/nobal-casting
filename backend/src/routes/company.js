import express from 'express'
import { getCompanyInfo } from '../controllers/CompanyController.js'

const router = express.Router()

router.get('/', getCompanyInfo)

export default router
