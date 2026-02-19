import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const channelId = req.user._id
    
    //Total Videos
    const totalVideos = await Video.countDocuments({ owner: channelId })
    
    //Tootal Views
    const totalViewsResult = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" }
            }
        }
    ])

    const totalViews = totalViewsResult[0]?.totalViews || 0
    
    //Total Subscribers
    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    })

    //Total likes on channel videos
    const totalLikesResult = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField:"_id",
                foreignField: "video",
                as: "videoLikes"
            }
        },
        {
            $project: {
                likeCount: { $size: "$videoLikes" }
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: "$likeCount"}
            }
        }
    ])
    
    const totalLikes = totalLikesResult[0]?.totalLikes || 0

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalVideos,
                totalViews,
                totalSubscribers,
                totalLikes
            },
            "Channel stats fetched successfully"
        )
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const channelId = req.user._id

    /*const videos = await Video.find({ owner: channelId })
        .sort({ createdAt: -1 })
        .populate("owner", "username avatar")

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Channel videos fetched successfully"
        )
    )*/

    
    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$likes" }
            }
        },
        {
            $project: {
                likes: 0
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, videos, "Channel videos fetched successfully")
    )
})

export {
    getChannelStats, 
    getChannelVideos
}