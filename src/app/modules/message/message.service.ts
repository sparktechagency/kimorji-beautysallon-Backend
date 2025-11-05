import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../../shared/apiFeature';
import { IMessage } from './message.interface';
import { Message } from './message.model';
import { Chat } from '../chat/chat.model';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const sendMessageToDB = async (payload: {
    chatId: string;
    sender: string;
    text?: string;
    offer?: any;
}): Promise<IMessage> => {
    // 1) persist message
    const msg = await Message.create({
        chatId: payload.chatId,
        sender: payload.sender,
        text: payload.text ?? "",
        offer: payload.offer ?? null,
    });

    await Chat.findByIdAndUpdate(payload.chatId, { $set: { updatedAt: new Date() } });

    const chat = await Chat.findById(payload.chatId).select("participants").lean<{ participants: string[] } | null>();
    const participants = chat?.participants ?? [];

    const io = global.io;
    if (io) {
        io.to(`chat:${payload.chatId}`).emit("message:new", {
            _id: msg._id,
            chatId: msg.chatId,
            sender: msg.sender,
            text: msg.text,
        });

        io.to(`chat:${payload.chatId}`).emit(`getMessage::${payload.chatId}`, msg);

        const lastMessageSummary = {
            chatId: payload.chatId,
            sender: msg.sender,
        };

        participants.forEach((uid) => {
            io.to(`user:${uid}`).emit("chat:updated", lastMessageSummary);
            io.to(`user:${uid}`).emit("badge:chatIncrement", { chatId: payload.chatId });
        });
    }

    return msg;
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