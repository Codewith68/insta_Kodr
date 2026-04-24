import multer from "multer"

const storage=multer.memoryStorage()

const upload=multer({
    storage:storage, 
    limits:{
        fileSize:3000000000
    },
})
export default upload