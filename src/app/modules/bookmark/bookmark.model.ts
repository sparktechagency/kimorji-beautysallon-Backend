import { model, Schema } from "mongoose";
import { IBookmark, BookmarkModel } from "./bookmark.interface"

const bookmarkSchema = new Schema<IBookmark, BookmarkModel>(
    {
        customer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        barber: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    }, 
    {
        timestamps: true
    }
);

export const Bookmark = model<IBookmark, BookmarkModel>("Bookmark", bookmarkSchema);