import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../../shared/apiFeature';
import { IMessage } from './message.interface';
import { Message } from './message.model';
import { Chat } from '../chat/chat.model';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const sendMessageToDB = async (payload: any): Promise<IMessage> => {

    // save to DB
    const response = await Message.create(payload);

    //@ts-ignore
    const io = global.io;
    if (io) {
        io.emit(`getMessage::${payload?.chatId}`, response);
    }

    return response;
};

const getMessageFromDB = async (user: JwtPayload, id: any, query: Record<string, any>): Promise<{ messages: IMessage[], pagination: any, participant: any }> => {

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Chat ID');
    }

    const result = new QueryBuilder(Message.find({ chatId: id }), query).paginate();
    const messages = await result.queryModel.sort({ createdAt: -1 });
    const pagination = await result.getPaginationInfo();


    const participant: any = await Chat.findById(id)
        .populate({
            path: 'participants',
            select: 'name profile location',
            match: {
                _id: { $ne: user.id }
            }
        })

    return { messages, pagination, participant: participant?.participants[0] };
};

export const MessageService = { sendMessageToDB, getMessageFromDB };