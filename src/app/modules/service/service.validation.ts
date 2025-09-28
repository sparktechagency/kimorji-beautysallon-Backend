import { z } from 'zod'
import { objectIdZodSchema } from '../../../helpers/checkObjectIdZodSchemaHelper'


const createServiceZodSchema = z.object({
    body: z.object({
        serviceType: z.string().optional(),
        title: z.string({ required_error: "Title is required" }),
        category: objectIdZodSchema("Category Object ID is required"),
        description: z.string().optional(),
        transportFee: z.number().optional(),
        price: z.number().optional(),
        timeSchedule: z.string().optional(),
        duration: z.string().optional(),
        image: z.string().optional(),
        gender: z.enum(["Male", 'Female', 'Children', 'Others']).optional()
    })
});

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