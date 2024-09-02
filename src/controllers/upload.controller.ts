import { firebaseApp } from "../utils/firebase.utils";
import { Response, Request } from "express";
import { getDownloadURL, } from "firebase-admin/storage";


export const uploadPrescription = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        const file = req.file;
        uploadFile({ file: file, folderName: "prescriptions" }).then((url) => {
            return res.status(200).send(url);
        });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
}

type UploadFileProps = {
    file: Express.Multer.File,
    folderName: string,
    filename?: string
}

export const uploadFile = async (props: UploadFileProps): Promise<string> => {
    try {
        const { file, folderName, filename } = props;

        const filePath = `${folderName}/${filename ? filename : Date.now()}`;
        const blob = firebaseApp.storage().bucket().file(filePath);

        await new Promise((resolve, reject) => {
            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                },
            });

            blobStream.on('error', reject);

            blobStream.on('finish', () => {
                console.info("File uploaded successfully");
                resolve(null);
            });

            blobStream.end(file.buffer);
        });

        return await getDownloadURL(blob);

    } catch (error) {

        throw error;
    }
}

export const deleteFile = async (filePath: string) => {
    try {
        const extractedPath = filePath.split('/o/')[1].split('?')[0].replace(/%2F/g, '/').replace(/%40/g, '@');
        await firebaseApp.storage().bucket().file(extractedPath).delete();
        return;
    } catch (error) {
        throw error;
    }
}