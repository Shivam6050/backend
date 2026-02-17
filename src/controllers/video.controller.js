import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query

    const pageNumber = Number(page)
    const pageSize = Number(limit)
    const skip = (pageNumber - 1) * pageSize

    const matchStage = {
        isPublished: true
    }

    if(query){
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    if(userId && mongoose.isValidObjectId(userId)){
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const videos = await Video.aggregate([

        {
            $match: matchStage
        },

        // add owner info
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            avatar:1
                        }
                    }
                ]
            }
        },

        {
            $unwind:"$owner"
        },

        // like count
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },

        {
            $addFields:{
                likeCount:{ $size:"$likes" },

                isLiked:{
                    $cond:{
                        if:{
                            $in:[
                                req.user?._id,
                                "$likes.likedBy"
                            ]
                        },
                        then:true,
                        else:false
                    }
                }
            }
        },

        // comment count
        {
            $lookup:{
                from:"comments",
                localField:"_id",
                foreignField:"video",
                as:"comments"
            }
        },

        {
            $addFields:{
                commentCount:{ $size:"$comments" }
            }
        },

        // remove unwanted fields
        {
            $project:{
                likes:0,
                comments:0
            }
        },

        {
            $sort:{
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        },

        {
            $skip:skip
        },

        {
            $limit:pageSize
        }

    ])

    const totalVideos = await Video.countDocuments(matchStage)

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                videos,
                page:pageNumber,
                limit:pageSize,
                totalVideos,
                totalPages:Math.ceil(totalVideos/pageSize)
            },
            "Videos fetched successfully"
        )
    )
})


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

     if(!title || !description){
        throw new ApiError(400, "Title and description are required");
    }

    // validate files
    const videoLocalPath = req.files?.video?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if(!videoLocalPath){
        throw new ApiError(400, "Video file is required");
    }

    if(!thumbnailLocalPath) {
        throw new ApiError(400, "Thumnail is required");
    }

    // upload to cloudinary
    const videoUpload = await uploadOnCloudinary(videoLocalPath);
    const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

    if(!videoUpload?.url){
        throw new ApiError(500, "Failed to upload video");
    }

    if(!thumbnailUpload?.url){
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    //create video in DB
    const video = await Video.create({
        title,
        description,
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        owner: req.user._id,
        isPublished: true
    });

    // return response
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video Published Successfully"
        )
    );
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    // Take id from req.params
    // Validate id
    // Find in DB
    // If not found → error
    // Return data
    
    
    // Validate ObjectId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    // Find video
    const video = await Video.findById(videoId).populate("owner", "username avatar");

    // If not found
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Return response
    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    );
})

const updateVideo = asyncHandler(async (req,res)=>{

    const {videoId} = req.params
    const {title, description} = req.body

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404,"Video not found")
    }

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"Unauthorized")
    }

    // update title & description
    if(title) video.title = title
    if(description) video.description = description

    // update thumbnail
    if(req.files?.thumbnail?.[0]?.path){

        const uploadedThumbnail = await uploadOnCloudinary(
            req.files.thumbnail[0].path
        )

        video.thumbnail = uploadedThumbnail.url
    }

    // update video file
    if(req.files?.video?.[0]?.path){

        const uploadedVideo = await uploadOnCloudinary(
            req.files.video[0].path
        )

        video.videoFile = uploadedVideo.url
    }

    await video.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video updated successfully"
        )
    )

})


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    //validate videoId
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    //find video
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found");
    }

    //check ownership
    if(video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this video");
    }

    //delete video
    await Video.findByIdAndDelete(videoId);

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    //validate videoId
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    //find video by id
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found");
    }

    //flip boolean
    video.isPublished = !video.isPublished;

    //save
    await video.save();

    //return updated video
    return res
    .status(200)
    .json(
        new ApiResponse(200, "Published status toggled successfully")
    ); 
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}