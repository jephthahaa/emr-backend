import express from "express";
import *  as Controller from "../controllers/paymentController";
import { verifyToken } from "../middleware/auth";

const router = express.Router();

router.post('/pay', verifyToken, Controller.initiatePayment);
// router.get('/verify', Controller.paystackWebhook);
router.post('/verify', verifyToken, Controller.verify);
router.get('/list-banks', Controller.listBanks);
router.get('/list-mobile-money', Controller.listMobileMoney);
router.post('/withdraw', verifyToken, Controller.withdraw);
router.get('/initiate-withdrawal/:id', Controller.initiateWithdrawal);

export default router;