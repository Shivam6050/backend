import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import mongoose from "mongoose"

const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message

    const dbStatus = mongoose.connection.readyState === 1

    if (!dbStatus) {
        throw new ApiError(500, "Database not connected")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                status: "OK",
                database: "Connected"
            },
            "Server and database are healthy"
        )
    )
})

export {
    healthcheck
}
    