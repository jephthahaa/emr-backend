
import { Request, Response } from "express";
import { FindOptionsWhere, Not } from "typeorm";
import { dataSource } from "../data-source";
import bcryptjs from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../middleware/auth";
import { AppointmentSlot } from "../models/appointment-slot";
import { Doctor } from "../models/doctor";
import { Patient } from "../models/patient";
import { RecordRequest } from "../models/medicalRecordRequests";
import { Appointment } from "../models/appointment";
import { AppointmentRequest } from "../models/appointment-request";
import { Allergy } from "../models/allergy";
import { Record } from "../models/record";
import { Lab } from "../models/lab";
import { Diagnosis } from "../models/diagnosis";
import { Surgery } from "../models/surgery";
import { Prescription } from "../models/prescription";
import { Symptom } from "../models/symptom";
import { FutureVisits } from "../models/future-visits";
import { PaymentMethod } from "../models/paymentMethod";
import {
  appointmentRequestParams,
  cancelAppointmentRequestSchema,
  doctorPatientsParams, FeedbackSchema, IssuesSchema,
  paginationQueryParams,
  paymentMethodSchema,
  updateDoctorSchema,
  updatePatientSchema
} from "../schema";
import {
  Between,
  ILike,
  In,
  MoreThanOrEqual,
} from "typeorm";
import {
  appointmentRequestSort,
  createSortOrder,
  doctorPatientsSort,
  getWeekStartandEnd,
  mergeMultiple,
  symptomsSort,
  updateProperties
} from "../utils";
import { getAppointmentSlotsSchema } from "../schema/appointmentSlots";
import { Messeges } from "../models/messages";
import { FamilyMember } from "../models/family-members";
import { Transactions } from "../models/transaction";
// import { authorize, createEvent } from "../utils/google";
import { Broadcast } from "../models/broadcast";
import { mailer } from "../utils/mailer";
import { deleteFile, uploadFile } from "./upload.controller";
import { doctorsHtml } from "../utils/mail.welcome.msg";
import { Symptoms } from "../models/sympoms";
import { Medicine } from "../models/medicine";
import { Icds } from "../models/icds";
import { processNotification } from "./notifications.controller";
import { COMPANY_NAME } from "../utils/constants";
import { Feedbacks } from "../models/feedbacks";
import { Issues } from "../models/issues";
import { generatePrescriptionPDF } from "../utils/genPrescriptionPDF";
import { referPatientSchema, Referral } from "../models/referral";
import { Logger } from "../logger";
import { v4 as uuidv4 } from "uuid";
import { DOCTORS_DATA } from "../data";

const doctorRepository = dataSource.getRepository(Doctor);
const patientRepository = dataSource.getRepository(Patient);
const requestRepository = dataSource.getRepository(RecordRequest);
const appointmentSlotRepository = dataSource.getRepository(AppointmentSlot);
const appointmentRepository = dataSource.getRepository(Appointment);
const appointmentRequestRepository =
  dataSource.getRepository(AppointmentRequest);
const allergyRepository = dataSource.getRepository(Allergy);
const recordRepository = dataSource.getRepository(Record);
const labRepository = dataSource.getRepository(Lab);
const diganosisRepository = dataSource.getRepository(Diagnosis);
const surgeryRepository = dataSource.getRepository(Surgery);
const prescriptionRepository = dataSource.getRepository(Prescription);
const symptomRepository = dataSource.getRepository(Symptom);
const visitRepository = dataSource.getRepository(FutureVisits);
const familyMemberRepository = dataSource.getRepository(FamilyMember);
const paymentMethodRepository = dataSource.getRepository(PaymentMethod);
const diagnosisRepository = dataSource.getRepository(Diagnosis);
const messagesRepository = dataSource.getRepository(Messeges);
const transactionRepository = dataSource.getRepository(Transactions);
const broadcastRepository = dataSource.getRepository(Broadcast);
const symptomsRepository = dataSource.getRepository(Symptoms);
const medicineRepository = dataSource.getRepository(Medicine);
const icdsRepository = dataSource.getRepository(Icds);
const feedbackRepository = dataSource.getRepository(Feedbacks);
const issuesRepository = dataSource.getRepository(Issues);

const referralRepository = dataSource.getRepository(Referral);

const logger = new Logger("DoctorController");


// Register a new doctor
export const register = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      dob,
      MDCRegistration,
      contact,
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: false,
        message: "Passwords do not match.",
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files) {
      return res.status(400).json({
        status: false,
        message: "Please upload a profile picture and ID.",
      });
    }

    const id = uuidv4();

    const foldername = `doctors/${id}`;
    const profilePicture = await uploadFile({ file: files["profilePicture"][0], folderName: foldername, filename: "profile" });
    const front = await uploadFile({ file: files["front"][0], folderName: foldername, filename: "front" });
    const back = await uploadFile({ file: files["back"][0], folderName: foldername, filename: "back" });

    const doctor = await doctorRepository.create({
      id,
      firstName,
      lastName,
      email,
      password: await bcryptjs.hash(password, 12),
      dob,
      contact,
      MDCRegistration,
      profilePicture,
      IDs: {
        front,
        back,
      },
    });


    await doctorRepository.save(doctor);

    logger.info({
      type: "Doctor registered",
      userId: doctor.id,
      message: `Doctor ${doctor.firstName} ${doctor.lastName} has been registered successfully`,
    });


    if (doctor.notifications.status === true && doctor.notifications.email === true) {
      // mailer.sendMail({
      //   from: COMPANY_NAME,
      //   to: doctor.email,
      //   subject: "Welcome to Zomujo",
      //   html: doctorsHtml(`${doctor.firstName} ${doctor.lastName}`)
      // });
    }

    return res.status(201).json({
      status: true,
      message: "Doctor created successfully",
      data: doctor,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Doctor was not created.",
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

    const doctor = await doctorRepository.findOne({
      where: {
        email,
        isActive: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found.",
      });
    }

    const isPasswordCorrect = await bcryptjs.compare(password, doctor.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: false,
        message: "Incorrect password.",
      });
    }

    const accessToken = generateAccessToken(doctor.id);
    const refreshToken = generateRefreshToken(doctor.id);

    res.clearCookie("refreshToken");
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/refresh-token",
    });

    logger.info({
      type: "Doctor logged in",
      userId: doctor.id,
      message: `Doctor ${doctor.firstName} ${doctor.lastName} has logged in successfully`,
    });



    return res.status(201).json({
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

export const getDoctorDetails = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: { paymentMethods: true },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    delete doctor.password;

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

    const doctor = await doctorRepository.findOne({
      where: { id: decoded["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const accessToken = generateAccessToken(doctor.id);
    const newRefreshToken = generateRefreshToken(doctor.id);

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

export const viewPatients = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { gender, sort } = doctorPatientsParams.parse(req.query);

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
        data: null,
      });
    }

    const filterOptions: any[] = [
      { doctors: { id: doctor.id } },
      gender && { gender: In(gender.split(".")) }
    ].filter(Boolean);

    const searchQuery: FindOptionsWhere<Patient>[] = search.split(" ").flatMap((item) => [
      { firstName: ILike(`%${item}%`) },
      { lastName: ILike(`%${item}%`) },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const totalPatients = await patientRepository.count({ where: searchOptions });

    let patients = await patientRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      order: doctorPatientsSort(sort),
      where: searchOptions,
    });


    for (const patient of patients) {
      const consultation = await recordRepository.findOne({
        where: {
          patient: {
            id: patient.id,
          },
        },
        order: {
          createdAt: "DESC",
        },
      });

      patient["recentConsultDate"] = consultation ? consultation.createdAt : null;
      delete patient.password;
      delete patient.notifications;
      delete patient.appointmentRequests;
      delete patient.referrals;
    }

    if (sort && sort.split(".")[0] === "date") {
      patients = patients.sort((a, b) => {
        const [field, order] = sort.split(".") as [string, "ASC" | "DESC"];
        return order === "ASC"
          ? new Date(a["recentConsultDate"]).getTime() - new Date(b["recentConsultDate"]).getTime()
          : new Date(b["recentConsultDate"]).getTime() - new Date(a["recentConsultDate"]).getTime();
      });
    }


    return res.status(200).json({
      status: true,
      message: "Patients retrieved successfully",
      data: patients,
      total: totalPatients,
      page
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// View today's appointment requests
export const viewTodaysAppointmentRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["appointmentSlots", "appointmentSlots.appointmentRequests"],
    });

    const today = new Date().toLocaleDateString();

    const todaysRequests = doctor.appointmentSlots.filter(
      (slot) => slot.date.toLocaleDateString() === today
    );

    return res.status(200).json({
      status: true,
      message: `Appointment requests for ${today} retrieved successfully`,
      data: todaysRequests,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// View a doctor's upcoming appointments
export const viewUpcomingAppointments = async (req: Request, res: Response) => {
  try {
    const { date } = await getAppointmentSlotsSchema.parseAsync({
      date: new Date(req.query.date as string),
    });

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    const { startOfWeek, endOfWeek } = getWeekStartandEnd(date);

    const upcomingAppointmentsBase = await appointmentRepository.find({
      where: {
        doctor: {
          id: doctor.id,
        },
        appointmentDate: Between(startOfWeek, endOfWeek),
        status: "accepted",
      },
      relations: { patient: true },
    });

    const upcomingAppointments = upcomingAppointmentsBase.map((item) => {
      return {
        ...item,
        patient: {
          firstName: item.patient.firstName,
          lastName: item.patient.lastName,
          profilePicture: item.patient.profilePicture,
        },
      };
    });

    return res.status(200).json({
      status: true,
      message: "Upcoming appointments retrieved successfully",
      data: upcomingAppointments,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// View completed appointments
export const viewCompletedAppointments = async (
  req: Request,
  res: Response
) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["appointments"],
    });

    const completedAppointments = doctor.appointments.filter(
      (appointment) => appointment.status === "completed"
    );

    return res.status(200).json({
      status: true,
      message: "Completed appointments retrieved successfully",
      data: completedAppointments,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Create an appointment slot
export const createAppointmentSlot = async (req: Request, res: Response) => {
  try {
    // const id = req.params.id;
    const { date, startTime, endTime, type } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["appointmentSlots"],
    });

    const appointmentSlot = new AppointmentSlot();
    appointmentSlot.date = date;
    appointmentSlot.startTime = startTime;
    appointmentSlot.endTime = endTime;
    appointmentSlot.type = type;

    await appointmentSlotRepository.save(appointmentSlot);

    doctor.appointmentSlots = [...doctor.appointmentSlots, appointmentSlot];

    await doctorRepository.save(doctor);

    logger.info({
      type: "Appointment slot created",
      userId: doctor.id,
      message: `Appointment slot created successfully`,
    });



    if (doctor.notifications.status === true && doctor.notifications.email === true) {
      let message = `Dear Dr. ${doctor.firstName} ${doctor.lastName},\n\nAn appointment slot has been created successfully. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team`;

      await processNotification([{
        topic: "Appointment Slot Created",
        message: message,
        email: doctor.email,
      }]);

    }

    return res.status(201).json({
      status: true,
      message: "Appointment slot created successfully",
      data: appointmentSlot,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// View appointment slots
export const viewAppointmentSlots = async (req: Request, res: Response) => {
  try {
    const { date } = await getAppointmentSlotsSchema.parseAsync({
      date: new Date(req.query.date as string),
    });

    const { startOfWeek, endOfWeek } = getWeekStartandEnd(date);

    const slots = await appointmentSlotRepository.findBy({
      doctor: {
        id: req["userId"],
      },
      status: "available",
      date: Between(startOfWeek, endOfWeek),
    });

    return res.status(200).json({
      status: true,
      message: "Appointment slots retrieved successfully",
      data: slots,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// View upcoming appointment slots
export const viewUpcomingAppointmentSlots = async (
  req: Request,
  res: Response
) => {
  try {
    const upcomingSlots = appointmentSlotRepository.findBy({
      doctor: {
        id: req["userId"],
      },
      date: MoreThanOrEqual(new Date()),
    });

    return res.status(200).json({
      status: true,
      message: "Upcoming appointment slots retrieved successfully",
      data: upcomingSlots,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// View appointment requests
export const viewAppointmentRequests = async (req: Request, res: Response) => {
  const { limit, page, search } = paginationQueryParams.parse(req.query);
  const { type, status, sort } = appointmentRequestParams.parse(req.query);

  const filterOptions: any[] = [
    { appointmentSlot: { doctor: { id: req["userId"] } } },
    type && { appointmentSlot: { type: In(type.split(".")) } },
    status && { status: In(status.split(".")) },
  ].filter(Boolean);

  const searchQuery: FindOptionsWhere<AppointmentRequest>[] = search.split(" ").flatMap((item) => [
    { patient: { firstName: ILike(`%${item}%`) } },
    { patient: { lastName: ILike(`%${item}%`) } },
  ]);

  const searchOptions = search !== "" ?
    searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
    mergeMultiple(filterOptions);

  const totalRequests = await appointmentRequestRepository.count({ where: searchOptions });

  try {
    const appointmentRequestsBase = await appointmentRequestRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: searchOptions,
      order: appointmentRequestSort(sort),
      relations: ["patient", "appointmentSlot"],
    });

    const appointmentRequests = appointmentRequestsBase.map((request) => ({
      id: request.id,
      date: request.appointmentSlot.date,
      startTime: request.appointmentSlot.startTime,
      endTime: request.appointmentSlot.endTime,
      type: request.appointmentSlot.type,
      slotId: request.appointmentSlot.id,
      patient: {
        id: request.patient.id,
        firstName: request.patient.firstName,
        lastName: request.patient.lastName,
        profilePicture: request.patient.profilePicture,
      },
      notes: request.notes,
      status: request.status,
      reason: request.reason,
    }));

    return res.status(200).json({
      status: true,
      message: "Appointment requests retrieved successfully",
      data: appointmentRequests,
      total: totalRequests,
      page,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// decline an appointment request
export const declineAppointmentRequest = async (
  req: Request,
  res: Response
) => {
  try {
    const { requestId } = req.body;

    const appointmentRequest = await appointmentRequestRepository.update(
      requestId,
      {
        status: "declined",
      }
    );

    logger.info({
      type: "Appointment request declined",
      userId: req["userId"],
      message: `Appointment request declined successfully`,
    });



    return res.status(200).send({
      status: true,
      message: "Appointment request declined successfully",
      data: appointmentRequest,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const rescheduleAppointmentRequest = async (
  req: Request,
  res: Response
) => {
  try {
    const { requestId, slotId } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (doctor === null) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    const appointmentRequest = await appointmentRequestRepository.findOne({
      where: {
        id: requestId,
      },
      relations: ["appointmentSlot"],
    });

    if (!appointmentRequest) {
      return res.status(404).json({
        status: false,
        message: "Appointment request not found",
      });
    }

    const appointmentSlot = await appointmentSlotRepository.findOne({
      where: {
        id: slotId,
      },
      relations: { doctor: true },
    });

    if (appointmentSlot.doctor.id !== doctor.id) {
      return res.status(401).json({
        status: false,
        message: "You are not authorized to reschedule this appointment",
      });
    }

    if (!appointmentSlot) {
      return res.status(404).json({
        status: false,
        message: "Appointment slot not found",
      });
    }

    appointmentRequest.appointmentSlot = appointmentSlot;
    await appointmentRequestRepository.save(appointmentRequest);

    logger.info({
      type: "Appointment request rescheduled",
      userId: req["userId"],
      message: `Doctor rescheduled appointment request successfully`,
    });



    let message;

    if (doctor.notifications.status === true && doctor.notifications.email === true) {
      message = {
        from: 'Zomujo',
        to: doctor.email,
        subject: 'Appointment Rescheduled',
        text: `Dear Dr. ${doctor.firstName} ${doctor.lastName},\n\nAn appointment has been rescheduled successfully. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team`,
      };
    }

    return res.status(200).json({
      status: true,
      message: "Appointment request rescheduled successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const cancelAppointmentRequest = async (req: Request, res: Response) => {
  try {
    const { requestId, slotId, keepSlot } =
      await cancelAppointmentRequestSchema.parseAsync(req.body);

    const appointmentRequest = await appointmentRequestRepository.update(
      requestId,
      {
        status: "cancelled",
      }
    );

    logger.info({
      type: "Appointment request cancelled",
      userId: req["userId"],
      message: `Doctor cancelled appointemnt request: ${requestId}`,
    });

    const appointmentSlot = await appointmentSlotRepository.findOne({
      where: {
        id: slotId,
      },
    });

    if (keepSlot) {
      appointmentSlot.status = "available";
    }

    const appointment = await appointmentRepository.findOne({
      where: {
        doctor: {
          id: req["userId"],
        },
        appointmentDate: appointmentSlot.date,
        startTime: appointmentSlot.startTime,
        endTime: appointmentSlot.endTime,
      },
      relations: { patient: true },
    });

    const doctor = await doctorRepository.findOne({
      where: {
        id: req["userId"],
      },
      relations: { patients: true },
    });

    doctor.patients = doctor.patients.filter(
      (patient) => patient.id !== appointment.patient.id
    );
    await doctorRepository.save(doctor);

    appointment.status = "cancelled";
    await appointmentRepository.save(appointment);

    logger.info({
      type: "Appointment cancelled",
      userId: req["userId"],
      message: `Doctor cancelled appointemnt: ${appointment.id}`,
    });

    if (doctor.notifications.status === true && doctor.notifications.email === true) {
      processNotification([
        { email: doctor.email, topic: "Appointment Cancelled", message: `Dear Dr. ${doctor.firstName} ${doctor.lastName},\n\nAn appointment has been cancelled successfully. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team` }
      ])
    }

    return res.status(200).send({
      status: true,
      message: "Appointment request declined successfully",
      data: appointmentRequest,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// View all patients for a doctor
export const viewAllPatients = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients"],
    });

    return res.status(200).json({
      status: true,
      message: "Patients retrieved successfully",
      data: doctor.patients,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving patients.",
      error: error.message,
    });
  }
};

// View a patient for a doctor
export const viewPatient = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients"],
    });

    const patient = doctor.patients.find(
      (patient) => patient.id === req.params.id
    );

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Patient retrieved successfully",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving patient.",
      error: error.message,
    });
  }
};

// Reject an appointment request
export const rejectAppointmentRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["appointmentSlots", "appointmentSlots.appointmentRequests"],
    });

    const appointmentRequest = await appointmentSlotRepository.findOne({
      where: {
        appointmentRequests: {
          id: requestId,
        },
      },
      relations: ["appointmentRequests", "appointmentRequests.patient"],
    });

    if (!appointmentRequest) {
      return res.status(404).json({
        status: false,
        message: "Appointment request not found",
      });
    }

    appointmentRequest.appointmentRequests.forEach((request) => {
      if (request.id === requestId) {
        request.status = "declined";
      } else {
        request.status = "accepted";
      }
    });

    await appointmentSlotRepository.save(appointmentRequest);

    logger.info({
      type: "Appointment request rejected",
      userId: doctor.id,
      message: `Appointment request rejected successfully`,
    });



    return res.status(200).json({
      status: true,
      message: "Appointment request rejected successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Check if request has been send already
export const checkRecord = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });
    const patient = await patientRepository.findOne({
      where: { id: patientId },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    const recordRequest = await requestRepository.findOne({
      where: {
        doctor: {
          id: doctor.id,
        },
        patient: {
          id: patient.id,
        },
      },
    });

    if (!recordRequest) {
      return res.status(200).send({
        status: true,
        message: "request not sent",
        data: "not-sent",
      });
    }

    if (recordRequest.approved) {
      return res.status(200).send({
        status: true,
        message: "request approved",
        data: "approved",
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "request not approved",
        data: "not-approved",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while sending request.",
      error: error.message,
    });
  }
};

// Send request to view a patient's record
export const sendRequest = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });
    const patient = await patientRepository.findOne({
      where: { id: patientId },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    const access = await requestRepository.findOne({
      where: {
        doctor: {
          id: doctor.id,
        },
        patient: {
          id: patient.id,
        },
      },
    });

    if (access) {
      return res.status(400).json({
        status: false,
        message: "Request already sent",
      });
    }

    const request = new RecordRequest();
    request.doctor = doctor;
    request.patient = patient;

    await requestRepository.save(request);

    logger.info({
      type: "Record request sent",
      userId: doctor.id,
      message: `Record request sent successfully`,
    });



    if (doctor.notifications.status === true && doctor.notifications.email === true) {
      let patientText = `Dear ${patient.firstName} ${patient.lastName},\n\nDr. ${doctor.firstName} ${doctor.lastName} has requested to view your medical records. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team`;
      let doctorText = `Dear Dr. ${doctor.firstName} ${doctor.lastName},\n\nYour request to view ${patient.firstName} ${patient.lastName}'s medical records has been sent successfully. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team`;

      await processNotification([{ email: patient.email, topic: "Record Request Sent", message: patientText, id: patient.id },
      { email: doctor.email, topic: "Record Request Sent", message: doctorText, id: doctor.id }
      ]);
    }

    return res.status(201).json({
      status: true,
      message: "Request sent successfully",
      data: {
        doctor_id: request.doctor.id,
        patient_id: request.patient.id,
        status: request.approved,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while sending request.",
      error: error.message,
    });
  }
};

// View doctor's profile
export const viewProfile = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients", "appointmentSlots"],
    });

    return res.status(200).json({
      status: true,
      message: "Profile retrieved successfully",
      data: doctor,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving profile.",
      error: error.message,
    });
  }
};

// View patient's records
export const viewPatientRecords = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients"],
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    const recordAccess = await requestRepository.findOne({
      where: {
        doctor: {
          id: doctor.id,
        },
        patient: {
          id: patientId,
        },
      },
    });

    if (!recordAccess.approved === true) {
      return res.status(401).json({
        status: false,
        message: "You do not have access to this patient's records",
      });
    }

    const records = await recordRepository.find({
      where: {
        patient: {
          id: patientId,
        },
      },
      relations: [
        "patient",
        "symptoms",
        "diagnoses",
        "prescriptions",
        "labs",
        "futureVisits",
      ],
    });

    return res.status(200).json({
      status: true,
      message: "Patient records retrieved successfully",
      data: records,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving patient records.",
      error: error.message,
    });
  }
};

// Add allergy for patient
export const addAllergy = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    const { name, severity, type } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients"],
    });

    const patient = doctor.patients.find((patient) => patient.id === patientId);

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    const newAllergy = allergyRepository.create({
      allergy: name,
      severity,
      type,
      patient,
    });

    await allergyRepository.save(newAllergy);

    logger.info({
      type: "Allergy added",
      userId: doctor.id,
      message: `Allergy added successfully`,
    });



    return res.status(201).json({
      status: true,
      message: "Allergy added successfully",
      data: newAllergy,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding allergy.",
      error: error.message,
    });
  }
};

// Add complaint
// export const addComplaint = async (req: Request, res: Response) => {
//   try {
//     const { complaint } = req.body;

//     const newComplaint = await complaintRepository.create({
//       complaint,
//     });

//     await complaintRepository.save(newComplaint);

//     return res.status(201).json({
//       status: true,
//       message: "Complaint added successfully",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       status: false,
//       message: "An error occurred while adding complaint.",
//       error: error.message,
//     });
//   }
// };

// Add lab for patient during consultation
export const addLab = async (req: Request, res: Response) => {
  try {
    const { consultationId, lab, notes } = req.body;

    const record = await recordRepository.findOne({
      where: {
        id: consultationId,
      },
    });

    if (!record) {
      return res.status(404).json({
        status: false,
        message: "Consultation not found",
      });
    }

    const newLab = labRepository.create({
      lab,
      notes: notes,
      consultation: record,
    });

    await labRepository.save(newLab);

    logger.info({
      type: "Lab request sent",
      userId: req["userId"],
      message: `Lab request sent successfully`,
    });



    return res.status(201).json({
      status: true,
      message: "Lab request sent successfully",
      data: newLab,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding lab.",
      error: error.message,
    });
  }
};

export const addLabs = async (req: Request, res: Response) => {
  try {
    const { consultationId, labs, notes }: {
      consultationId: string;
      labs: string[];
      notes: string;
    } = req.body;

    const record = await recordRepository.findOne({
      where: {
        id: consultationId,
      }, relations: { patient: true }
    });

    if (!record) {
      return res.status(404).json({
        status: false,
        message: "Consultation not found",
      });
    }

    const newLabs = labRepository.create(labs.map((lab) => ({
      lab,
      notes,
      consultation: record,
    })));

    await labRepository.save(newLabs);

    logger.info({
      type: "Labs request sent",
      userId: req["userId"],
      message: `Labs request sent successfully`,
    });



    let patientText = `Dear ${record.patient.firstName} ${record.patient.lastName},\n\nYou have labs tests requested from your recent consultation. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team`;
    let topic = "Lab Test Requests";

    await processNotification([
      { email: record.patient.email, topic, message: patientText, id: record.patient.id }
    ]);

    return res.status(201).json({
      status: true,
      message: "Lab request sent successfully",
      data: newLabs,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding lab.",
      error: error.message,
    });
  }
};

// get labs for patient across consultations
export const getLabs = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    const consultationId = req.query.consultationId;
    const status = req.query.status;

    const filterOptions = [
      { consultation: { patient: { id: patientId, }, }, },
      consultationId && { consultation: { id: consultationId, }, },
      status && { status: status, },
    ].filter(Boolean);

    const labs = await labRepository.find({
      where: mergeMultiple(filterOptions),
    });

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

export const getPatientLabs = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
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
}

export const deleteLab = async (req: Request, res: Response) => {
  try {
    const labId = req.params.id;

    const lab = await labRepository.findOne({
      where: {
        id: labId,
      },
    });

    if (!lab) {
      return res.status(404).json({
        status: false,
        message: "Lab not found",
      });
    }

    await labRepository.remove(lab);

    return res.status(200).json({
      status: true,
      message: "Lab deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while deleting lab.",
      error: error.message,
    });
  }
}

// Add diagnosis for patient
export const addDiagnosis = async (req: Request, res: Response) => {
  try {
    const { consultationId, diagnosis, code, notes } = req.body;

    const record = await recordRepository.findOne({
      where: {
        id: consultationId,
      },
    });

    if (!record) {
      return res.status(404).json({
        status: false,
        message: "Consultation not found",
      });
    }

    const newDiagnosis = diganosisRepository.create({
      name: diagnosis,
      consultation: record,
      code,
      consultationNotes: notes,
    });

    await diganosisRepository.save(newDiagnosis);

    logger.info({
      type: "Diagnosis added",
      userId: record.doctor.id,
      message: `Diagnosis added successfully`,
    });



    return res.status(201).json({
      status: true,
      message: "Diagnosis added successfully",
      data: record,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding diagnosis.",
      error: error.message,
    });
  }
};

// Add multiple diagnosis for patient
export const addMultipleDiagnosis = async (req: Request, res: Response) => {
  try {
    const { consultationId, diagnoses } = req.body;

    const record = await recordRepository.findOne({
      where: {
        id: consultationId,
      },
    });

    if (!record) {
      return res.status(404).json({
        status: false,
        message: "Consultation not found",
      });
    }

    const newDiagnoses = diagnoses.map((diagnosis) => {
      return {
        name: diagnosis.name,
        consultation: record,
        code: diagnosis.code,
        consultationNotes: diagnosis.notes,
      };
    });

    await diganosisRepository.save(newDiagnoses);

    logger.info({
      type: "Diagnosis added",
      userId: req["userId"],
      message: `Diagnosis added successfully`,
    });



    return res.status(201).json({
      status: true,
      message: "Diagnosis added successfully",
      data: record,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding diagnosis.",
      error: error.message,
    });
  }
};

// Load existing diagnoses(conditions) for patient
export const loadDiagnoses = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;

    const diagnoses = await diagnosisRepository.find({
      where: {
        consultation: {
          patient: {
            id: patientId,
          },
        },
      },
    });

    logger.info({
      type: "Diagnoses retrieved",
      userId: req["userId"],
      message: `Diagnoses retrieved successfully`,
    });

    return res.status(200).json({
      status: true,
      message: "Diagnoses retrieved successfully",
      data: diagnoses,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving diagnoses.",
      error: error.message,
    });
  }
};

export const loadPrescriptions = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;

    const prescriptions = await prescriptionRepository.find({
      where: {
        consultation: {
          patient: {
            id: patientId,
          },
        },
      },
    });

    return res.status(200).json({
      status: true,
      message: "Prescriptions retrieved successfully",
      data: prescriptions,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving prescriptions.",
      error: error.message,
    });
  }
};

export const addMultiplePrescriptions = async (req: Request, res: Response) => {
  try {
    const { consultationId, prescriptions } = req.body;

    const record = await recordRepository.findOne({
      where: {
        id: consultationId,
      },
    });

    if (!record) {
      return res.status(404).json({
        status: false,
        message: "Consultation not found",
      });
    }

    const newPrescriptions = prescriptions.map((prescription) => {
      return {
        medicine: prescription.medicine,
        dosage: prescription.dosage,
        duration: prescription.duration,
        option: prescription.option,
        repeat: prescription.repeat,
        instructions: prescription.instructions,
        additionalInstructions: prescription.additionalInstructions,
        consultation: record,
      };
    });

    await prescriptionRepository.save(newPrescriptions);

    return res.status(201).json({
      status: true,
      message: "Prescriptions added successfully",
      data: newPrescriptions,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding prescriptions.",
      error: error.message,
    });
  }
};

// Add surgery for patient
export const addSurgery = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    const { name, additionalNotes } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients"],
    });

    const patient = doctor.patients.find((patient) => patient.id === patientId);

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    const newSurgery = await surgeryRepository.create({
      name,
      additionalNotes,
    });

    newSurgery.patient = patient;

    await surgeryRepository.save(newSurgery);

    logger.info({
      type: "Surgery added",
      userId: doctor.id,
      message: `Surgery added successfully`,
    });



    return res.status(201).json({
      status: true,
      message: "Surgery added successfully",
      data: newSurgery,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding surgery.",
      error: error.message,
    });
  }
};

// Add symptoms for patient
export const addSymptom = async (req: Request, res: Response) => {
  try {
    const { complaints, symptoms, from, to, medicinesTaken, consultationId } =
      req.body;

    const consultation = await recordRepository.findOne({
      where: {
        id: consultationId,
      },
    });

    if (!consultation) {
      return res.status(404).json({
        status: false,
        message: "Consultation not found",
      });
    }

    const prevSymptoms = await symptomRepository.find({
      where: {
        consultation: { id: consultation.id },
      },
    });

    await symptomRepository.remove(prevSymptoms);

    const newSymptom = symptomRepository.create({
      symptoms,
      duration: {
        from,
        to,
      },
      medicinesTaken,
      consultation,
    });

    consultation.complaints = complaints;
    if (consultation.currentStep < 1) {
      consultation.currentStep = 1;
    }

    await recordRepository.save(consultation);
    await symptomRepository.save(newSymptom);

    return res.status(201).json({
      status: true,
      message: "Symptoms added successfully",
      data: newSymptom,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding symptoms.",
      error: error.message,
    });
  }
};

// Schedule future visit
export const scheduleVisit = async (req: Request, res: Response) => {
  try {
    const consultationId = req.params.id;
    const { type, messageType, message, sendMessageAt } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients"],
    });

    const consultation = await recordRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      return res.status(404).json({
        status: false,
        message: "Consultation not found",
      });
    }

    const newVisit = visitRepository.create({
      type,
      messageType,
      message,
      sendMessageAt,
    });

    newVisit.consultation = consultation;

    await visitRepository.save(newVisit);

    logger.info({
      type: "Visit scheduled",
      userId: doctor.id,
      message: `Visit scheduled successfully`,
    });



    if (doctor.notifications.status === true && doctor.notifications.email === true) {
      let doctorText = `Dear Dr. ${doctor.firstName} ${doctor.lastName},\n\nA visit has been scheduled successfully. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team`;
      let topic = "Visit Scheduled";

      await processNotification([
        { email: doctor.email, topic, message: doctorText, id: doctor.id }
      ]);
    }


    return res.status(201).json({
      status: true,
      message: "Visit scheduled successfully",
      data: newVisit,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while scheduling visit.",
      error: error.message,
    });
  }
};

// Upload front and back images of doctor's ID
export const uploadID = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    if (!req.files) {
      return res.status(400).json({
        status: false,
        message: "Please upload files",
      });
    }

    // upload replaces the old files
    const foldername = `doctors/${doctor.id}`;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const front = await uploadFile({ file: files["front"][0], folderName: foldername, filename: "front" });
    const back = await uploadFile({ file: files["back"][0], folderName: foldername, filename: "back" });

    const updateID = await doctorRepository.update(doctor.id, {
      IDs: {
        front,
        back,
      },
    });

    await doctorRepository.save(doctor);

    return res.status(201).json({
      status: true,
      message: "IDs uploaded successfully",
      data: {
        front,
        back,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while uploading ID.",
      error: error.message,
    });
  }
};

// Upload doctor's profile picture
export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Please upload a file",
      });
    }

    const profilePicture = await uploadFile({ file: req.file, folderName: `doctors/${doctor.id}`, filename: "profile" });

    await doctorRepository.update(doctor.id, {
      profilePicture,
    });

    logger.info({
      type: "Profile picture uploaded",
      userId: doctor.id,
      message: `Profile picture uploaded successfully`,
    });



    return res.status(201).json({
      status: true,
      message: "Profile picture uploaded successfully",
      data: profilePicture,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while uploading profile picture.",
      error: error.message,
    });
  }
};

// Remove profile picture
export const removeProfilePicture = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    await deleteFile(doctor.profilePicture);

    doctor.profilePicture = null;

    await doctorRepository.save(doctor);

    logger.info({
      type: "Profile picture removed",
      userId: doctor.id,
      message: `Profile picture removed successfully`,
    });



    return res.status(200).json({
      status: true,
      message: "Profile picture removed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while removing profile picture.",
      error: error.message,
    });
  }
};

// Add family members for patient
export const addFamilyMember = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    const { firstName, lastName, relation } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients"],
    });

    const patient = doctor.patients.find((patient) => patient.id === patientId);

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    const newFamilyMember = new FamilyMember();
    newFamilyMember.firstName = firstName;
    newFamilyMember.lastName = lastName;
    newFamilyMember.relation = relation;

    await familyMemberRepository.save(newFamilyMember);
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding family member.",
      error: error.message,
    });
  }
};

// Edit gynae for female patient
export const editGynae = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    const {
      contraception,
      additionalInstructions,
      numberOfPregnancies,
      numberOfChildren,
      pregnancyComplications,
    } = req.body;
    req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients"],
    });

    const patient = doctor.patients.find(
      (patient) => patient.id === patientId && patient.gender === "female"
    );

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    const updateGynae = await patientRepository.update(patient.id, {
      gynae: {
        contraception,
        additionalInstructions,
        numberOfPregnancies,
        numberOfChildren,
        pregnancyComplications,
      },
    });

    await patientRepository.save(patient);

    return res.status(201).json({
      status: true,
      message: "Gynae updated successfully",
      data: patient.gynae,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating gynae.",
      error: error.message,
    });
  }
};

// Delete doctor's account
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    doctor.isActive = false;

    await doctorRepository.save(doctor);

    logger.info({
      type: "Account deleted",
      userId: doctor.id,
      message: `Account deleted successfully`,
    });



    if (doctor.notifications.status === true && doctor.notifications.email === true) {
      let text = `Dear Dr. ${doctor.firstName} ${doctor.lastName},\n\nYour account has been deleted successfully. Please contact support for more details.\n\nBest,\nThe Zomujo Team`;
      await processNotification([{ email: doctor.email, topic: "Account Deletion", message: text, id: doctor.id }]);
    }

    return res.status(200).json({
      status: true,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while deleting doctor.",
      error: error.message,
    });
  }
};

// Enable or disable notifications
export const toggleNotifications = async (req: Request, res: Response) => {
  try {
    const { status, email, messages, appointments, records } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    doctor.notifications = {
      status: status || doctor.notifications.status,
      email: email || doctor.notifications.email,
      messages: messages || doctor.notifications.messages,
      appointments: appointments || doctor.notifications.appointments,
      records: records || doctor.notifications.records,
    };

    await doctorRepository.save(doctor);

    return res.status(200).json({
      status: true,
      message: "Notifications updated successfully",
      data: doctor.notifications,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating notifications.",
      error: error.message,
    });
  }
};

// Add payment method
export const addPaymentMethod = async (req: Request, res: Response) => {
  try {
    const { card, mobile } = await paymentMethodSchema.parseAsync(req.body);

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    const paymentMethodData =
      card !== undefined
        ? { ...card, type: "bank" }
        : { ...mobile, type: "mobile_money" };

    const newPaymentMethod = paymentMethodRepository.create({
      ...paymentMethodData,
      doctor,
    });

    await paymentMethodRepository.save(newPaymentMethod);

    logger.info({
      type: "Payment method added",
      userId: doctor.id,
      message: `Payment method added successfully`,
    });



    if (doctor.notifications.status === true && doctor.notifications.email === true) {
      let text = `Dear Dr. ${doctor.firstName} ${doctor.lastName},\n\nYour payment method has been added successfully. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team`
      await processNotification([{ email: doctor.email, topic: "Payment Method Added", message: text, id: doctor.id }]);
    }

    return res.status(201).json({
      status: true,
      message: "Payment method added successfully",
      data: newPaymentMethod,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding payment method.",
      error: error.message,
    });
  }
};

// Set rate for doctor
export const setRate = async (req: Request, res: Response) => {
  try {
    const { amount, lengthOfSession } = req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    doctor.rate = {
      amount,
      lengthOfSession,
    };

    await doctorRepository.save(doctor);

    logger.info({
      type: "Rate set",
      userId: doctor.id,
      message: `Rate set to ${doctor.rate.amount}`,
    });



    return res.status(200).json({
      status: true,
      message: "Rate set successfully",
      data: doctor.rate,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while setting pricing.",
      error: error.message,
    });
  }
};

export const updateDoctorDetails = async (req: Request, res: Response) => {
  try {
    const modifiedDoctor = await updateDoctorSchema.parseAsync(req.body);

    let doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    function updateProperties(source, target) {
      for (let key in source) {
        if (typeof source[key] === "object" && source[key] !== null) {
          if (Array.isArray(source[key])) {
            target[key] = source[key];
          } else {
            if (!target[key]) {
              target[key] = {};
            }
            updateProperties(source[key], target[key]);
          }
        } else {
          target[key] = source[key];
        }
      }
    }

    updateProperties(modifiedDoctor, doctor);

    await doctorRepository.save(doctor);

    return res.status(200).json({
      status: true,
      message: "Doctor updated successfully",
      data: doctor,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating doctor.",
      error: error.message,
    });
  }
};

// Update doctor's profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, contact, bio, MDCRegistration, languages } =
      req.body;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    const updateProfile = await doctorRepository.update(doctor.id, {
      firstName,
      lastName,
      contact,
      bio,
      MDCRegistration,
      languages,
    });

    await doctorRepository.save(doctor);

    logger.info({
      type: "Doctor profile updated",
      userId: doctor.id,
      message: `Profile updated successfully`,
    });



    return res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: doctor,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating profile.",
      error: error.message,
    });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const doctor = await doctorRepository.findOne({
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
      doctor.password
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

    doctor.password = hashedPassword;

    await doctorRepository.save(doctor);

    logger.info({
      type: "Password reset",
      userId: doctor.id,
      message: "Password reset successful",
    });



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


export const getPatientRecords = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;

    const recordRequest = await requestRepository.findOne({
      where: {
        doctor: {
          id: req["userId"],
        },
        patient: {
          id: patientId,
        },
      },
    });

    if (!recordRequest) {
      return res.status(404).json({
        status: false,
        message: "You do not have permission to perform this action",
      });
    }

    if (!recordRequest.approved) {
      return res.status(404).json({
        status: false,
        message: "You do not have permission to perform this action",
      });
    }

    const patient = await patientRepository.findOne({
      where: {
        id: patientId,
      },
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

    const appointment = await appointmentRepository.findOne({
      where: {
        patient: {
          id: patientId,
        },
        doctor: {
          id: req["userId"],
        },
        status: "accepted",
      },
      order: {
        createdAt: "DESC",
      },
    });

    if (appointment !== null) {
      patient["nearestAppointment"] = {
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        date: appointment.appointmentDate,
      };
    } else {
      patient["nearestAppointment"] = null;
    }

    delete patient.password;
    delete patient.createdAt;
    delete patient.updatedAt;

    return res.status(200).send({
      status: true,
      message: "Patient found",
      data: patient,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const patchPatientRecords = async (req: Request, res: Response) => {
  try {
    const recordRequest = await requestRepository.findOne({
      where: {
        doctor: {
          id: req["userId"],
        },
        patient: {
          id: req.params.id,
        },
      },
    });

    if (!recordRequest) {
      return res.status(404).json({
        status: false,
        message: "You do not have permission to perform this action",
      });
    }

    if (!recordRequest.approved) {
      return res.status(404).json({
        status: false,
        message: "You do not have permission to perform this action",
      });
    }

    const modifiedPatient = await updatePatientSchema.parseAsync(req.body);
    let patient = await patientRepository.findOne({
      where: { id: req.params.id },
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
};

export const addFutureVisit = async (req: Request, res: Response) => {
  try {
    const { consultationId, type, message, sendMessageAt } = req.body;

    const consultation = await recordRepository.findOne({
      where: {
        id: consultationId,
      },
    });

    if (!consultation) {
      return res.status(404).json({
        status: false,
        message: "Consultation not found",
      });
    }

    const visit = visitRepository.create({
      type,
      message,
      sendMessageAt,
      consultation,
    });

    await visitRepository.save(visit);

    let doctorText = `Dear Dr. ${consultation.doctor.firstName} ${consultation.doctor.lastName},\n\nA future visit has been scheduled successfully. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team`;
    let patientText = `Dear ${consultation.patient.firstName} ${consultation.patient.lastName},\n\nA future visit has been scheduled successfully. Please check your dashboard for more details.\n\nBest,\nThe Zomujo Team`;
    let topic = "Future Visit Scheduled";
    await processNotification([
      { email: consultation.doctor.email, topic, message: doctorText, id: consultation.doctor.id },
      { email: consultation.patient.email, topic, message: patientText, id: consultation.patient.id }
    ]);

    return res.status(201).json({
      status: true,
      message: "Future visit added successfully",
      data: visit,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding future visit.",
      error: error.message,
    });
  }
};

export const fetchConsultationMessages = async (
  req: Request,
  res: Response
) => {
  try {
    const patientId = req.params.id;
    const doctorId = req["userId"];

    const messages = await messagesRepository.find({
      where: [
        { receiverId: doctorId, senderId: patientId },
        { receiverId: patientId, senderId: doctorId },
      ],
      order: {
        createdAt: "ASC",
      },
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

export const fetchRecentChats = async (req: Request, res: Response) => {
  try {
    const peopleQuery: { receiverId: string }[] = await messagesRepository
      .createQueryBuilder("messages")
      .select(["receiverId"])
      .where("senderId = :id", { id: req["userId"] })
      .distinct()
      .take(2)
      .getRawMany();

    const users = await patientRepository.find({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
      },
      where: {
        id: In(peopleQuery.map((item) => item.receiverId)),
      },
      take: 2,
    });

    return res.status(200).json({
      status: true,
      message: "recent Chats",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred fetching messages",
      error: error.message,
    });
  }
};
// Recent Payments
export const recentPayments = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
      relations: ["patients"],
    });

    let payments;

    if (limit) {
      payments = await transactionRepository.find({
        where: {
          doctor: {
            id: doctor.id,
          },
        },
        order: {
          createdAt: "DESC",
        },
        take: +limit,
      });
    } else {
      payments = await transactionRepository.find({
        where: {
          doctor: {
            id: doctor.id,
          },
        },
        order: {
          createdAt: "DESC",
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: "Payments retrieved successfully",
      data: payments,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving payments.",
      error: error.message,
    });
  }
};

// Cancel a scheduled appointment
export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found.",
      });
    }

    const appointment = await appointmentRepository.findOne({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return res.status(404).json({
        status: false,
        message: "Appointment not found.",
      });
    }

    const cancelledAppointment = await appointmentRepository.update(
      appointmentId,
      {
        status: "cancelled",
      }
    );

    logger.info({
      type: "Appointment cancelled",
      userId: doctor.id,
      message: `Doctor ${doctor.firstName} ${doctor.lastName} cancelled their appointment successfully`,
    });



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

export const getPatientConsultationNotes = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    const { limit, page } = paginationQueryParams.parse(req.query);

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found.",
      });
    }

    const totalConsultations = await recordRepository.count({
      where: {
        patient: {
          id: patientId,
        },
      },
    });

    const consultations = await recordRepository.find({
      where: {
        patient: {
          id: patientId,
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
      message: "An error occurred while retrieving consultation notes.",
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
        scope: In(["ALL", "DOCTOR"]),
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

export const getSymptoms = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { type, sort } = appointmentRequestParams.parse(req.query);

    const filterOptions: any[] = [
      type && { type: In(type.split(".")) },
    ].filter(Boolean);

    const searchQuery: FindOptionsWhere<Symptoms>[] = search.split(" ").flatMap((item) => [
      { name: ILike(`%${item}%`) },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const symptomsCount = await symptomsRepository.count();

    const symptoms = await symptomsRepository.find({
      take: limit === -1 ? undefined : limit,
      skip: (page - 1) * limit,
      order: symptomsSort(sort),
      where: searchOptions,
    });

    return res.status(200).json({
      status: true,
      message: "symptoms retrieved successfully",
      data: symptoms,
      page: page,
      total: symptomsCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving symptoms.",
      error: error.message,
    });
  }
}

export const getMedicines = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { sort } = appointmentRequestParams.parse(req.query);

    const filterOptions: any[] = [].filter(Boolean);

    const searchQuery: FindOptionsWhere<Medicine>[] = search.split(" ").flatMap((item) => [
      { name: ILike(`%${item}%`) },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const medicinesCount = await medicineRepository.count();

    const medicines = await medicineRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      order: symptomsSort(sort),
      where: searchOptions,
    });

    return res.status(200).json({
      status: true,
      message: "medicines retrieved successfully",
      data: medicines,
      page: page,
      total: medicinesCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving medicines.",
      error: error.message,
    });
  }
}


export const getIcds = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { sort } = appointmentRequestParams.parse(req.query);

    const filterOptions: any[] = [].filter(Boolean);

    const searchQuery: FindOptionsWhere<Icds>[] = search.split(" ").flatMap((item) => [
      { name: ILike(`%${item}%`) },
      { code: ILike(`%${item}%`) },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const icdsCount = await icdsRepository.count();

    const icds = await icdsRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      order: createSortOrder(sort, { name: "name", code: "code" }, { field: "name", order: "ASC" }),
      where: searchOptions,
    });

    return res.status(200).json({
      status: true,
      message: "symptoms retrieved successfully",
      data: icds,
      page: page,
      total: icdsCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving icds.",
      error: error.message,
    });
  }
}

export const generatePrescription = async (req: Request, res: Response) => {
  try {
    const consultationId = req.params.consultationId;

    console.log("conslation id" + consultationId);

    const consultation = await recordRepository.findOne({
      where: {
        id: consultationId,
      },
      relations: {
        doctor: true,
        patient: true,
        prescriptions: true
      }
    });

    if (!consultation) {
      return res.status(404).json({
        status: false,
        message: "Consultation not found",
      });
    }
    const { patient, doctor, prescriptions } = consultation;
    if (consultation.doctor.signaturePath === null) {
      return res.status(400).json({
        status: false,
        message: "Doctor must have a signature uploaded"
      });
    } else if (prescriptions.length == 0) {
      return res.status(400).json({
        status: false,
        message: "Prescriptions is empty"
      });
    }
    console.log("check passed");

    const downloadUrl = await generatePrescriptionPDF({
      doctor: doctor,
      patient: patient,
      prescriptions: prescriptions,
    });

    logger.info({
      type: "Prescription generated",
      userId: doctor.id,
      message: `Prescription generated successfully`,
    });



    consultation.prescriptionUrl = downloadUrl;

    await recordRepository.save(consultation);

    await processNotification([
      { email: doctor.email, topic: "Prescription Generated", message: `Prescription generated successfully. Download url: ${downloadUrl}`, id: doctor.id },
      { email: patient.email, topic: "Prescription Generated", message: `Prescription generated successfully. Download url: ${downloadUrl}`, id: patient.id }
    ]);

    return res.status(201).json({
      status: true,
      message: "Prescription generated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while generating prescription.",
      error: error.message,
    });
  }
}

export const uploadSignature = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Please upload a file",
      });
    }
    const doctorId = req["userId"];
    const doctor = await doctorRepository.findOne({
      where: { id: doctorId }
    });

    const signature = await uploadFile({ file: req.file, folderName: `doctors/${doctor.id}`, filename: "signature" });

    doctor.signaturePath = signature;

    await doctorRepository.save(doctor);

    return res.status(201).json({
      status: true,
      message: "Signature uploaded successfully",
      data: signature,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while uploading signature.",
      error: error.message,
    });
  }
}

export const checkSignature = async (req: Request, res: Response) => {
  try {
    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    return res.status(200).json({
      status: doctor.signaturePath === null,
      message: "Doctor has a signature uploaded"
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while checking signature.",
      error: error.message,
    });
  }
}

export const postFeedback = async (req: Request, res: Response) => {
  try {
    const { type, comment } = await FeedbackSchema.parseAsync(req.body);

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found.",
      });
    }

    const feedback = feedbackRepository.create({
      type,
      comment,
      doctor,
      userType: "doctor",
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

    const doctor = await doctorRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found.",
      });
    }

    const issue = issuesRepository.create({
      name,
      description,
      doctor,
      userType: "doctor",
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

export const populateDoctors = async (req: Request, res: Response) => {
  try {
    DOCTORS_DATA.forEach(async (doctor) => {
      const newDoctor = doctorRepository.create({
        ...doctor,
        password: await bcryptjs.hash("zmr1234", 10),
      });
      await doctorRepository.save(newDoctor);
    });

    return res.status(200).json({
      status: true,
      message: "Doctors retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving doctors.",
      error: error.message,
    });
  }
};

function generateRandomAppointmentSlots() {
  const slots = [];
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
    const availableHours = [8, 9, 10, 11, 12, 13, 14, 15, 16];
    
    // Randomly remove one slot
    const randomRemoveIndex = Math.floor(Math.random() * availableHours.length);
    availableHours.splice(randomRemoveIndex, 1);

    while (availableHours.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableHours.length);
      const startHour = availableHours[randomIndex];
      
      const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, 0, 0);
      const endTime = new Date(startTime.getTime() + 1 * 60 * 60 * 1000); // 1 hour later

      slots.push({
        date: new Date(date),
        startTime,
        endTime,
        type: 'virtual' // You can customize this as needed
      });

      // Remove the used hour from availableHours
      availableHours.splice(randomIndex, 1);
    }
  }

  return slots;
}

export const generateSlots = async (req: Request, res: Response) => {
  try {
    const doctors = await doctorRepository.find({
      where: {
        id: Not(In(["e2559a17-2441-409b-bf74-12687719d457"]))
      }
    });

    doctors.forEach(async (doctor) => {
      const slots = generateRandomAppointmentSlots();

      const aslots = slots.map((slot) => {
        const appointmentSlot = new AppointmentSlot();
        appointmentSlot.date = slot.date;
        appointmentSlot.startTime = slot.startTime;
        appointmentSlot.endTime = slot.endTime;
        appointmentSlot.type = slot.type;
        appointmentSlot.doctor = doctor;
        return appointmentSlot;
      });
      await appointmentSlotRepository.save(aslots);

      doctor.appointmentSlots = aslots;
      await doctorRepository.save(doctor);
    });


    return res.status(200).json({
      status: true,
      message: "Slots generated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while generating slots.",
      error: error.message,
    });
  }
};