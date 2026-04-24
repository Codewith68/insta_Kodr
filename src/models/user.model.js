import mongoose from "mongoose"

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:function(){
            return this.googleId===undefined;
        }
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true,
        default:undefined
    },
    fullname:{
        type:String,
        required:true
    },
    profilePic:{
        type:String,
        default:"https://i.pinimg.com/474x/3d/8d/b1/3d8db18cc50c15523a13908a593a480c.jpg?nii=t"
    },
    bio:{
        type:String,
        default:"",
        maxlength:150
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Userr'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Userr'
    }],
    followRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Userr'
    }],
    sentRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Userr'
    }]
})

userSchema.index({ username: "text" })
const userModel=mongoose.model('Userr',userSchema);

export default userModel;
