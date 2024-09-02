import { Router } from 'express';
import * as Controller from '../controllers/patientController';
import { verifyToken } from '../middleware/auth';
import multer from 'multer';
import { viewReferrals } from '../controllers/referrals.controller';



const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/me', verifyToken, Controller.getPatientDetails); // Get current patient details
router.patch('/me', verifyToken, Controller.updatePatientDetails); // Edit a patient's profile
// router.patch('/profile', verifyToken, Controller.editProfile); // Edit a patient's profile
router.get('/doctors', verifyToken, Controller.viewDoctors); // view all doctors \
router.post('/password-reset', verifyToken, Controller.resetPassword); // Reset password for a patient
// router.patch('/update-profile', verifyToken, Controller.editProfileInformation) // Edit a patient's profile information
// router.get('/profile', verifyToken, Controller.viewProfile); // View a patient's profile information
router.delete('/delete-account', verifyToken, Controller.deleteAccount); // Delete a patient's account
// router.post('/schedule-appointment', verifyToken, Controller.createMeeting); // Schedule a medical appointment


// Consultation routes
router.get('/consultations/status', verifyToken, Controller.checkActiveConsultation); // check if patient has active consultation ongoing
router.get('/consultations/prescription/:consultationId', verifyToken, Controller.getPrescription); // View a patient's prescriptions
router.get('/messages/:id', verifyToken, Controller.fetchConsultationMessages); // fetch consultation messages

// Appointment routes
router.get('/appointments/upcoming', verifyToken, Controller.viewUpcomingAppointments); // View a patient's upcoming appointments
router.get('/appointments/past', verifyToken, Controller.viewPastAppointments); // View a patient's past appointments
router.patch('/appointments/:id/cancel', Controller.cancelAppointment); // Cancel a scheduled appointment
router.patch('/appointments/:id/reschedule', verifyToken, Controller.rescheduleAppointment); // Reschedule a scheduled appointment
router.post('/appointments/requests', verifyToken, Controller.requestAppointment); // Make an appointment request
router.get('/appointments/requests', verifyToken, Controller.getAppointmentRequests); // get appointment requests
router.patch('/appointments/requests/cancel/:id', verifyToken, Controller.cancelAppointmentRequest); // cancel appointment requests
router.patch('/appointments/requests/reschedule/:id', verifyToken, Controller.rescheduleAppointmentRequest); // reschedule appointment requests
router.get('/appointments/slots/:id', verifyToken, Controller.viewAppointmentSlots); // View available appointment slots

// Records routes
router.get('/records/requests', verifyToken, Controller.viewPendingRecordsRequests); // View record requests
router.patch('/records/requests/toggle', verifyToken, Controller.toggleRecordsRequest); // Approve/Revoke record requests
router.get('/doctors/:id', verifyToken, Controller.getDoctorDetails); // Get Specific Doctor Profile
router.get('/find-doctors', verifyToken, Controller.findDoctor); // Find doctors by specialty
router.get("/top-doctors", verifyToken, Controller.topDoctors); // Get Top doctors

router.get('/favourites', verifyToken, Controller.viewFavouriteDoctors); // View a patient's favourite doctors
router.post('/favourites/toggle', verifyToken, Controller.toggleFavouriteDoctor); // Add a doctor to a patient's favourite list
router.get('/reviews/check', verifyToken, Controller.checkPendingReviews); // check if there are any pending reviews
router.patch('/reviews/:id', verifyToken, Controller.submitReview); // Submit a review
router.post('/reset-password', verifyToken, Controller.resetPassword);
router.get('/suggested-doctors', verifyToken, Controller.suggestedDoctors); // View suggested doctors
router.get('/broadcasts', verifyToken, Controller.getAdminBroadcasts); // Get admin broadcasts
router.get('/records/notes', verifyToken, Controller.getAllConsultationNotes); // Get all consultation notes
router.get('/labs', verifyToken, Controller.getLabs); // Get all lab tests
router.get('/prescriptions', verifyToken, Controller.getPrescriptions); // get all prescriptions

// image upload routes
router.post('/:id/add-lab', verifyToken, upload.single('image'), Controller.addLabPicture); // Add a lab image
router.delete('/:id/remove-lab', verifyToken, Controller.removeLabPicture); // Add a lab image
router.delete('/remove-profile-picture', verifyToken, Controller.removeProfilePicture); // Remove a patient's profile picture
router.post('/upload-profile-picture', verifyToken, upload.single('image'), Controller.uploadProfilePicture); // Upload a patient's profile picture

router.post('/issues', verifyToken, Controller.postIssues) // Submit an issue
router.post('/feedback', verifyToken, Controller.postFeedback) // Submit feedback

// referral routes
router.get('/referrals', verifyToken, viewReferrals); // View a patient's referrals
export default router;