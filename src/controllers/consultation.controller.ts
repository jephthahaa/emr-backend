import { Request, Response } from 'express'
import { dataSource } from '../data-source';
import { Doctor } from '../models/doctor';
import { Patient } from '../models/patient';
import { Record } from '../models/record';
import { Appointment } from '../models/appointment';
import { Review } from '../models/review';
import { Logger } from '../logger';

const doctorRepository = dataSource.getRepository(Doctor);
const patientRepository = dataSource.getRepository(Patient);
const recordRepository = dataSource.getRepository(Record);
const appointmentRepository = dataSource.getRepository(Appointment);
const reviewRepository = dataSource.getRepository(Review);

const logger = new Logger("ConsultationController");

// start a consultation session
export const startConsultation = async (req: Request, res: Response) => {
    try {
      const patientId = req.params.patientId;

        const doctor = await doctorRepository.findOne({
            where: { id: req["userId"] },
        });

        const patient = await patientRepository.findOne({
            where: { id: patientId },
        });

        if (!patient) {
            return res.status(404).json({
                status: false,
                message: "Patient not found",
            });
        }

        const activeConsultation = await recordRepository.findOne({
            where: {
                doctor: {
                    id: doctor.id,
                },
                status: "active",
            },
        });

        if (activeConsultation) {
            return res.status(400).json({
                status: false,
                message: "You already have an active consultation",
            });
        }

        const newConsultation = recordRepository.create({
            complaints: [],
            patient: patient,
            doctor: doctor,
        });

        await recordRepository.save(newConsultation);

        logger.info({
            type: "Consultation started",
            userId: doctor.id,
            message: `Doctor started consultation with patient: ${patient.id}`,
        });

        return res.status(201).json({
            status: true,
            message: "Consultation started successfully",
            data: newConsultation,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while starting consultation.",
            error: error.message,
        });
    }
};

// check if a doctor has an active consultation session
export const checkActiveConsultation = async (req: Request, res: Response) => {
    try {
        const doctor = await doctorRepository.findOne({
            where: { id: req["userId"] },
        });

        const activeConsultation = await recordRepository.findOne({
            where: {
                doctor: {
                    id: doctor.id,
                },
                status: "active",
            },
            relations: { patient: true, doctor: true },
        });

        let activeConsult = null;

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
                id: activeConsultation.patient.id,
                firstName: activeConsultation.patient.firstName,
                lastName: activeConsultation.patient.lastName,
            },
            rate: activeConsultation.doctor.rate,
        };

        delete activeConsult.doctor;
        delete activeConsult.patient;

        return res.status(200).json({
            status: true,
            message: "Active consultation found",
            data: activeConsult,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            status: false,
            message: "An error occurred while checking active consultation.",
            error: error.message,
        });
    }
};

export const setCurrentConsultationStep = async (
    req: Request,
    res: Response
) => {
    try {
        const { consultationId, step } = req.body;

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

        consultation.currentStep = step;

        await recordRepository.save(consultation);

        return res.status(200).json({
            status: true,
            message: "Current step updated successfully",
            data: consultation,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while updating current step.",
            error: error.message,
        });
    }
};

export const completeConsultation = async (req: Request, res: Response) => {
    try {
      const { consultationId, notes } = req.body;
  
      const consultation = await recordRepository.findOne({
        where: {
          id: consultationId,
        },
        relations: { patient: true, doctor: true },
      });
  
      if (!consultation) {
        return res.status(404).json({
          status: false,
          message: "Consultation not found",
        });
      }
  
      consultation.status = "completed";
      consultation.notes = notes;
  
      await recordRepository.save(consultation);
  
      const appointment = await appointmentRepository.findOne({
        where: {
          doctor: {
            id: req["userId"],
          },
          patient: {
            id: consultation.patient.id,
          },
          status: "accepted",
        },
        order: {
          appointmentDate: "DESC",
        },
      });
  
      appointment.status = "completed";
  
      await appointmentRepository.save(appointment);
  
      logger.info({
        type: "Consultation ended",
        userId: req["userId"],
        message: `Consultation with patient: ${consultation.patient.id} ended successfully`,
      });
  
      const review = reviewRepository.create({
        doctor: consultation.doctor,
        patient: consultation.patient,
        consultation,
      });
  
      await reviewRepository.save(review);
  
      return res.status(200).json({
        status: true,
        message: "Consultation ended successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "An error occurred while ending consultation.",
        error: error.message,
      });
    }
  };
  
  export const endConsultation = async (req: Request, res: Response) => {
    try {
      const { consultationId, reason } = req.body;
  
      const consultation = await recordRepository.findOne({
        where: {
          id: consultationId,
        },
        relations: { patient: true },
      });
  
      if (!consultation) {
        return res.status(404).json({
          status: false,
          message: "Consultation not found",
        });
      }
      
      console.log(consultation);
      consultation.status = "ended";
      consultation.reasonEnded = reason;
  
      await recordRepository.save(consultation);
  
      const appointment = await appointmentRepository.findOne({
        where: {
          doctor: {
            id: req["userId"],
          },
          patient: {
            id: consultation.patient.id,
          },
          status: "accepted",
        },
      });
  
      appointment.status = "completed";
  
      await appointmentRepository.save(appointment);
  
      return res.status(200).json({
        status: true,
        message: "Consultation ended successfully",
        data: consultation,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "An error occurred while ending consultation.",
        error: error.message,
      });
    }
  };
  