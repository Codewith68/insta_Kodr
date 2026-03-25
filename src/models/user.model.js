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
        default:""
    }
})

const userModel=mongoose.model('Userr',userSchema);

export default userModel;
