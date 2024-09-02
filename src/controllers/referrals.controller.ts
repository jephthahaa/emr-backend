import { Request, Response } from "express";
import { Doctor } from "../models/doctor";
import { dataSource } from "../data-source";
import { Patient } from "../models/patient";
import { ReferPatientStatus, Referral, referPatientSchema } from "../models/referral";
import { processNotification } from "./notifications.controller";
import { FindManyOptions } from "typeorm";
import { doctorRelevantFields, patientRelevantFields } from "../utils/query.options";
import { Logger } from "../logger";



const doctorRepository = dataSource.getRepository(Doctor);
const patientRepository = dataSource.getRepository(Patient);
const referralRepository = dataSource.getRepository(Referral);

const logger = new Logger("ReferralController");

// function to refer patient to another doctor
export const referPatient = async (req: Request, res: Response) => {
    try {
        const { referredDoctorId, patientId } = await referPatientSchema.parseAsync(req.body);

        const doctor = await doctorRepository.findOne({
            where: { id: req["userId"] },
        });

        const patient = await patientRepository.findOne({
            where: { id: patientId },
        });

        const referredDoctor = await doctorRepository.findOne({
            where: { id: referredDoctorId },
        });

        if (!doctor || !patient || !referredDoctor) {
            return res.status(404).json({
                status: false,
                message: "Doctor, patient or referred doctor not found",
            });
        }

        const referral = referralRepository.create({
            doctor,
            patient,
            referredDoctor,
            status: "pending",
        });

        await referralRepository.save(referral);

        // log
        logger.info({
            userId: doctor.id,
            type: "Referral",
            message: `Dr. ${doctor.firstName} ${doctor.lastName} referred patient to Dr. ${referredDoctor.firstName} ${referredDoctor.lastName}`,
        });
    
        await processNotification([
            { email: referredDoctor.email, topic: "Patient Referral", message: `You have been referred a patient by Dr. ${doctor.firstName} ${doctor.lastName}. Please check your dashboard for more details.`, id: referredDoctor.id },
            { email: patient.email, topic: "Patient Referral", message: `You have been referred to Dr. ${referredDoctor.firstName} ${referredDoctor.lastName} by Dr. ${doctor.firstName} ${doctor.lastName}. Please check your dashboard for more details.`, id: patient.id }
        ]);

        return res.status(201).json({
            status: true,
            message: "Patient referred successfully",
            data: referral,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while referring patient.",
            error: JSON.parse(error.message),
        });
    }
}


export const acceptReferral = async (req: Request, res: Response) => {
    try {
        const id = req["userId"];
        const referralId = req.params.referralId;
        const referral = await referralRepository.findOne({
            where: { id: referralId, referredDoctor: { id } },
            relations: ["doctor", "referredDoctor", "patient"],
        });

        if (!referral) {
            return res.status(404).json({
                status: false,
                message: "Referral not found",
            });
        }

        referral.status = "accepted";
        await referralRepository.save(referral);

        // log
        logger.info({
            userId: id,
            type: "Referral",
            message: `Dr. ${referral.referredDoctor.firstName} ${referral.referredDoctor.lastName} accepted referral for ${referral.patient.firstName} ${referral.patient.lastName}`,
        });

        await processNotification([
            { email: referral.doctor.email, topic: "Referral Accepted", message: `Dr. ${referral.referredDoctor.firstName} ${referral.referredDoctor.lastName} has accepted your referral for ${referral.patient.firstName} ${referral.patient.lastName}.`, id: referral.doctor.id },
            { email: referral.patient.email, topic: "Referral Accepted", message: `Dr. ${referral.referredDoctor.firstName} ${referral.referredDoctor.lastName} has accepted your referral.`, id: referral.patient.id }
        ]);

        return res.status(200).json({
            status: true,
            message: "Referral accepted successfully",
            data: referral,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while accepting referral",
            error: error.message,
        });
    }
}

// functio to get referrals
export const viewReferrals = async (req: Request, res: Response) => {
    try {
        const id = req["userId"];
        const status = req.query.status as ReferPatientStatus;
        const referrals = await referralRepository.find({
            where: [
                { patient: { id }, status: "accepted" },
                { referredDoctor: { id }, status },
            ],
            relations: ["referredDoctor", "patient"],
            select: {
                referredDoctor: doctorRelevantFields,
                patient: patientRelevantFields,
            }
        });

        if (!referrals) {
            return res.status(404).json({
                status: false,
                message: "Referral not found",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Referrals fetched successfully",
            data: referrals,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching referrals",
            error: error.message,
        });
    }
}

export const getReferred = async (req: Request, res: Response) => {
    try {
        const id = req["userId"];
        const status = req.query.status as ReferPatientStatus;
        const referrals = await referralRepository.find({
            where: [
                { referredDoctor: { id }, status },
            ],
            relations: ["referredDoctor", "patient"],
            select: {
                referredDoctor: doctorRelevantFields,
                patient: patientRelevantFields,
            }
        });

        if (!referrals) {
            return res.status(404).json({
                status: false,
                message: "Referral not found",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Referrals fetched successfully",
            data: referrals,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching referrals",
            error: error.message,
        });
    }
}
