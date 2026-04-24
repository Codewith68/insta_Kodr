import mongoose from "mongoose";




const mediaSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
            trim: true,
        },
        mediaType: {
            type: String,
            enum: ["image", "video"],
            required: true,
        },
    },
    { _id: false }
);


const postSchema = new mongoose.Schema(
    {
        caption: {
        type:String,
        required:true,
        maxlength:280
    },
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Userr',
        required:true
    },
    media:{
        type:[mediaSchema],
        default:[]
    }
})

const postModel=mongoose.model('Post',postSchema);

export default postModel;