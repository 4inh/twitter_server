import { Types } from "mongoose";

export const formatResponse = (message, data = null, error = null) => {
    return { message, data, error };
};
export const validateObjectId = (id) => {
    return Types.ObjectId.isValid(id);
};
