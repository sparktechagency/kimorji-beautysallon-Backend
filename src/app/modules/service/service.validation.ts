import { z } from 'zod'
import { objectIdZodSchema } from '../../../helpers/checkObjectIdZodSchemaHelper'

const createServiceZodSchema = z.object({
    body: z.array(
        z.object({
            title: z.string({ required_error: "Title is required" }),
            category: objectIdZodSchema("Category Object ID is required")
        })
    )
})

const updateServiceZodSchema = z.object({
    body: z.object({
        image: z.string().optional(),
        gender: z.enum([ "Male", 'Female', 'Children', 'Others']).optional(),
        price: z.number().optional(),
        duration: z.string().optional(),
        description: z.string().optional()
    })

})

export const ServiceValidation = {
    createServiceZodSchema,
    updateServiceZodSchema
}