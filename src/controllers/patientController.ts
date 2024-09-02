import { Request, Response } from "express";
import * as nodemailer from "nodemailer";
import { dataSource } from "../data-source";
import { Patient } from "../models/patient";
import bcryptjs from "bcryptjs";
import { Appointment } from "../models/appointment";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../middleware/auth";
import { AppointmentRequest } from "../models/appointment-request";
import { AppointmentSlot } from "../models/appointment-slot";
import { RecordRequest } from "../models/medicalRecordRequests";
import { Doctor } from "../models/doctor";
import { Between, Equal, FindOptionsWhere, ILike, In, IsNull, MoreThanOrEqual, Not } from "typeorm";
import { Lab } from "../models/lab";
import { Record } from "../models/record";
import { Favourite } from "../models/favourites";
import ReviewSchema, {
  appointmentRequestParams,
  createAppointmentRequestSchema, FeedbackSchema,
  findDoctorsQueryParams, IssuesSchema,
  paginationQueryParams,
  updatePatientSchema
} from "../schema";
import { createSortOrder, doctorsSort, getWeekStartandEnd, mergeMultiple, updateProperties } from "../utils";
import { Review } from "../models/review";
import { Messeges } from "../models/messages";
import { Broadcast } from "../models/broadcast";
import { authorize, createEvent } from "../utils/google";
import { mailer } from "../utils/mailer";
import { deleteFile, uploadFile } from "./upload.controller";
import { processNotification, sendNotification } from "./notifications.controller";
import { Feedbacks } from "../models/feedbacks";
import { Issues } from "../models/issues";
import { Logger } from "../logger";
import { COMPANY_NAME } from "../utils/constants";
import { patientHtml } from "../utils/mail.welcome.msg";

const patientRepository = dataSource.getRepository(Patient);
const doctorRepository = dataSource.getRepository(Doctor);
const appointmentRequestRepository = dataSource.getRepository(AppointmentRequest);
const appointmentSlotRepository = dataSource.getRepository(AppointmentSlot);
const recordsRequestRepository = dataSource.getRepository(RecordRequest);
const appointmentRepository = dataSource.getRepository(Appointment);
const labRepository = dataSource.getRepository(Lab);
const recordRepository = dataSource.getRepository(Record);
const favouritesRepository = dataSource.getRepository(Favourite);
const reviewRepository = dataSource.getRepository(Review);
const messagesRepository = dataSource.getRepository(Messeges);
const broadcastRepository = dataSource.getRepository(Broadcast);
const feedbackRepository = dataSource.getRepository(Feedbacks);
const issuesRepository = dataSource.getRepository(Issues);

const logger = new Logger("PatientController");

// Register a new patient
export const register = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      dob,
      gender,
      contact,
      address,
      city,
      provider,
    } = req.body;

    if (!firstName || !lastName || !email || !dob || !gender || !contact) {
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "password",
        confirmPassword,
        "dob",
        "gender",
        "contact",
      ];
      const emptyFields = [];

      requiredFields.forEach((field) => {
        if (!req.body[field] || req.body[field].trim() === "") {
          emptyFields.push(field);
        }
      });

      return res.status(400).json({
        status: false,
        message: "Please fill in all required fields.",
        requiredFields,
        emptyFields,
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: false,
        message: "Passwords do not match.",
      });
    }

    const patient = patientRepository.create({
      firstName,
      lastName,
      email,
      password: await bcryptjs.hash(password, 12),
      dob,
      gender,
      contact,
      address,
      city,
      insuranceInfo: {
        provider,
      },
    });

    await patientRepository.save(patient);

    logger.info({
      type: "Patient registered",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} registered successfully`,
    });


    

    if (patient.notifications.status === true && patient.notifications.email === true) {
      // mailer.sendMail({
      //   from: COMPANY_NAME,
      //   to: patient.email,
      //   subject: "Welcome to Zomujo",
      //   html: patientHtml(`${patient.firstName} ${patient.lastName}`)
      // });
    }

    return res.status(201).json({
      status: true,
      message: "Patient created successfully",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Patient was not created.",
      error: error.message,
    });
  }
};

// Login a registered user after authentication
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const requiredFields = ["email", "password"];
      const emptyFields = [];

      requiredFields.forEach((field) => {
        if (!req.body[field] || req.body[field].trim() === "") {
          emptyFields.push(field);
        }
      });

      return res.status(400).json({
        status: false,
        message: "Please fill in all required fields.",
        requiredFields,
        emptyFields,
      });
    }

    const patient = await patientRepository.findOne({
      where: {
        email,
      },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const isPasswordCorrect = await bcryptjs.compare(
      password,
      patient.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: false,
        message: "Incorrect password.",
      });
    }

    const accessToken = generateAccessToken(patient.id);
    const refreshToken = generateRefreshToken(patient.id);

    res.clearCookie("refreshToken");
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/refresh-token",
    });

    logger.info({
      type: "Patient logged in",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} logged in successfully`,
    });

    

    return res.status(200).json({
      status: true,
      message: "Login successful",
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while logging in.",
      error: error.message,
    });
  }
};

// Logout a logged-in user
export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("refreshToken");

    res.status(200).json({
      status: true,
      message: "Logout successful",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const patient = await patientRepository.findOne({ where: { email } });
    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const accessToken = generateAccessToken(patient.id);

    const mailer = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>Hello ${patient.firstName},</p>
        <p>You recently requested to reset your password for your Zomujo account. Click the link below to reset it.</p>
        <a href="${req.protocol}://${req.hostname}/reset-password/${accessToken}">Reset Password</a>
        <p>If you did not request a password reset, please ignore this email.</p>
      `,
    };

    // mailer.sendMail(mailOptions, (error, info) => {
    //   if (error) {
    //     console.log(error);
    //     return res.status(500).json({
    //       status: false,
    //       message: "Error sending email",
    //     });
    //   } else {
    //     console.log("Email sent: " + info.response);
    //     return res.status(200).json({
    //       status: true,
    //       message: "Password reset email sent",
    //     });
    //   }
    // });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Generate a new access token and refresh token for a logged-in user
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        status: false,
        message: "Refresh token not provided",
      });
    }

    const decoded = verifyToken(req, res, refreshToken);

    const patient = await patientRepository.findOne({
      where: { id: decoded["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const accessToken = generateAccessToken(patient.id);
    const newRefreshToken = generateRefreshToken(patient.id);

    return res.status(200).json({
      status: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

export const getPatientDetails = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
      relations: {
        allergies: true,
        surgeries: true,
        gynae: true,
        familyMembers: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    delete patient.password

    return res.status(200).json({
      status: true,
      message: "Patient details retrieved successfully",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving doctor details.",
      error: error.message,
    });
  }
};

export const updatePatientDetails = async (req: Request, res: Response) => {
  try {
    const modifiedPatient = await updatePatientSchema.parseAsync(req.body);
    let patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    updateProperties(modifiedPatient, patient);

    await patientRepository.save(patient);

    logger.info({
      type: "Patient profile updated",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} updated their profile successfully`,
    });

    return res.status(200).json({
      status: true,
      message: "Patient updated successfully",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating patient.",
      error: error.message,
    });
  }

}

export const viewDoctors = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (patient === null) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
        data: null,
      });
    }

    const searchQuery = search.split(" ").map((item) => ([
      { firstName: ILike(`%${item}%`), patients: { id: patient.id } },
      { lastName: ILike(`%${item}%`), patients: { id: patient.id } }
    ])).flat(1);

    const searchOptions = search !== "" ? searchQuery : {
      patients: {
        id: patient.id
      },
    }

    const doctors = await doctorRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: searchOptions,
    })

    return res.status(200).json({
      status: true,
      message: "Patients retrieved successfully",
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// Request a password reset for a patient
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const patient = await patientRepository.findOne({ where: { email } });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const mailer = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject: "Password Reset",
      text: `Hello ${patient.firstName} ${patient.lastName},\n\nYou are receiving this email because you have requested a password reset for your account.\n\nPlease click on the following link to reset your password: \n\nhttp://localhost:3000/reset/${patient.id}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    // mailer.sendMail(mailOptions, (error, info) => {
    //   if (error) {
    //     return res.status(500).json({
    //       status: false,
    //       message: "Password reset request failed.",
    //       error: error.message,
    //     });
    //   } else {
    //     return res.status(200).json({
    //       status: true,
    //       message: "Password reset request was successful.",
    //       data: info.response,
    //     });
    //   }
    // });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Password reset request failed.",
      error: error.message,
    });
  }
};

// View a patient's profile information
export const viewProfile = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: {
        id: req["userId"],
      },
      relations: [
        "appointments",
        "appointmentRequests",
        "medicalRecords",
        "doctors",
        "records",
      ],
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Patient was retrieved successfully.",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Patient was not retrieved.",
      error: error.message,
    });
  }
};

// Delete a patient's account
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    console.log(req["userId"]);

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const deletedPatient = await patientRepository.update(req["userId"], {
      isActive: false,
    });

    logger.info({
      type: "Patient account deleted",
      userId: patient.id,
      message: "Patient account deleted successfully",
    });

    

    let message;

    if (patient.notifications.status === true && patient.notifications.email === true) {
      message = {
        from: process.env.EMAIL_ADDRESS,
        to: patient.email,
        subject: "Account Deletion",
        text: `Hello ${patient.firstName},\n\nYour account has been successfully deleted.`
      }
    }

    mailer.sendMail(message);

    return res.status(200).json({
      status: true,
      message: "Patient was deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Patient was not deleted.",
      error: error.message,
    });
  }
};

// Access a patient's medical history
export const viewMedicalHistory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const patient = await patientRepository.findOne({ where: { id } });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const medicalHistory = await patientRepository.find({
      where: { id },
      relations: ["medicalRecords"],
      select: ["medicalRecords"],
      order: {
        medicalRecords: "DESC",
      },
    });

    return res.status(200).json({
      status: true,
      message: "Medical history was retrieved successfully.",
      data: medicalHistory,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Medical history was not retrieved.",
      error: error.message,
    });
  }
};

// View a patient's upcoming appointments
/**
 * Retrieves the upcoming appointments for a patient.
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response with the status, message, and data of the retrieved appointments.
 */
export const viewUpcomingAppointments = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const { endOfWeek, startOfWeek } = getWeekStartandEnd(new Date());

    const appointmentsBase = await appointmentRepository.find({
      where: {
        patient: {
          id: patient.id
        },
        appointmentDate: Between(startOfWeek, endOfWeek),
        status: "accepted"
      },
      order: {
        appointmentDate: "ASC"
      }, relations: { doctor: true }
    });

    const appointments = appointmentsBase.map((appointment) => {
      return {
        id: appointment.id,
        doctor: {
          firstName: appointment.doctor.firstName,
          lastName: appointment.doctor.lastName,
          profilePicture: appointment.doctor.profilePicture,
          specializations: appointment.doctor.specializations
        },
        status: appointment.status,
        type: appointment.type,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        appointmentDate: appointment.appointmentDate
      }
    });

    return res.status(200).json({
      status: true,
      message: "Upcoming appointments were retrieved successfully.",
      data: appointments,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Upcoming appointments were not retrieved.",
      error: error.message,
    });
  }
};

// View a patient's past appointments
export const viewPastAppointments = async (req: Request, res: Response) => {
  try {
    const id = req["userId"]

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (patient === null) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const appointmentsBase = await appointmentRepository.find({
      where: {
        patient: {
          id: patient.id
        },
        status: In(["completed", "cancelled"])
      }, relations: { doctor: true }
    });

    return res.status(200).json({
      status: true,
      message: "Past appointments were retrieved successfully.",
      data: appointmentsBase.map((appointment) => {
        return {
          id: appointment.id,
          doctor: {
            firstName: appointment.doctor.firstName,
            lastName: appointment.doctor.lastName,
            profilePicture: appointment.doctor.profilePicture,
          },
          status: appointment.status,
          type: appointment.type,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          appointmentDate: appointment.appointmentDate
        }
      }),
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Past appointments were not retrieved.",
      error: error.message,
    });
  }
};


// Cancel a scheduled appointment
export const cancelAppointment = async (req: Request, res: Response) => {
  try {

    const appointmentId = req.params.id;
    const patient = await patientRepository.findOne({ where: { id: req['userId'] } });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const appointment = await appointmentRepository.findOne({ where: { id: appointmentId } });

    if (!appointment) {
      return res.status(404).json({
        status: false,
        message: "Appointment not found.",
      });
    }

    const cancelledAppointment = await appointmentRepository.update(appointmentId, {
      status: "cancelled",
    });

    logger.info({
      type: "Appointment cancelled",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} cancelled their appointment successfully`,
    });
    

    // check and send notifications
    if (patient.notifications.status === true && patient.notifications.email === true) {
      let patientMessage = `Hello ${patient.firstName},\n\nYour appointment has been successfully cancelled.`;
      let doctorMessage = `Hello ${appointment.doctor.firstName} ${appointment.doctor.lastName}, \n\nAn appointment made by ${patient.firstName} has been cancelled`;
      let topic = "Appointment Cancellation"
      await processNotification([
        {
          email: appointment.doctor.email,
          topic: topic,
          message: doctorMessage,
          id: appointment.doctor.id,
        },
        {
          email: patient.email,
          topic,
          message: patientMessage,
        }
      ]);
    }


    return res.status(200).json({
      status: true,
      message: "Appointment was cancelled successfully.",
      data: cancelledAppointment,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Appointment was not cancelled.",
      error: error.message,
    });
  }
};

export const getAppointmentRequests = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const appointmentRequestsBase = await appointmentRequestRepository.find({
      where: { patient: { id: patient.id }, appointmentSlot: Not(IsNull()) },
      order: {
        appointmentSlot: {
          date: "DESC",
          startTime: "ASC",
        }
      },
      relations: ['appointmentSlot', "appointmentSlot.doctor"],
    });

    const appointmentRequests = appointmentRequestsBase.map((request) => {
      return {
        id: request.id,
        type: request.type,
        status: request.status,
        doctor: {
          id: request.appointmentSlot.doctor.id,
          firstName: request.appointmentSlot.doctor.firstName,
          lastName: request.appointmentSlot.doctor.lastName,
          profilePicture: request.appointmentSlot.doctor.profilePicture
        },
        date: request.appointmentSlot.date,
      }
    })

    return res.status(200).json({
      status: true,
      message: "Appointment requests were retrieved successfully.",
      data: appointmentRequests,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Could not fetch appointment requests",
      error: error.message,
    });
  }
};

// Make an appointment request
/**
 * Handles the request for a new appointment.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response indicating the status and result of the appointment request.
 * @throws If there is an error while processing the appointment request.
 */
export const requestAppointment = async (req: Request, res: Response) => {
  try {
    const { reason, notes, slotId } = await createAppointmentRequestSchema.parseAsync(req.body);
    console.log("request valid");
    // get current relevaant data
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });
    const slot = await appointmentSlotRepository.findOne({
      where: { id: slotId },
      relations: { doctor: true }
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    if (!slot) {
      return res.status(404).json({
        status: false,
        message: "Appointment slot not found.",
      });
    }

    // create and save appointment request
    const appointmentRequest = appointmentRequestRepository.create({
      reason,
      notes,
      type: slot.type,
      patient,
      appointmentSlot: slot,
    });
    await appointmentRequestRepository.save(appointmentRequest);

    logger.info({
      type: "Appointment request",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} requested an appointment successfully`,
    });
    

    // get doctor with the slot
    const doctor = await doctorRepository.findOne({
      where: { id: slot.doctor.id },
      relations: ["patients"],
    });

    // make currently requested slot unavailable
    slot.status = "unavailable";
    await appointmentSlotRepository.save(slot);

    const appointmentRequests = await appointmentRequestRepository.find({
      where: {
        appointmentSlot: {
          id: slot.id,
        },
      },
    });

    appointmentRequests.forEach((request) => {
      if (request.id === Number(appointmentRequest.id)) {
        request.status = "accepted";
      } else {
        if (request.status !== "cancelled") {
          request.status = "declined";
        }
      }
    });
    await appointmentRequestRepository.save(appointmentRequests);

    const appointment = new Appointment();
    appointment.doctor = doctor;
    appointment.patient = appointmentRequest.patient;
    appointment.appointmentDate = slot.date;
    appointment.startTime = slot.startTime;
    appointment.endTime = slot.endTime;
    appointment.type = slot.type;
    appointment.reason = appointmentRequest.reason;
    appointment.notes = appointmentRequest.notes;
    appointment.status = "accepted";

    let meetingLink;
    try {
      if (slot.type === "virtual") {
        const auth = await authorize();
        meetingLink = await createEvent(auth, appointment);
      }

      appointment.meetingLink = meetingLink;
    } catch (error) {
      console.log(error);
    }
    await appointmentRepository.save(appointment);

    doctor.patients.push(patient);

    await doctorRepository.save(doctor);

    logger.info({
      type: "Appointment request accepted",
      userId: doctor.id,
      message: `Appointment request accepted successfully`,
    });

    // send Notifications
    if (patient.notifications.status === true && patient.notifications.email === true) {
      let patientText = `Hello ${patient.firstName},\n\nYour appointment request has been successfully accepted.`;
      let doctorText = `Hello ${doctor.firstName}, \n\n There's a new appointment request made.`;
      let topic = "Appointment Request";
      await processNotification([
        { email: patient.email, topic, message: patientText, id: patient.id },
        { email: doctor.email, topic, message: doctorText, id: doctor.id }
      ]);
    }

    return res.status(201).json({
      status: true,
      message: "Appointment request was created successfully.",
      data: appointmentRequest,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Appointment request was not created.",
      error: error.message,
    });
  }
};

export const cancelAppointmentRequest = async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });
    const appointmentRequest = await appointmentRequestRepository.findOne({
      where: { id: parseInt(requestId) }, relations: { patient: true }
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    if (appointmentRequest.patient.id !== patient.id) {
      return res.status(401).json({
        status: false,
        message: "You are not authorized to cancel this request.",
      });
    }

    const cancelledRequest = await appointmentRequestRepository.update(requestId, {
      status: "cancelled",
    });

    logger.info({
      type: "Appointment request cancelled",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} cancelled an appointment request`,
    });

    

    if (patient.notifications.status === true && patient.notifications.email === true) {
      let patientText = `Hello ${patient.firstName},\n\nYour appointment request has been successfully cancelled.`;
      let topic = "Cancel Appointment Request";
      await processNotification([
        { email: patient.email, topic, message: patientText, id: patient.id },
      ]);
    }

    return res.status(200).json({
      status: true,
      message: "Appointment request was cancelled successfully.",
      data: cancelledRequest,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Appointment request was not cancelled.",
      error: error.message,
    });
  }
}

export const rescheduleAppointmentRequest = async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;
    const { slotId } = req.body;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    const appointmentRequest = await appointmentRequestRepository.findOne({
      where: { id: parseInt(requestId) }, relations: { patient: true }
    });

    const slot = await appointmentSlotRepository.findOne({
      where: { id: slotId },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    if (appointmentRequest.patient.id !== patient.id) {
      return res.status(401).json({
        status: false,
        message: "You are not authorized to reschedule this request.",
      });
    }

    if (!slot) {
      return res.status(404).json({
        status: false,
        message: "Appointment slot not found.",
      });
    }

    const rescheduledRequest = await appointmentRequestRepository.update(requestId, {
      appointmentSlot: slot,
    });

    logger.info({
      type: "Appointment request rescheduled",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} rescheduled an appointment request`,
    });

    

    if (patient.notifications.status === true && patient.notifications.email === true) {
      let patientText = `Hello ${patient.firstName},\n\nYour appointment request has been successfully rescheduled.`;
      let topic = "Appointment Request Reschedule";
      await processNotification([
        { email: patient.email, topic, message: patientText, id: patient.id },
      ]);
    }

    return res.status(200).json({
      status: true,
      message: "Appointment request was rescheduled successfully.",
      data: rescheduledRequest,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Appointment request was not rescheduled.",
      error: error.message,
    });
  }

}


// View pending records requests
export const viewPendingRecordsRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const pendingRecordsRequests = await recordsRequestRepository.find({
      where: { patient: { id: patient.id } },
      order: {
        createdAt: "ASC",
      },
      relations: { doctor: true }
    });

    const patientPendingRequests = pendingRecordsRequests.map((request) => {
      return {
        id: request.id,
        createdAt: request.createdAt,
        approved: request.approved,
        doctor: {
          firstName: request.doctor.firstName,
          lastName: request.doctor.lastName,
          profilePicture: request.doctor.profilePicture,
        }
      }
    })
    return res.status(200).json({
      status: true,
      message: "Pending records requests were retrieved successfully.",
      data: patientPendingRequests,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Records requests were not retrieved.",
      error: error.message,
    });
  }
};

// Toggle records request
export const toggleRecordsRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.body;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });
    const recordsRequest = await recordsRequestRepository.findOne({
      where: { id: requestId }, relations: { patient: true }
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    if (recordsRequest.patient.id !== patient.id) {
      return res.status(401).json({
        status: false,
        message: "You are not authorized to accept this request.",
      });
    }

    const modifiedRequest = await recordsRequestRepository.update(requestId, {
      approved: !recordsRequest.approved,
    });

    logger.info({
      type: "Records request accepted",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} ${!recordsRequest.approved ? "approved" : "revoked"} a records request successfully`,
    });

    let message;

    if (patient.notifications.status === true && patient.notifications.email === true) {
      message = {
        from: process.env.EMAIL_ADDRESS,
        to: patient.email,
        subject: "Records Request",
        text: `Hello ${patient.firstName},\n\nYour records request has been successfully ${!recordsRequest.approved ? "approved" : "revoked"}.`
      }
    }

    

    return res.status(200).json({
      status: true,
      message: `Records request was ${!recordsRequest.approved ? "approved" : "revoked"} successfully.`,
      data: modifiedRequest,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Records request was not toggled.",
      error: error.message,
    });
  }
};

// Find a doctor
export const findDoctor = async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      search,
      minPrice,
      minStar,
      maxPrice,
      maxStar,
      language,
      gender,
      speciality,
      location,
    } =
      findDoctorsQueryParams.parse(req.query);

    const filterOptions: FindOptionsWhere<Doctor>[] = [
      speciality !== "" && { specializations: ILike(`%${speciality}%`) },
      language !== "" && { languages: ILike(`%${language}%`) },
      gender !== "" && { gender: gender.toLowerCase() },
      location !== "" && { city: ILike(`%${location}%`) },
    ].filter(Boolean);

    const searchQuery = search.split(" ").flatMap((item) => [
      { specializations: ILike(`%${item}%`) },
      { firstName: ILike(`%${item}%`) },
      { lastName: ILike(`%${item}%`) },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const doctors = await doctorRepository.find({
      where: searchOptions,
    });

    for (const doctor of doctors) {
      const reviews = await reviewRepository.find({
        where: {
          doctor: { id: doctor.id },
          rating: Not(0),
        },
      });

      const consultations = await recordRepository.count({
        where: { doctor: { id: doctor.id } },
      });

      const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
      doctor["ratings"] = isNaN(totalRating) ? 0 : totalRating.toFixed(1);
      doctor["noOfConsultations"] = consultations;
    }

    const filteredDoctors = doctors.filter((doctor) => {
      const filterRate = doctor.rate != null ? (doctor.rate.amount >= minPrice && doctor.rate.amount <= maxPrice) : true;
      const filterRating = doctor["ratings"] != null ? doctor["ratings"] >= minStar && doctor["ratings"] <= maxStar : true;
      delete doctor.password; 
      delete doctor.IDs;
      delete doctor.signaturePath;
      delete doctor.notifications;
      delete doctor.referrals;
      return filterRate && filterRating;
    }).slice((page - 1) * limit, page * limit);


    return res.status(200).json({
      status: true,
      message: "Doctors were retrieved successfully.",
      data: filteredDoctors,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      status: false,
      message: "Doctors were not retrieved.",
      error: error.message,
    });
  }
};

export const getDoctorDetails = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const doctor = await doctorRepository.findOne({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specializations: true,
        profilePicture: true,
        bio: true,
        education: true,
        experience: true,
        awards: true,
        verification_status: true,
        rate: {
          amount: true,
        },
        languages: true,
      }
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found.",
      });
    }

    const consultations = await recordRepository.count({
      where: {
        doctor: {
          id: doctor.id,
        },
      }
    })


    const favorite = await favouritesRepository.count({
      where: {
        patient: {
          id: Equal(patient.id)
        },
        doctor: {
          id: Equal(doctor.id)
        }
      },
    });

    const reviews = await reviewRepository.find({
      where: {
        doctor: {
          id: doctor.id,
        },
        rating: Not(0),
      },
    });

    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

    doctor['noOfConsultations'] = consultations;
    doctor["isFavourite"] = Boolean(favorite);
    doctor['ratings'] = isNaN(totalRating) ? 0 : totalRating.toFixed(1);

    return res.status(200).json({
      status: true,
      message: "Doctor details retrieved successfully",
      data: doctor,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving doctor details.",
      error: error.message,
    });
  }
};

// Popular specialties
export const popularSpecialties = async (req: Request, res: Response) => {
  try {
    const specialties = await doctorRepository.find({
      select: ["specializations"],
      order: {
        createdAt: "ASC",
      },
    });

    return res.status(200).json({
      status: true,
      message: "Specialties were retrieved successfully",
      specialties,
    });
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: "Specialties were not retrieved.",
      error: error.message,
    });
  }
};

// Top doctors
export const topDoctors = async (req: Request, res: Response) => {
  try {
    const { search, limit, page } = paginationQueryParams.parse(req.query);

    const searchQuery = search.split(" ").map((item) => ([
      { specializations: ILike(`%${item}%`) }
    ])).flat(1);

    const searchOptions = search !== "" ? searchQuery : {}

    const doctors = await doctorRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: searchOptions
    });

    for (const doctor of doctors) {
      const reviews = await reviewRepository.find({
        where: {
          doctor: { id: doctor.id },
          rating: Not(0),
        },
      });

      const consultations = await recordRepository.count({
        where: { doctor: { id: doctor.id } },
      });

      const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
      doctor["ratings"] = isNaN(totalRating) ? 0 : totalRating.toFixed(1);
      doctor["noOfConsultations"] = consultations;
    }

    return res.status(200).json({
      status: true,
      message: "Top doctors were retrieved successfully",
      data: doctors.map(doc => ({
        id: doc.id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        specializations: doc.specializations,
        rate: doc.rate,
        experience: doc.experience,
        noOfConsultations: doc['noOfConsultations'],
        ratings: doc['ratings'],
        profilePicture: doc.profilePicture,
      })).sort((a, b) => b.ratings - a.ratings),
    });
  } catch (error) {
    console.log(error.message)
    return res.status(400).json({
      status: false,
      message: "Top doctors were not retrieved.",
      error: error.message,
    });
  }
};

// Sugested doctors
export const suggestedDoctors = async (req: Request, res: Response) => {
  try {

  } catch (error) {
    return res.status(400).json({
      status: false,
      message: "Suggested doctors were not retrieved.",
      error: error.message,
    });
  }
};

// View a doctor's profile
export const viewDoctorProfile = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const doctor = await doctorRepository.findOne({ where: { id } });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Doctor was retrieved successfully.",
      data: doctor,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Doctor was not retrieved.",
      error: error.message,
    });
  }
};

export const checkActiveConsultation = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    const activeConsultation = await recordRepository.findOne({
      where: {
        patient: {
          id: patient.id,
        },
        status: "active",
      },
      relations: { doctor: true },
    });

    let activeConsult = null

    if (!activeConsultation) {
      return res.status(200).json({
        status: false,
        message: "No active consultation",
        data: false,
      });
    }

    activeConsult = {
      ...activeConsultation,
      user: {
        id: activeConsultation.doctor.id,
        firstName: activeConsultation.doctor.firstName,
        lastName: activeConsultation.doctor.lastName,
      },
      rate: activeConsultation.doctor.rate,
    }

    delete activeConsult.doctor;
    delete activeConsult.patient;

    return res.status(200).json({
      status: true,
      message: "Active consultation found",
      data: activeConsult,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while checking active consultation.",
      error: error.message,
    });
  }
}

export const getPrescription = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const record = await recordRepository.findOne({
      where: { id: req.params.consultationId },
      relations: { doctor: true }
    });

    if (!record || !record.prescriptionUrl) {
      return res.status(404).json({
        status: false,
        message: "Prescription not found.",
      });
    }

    // log to database
    logger.info({
      type: "Prescription viewed",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} viewed a prescription successfully`,
    });

    

    return res.status(200).json({
      status: true,
      message: "record was retrieved successfully.",
      data: record.prescriptionUrl,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Prescription was not retrieved.",
      error: error.message,
    });
  }
}

// Reschedule an appointment
export const rescheduleAppointment = async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;

    const { appointmentDate, startTime, endTime } = req.body;

    const appointment = await appointmentRepository.findOne({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return res.status(404).json({
        status: false,
        message: "Appointment not found",
      });
    }

    const updatedAppointment = await appointmentRepository.update(appointmentId, {
      appointmentDate,
      startTime,
      endTime,
    });

    logger.info({
      type: "Appointment rescheduled",
      userId: appointment.patient.id,
      message: `Patient ${appointment.patient.firstName} ${appointment.patient.lastName} rescheduled their appointment successfully`,
    });

    


    if (appointment.patient.notifications.status === true && appointment.patient.notifications.email === true) {
      const doctor = appointment.doctor;
      const patient = appointment.patient;
      let topic = "Appointment Reschedule"
      let patientMessage = `Hello ${appointment.patient.firstName},\n\nYour appointment has been successfully rescheduled.`;
      let doctorMessage = `Dear ${doctor.firstName} ${doctor.lastName}, \n\nYour appointment with ${patient.firstName} has been rescheduled.`;
      await processNotification([
        { email: patient.email, topic, message: patientMessage, id: patient.id },
        { email: doctor.email, topic, message: doctorMessage, id: doctor.id }
      ]);

    }


    return res.status(200).json({
      status: true,
      message: "Appointment rescheduled successfully",
      data: updatedAppointment,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while rescheduling appointment.",
      error: error.message,
    });
  }
}

export const fetchConsultationMessages = async (req: Request, res: Response) => {
  try {
    const doctorId = req.params.id;
    const patientId = req['userId'];

    const messages = await messagesRepository.find({
      where: {
        receiverId: In([doctorId, patientId]),
        senderId: In([doctorId, patientId])
      },
      order: {
        createdAt: "ASC"
      }
    });

    return res.status(200).json({
      status: true,
      message: "messages",
      data: messages,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred fetching messages",
      error: error.message,
    });
  }
};

// View favourite doctors
export const viewFavouriteDoctors = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, minPrice, minStar, maxPrice, maxStar, sort } =
      findDoctorsQueryParams.parse(req.query);

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const filterOptions: any[] = [
      { patient: { id: patient.id }, }
    ];

    const searchQuery = search.split(" ").flatMap((item) => [
      { doctor: { specializations: ILike(`%${item}%`) }, },
      { doctor: { firstName: ILike(`%${item}%`) }, },
      { doctor: { lastName: ILike(`%${item}%`) } },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);


    const favouriteDoctors = await favouritesRepository.find({
      where: searchOptions,
      relations: { doctor: true },
    });

    const doctors = favouriteDoctors.map((favourite) => favourite.doctor);

    for (const doctor of doctors) {
      const reviews = await reviewRepository.find({
        where: {
          doctor: { id: doctor.id, },
          rating: Not(0),
        },
      });

      const consultations = await recordRepository.count({
        where: {
          doctor: { id: doctor.id, },
        }
      })

      const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
      doctor["ratings"] = isNaN(totalRating) ? 0 : totalRating.toFixed(1);
      doctor['noOfConsultations'] = consultations;
    }

    const sortedDoctors = doctors.sort(doctorsSort(sort));

    const filteredDoctors = sortedDoctors.filter((doctor) => {
      return doctor.rate.amount >= minPrice && doctor.rate.amount <= maxPrice && doctor["ratings"] >= minStar && doctor["ratings"] <= maxStar;
    }).slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      status: true,
      message: "Favourite doctors were retrieved successfully.",
      data: filteredDoctors,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Favourite doctors were not retrieved.",
      error: error.message,
    });
  }
};

// Add a doctor to favourites
export const toggleFavouriteDoctor = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.body;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });
    const doctor = await doctorRepository.findOne({ where: { id: doctorId } });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found.",
      });
    }

    const favouriteDoctor = await favouritesRepository.findOne({
      where: {
        patient: {
          id: Equal(patient.id)
        },
        doctor: {
          id: Equal(doctor.id)
        },
      },
    });

    if (favouriteDoctor) {
      await favouritesRepository.remove(favouriteDoctor);

      logger.info({
        type: "Doctor removed from favourites",
        userId: patient.id,
        message: `Patient ${patient.firstName} ${patient.lastName} removed a doctor from favourites successfully`,
      });

      

      return res.status(200).json({
        status: true,
        message: "Doctor was removed from favourites successfully.",
        data: favouriteDoctor,
      });
    } else {
      const newFavouriteDoctor = favouritesRepository.create({
        doctor,
        patient,
      });

      await favouritesRepository.save(newFavouriteDoctor);

      logger.info({
        type: "Doctor added to favourites",
        userId: patient.id,
        message: `Patient ${patient.firstName} ${patient.lastName} added a doctor to favourites successfully`,
      });

      

      return res.status(200).json({
        status: true,
        message: "Doctor was added to favourites successfully.",
        data: newFavouriteDoctor,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Doctor was not added to favourites.",
      error: error.message,
    });
  }
};

// View patient's medical records
export const viewMedicalRecords = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const medicalRecords = await patientRepository.find({
      where: { id: patient.id },
      relations: ["medicalRecords"],
      select: ["medicalRecords"],
      order: {
        medicalRecords: "ASC",
      },
    });

    return res.status(200).json({
      status: true,
      message: "Medical records were retrieved successfully.",
      data: medicalRecords,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Medical records were not retrieved.",
      error: error.message,
    });
  }
};

// Remove profile picture
export const removeProfilePicture = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }
    await deleteFile(patient.profilePicture);

    patient.profilePicture = null;

    await patientRepository.save(patient);

    logger.info({
      type: "Profile picture removed",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} removed their profile picture successfully`,
    });

    

    return res.status(200).json({
      status: true,
      message: "Profile picture was removed successfully.",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Profile picture was not removed.",
      error: error.message,
    });
  }
};

// Add vitals
export const addVitals = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const { weight, temperature, bloodPressure, heartRate, bloodSugarLevel } =
      req.body;

    const update = await patientRepository.update(patient.id, {
      weight,
      temperature,
      bloodPressure,
      heartRate,
      bloodSugarLevel,
    });

    logger.info({
      type: "Vitals added",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} added vitals successfully`,
    });

    return res.status(201).json({
      status: true,
      message: "Vitals were added successfully.",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Vitals were not added.",
      error: error.message,
    });
  }
};

// get labs for patient across consultations
export const getLabs = async (req: Request, res: Response) => {
  try {
    const patientId = req["userId"];
    const { search, limit, page } = await paginationQueryParams.parseAsync(req.query);
    const { status, sort } = appointmentRequestParams.parse(req.query);

    const filterOptions = [
      { consultation: { patient: { id: patientId, }, }, },
      status && { status: In(status.split(".")) },
    ].filter(Boolean);

    const searchQuery = search.split(" ").flatMap((item) => [
      { lab: ILike(`%${item}%`) },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const labsRaw = await labRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: searchOptions,
      order: createSortOrder(sort, { createdAt: "createdAt", status: "status", lab: "lab" }, { field: "createdAt", order: "DESC"}),
      relations: ["consultation", "consultation.doctor"],
    });

    const labs = labsRaw.map(lab => {
      return {
        id: lab.id,
        lab: lab.lab,
        fileUrl: lab.fileUrl,
        status: lab.status,
        notes: lab.notes,
        createdAt: lab.consultation.createdAt,
        consultationId: lab.consultation.id,
        doctor: {
          id: lab.consultation.doctor.id,
          firstName: lab.consultation.doctor.firstName,
          lastName: lab.consultation.doctor.lastName,
          profilePicture: lab.consultation.doctor.profilePicture,
        }
    }});

    return res.status(200).json({
      status: true,
      message: "Labs retrieved successfully",
      data: labs,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving labs.",
      error: error.message,
    });
  }
};

// Add picture of lab requested for consultation
export const addLabPicture = async (req: Request, res: Response) => {
  try {
    const labId = req.params.id;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const lab = await labRepository.findOne({
      where: { id: labId },
      relations: ["consultation", "consultation.doctor"],
    });

    if (!lab) {
      return res.status(404).json({
        status: false,
        message: "Lab not found.",
      });
    }

    const labPictureUrl = await uploadFile({ file: req.file, folderName: `labPictures/${patient.id}` });

    lab.fileUrl = labPictureUrl;
    lab.status = "completed"
    await labRepository.save(lab);

    const consultation = lab.consultation;
    
    logger.info({
      type: "Lab picture uploaded",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} uploaded a lab picture successfully`,
    });

    let doctor = consultation.doctor;
    let doctorMessage = `Hello ${doctor.firstName},\n\nA lab picture has been uploaded for the consultation ${consultation.id} with ${patient.firstName}.`;
    let topic = "Lab Picture Upload";
    await processNotification([
      { email: doctor.email, topic, message: doctorMessage, id: doctor.id },
    ]);

    return res.status(201).json({
      status: true,
      message: "Lab picture was added successfully.",
      data: lab,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Lab picture was not uploaded.",
      error: error.message,
    });
  }
};

export const removeLabPicture = async (req: Request, res: Response) => {
  try {
    const labId = req.params.id;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });
    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const lab = await labRepository.findOne({
      where: { id: labId },
      select: { fileUrl: true, id: true }
    });

    lab.fileUrl && await deleteFile(lab.fileUrl);

    await labRepository.delete(lab.id);

    res.status(200).json({
      status: true,
      message: "Lab picture was removed successfully.",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Lab picture was not removed.",
      error: error.message,
    });
  }
}

// Upload profile picture
export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Please upload a profile picture.",
      });
    }

    patient.profilePicture = await uploadFile({ file: req.file, folderName: `patients/${patient.id}`, filename: "profile" });

    await patientRepository.save(patient);

    logger.info({
      type: "Profile picture uploaded",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} uploaded a profile picture successfully`,
    });

    

    return res.status(200).json({
      status: true,
      message: "Profile picture was uploaded successfully.",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Profile picture was not uploaded.",
      error: error.message,
    });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: false,
        message: "Please fill in all required fields.",
      });
    }

    const isPasswordCorrect = await bcryptjs.compare(
      currentPassword,
      patient.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: false,
        message: "Incorrect password.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: false,
        message: "Passwords do not match.",
      });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);

    patient.password = hashedPassword;

    await patientRepository.save(patient);

    logger.info({
      type: "Password reset",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} reset their password successfully`,
    });

    


    if (patient.notifications.status === true && patient.notifications.email === true) {
      let patientText = `Hello ${patient.firstName},\n\nYour password has been successfully reset.`;
      await processNotification([
        { email: patient.email, topic: "Password Reset", message: patientText, id: patient.id },
      ]);
    }

    return res.status(200).json({
      status: true,
      message: "Password reset successful",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while resetting password.",
      error: error.message,
    });
  }
};

// View available appointment slots for a doctor
export const viewAppointmentSlots = async (req: Request, res: Response) => {
  try {
    const doctorId = req.params.id;

    const w = new Date();

    console.log(w.toLocaleDateString());

    const doctor = await doctorRepository.findOne({
      where: {
        id: doctorId,
      },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found.",
      });
    }

    let availableSlots = await appointmentSlotRepository.findBy({
      doctor: {
        id: doctorId
      },
      date: MoreThanOrEqual(new Date(new Date().setHours(0, 0, 0, 0))),
      status: "available",
    });

    availableSlots = availableSlots.filter((slot) => {
      const appointmentStartTime = new Date(`${slot.date} ${slot.startTime}`);
      return appointmentStartTime > new Date();
    });

    return res.status(200).json({
      status: true,
      message: "Appointment slots were retrieved successfully.",
      data: availableSlots,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Appointment slots were not retrieved.",
      error: error.message,
    });
  }
};

// View Records
export const viewRecords = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    const records = await recordRepository.find({
      where: { patient: { id: patient.id } },
      order: {
        createdAt: "DESC",
      },
      relations: ["symptoms", "diagnoses", "examinations", "prescriptions", "labs", "doctor"],
    });

    return res.status(200).json({
      status: true,
      message: "Records were retrieved successfully.",
      data: records,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Records were not retrieved.",
      error: error.message,
    });
  }
};

// check if there are pending reviews to be made
export const checkPendingReviews = async (req: Request, res: Response) => {
  try {
    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const pendingReview = await reviewRepository.findOne({
      where: {
        patient: {
          id: patient.id,
        },
        status: "pending",
      }, relations: { doctor: true }
    });

    let review = null;

    if (pendingReview !== null) {
      review = {
        ...pendingReview,
        doctor: {
          id: pendingReview.doctor.id,
          firstName: pendingReview.doctor.firstName,
          lastName: pendingReview.doctor.lastName,
        }
      }
    }

    return res.status(200).json({
      status: true,
      message: "Pending reviews were retrieved successfully.",
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Pending reviews were not retrieved.",
      error: error.message,
    });
  }
};

export const submitReview = async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id;

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    const reviewBody = await ReviewSchema.parseAsync(req.body);

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }


    const review = await reviewRepository.findOne({
      where: {
        id: reviewId,
      },
    });

    if (review === null) {
      return res.status(404).json({
        status: false,
        message: "Review not found.",
      });
    }

    const reviewData = reviewRepository.merge(review, reviewBody);

    reviewData.status = "completed";

    await reviewRepository.save(reviewData);

    logger.info({
      type: "Review submitted",
      userId: patient.id,
      message: `Patient ${patient.firstName} ${patient.lastName} submitted a review successfully`,
    });

    

    return res.status(200).json({
      status: true,
      message: "Review was submitted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Review was not submitted.",
      error: error.message,
    });
  }

}

export const getAdminBroadcasts = async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationQueryParams.parse(req.query);

    const broadcasts = await broadcastRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        scope: In(["ALL", "PATIENT"]),
      },
      order: {
        createdAt: "DESC",
      }, relations: {
        admin: true,
      }
    });

    return res.status(200).json({
      status: true,
      message: "admin broadcasts retreived successfully",
      data: broadcasts.map((broadcast) => ({
        ...broadcast,
        admin: {
          id: broadcast.admin.id,
          name: broadcast.admin.name,
          profilePicture: broadcast.admin.profilePicture
        }
      })),
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving broadcasts.",
      error: error.message,
    });
  }
}

export const getAllConsultationNotes = async (req: Request, res: Response) => {
  try {
    const { limit, page } = paginationQueryParams.parse(req.query);

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const totalConsultations = await recordRepository.count({
      where: {
        patient: {
          id: patient.id,
        },
      },
    });

    const consultations = await recordRepository.find({
      where: {
        patient: {
          id: patient.id,
        },
      },
      take: limit,
      skip: (page - 1) * limit,
      order: {
        createdAt: "DESC",
      },
      relations: { doctor: true }
    });

    return res.status(200).json({
      status: true,
      message: "Consultations retrieved successfully.",
      data: consultations.map((consultation) => ({
        id: consultation.id,
        doctor: {
          id: consultation.doctor.id,
          firstName: consultation.doctor.firstName,
          lastName: consultation.doctor.lastName,
          profilePicture: consultation.doctor.profilePicture,
        },
        notes: consultation.notes,
        createdAt: consultation.createdAt,
      })),
      total: totalConsultations,
      page: page,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Consultation notes were not retrieved.",
      error: error.message,
    });
  }
}

export const postFeedback = async (req: Request, res: Response) => {
  try {
    const { type, comment } = await FeedbackSchema.parseAsync(req.body);

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const feedback = feedbackRepository.create({
      type,
      comment,
      patient,
      userType: "patient",
    });

    await feedbackRepository.save(feedback);

    return res.status(200).json({
      status: true,
      message: "Feedback was submitted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Feedback was not sent.",
      error: error.message,
    });
  }
};

export const postIssues = async (req: Request, res: Response) => {
  try {
    const { name, description } = await IssuesSchema.parseAsync(req.body);

    const patient = await patientRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found.",
      });
    }

    const issue = issuesRepository.create({
      name,
      description,
      patient,
      userType: "patient",
    });

    await issuesRepository.save(issue);

    return res.status(200).json({
      status: true,
      message: "Issue was submitted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Issues was not sent.",
      error: error.message,
    });
  }
};

export const getPrescriptions = async (req: Request, res: Response) => {
  try {
    const patientId = req["userId"];
    const { search, limit, page } = await paginationQueryParams.parseAsync(req.query);

    const filterOptions = [
      { patient: { id: patientId, }, prescriptionUrl: Not(null) },
    ].filter(Boolean);

    const searchQuery = search.split(" ").flatMap((item) => [
      { doctor: { firstName: ILike(`%${item}%`) } },
      { doctor: { lastName: ILike(`%${item}%`) } },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const totalRecords = await recordRepository.count({
      where: { patient: { id: patientId, }, prescriptionUrl: Not(null) },
    });

    const records = await recordRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: searchOptions,
      order: {
        createdAt: "DESC",
      },
      select: {
        id: true,
        prescriptionUrl: true,
        createdAt: true,
        doctor: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
        },
      },
      relations: { doctor: true }
    });

    return res.status(200).json({
      status: true,
      message: "Prescriptions retrieved successfully.",
      data: records,
      total: totalRecords,
      page: page,
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving prescriptions.",
      error: e.message,
    });
  }
}