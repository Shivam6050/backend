import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    //validate videoId
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }

    //check if like already exists
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    })

    //if exists then unlike
    if(existingLike){
        await Like.findByIdAndDelete(existingLike._id)

        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Video unliked successfully")
        )
    }

    // else like the video
    await Like.create({
        video: videoId,
        likedBy: userId
    })

    //Return response
    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Video Liked successfully")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const userId = req.user._id
    //TODO: toggle like on comment

    //validate commentId
    if(!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    //check if like already exists
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: userId
    })

    //if exists unlike it
    if(existingLike){
        await Like.findByIdAndDelete(existingLike._id)

        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Comment unliked successfully")
        )
    }

    //else like
    await Like.create({
        comment: commentId,
        likedBy: userId
    })

    //Return response
    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Video Liked successfully")
    )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user._id
    //TODO: toggle like on tweet

    //validate tweetId
    if(!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    //check if like already exists
    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: userId
    })

    //if exists unlike it
    if(existingLike){
        await Like.findByIdAndDelete(existingLike._id)

        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Tweet unliked successfully")
        )
    }

    //else like
    await Like.create({
        tweet: tweetId,
        likedBy: userId
    })

    //Return response
    return res
    .status(200)
    .json(
        new ApiResponse(200, {},"tweet Liked successfully")
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id
    //TODO: get all liked videos

    const likedVideos = await Like.find({
        likedBy: userId,
        video: { $exists: true }
    })
    .populate("video")

    return res
    .status(200)
    .json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}