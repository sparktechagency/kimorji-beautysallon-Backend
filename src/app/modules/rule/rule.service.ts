import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IRule } from './rule.interface'
import { Rule } from './rule.model'

//privacy policy
const createPrivacyPolicyToDB = async (payload: IRule) => {

    // check if privacy policy exist or not
    const isExistPrivacy = await Rule.findOne({ type: 'privacy' })

    if (isExistPrivacy) {

        // update privacy is exist 
        const result = await Rule.findOneAndUpdate({ type: 'privacy' }, { content: payload?.content }, { new: true })
        const message = "Privacy & Policy Updated successfully"
        return { message, result }
    } else {

        // create new if not exist
        const result = await Rule.create({ ...payload, type: 'privacy' })
        const message = "Privacy & Policy Created successfully"
        return { message, result }
    }
}

const updatePrivacyPolicyToDB = async (payload: IRule) => {

    const isExistPrivacy = await Rule.findOne({ type: 'privacy' })
    if (!isExistPrivacy) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Privacy & Policy not found")
    }
    const result = await Rule.findOneAndUpdate({ type: 'privacy' }, { content: payload?.content }, { new: true })
    const message = "Privacy & Policy Updated successfully"
    return { message, result }
    }

const getPrivacyPolicyFromDB = async () => {
    const result = await Rule.findOne({ type: 'privacy' })
    if (!result) {
        return { message: "Privacy & Policy not found", }
    }
    return result
}

//terms and conditions
const createTermsAndConditionToDB = async (payload: IRule) => {
    const result = await Rule.findOneAndUpdate(
        { type: 'terms' }, 
        { 
            $set: { 
                content: payload.content,
                type: 'terms' 
            } 
        },
        { 
            new: true,      
            upsert: true,  
            runValidators: true 
        }
    );

    const message = "Terms And Condition saved successfully";
    return { message, result };
};

const updateTermsAndConditionToDB = async (payload: IRule) => {

    const isExistTerms = await Rule.findOne({ type: 'terms' })
    if (!isExistTerms) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Terms And Condition not found")
    }
    const result = await Rule.findOneAndUpdate({ type: 'terms' }, { content: payload?.content }, { new: true })
    const message = "Terms And Condition Updated successfully"
    return { message, result }
    }

const getTermsAndConditionFromDB = async () => {
    const result = await Rule.findOne({ type: 'terms' })
    if (!result) {
        return { message: "Terms and conditions not found", }
    }
    return result
}

//privacy policy
const createAboutToDB = async (payload: IRule) => {

    const isExistAbout = await Rule.findOne({ type: 'about' })
    if (isExistAbout) {
        const result = await Rule.findOneAndUpdate({ type: 'about' }, { content: payload?.content }, { new: true })
        const message = "About Us Updated successfully"
        return { message, result }
    } else {
        const result = await Rule.create({ ...payload, type: 'about' })
        const message = "About Us created successfully"
        return { message, result }
    }
}

const updateAboutToDB = async (payload: IRule) => {

    const isExistAbout = await Rule.findOne({ type: 'about' })
    if (!isExistAbout) {
        throw new ApiError(StatusCodes.NOT_FOUND, "About Us not found")
    }
    const result = await Rule.findOneAndUpdate({ type: 'about' }, { content: payload?.content }, { new: true })
    const message = "About Us Updated successfully"
    return { message, result }
}

const getAboutFromDB = async () => {

    const result = await Rule.findOne({ type: 'about' })
    if (!result) {
        //empty response if about us not found
        return { message: "About us not found", }
    }
    return result
}

export const RuleService = {
    createPrivacyPolicyToDB,
    getPrivacyPolicyFromDB,
    createTermsAndConditionToDB,
    getTermsAndConditionFromDB,
    createAboutToDB,
    getAboutFromDB,
    updatePrivacyPolicyToDB,
    updateTermsAndConditionToDB,
    updateAboutToDB
}  