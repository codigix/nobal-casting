import ProductionStageModel from '../models/ProductionStageModel.js'

export async function getAllProductionStages(req, res) {
  try {
    const filters = {
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      search: req.query.search
    }

    const stages = await ProductionStageModel.getAll(filters)
    res.json({
      success: true,
      data: stages
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function getProductionStage(req, res) {
  try {
    const { id } = req.params
    const stage = await ProductionStageModel.getById(id)

    if (!stage) {
      return res.status(404).json({
        success: false,
        error: 'Production stage not found'
      })
    }

    res.json({
      success: true,
      data: stage
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function createProductionStage(req, res) {
  try {
    const {
      stage_code,
      stage_name,
      stage_sequence,
      description,
      is_active
    } = req.body

    if (!stage_code || !stage_name || stage_sequence === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: stage_code, stage_name, stage_sequence'
      })
    }

    if (typeof stage_sequence !== 'number' || stage_sequence < 1) {
      return res.status(400).json({
        success: false,
        error: 'stage_sequence must be a positive number'
      })
    }

    const existingStage = await ProductionStageModel.getByCode(stage_code)
    if (existingStage) {
      return res.status(409).json({
        success: false,
        error: `Stage code '${stage_code}' already exists`
      })
    }

    const stage = await ProductionStageModel.create({
      stage_code,
      stage_name,
      stage_sequence: parseInt(stage_sequence),
      description,
      is_active: is_active !== undefined ? is_active : 1
    })

    res.status(201).json({
      success: true,
      data: stage,
      message: 'Production stage created successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function updateProductionStage(req, res) {
  try {
    const { id } = req.params
    const {
      stage_code,
      stage_name,
      stage_sequence,
      description,
      is_active
    } = req.body

    const existingStage = await ProductionStageModel.getById(id)
    if (!existingStage) {
      return res.status(404).json({
        success: false,
        error: 'Production stage not found'
      })
    }

    if (stage_code && stage_code !== existingStage.stage_code) {
      const duplicateStage = await ProductionStageModel.getByCode(stage_code)
      if (duplicateStage) {
        return res.status(409).json({
          success: false,
          error: `Stage code '${stage_code}' already exists`
        })
      }
    }

    if (stage_sequence !== undefined && (typeof stage_sequence !== 'number' || stage_sequence < 1)) {
      return res.status(400).json({
        success: false,
        error: 'stage_sequence must be a positive number'
      })
    }

    const updatedStage = await ProductionStageModel.update(id, {
      stage_code,
      stage_name,
      stage_sequence: stage_sequence !== undefined ? parseInt(stage_sequence) : undefined,
      description,
      is_active
    })

    res.json({
      success: true,
      data: updatedStage,
      message: 'Production stage updated successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function deleteProductionStage(req, res) {
  try {
    const { id } = req.params

    const stage = await ProductionStageModel.getById(id)
    if (!stage) {
      return res.status(404).json({
        success: false,
        error: 'Production stage not found'
      })
    }

    const result = await ProductionStageModel.delete(id)

    res.json({
      success: true,
      data: result,
      message: 'Production stage deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function getActiveProductionStages(req, res) {
  try {
    const stages = await ProductionStageModel.getActiveStages()
    res.json({
      success: true,
      data: stages
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
