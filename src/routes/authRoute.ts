import { Router } from "express";
import multer from "multer";
import * as patientController from "../controllers/patientController";
import * as doctorController from "../controllers/doctorController";
import * as adminController from "../controllers/adminController";
import * as emailVerifierController from "../controllers/email.verifier.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Patient Auth
router.post("/patients/register", patientController.register); // Register a new patient
router.post("/patients/login", patientController.login); // Login a registered user after authentication
router.post("/patients/logout", patientController.logout); // Logout a logged-in user
router.post("/patients/reset-password", patientController.resetPassword); // Reset password

// Doctor Auth
router.post(
  "/doctors/register",
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
  ]),
  doctorController.register
); // Register a new doctor
router.post("/doctors/login", doctorController.login); // Login a registered doctor after authentication
router.get("/doctors/logout", doctorController.logout); // Logout a logged-in doctor
router.post("/doctors/reset-password", doctorController.resetPassword); // Request a password reset

// Admin Auth
router.post("/admin/register", adminController.register); // Register a new admin
router.post("/admin/login", adminController.login); // Login a registered admin after authentication
router.get("/admin/logout", adminController.logout); // Logout a logged-in admin
router.post("/admin/reset-password", adminController.resetPassword); // Reset admin password

// route to verify email
router.post("/verify-email", emailVerifierController.verifyEmail);
router.get("/getVerificationCode", emailVerifierController.sendVerificationEmail);

export default router;
