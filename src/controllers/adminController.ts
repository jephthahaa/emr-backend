import { Request, Response } from "express";
import { dataSource } from "../data-source";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../middleware/auth";
import { Admin } from "../models/admin";
import bcryptjs from "bcryptjs";
import { Patient } from "../models/patient";
import { Doctor } from "../models/doctor";
import { Appointment } from "../models/appointment";

import { Transactions } from "../models/transaction";
import { AppointmentRequest } from "../models/appointment-request";
import {
  appointmentRequestParams,
  doctorPatientsParams, IcdsSchema, issuesFeedbackParams,
  MedicineSchema,
  paginationQueryParams,
  SymptomsSchema
} from "../schema";
import { FindOptionsWhere, ILike, In } from "typeorm";
import { Record } from "../models/record";
import { Broadcast } from "../models/broadcast";
import {
  appointmentSort,
  consultFilter,
  createSortOrder,
  doctorSort,
  mergeMultiple,
  patientSort,
  symptomsSort,
  transactionsSort
} from "../utils";
import { deleteFile, uploadFile } from "./upload.controller";
import { Symptoms } from "../models/sympoms";
import { MEDICINES_DATA, SYMPTOMS_DATA } from "../constants";
import { Medicine } from "../models/medicine";
import { Icds } from "../models/icds";
import { GlobalInfo } from "../models/global-info";
import { Logger, LogProps } from "../logger";
import { Feedbacks } from "../models/feedbacks";
import { Issues } from "../models/issues";
const adminRepository = dataSource.getRepository(Admin);
const patientRepository = dataSource.getRepository(Patient);
const doctorRepository = dataSource.getRepository(Doctor);
const appointmentRepository = dataSource.getRepository(Appointment);
const appointmentRequestRepository = dataSource.getRepository(AppointmentRequest);
const transactionRepository = dataSource.getRepository(Transactions);
const recordRepository = dataSource.getRepository(Record);
const broadcastRepository = dataSource.getRepository(Broadcast);
const symptomsRepository = dataSource.getRepository(Symptoms);
const medicineRepository = dataSource.getRepository(Medicine);
const icdsRepository = dataSource.getRepository(Icds);
const globalInfoRepository = dataSource.getRepository(GlobalInfo);
import * as fs from 'fs';
import * as readline from 'readline';

const logger = new Logger("AdminController");
const feedbackRepository = dataSource.getRepository(Feedbacks);
const issuesRepository = dataSource.getRepository(Issues);

// Register an admin
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    const adminExists = await adminRepository.findOne({
      where: { email },
    });

    if (adminExists) {
      return res.status(400).json({
        status: false,
        message: "Admin already exists",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: false,
        message: "Passwords do not match",
      });
    }

    const admin = adminRepository.create({
      name,
      email,
      password: await bcryptjs.hash(password, 10),
    });

    await adminRepository.save(admin);

    logger.info({
      type: "Admin registered",
      userId: admin.id,
      message: `Admin ${admin.name} has been registered successfully`,
    });

    delete admin.password;
    delete admin.broadcasts;
    delete admin.notifications;

    return res.status(201).json({
      status: true,
      message: "Admin registered successfully",
      admin,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "An error occurred while registering admin.",
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

    const admin = await adminRepository.findOne({
      where: {
        email,
      },
    });

    if (!admin) {
      return res.status(404).json({
        status: false,
        message: "admin not found.",
      });
    }
    const isPasswordCorrect = await bcryptjs.compare(password, admin.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: false,
        message: "Incorrect password.",
      });
    }

    const accessToken = generateAccessToken(admin.id);
    const refreshToken = generateRefreshToken(admin.id);

    console.log("token");
    res.clearCookie("refreshToken");
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/refresh-token",
    });

    return res.status(200).json({
      status: true,
      message: "Login successful",
      accessToken,
      name: admin.name,
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

// Reset admin password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const admin = await adminRepository.findOne({
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
      admin.password
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

    admin.password = hashedPassword;

    await adminRepository.save(admin);

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

    const admin = await adminRepository.findOne({
      where: { id: decoded["userId"] },
    });

    if (!admin) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const accessToken = generateAccessToken(admin.id);
    const newRefreshToken = generateRefreshToken(admin.id);

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

// Broadcast an announcement to all users
export const broadcast = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        status: false,
        message: "Please provide a message to broadcast.",
      });
    }

    // Broadcast message to all users

    return res.status(200).json({
      status: true,
      message: "Broadcast successful",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while broadcasting message.",
      error: error.message,
    });
  }
};

// Get daily active users
export const getDailyActiveUsers = async (req: Request, res: Response) => {
  try {
    const fileStream = fs.createReadStream("logs/infos.log");
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const dailyActiveUsersMap: { [key: string]: number } = {};
    for await (const line of rl) {
      try {
        if (line.includes("logged")) {
          const logEntry: LogProps = JSON.parse(line);
          const date = new Date(logEntry.timestamp).toISOString().split('T')[0];
          if (!dailyActiveUsersMap[date]) {
            dailyActiveUsersMap[date] = 0
          }
          dailyActiveUsersMap[date]++;
        }
      } catch (error) {
        console.error("Failed to parse log entry", line);
      }
    }

    
    return res.status(200).json({
      status: true,
      message: "Daily active users retrieved successfully",
      data: dailyActiveUsersMap
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving daily active users.",
      error: error.message,
    });
  }
};

// Get daily new users
export const getDailyNewUsers = async (req: Request, res: Response) => {
  try {

    const fileStream = fs.createReadStream("logs/infos.log");
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    const dailyNewUsersMap: { [key: string]: number } = {};

    for await (const line of rl) {
      if (line.includes("registered")) {
        const logEntry: LogProps = JSON.parse(line);
        const date = new Date(logEntry.timestamp).toISOString().split('T')[0];
        if (!dailyNewUsersMap[date]) {
          dailyNewUsersMap[date] = 0
        }
        dailyNewUsersMap[date]++;
      }
    }

    return res.status(200).json({
      status: true,
      message: "Daily new users retrieved successfully",
      data: dailyNewUsersMap,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving daily new users.",
      error: error.message,
    });
  }
};

// Get monthly new users
export const getMonthlyNewUsers = async (req: Request, res: Response) => {
  try {
    const fileStream = fs.createReadStream("logs/infos.log");
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    // Get monthly new users
    const monthlyNewUsersMap: { [key: string]: number } = {};
    for await (const line of rl) {
      if (line.includes("registered")) {
        const logEntry: LogProps = JSON.parse(line);
        const date = new Date(logEntry.timestamp).toISOString().split('T')[0];
        const month = date.split('-')[1];
        if (!monthlyNewUsersMap[month]) {
          monthlyNewUsersMap[month] = 0
        }
        monthlyNewUsersMap[month]++;
      }
    }


    return res.status(200).json({
      status: true,
      message: "Monthly new users retrieved successfully",
      data: monthlyNewUsersMap,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving monthly new users.",
      error: error.message,
    });
  }
};

// Get total users
export const getTotalUsers = async (req: Request, res: Response) => {
  try {
    // Get total users
    const patientsCount = await patientRepository.count();

    const doctorsCount = await doctorRepository.count();

    const totalUsers = patientsCount + doctorsCount;

    return res.status(200).json({
      status: true,
      message: "Total users retrieved successfully",
      data: totalUsers,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total users.",
      error: error.message,
    });
  }
};

// Get total doctors
export const getTotalDoctors = async (req: Request, res: Response) => {
  try {
    // Get total doctors
    const doctorsCount = await doctorRepository.count({});

    return res.status(200).json({
      status: true,
      message: "Total doctors retrieved successfully",
      data: doctorsCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total doctors.",
      error: error.message,
    });
  }
};

// Get total patients
export const getTotalPatients = async (req: Request, res: Response) => {
  try {
    // Get total patients
    const patientsCount = await patientRepository.count();

    return res.status(200).json({
      status: true,
      message: "Total patients retrieved successfully",
      data: patientsCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total patients.",
      error: error.message,
    });
  }
};

// Get removed users
export const getRemovedUsers = async (req: Request, res: Response) => {
  try {
    // Get removed users
    const removedPatients = await patientRepository.count({
      where: {
        isActive: false,
      },
    });

    const removedDoctors = await doctorRepository.count({
      where: {
        isActive: false,
      },
    });

    const removedUsers = removedPatients + removedDoctors;

    return res.status(200).json({
      status: true,
      message: "Removed users retrieved successfully",
      data: removedUsers,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving removed users.",
      error: error.message,
    });
  }
};

// Get pending users
export const getPendingUsers = async (req: Request, res: Response) => {
  try {
    // Get pending users
    const pendingUsers = await doctorRepository.count({
      where: {
        verification_status: "unverified",
      },
    });

    return res.status(200).json({
      status: true,
      message: "Pending users retrieved successfully",
      data: pendingUsers,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving pending users.",
      error: error.message,
    });
  }
};

// Get total appointments
export const getTotalAppointments = async (req: Request, res: Response) => {
  try {
    // Get total appointments
    const totalAppointments = await appointmentRepository.count();

    const totalAppointmentsForGraph: {
      "date": Date,
      "count": number
    }[] = await appointmentRepository
      .createQueryBuilder("appointments")
      .select("DATE(appointments.createdAt) AS date")
      .addSelect("COUNT(*) AS count")
      .groupBy("DATE(appointments.createdAt)")
      .getRawMany();

    return res.status(200).json({
      status: true,
      message: "Total appointments retrieved successfully",
      data: {
        total: totalAppointments,
        appointments: totalAppointmentsForGraph
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total appointments.",
      error: error.message,
    });
  }
};

// Get total declined appointments
export const getDeclinedAppointments = async (req: Request, res: Response) => {
  try {
    // Get total declined appointments
    const declinedAppointments = await appointmentRequestRepository.count({
      where: {
        status: "declined",
      },
    });

    return res.status(200).json({
      status: true,
      message: "Declined appointments retrieved successfully",
      data: declinedAppointments,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving declined appointments.",
      error: error.message,
    });
  }
};

// Get total pending appointments
export const getPendingAppointments = async (req: Request, res: Response) => {
  try {
    // Get total pending appointments
    const pendingAppointments = await appointmentRequestRepository.count({
      where: {
        status: "pending",
      },
    });

    return res.status(200).json({
      status: true,
      message: "Pending appointments retrieved successfully",
      data: pendingAppointments,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving pending appointments.",
      error: error.message,
    });
  }
};

// Get all appointments
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { type, status, sort } = appointmentRequestParams.parse(req.query);

    const filterOptions: any[] = [
      type && { type: In(type.split(".")) },
      status && { status: In(status.split(".")) },
    ].filter(Boolean);

    const searchQuery: FindOptionsWhere<Appointment>[] = search.split(" ").flatMap((item) => [
      { patient: { firstName: ILike(`%${item}%`) } },
      { patient: { lastName: ILike(`%${item}%`) } },
      { doctor: { firstName: ILike(`%${item}%`) } },
      { doctor: { lastName: ILike(`%${item}%`) } },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const appointmentCount = await appointmentRepository.count({ where: searchOptions });

    const appointments = await appointmentRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: searchOptions,
      order: appointmentSort(sort),
      relations: { patient: true, doctor: true }
    });

    return res.status(200).json({
      status: true,
      message: "Appointments retrieved successfully",
      data: appointments.map((appointment) => ({
        id: appointment.id,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        reason: appointment.reason,
        notes: appointment.notes,
        status: appointment.status,
        type: appointment.type,
        patient: {
          id: appointment.patient.id,
          firstName: appointment.patient.firstName,
          lastName: appointment.patient.lastName,
        },
        doctor: {
          id: appointment.doctor.id,
          firstName: appointment.doctor.firstName,
          lastName: appointment.doctor.lastName,
        }
      })),
      page: page,
      total: appointmentCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving appointments.",
      error: error.message,
    });
  }
};

// Get total patients
export const getPatients = async (req: Request, res: Response) => {
  try {
    // Get total patients
    const patientsCount = await patientRepository.count();

    return res.status(200).json({
      status: true,
      message: "Total patients retrieved successfully",
      data: patientsCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total patients.",
      error: error.message,
    });
  }
};

// Get total active patients
export const getActivePatients = async (req: Request, res: Response) => {
  try {
    // Get total active patients
    const activePatients = await patientRepository.count({
      where: {
        isActive: true,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Total active patients retrieved successfully",
      data: activePatients,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total active patients.",
      error: error.message,
    });
  }
};

// Get total deleted patients
export const getDeletedPatients = async (req: Request, res: Response) => {
  try {
    // Get total deleted patients
    const deletedPatients = await patientRepository.count({
      where: {
        isActive: false,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Total deleted patients retrieved successfully",
      data: deletedPatients,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total deleted patients.",
      error: error.message,
    });
  }
};

// Get all patients
export const getAllPatients = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { sort, gender, consult } = doctorPatientsParams.parse(req.query);

    const filterOptions: any[] = [
      gender && { gender: gender },
    ].filter(Boolean);

    const searchQuery = search.split(" ").flatMap((item) => [
      { firstName: ILike(`%${item}%`) },
      { lastName: ILike(`%${item}%`) }
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const [patients, totalPatients] = await patientRepository.findAndCount({
      where: searchOptions,
    });

    for (const patient of patients) {
      const consultation = await recordRepository.findOne({
        where: {
          patient: { id: patient.id, },
        },
        order: { createdAt: "DESC", },
      });

      patient["recentConsultDate"] = consultation ? consultation.createdAt : null;
    }

    const filterdPatients = patients.filter(consultFilter(consult)).sort(patientSort(sort)).slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      status: true,
      message: "All patients retrieved successfully",
      data: filterdPatients,
      page: page,
      total: totalPatients,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving all patients.",
      error: error.message,
    });
  }
};

// View a patient
export const viewPatient = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;

    const patient = await patientRepository.findOne({
      where: { id: patientId },
    });

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

// Get total active doctors
export const getActiveDoctors = async (req: Request, res: Response) => {
  try {
    // Get total active doctors
    const activeDoctors = await doctorRepository.count({
      where: {
        isActive: true,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Total active doctors retrieved successfully",
      data: activeDoctors,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total active doctors.",
      error: error.message,
    });
  }
};

// Get total pending doctors
export const getPendingDoctors = async (req: Request, res: Response) => {
  try {
    // Get total pending doctors
    const pendingDoctors = await doctorRepository.count({
      where: {
        verification_status: "unverified",
      },
    });

    return res.status(200).json({
      status: true,
      message: "Total pending doctors retrieved successfully",
      data: pendingDoctors,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total pending doctors.",
      error: error.message,
    });
  }
};

// Get all doctors
export const getAllDoctors = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { status, sort } = appointmentRequestParams.parse(req.query);
    const { consult } = doctorPatientsParams.parse(req.query);

    const filterOptions: any[] = [
      status && { verification_status: status },
    ].filter(Boolean);

    const searchQuery = search.split(" ").flatMap((item) => [
      { firstName: ILike(`%${item}%`) },
      { lastName: ILike(`%${item}%`) }
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const totalDoctors = await doctorRepository.count({ where: searchOptions });

    const doctors = await doctorRepository.find({
      where: searchOptions,
    });

    for (const doctor of doctors) {
      const consultation = await recordRepository.findOne({
        where: {
          doctor: { id: doctor.id, },
        },
        order: { createdAt: "DESC", }
      });

      doctor["recentConsultDate"] = consultation !== null ? consultation.createdAt : null;
    }

    const filterdDoctor = doctors.filter(consultFilter(consult)).sort(doctorSort(sort)).slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      status: true,
      message: "All doctors retrieved successfully",
      data: filterdDoctor,
      page: page,
      total: totalDoctors,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving all doctors.",
      error: error.message,
    });
  }
};

// View a doctor
export const viewDoctor = async (req: Request, res: Response) => {
  try {
    const doctorId = req.params.id;

    const doctor = await doctorRepository.findOne({
      where: { id: doctorId },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Doctor retrieved successfully",
      data: doctor,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving doctor.",
      error: error.message,
    });
  }
};

export const viewDoctorLogs = async (req: Request, res: Response) => {
  try {
    const doctorId = req.params.id;
    const { limit, page, search } = paginationQueryParams.parse(req.query);

    const doctor = await doctorRepository.findOne({
      where: { id: doctorId },
    });

    if (!doctor) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    const fileStream = fs.createReadStream("logs/infos.log");
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const doctorLogs: LogProps[] = [];
    for await (const line of rl) {
      try {
        if (line.includes(doctorId)) {
          doctorLogs.push(JSON.parse(line));
        }
      } catch (error) {
        console.error("Failed to parse log entry", line);
      }
    }

    // apply the search query
    const searchQuery = search.split(" ").flatMap((item) => [
      { message: ILike(`%${item}%`) },
    ]);
    // use search on dockroLogs
    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([query])) :
      mergeMultiple([]);
    
    // apply the search query
    const filteredDoctorLogs = doctorLogs.filter((log) => {
      return searchOptions.every((option) => {
        return Object.entries(option).every(([key, value]) => {
          return log[key].toLowerCase().includes(String(value).toLowerCase());
        });
      });
    });
    const recentActivity = filteredDoctorLogs.slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      status: true,
      message: "Doctor logs retrieved successfully",
      data: recentActivity,
      page: page,
      total: doctorLogs.length,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving doctor logs.",
      error: error.message,
    });
  }

}

// Enable email notifications
export const enableEmailNotifications = async (req: Request, res: Response) => {
  try {
    // Enable email notifications

    return res.status(200).json({
      status: true,
      message: "Email notifications enabled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while enabling email notifications.",
      error: error.message,
    });
  }
};

// Verify doctor
export const verifyDoctor = async (req: Request, res: Response) => {
  try {

    const verifyDcotor = await doctorRepository.update(req.params.id, {
      verification_status: "verified",
    });

    return res.status(200).json({
      status: true,
      message: "Doctor verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while verifying doctor.",
      error: error.message,
    });
  }
};

// Decline doctor verification
export const declineDoctorVerification = async (
  req: Request,
  res: Response
) => {
  try {
    // Decline doctor verification
    const declineDoctorVerification = await doctorRepository.update(
      req.params.id,
      {
        verification_status: "unverified",
      }
    );

    return res.status(200).json({
      status: true,
      message: "Doctor verification declined successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while declining doctor verification.",
      error: error.message,
    });
  }
};

// Upload profile picture
export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    const admin = await adminRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Please upload a profile picture.",
      });
    }

    // replace old profile pic
    const profileUrl = await uploadFile({ file: req.file, folderName: `admins/${admin.id}`, filename: "profile" });

    admin.profilePicture = profileUrl;

    await adminRepository.save(admin);

    return res.status(200).json({
      status: true,
      message: "Profile picture uploaded successfully",
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
    const admin = await adminRepository.findOne({
      where: { id: req["userId"] },
    });

    await deleteFile(admin.profilePicture);

    admin.profilePicture = null;

    await adminRepository.save(admin);

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

// Update name
export const updateName = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    const admin = await adminRepository.findOne({
      where: { id: req["userId"] },
    });

    if (!req.body.name) {
      return res.status(400).json({
        status: false,
        message: "Please provide a name.",
      });
    }

    admin.name = name;

    await adminRepository.save(admin);

    return res.status(200).json({
      status: true,
      message: "Name updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating name.",
      error: error.message,
    });
  }
};

// Toggle notifications
export const toggleNotifications = async (req: Request, res: Response) => {
  try {
    const { status, messages, appointments } = req.body;

    const admin = await adminRepository.findOne({
      where: { id: req["userId"] },
    });

    admin.notifications = {
      status,
      email: false,
      messages,
      appointments,
      records: false,
    };

    await adminRepository.save(admin);

    return res.status(200).json({
      status: true,
      message: "Notifications updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating notifications.",
      error: error.message,
    });
  }
};

// View patient activities
export const viewPatientActivities = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit, page, search } = paginationQueryParams.parse(req.query);

    const patient = await patientRepository.findOne({
      where: { id },
    });

    if (!patient) {
      return res.status(404).json({
        status: false,
        message: "Patient not found",
      });
    }

    // const recentActivityTotal = await logRepository.count({
    //   where: {
    //     userId: id,
    //   },
    // });
    const fileStream = fs.createReadStream("logs/infos.log");
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const patientLogs: LogProps[] = [];
    for await (const line of rl) {
      try {
        if (line.includes(id)) {
          patientLogs.push(JSON.parse(line));
        }
      } catch (error) {
        console.error("Failed to parse log entry", line);
      }
    }

    // apply search to patientLogs
    const filteredPatientLogs = patientLogs.filter((log) => {
      return log.message.toLowerCase().includes(search.toLowerCase());
    });

    const recentActivity = filteredPatientLogs.slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      status: true,
      message: "Patient activities retrieved successfully",
      data: recentActivity,
      page: page,
      total: patientLogs.length,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving patient activities.",
      error: error.message,
    });
  }
};

// View all transactions
export const viewTransactions = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { type, status, sort } = appointmentRequestParams.parse(req.query);

    const filterOptions: any[] = [
      // type && { type: In(type.split(".")) },
      // status && { status: In(status.split(".")) },
    ].filter(Boolean);

    const searchQuery: FindOptionsWhere<Appointment>[] = search.split(" ").flatMap((item) => [
      { patient: { firstName: ILike(`%${item}%`) } },
      { patient: { lastName: ILike(`%${item}%`) } },
      { doctor: { firstName: ILike(`%${item}%`) } },
      { doctor: { lastName: ILike(`%${item}%`) } },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const transactionCount = await transactionRepository.count({
      where: searchOptions,
    });

    const transactions = await transactionRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: searchOptions,
      order: transactionsSort(sort),
      relations: { patient: true, doctor: true },
    });

    return res.status(200).json({
      status: true,
      message: "Transactions retrieved successfully",
      data: transactions.map((transaction) => ({
        ...transaction,
        doctor: {
          id: transaction.doctor.id,
          firstName: transaction.doctor.firstName,
          lastName: transaction.doctor.lastName,
          profilePicture: transaction.doctor.profilePicture
        },
        patient: {
          id: transaction.patient.id,
          firstName: transaction.patient.firstName,
          lastName: transaction.patient.lastName,
          profilePicture: transaction.patient.profilePicture
        }
      })),
      page: page,
      total: transactionCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving transactions.",
      error: error.message,
    });
  }
};

// Get total amount
export const getTotalAmount = async (req: Request, res: Response) => {
  try {
    const transactions = await transactionRepository.find();

    let paymentSum = 0;
    let withdrawalSum = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === "payment") {
        paymentSum += transaction.amount;
      } else {
        withdrawalSum += transaction.amount;
      }
    });

    return res.status(200).json({
      status: true,
      message: "Total amount retrieved successfully",
      data: paymentSum - withdrawalSum,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving total amount.",
      error: error.message,
    });
  }
};

// View a transaction
export const viewTransaction = async (req: Request, res: Response) => {
  try {
    const transactionId = req.params.id;

    const transaction = await transactionRepository.findOne({
      where: { id: transactionId },
      relations: { patient: true, doctor: true },
    });

    if (!transaction) {
      return res.status(404).json({
        status: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Transaction retrieved successfully",
      data: {
        ...transaction,
        doctor: {
          id: transaction.doctor.id,
          firstName: transaction.doctor.firstName,
          lastName: transaction.doctor.lastName,
          profilePicture: transaction.doctor.profilePicture
        },
        patient: {
          id: transaction.patient.id,
          firstName: transaction.patient.firstName,
          lastName: transaction.patient.lastName,
          profilePicture: transaction.patient.profilePicture
        }
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving transaction.",
      error: error.message,
    });
  }
};

// Get recent transactions
export const getRecentTransactions = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);

    const transactionCount = await transactionRepository.count();

    const transactions = await transactionRepository.find({
      order: {
        createdAt: "DESC",
      },
      take: limit,
      skip: (page - 1) * limit,
    })

    return res.status(200).json({
      status: true,
      message: "Recent transactions retrieved successfully",
      data: transactions,
      page: page,
      total: transactionCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving recent transactions.",
      error: error.message,
    });
  }
};

export const getCurrentAdminInfo = async (req: Request, res: Response) => {
  try {
    const admin = await adminRepository.findOne({
      where: { id: req["userId"] },
    });

    if (admin === null) {
      return res.status(404).json({
        status: false,
        message: "Admin not found",
      });
    }

    delete admin.password;

    return res.status(200).json({
      status: true,
      message: "Admin details retrieved successfully",
      data: admin,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving admin details.",
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
};

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
      take: limit,
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

export const postSymptom = async (req: Request, res: Response) => {
  try {
    const { name, type } = await SymptomsSchema.parseAsync(req.body);

    const symptom = new Symptoms();
    symptom.name = name;
    symptom.type = type;

    await symptomsRepository.save(symptom);

    return res.status(200).json({
      status: true,
      message: "Symptom added successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding symptom.",
      error: error.message,
    });
  }
}

export const updateSymptom = async (req: Request, res: Response) => {
  try {
    const { name, type } = await SymptomsSchema.parseAsync(req.body);

    const symptom = await symptomsRepository.findOne({
      where: { id: req.params.id },
    });

    if (!symptom) {
      return res.status(404).json({
        status: false,
        message: "Symptom not found",
      });
    }

    symptom.name = name;
    symptom.type = type;

    await symptomsRepository.save(symptom);

    return res.status(200).json({
      status: true,
      message: "Symptom updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating symptom.",
      error: error.message,
    });
  }
}

export const deleteSymptom = async (req: Request, res: Response) => {
  try {
    const symptom = await symptomsRepository.findOne({
      where: { id: req.params.id },
    });

    if (!symptom) {
      return res.status(404).json({
        status: false,
        message: "Symptom not found",
      });
    }

    await symptomsRepository.remove(symptom);

    return res.status(200).json({
      status: true,
      message: "Symptom deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while deleting symptom.",
      error: error.message,
    });
  }
}

export const populateSymptomsTable = async (req: Request, res: Response) => {
  try {
    const existingSymptoms = await symptomsRepository.find();

    const symptoms = SYMPTOMS_DATA.filter((symptom) => {
      return !existingSymptoms.some((existingSymptom) => existingSymptom.name === symptom.name);
    }).map((symptom) => {
      const newSymptom = new Symptoms();
      newSymptom.name = symptom.name;
      newSymptom.type = symptom.type;
      return newSymptom;
    });

    await symptomsRepository.save(symptoms);

    return res.status(200).json({
      status: true,
      message: "Symptoms table filled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while filling symptoms table",
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

export const postMedicine = async (req: Request, res: Response) => {
  try {
    const { name, description } = await MedicineSchema.parseAsync(req.body);

    const medicine = new Medicine();
    medicine.name = name;
    medicine.description = description;

    await medicineRepository.save(medicine);

    return res.status(200).json({
      status: true,
      message: "Medicine added successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding medicine.",
      error: error.message,
    });
  }
}

export const updateMedicine = async (req: Request, res: Response) => {
  try {
    const { name, description } = await MedicineSchema.parseAsync(req.body);

    const medicine = await medicineRepository.findOne({
      where: { id: req.params.id },
    });

    if (!medicine) {
      return res.status(404).json({
        status: false,
        message: "Medicine not found",
      });
    }

    medicine.name = name;
    medicine.description = description;

    await medicineRepository.save(medicine);

    return res.status(200).json({
      status: true,
      message: "Medicine updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating medicine.",
      error: error.message,
    });
  }
}

export const deleteMedicine = async (req: Request, res: Response) => {
  try {
    const medicine = await medicineRepository.findOne({
      where: { id: req.params.id },
    });

    if (!medicine) {
      return res.status(404).json({
        status: false,
        message: "Medicine not found",
      });
    }

    await medicineRepository.remove(medicine);

    return res.status(200).json({
      status: true,
      message: "Medicine deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while deleting medicine.",
      error: error.message,
    });
  }
}

export const populateMedicinesTable = async (req: Request, res: Response) => {
  try {
    const existingMedicines = await medicineRepository.find();

    const medicines = MEDICINES_DATA.filter((medicine) => {
      return !existingMedicines.some((existingMedicine) => existingMedicine.name === medicine.name);
    }).map((medicine) => {
      const newMedicine = new Medicine();
      newMedicine.name = medicine.name;
      newMedicine.description = medicine.description;
      return newMedicine;
    });

    await medicineRepository.save(medicines);
    //
    return res.status(200).json({
      status: true,
      message: "Medicines table filled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while filling medicines table",
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

export const postIcd = async (req: Request, res: Response) => {
  try {
    const { name, code } = await IcdsSchema.parseAsync(req.body);

    const icd = new Icds();
    icd.name = name;
    icd.code = code;

    await icdsRepository.save(icd);

    return res.status(200).json({
      status: true,
      message: "Icd added successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while adding icd.",
      error: error.message,
    });
  }
}

export const updateIcd = async (req: Request, res: Response) => {
  try {
    const { name, code } = await IcdsSchema.parseAsync(req.body);

    const icd = await icdsRepository.findOne({
      where: { id: req.params.id },
    });

    if (!icd) {
      return res.status(404).json({
        status: false,
        message: "Icd not found",
      });
    }

    icd.name = name;
    icd.code = code;

    await icdsRepository.save(icd);

    return res.status(200).json({
      status: true,
      message: "Icd updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating icd.",
      error: error.message,
    });
  }
}

export const deleteIcd = async (req: Request, res: Response) => {
  try {
    const icd = await icdsRepository.findOne({
      where: { id: req.params.id },
    });

    if (!icd) {
      return res.status(404).json({
        status: false,
        message: "Icd not found",
      });
    }

    await icdsRepository.remove(icd);

    return res.status(200).json({
      status: true,
      message: "Icd deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while deleting icd.",
      error: error.message,
    });
  }
}

export const populateIcdsTable = async (req: Request, res: Response) => {
  try {
    // const existingIcds = await icdsRepository.find();
    //
    // const icds = ICDS_DATA.filter((icd) => {
    //   return !existingIcds.some((existingIcd) => existingIcd.name === icd.name);
    // }).map((icd) => {
    //   const newIcd = new Icds();
    //   newIcd.name = icd.name;
    //   newIcd.code = icd.code;
    //   return newIcd;
    // });
    //
    // await icdsRepository.save(icds);

    return res.status(200).json({
      status: true,
      message: "Icds table filled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while filling icds table",
      error: error.message,
    });
  }
}

export const initializeGlobalInfo = async (req: Request, res: Response) => {
  try {
    const GlobalInfo = await globalInfoRepository.findOne({
      where: {
        id: 1,
      },
    });

    if (!GlobalInfo) {
      const newGlobalInfo = globalInfoRepository.create({
        id: 1,
        appointmentRate: 0.05,
        cancellationRate: 0.15,
      });

      await globalInfoRepository.save(newGlobalInfo);

      return res.status(200).json({
        status: true,
        message: "Global info initialized Successfully",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Global info initialized Already",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while initializing global info.",
      error: error.message,
    });
  }
}

export const updateAppointmentRate = async (req: Request, res: Response) => {
  try {
    const { appointmentRate } = req.body;

    const GlobalInfo = await globalInfoRepository.findOne({
      where: {
        id: 1,
      },
    });

    GlobalInfo.appointmentRate = appointmentRate;

    await globalInfoRepository.save(GlobalInfo);
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating appointment rate.",
      error: error.message,
    });
  }
}

export const updateCancellationRate = async (req: Request, res: Response) => {
  try {
    const { cancellationRate } = req.body;

    const GlobalInfo = await globalInfoRepository.findOne({
      where: {
        id: 1,
      },
    });

    GlobalInfo.cancellationRate = cancellationRate;

    await globalInfoRepository.save(GlobalInfo);
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating cancellation rate.",
      error: error.message,
    });
  }
}

export const getAllIssues = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { sort, userType } = issuesFeedbackParams.parse(req.query);

    const filterOptions: any[] = [
      userType && { userType: In(userType.split(".")) },
    ].filter(Boolean);

    const searchQuery: FindOptionsWhere<Issues>[] = search.split(" ").flatMap((item) => [
      { name: ILike(`%${item}%`) },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const issuesCount = await issuesRepository.count();

    const issuesRaw = await issuesRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      order: createSortOrder(sort, { name: "name", userType: "userType", createdAt: "createdAt" }, { field: "createdAt", order: "DESC"}),
      where: searchOptions,
      relations: { patient: true, doctor: true }
    });

    const issues = issuesRaw.map(issue => {
      const modifiedIssue = {
        ...issue,
        user: issue.userType === "doctor" ? {
          id: issue.doctor.id,
          firstName: issue.doctor.firstName,
          lastName: issue.doctor.lastName,
          profilePicture: issue.doctor.profilePicture
        } : {
          id: issue.patient.id,
          firstName: issue.patient.firstName,
          lastName: issue.patient.lastName,
          profilePicture: issue.patient.profilePicture
        }
      };

      delete modifiedIssue.doctor;
      delete modifiedIssue.patient;

      return modifiedIssue;
    });

    return res.status(200).json({
      status: true,
      message: "issues retrieved successfully",
      data: issues,
      page: page,
      total: issuesCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving issues.",
      error: error.message,
    });
  }
}

export const getAllFeedback = async (req: Request, res: Response) => {
  try {
    const { limit, page, search } = paginationQueryParams.parse(req.query);
    const { sort, type, userType } = issuesFeedbackParams.parse(req.query);

    const filterOptions: FindOptionsWhere<Feedbacks>[] = [
      userType && { userType: In(userType.split(".")) },
      type && { type: In(type.split(".")) },
    ].filter(Boolean);

    const searchQuery: FindOptionsWhere<Feedbacks>[] = search.split(" ").flatMap((item) => [
      { comment: ILike(`%${item}%`) },
    ]);

    const searchOptions = search !== "" ?
      searchQuery.map((query) => mergeMultiple([...filterOptions, query])) :
      mergeMultiple(filterOptions);

    const feedbackCount = await feedbackRepository.count();

    const feedbacksRaw = await feedbackRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      order: createSortOrder(sort, { type: "type", userType: "userType", createdAt: "createdAt" }, { field: "createdAt", order: "DESC"}),
      where: searchOptions,
      relations: { patient: true, doctor: true }
    });

    const feedbacks = feedbacksRaw.map((feedback) => {
      const modifiedFeedback = {
        ...feedback,
          user: feedback.userType === "doctor" ? {
          id: feedback.doctor.id,
          firstName: feedback.doctor.firstName,
          lastName: feedback.doctor.lastName,
          profilePicture: feedback.doctor.profilePicture
        } : {
          id: feedback.patient.id,
          firstName: feedback.patient.firstName,
          lastName: feedback.patient.lastName,
          profilePicture: feedback.patient.profilePicture
        }
      };

      delete modifiedFeedback.doctor;
      delete modifiedFeedback.patient;

      return modifiedFeedback;
    });

    return res.status(200).json({
      status: true,
      message: "feedbacks retrieved successfully",
      data: feedbacks,
      page: page,
      total: feedbackCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving feedbacks.",
      error: error.message,
    });
  }
}

export const patchToggleIssue = async (req: Request, res: Response) => {
  try {
    const issue = await issuesRepository.findOne({
      where: { id: req.params.id },
    });

    if (!issue) {
      return res.status(404).json({
        status: false,
        message: "Issue not found",
      });
    }

    issue.status = issue.status === "open" ? "fixed" : "open";

    await issuesRepository.save(issue);

    return res.status(200).json({
      status: true,
      message: "Issue toggled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while toggling issue.",
      error: error.message,
    });
  }
}