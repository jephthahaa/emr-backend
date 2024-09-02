import multer from "multer";
import { Router, Request, Response } from "express";
import { deleteFile, uploadFile, uploadPrescription } from "../controllers/upload.controller";

const upload = multer({
    storage: multer.memoryStorage(),
});

const uploadRouter = Router();

uploadRouter.post("/prescriptions", upload.single("file"), uploadPrescription);

uploadRouter.post('/test', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).send('No file uploaded.');
            return;
        }
        const file = req.file;
        const url = await uploadFile({ file: file, folderName: "random" })
        console.log(url);
        return res.status(200).json(url);

    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
});

uploadRouter.delete('/test', async (req: Request, res: Response) => {
    try {
        const { filePath } = req.body;
        // controller.deleteFile(filePath).then(() => {
        //     res.status(200).send('File deleted successfully');
        // });
        await deleteFile(filePath);
        res.status(200).send('File deleted successfully');

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export { uploadRouter }