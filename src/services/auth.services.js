import ImageKit, { toFile } from "@imagekit/nodejs";
import config from "../config/config.js";

const imagekit = new ImageKit({
    publicKey: config.IMAGEKIT_PUBLIC_KEY,
    privateKey: config.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: config.IMAGEKIT_URL_ENDPOINT,
});

export async function uploadFile(fileBuffer, fileName, folder = "/posts") {
    try {
        const response = await imagekit.files.upload({
            file: await toFile(fileBuffer, fileName),
            fileName,
            folder,
        });
        return response;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
