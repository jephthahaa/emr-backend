import { Router } from 'express';
import * as Controller from '../controllers/adminController';
import { verifyToken } from '../middleware/auth';
import multer from 'multer';
import { patchToggleIssue } from "../controllers/adminController";


const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/me', verifyToken, Controller.getCurrentAdminInfo); // Get current user
router.post('/upload-profile-picture', verifyToken, upload.single('profilePicture'), Controller.uploadProfilePicture); // Upload profile picture
router.delete('/remove-profile-picture', verifyToken, Controller.removeProfilePicture); // Remove profile picture
router.patch('/update-name', verifyToken, Controller.updateName); // Update name
router.patch('/toggle-notifications', verifyToken, Controller.toggleNotifications); // Toggle notifications
router.patch('/reset-password', verifyToken, Controller.resetPassword); // Reset password

// analytics
router.get('/total-doctors', verifyToken, Controller.getTotalDoctors); // Get total doctors
router.get('/total-patients', verifyToken, Controller.getTotalPatients); // Get total patients
router.get('/total-users', verifyToken, Controller.getTotalUsers); // Get total users
router.get('/total-removed-users', verifyToken, Controller.getRemovedUsers); // Get total removed users
router.get('/total-pending-users', verifyToken, Controller.getPendingUsers); // Get total pending users
router.get('/total-appointments', verifyToken, Controller.getTotalAppointments); // Get total appointments
router.get('/total-declined-appointments', verifyToken, Controller.getDeclinedAppointments); // Get total declined appointments
router.get('/total-pending-appointments', verifyToken, Controller.getPendingAppointments); // Get total pending appointments
router.get('/appointments', verifyToken, Controller.getAppointments); // Get all appointments
router.get('/total-patients', verifyToken, Controller.getTotalPatients); // Get total patients
router.get('/total-active-patients', verifyToken, Controller.getActivePatients); // Get total active patients
router.get('/total-deleted-patients', verifyToken, Controller.getDeletedPatients); // Get total deleted patients
router.get('/patients', verifyToken, Controller.getAllPatients); // Get all patients
router.get('/patients/:id', verifyToken, Controller.viewPatient); // View a patient
router.get('/patients/:id/logs', verifyToken, Controller.viewPatientActivities); // View a patient
router.get('/total-active-doctors', verifyToken, Controller.getActiveDoctors); // Get total active doctors
router.get('/total-pending-doctors', verifyToken, Controller.getPendingDoctors); // Get total pending doctors
router.get('/doctors', verifyToken, Controller.getAllDoctors); // Get all doctors
router.get('/doctors/:id', verifyToken, Controller.viewDoctor); // View a doctor
router.get('/doctors/:id/logs', verifyToken, Controller.viewDoctorLogs); // View a doctor's recent activity
router.patch('/verify-doctor/:id', verifyToken, Controller.verifyDoctor); // Verify a doctor
router.patch('/decline-doctor/:id', verifyToken, Controller.declineDoctorVerification); // Decline a doctor

router.get('/daily-active-users', verifyToken, Controller.getDailyActiveUsers); // Get daily active users
router.get('/daily-new-users', verifyToken, Controller.getDailyNewUsers); // Get monthly active users
router.get('/monthly-new-users', verifyToken, Controller.getMonthlyNewUsers); // Get monthly active users

router.get('/transactions', verifyToken, Controller.viewTransactions); // View transactions
router.get('/transactions/:id', verifyToken, Controller.viewTransaction); // View a transaction
router.get('/total-amount', verifyToken, Controller.getTotalAmount); // Get total transactions
router.get('/recent-transactions', verifyToken, Controller.getRecentTransactions); // Get recent transactions   
router.get('/broadcasts', verifyToken, Controller.getAdminBroadcasts); // Get admin broadcasts
router.get('/symptoms', verifyToken, Controller.getSymptoms); // Get all symptoms
router.put('/symptoms/:id', verifyToken, Controller.updateSymptom); // update a symptom
router.delete('/symptoms/:id', verifyToken, Controller.deleteSymptom); // delete a symptom
router.post('/symptoms', verifyToken, Controller.postSymptom); // Post a symptoms
router.post('/populate-symptoms', verifyToken, Controller.populateSymptomsTable); // fill symptoms table with defaults
router.get('/medicines', verifyToken, Controller.getMedicines); // Get all medicines
router.put('/medicines/:id', verifyToken, Controller.updateMedicine); // update a medicine
router.delete('/medicines/:id', verifyToken, Controller.deleteMedicine); // delete a medicine
router.post('/medicines', verifyToken, Controller.postMedicine); // Post a medicines
router.post('/populate-medicines', verifyToken, Controller.populateMedicinesTable); // fill medicines table with defaults
router.get('/icds', verifyToken, Controller.getIcds); // get all icds
router.put('/icds/:id', verifyToken, Controller.updateIcd); // update an icd
router.delete('/icds/:id', verifyToken, Controller.deleteIcd); // delete an icd
router.post('/icds', verifyToken, Controller.postIcd); // post an icd
router.post('/populate-icds', verifyToken, Controller.populateIcdsTable); // fill icds table with defaults
router.post('/initialize-global-info', verifyToken, Controller.initializeGlobalInfo) // initialize global info
router.put('/update-appointment-rate', verifyToken, Controller.updateAppointmentRate) // update appointment rate
router.put('/update-cancellation-rate', verifyToken, Controller.updateCancellationRate) // update cancellation rate
router.get('/issues', verifyToken, Controller.getAllIssues) // get all support issues
router.get('/feedback', verifyToken, Controller.getAllFeedback) // get all feedbacks
router.patch('/toggle-issue/:id', verifyToken, Controller.patchToggleIssue) // toggle issue status

export default router;