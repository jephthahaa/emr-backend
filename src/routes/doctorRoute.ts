import { Router } from 'express';
import * as Controller from '../controllers/doctorController';
import * as consultationController from '../controllers/consultation.controller';

import { verifyToken } from '../middleware/auth';
import multer from 'multer';
import { acceptReferral, getReferred, referPatient, viewReferrals } from '../controllers/referrals.controller';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/me', verifyToken, Controller.getDoctorDetails); // get current signin user's details
router.patch('/me', verifyToken, Controller.updateDoctorDetails); // update parts of the signedIn doctor's details
router.get('/patients', verifyToken, Controller.viewPatients); // View the list of patients assigned to a doctor

// appointment routes
router.get('/appointments/upcoming', verifyToken, Controller.viewUpcomingAppointments); // View a doctor's upcoming appointments
router.post('/appointments/slots', verifyToken, Controller.createAppointmentSlot); // Add appointment slot
router.get('/appointments/slots', verifyToken, Controller.viewAppointmentSlots); // View appointment slots
router.get('/appointments/requests', verifyToken, Controller.viewAppointmentRequests); // View appointment requests
router.post('/appointments/decline', verifyToken, Controller.declineAppointmentRequest); // decline appointment request
router.patch('/appointments/reschedule', verifyToken, Controller.rescheduleAppointmentRequest); // reschedule appointment request
router.post('/appointments/cancel', verifyToken, Controller.cancelAppointmentRequest); // cancel appointment

// records routes
router.post('/records/status', verifyToken, Controller.checkRecord); // Check record status
router.post('/records/send-request', verifyToken, Controller.sendRequest); // Request patient records
router.get('/records/:id', verifyToken, Controller.getPatientRecords); // get patient medical record
router.patch('/records/:id', verifyToken, Controller.patchPatientRecords); // update patient medical record
router.get('/messages/recent', verifyToken, Controller.fetchRecentChats); // fetch consultation messages
router.get('/messages/:id', verifyToken, Controller.fetchConsultationMessages); // fetch consultation messages

// consultations routes
router.get('/consultations/notes/:id', verifyToken, Controller.getPatientConsultationNotes) // fetch patient consultation notes
router.post('/consultations/start/:patientId', verifyToken, consultationController.startConsultation); // Start a consultation
router.get('/consultations/status', verifyToken, consultationController.checkActiveConsultation); // Check consultation status
router.patch('/consultations/step', verifyToken, consultationController.setCurrentConsultationStep); // Set current consultation step
router.post('/consultations/complete', verifyToken, consultationController.completeConsultation); // Complete a consultation
router.post('/consultations/end', verifyToken, consultationController.endConsultation); // End a consultation

// other routes
router.post('/:id/add-surgery', verifyToken, Controller.addSurgery); // Add a surgery
router.post('/:id/add-allergy', verifyToken, Controller.addAllergy); // Add an allergy
router.post('/add-diagnosis', verifyToken, Controller.addDiagnosis); // Add a diagnosis
router.post('/add-diagnoses', verifyToken, Controller.addMultipleDiagnosis); // Add a diagnosis
router.post('/add-future-visit', verifyToken, Controller.addFutureVisit); // Add a future visit
router.get('/check-signature', verifyToken, Controller.checkSignature); // Check if doctor has a signature

router.get('/load-diagnoses/:id', verifyToken, Controller.loadDiagnoses); // Load diagnosis
router.get("/load-prescriptions/:id", verifyToken, Controller.loadPrescriptions); // Load prescriptions
router.post("/add-prescriptions", verifyToken, Controller.addMultiplePrescriptions); // Add prescriptions
router.post('/request-lab', verifyToken, Controller.addLab); // Request lab test
router.post('/request-labs', verifyToken, Controller.addLabs); // Request lab tests
router.get('/labs/:id', verifyToken, Controller.getLabs); // get patient lab tests
router.get('/patient-labs/:id', verifyToken, Controller.getPatientLabs); // get all patient lab test
router.delete('/labs/:id', verifyToken, Controller.deleteLab); // deleted patient lab test request
router.post('/add-symptom', verifyToken, Controller.addSymptom); // Add a symptom

router.post('/upload-id', verifyToken, upload.fields([{ name: 'front', maxCount: 1 }, { name: 'back', maxCount: 1 }]), Controller.uploadID); // Upload patient's ID
router.post('/upload-profile-picture', verifyToken, upload.single('profilePicture'), Controller.uploadProfilePicture); // Upload profile picture
router.delete('/remove-profile-picture', verifyToken, Controller.removeProfilePicture); // Remove profile picture

router.post('/:id/add-family-member', verifyToken, Controller.addFamilyMember); // Add a family member to a patient's profile
// router.post('/:id/edit-lifestyle', verifyToken, Controller.editLifestyle); // Edit lifestyle
router.post('/set-rate', verifyToken, Controller.setRate); // Set consultation rate
router.post('/add-payment-method', verifyToken, Controller.addPaymentMethod); // Add payment method  (for doctor)
router.post('/toggle-notifications', verifyToken, Controller.toggleNotifications); // Toggle notifications
router.delete('/delete-account', verifyToken, Controller.deleteAccount); // Delete account
router.post('/reset-password', verifyToken, Controller.resetPassword); // Reset password
router.get('/broadcasts', verifyToken, Controller.getAdminBroadcasts); // Get admin broadcasts
router.get('/symptoms', verifyToken, Controller.getSymptoms); // get all symptoms
router.get('/medicines', verifyToken, Controller.getMedicines); // get all symptoms
router.get('/icds', verifyToken, Controller.getIcds); // get all icds
router.post('/issues', verifyToken, Controller.postIssues) // Submit an issue
router.post('/feedback', verifyToken, Controller.postFeedback) // Submit feedback
router.post('/generate-prescription/:consultationId', verifyToken, Controller.generatePrescription); // generate prescription
router.post('/upload-signature', verifyToken, upload.single('signature'), Controller.uploadSignature); // Upload signature
router.get('/doctor', Controller.generateSlots)

// referral routes
router.post('/refer-patient', verifyToken, referPatient); // Refer a patient
router.post("/accept-referral/:referralId", verifyToken, acceptReferral); // Accept referral
router.get('/referrals', verifyToken, viewReferrals); // View referrals
router.get('/referred', verifyToken, getReferred); // View referred

export default router;