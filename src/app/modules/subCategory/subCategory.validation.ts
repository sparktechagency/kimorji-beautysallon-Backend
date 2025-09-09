import { z } from 'zod'
import { objectIdZodSchema } from '../../../helpers/checkObjectIdZodSchemaHelper'

const createSubCategoryZodSchema = z.object({
    body: z.object({
        category : objectIdZodSchema("Category Id"),
        title: z.string({ required_error: 'Sub Category is required' })
    })
})

export const SubCategoryValidation = {
    createSubCategoryZodSchema
}
