import { FindOptionsSelect } from "typeorm";
import { Doctor } from "../models/doctor";
import { Patient } from "../models/patient";



export const doctorRelevantFields: FindOptionsSelect<Doctor> = {
    firstName: true,
    lastName: true,
    email: true,
    contact: true,
    address: true,
    bio: true,
    profilePicture: true,
    specializations: true,
    qualifications: true,
    reviews: true,
    gender: true,
    education: true,
    experience: true,

};

export const patientRelevantFields: FindOptionsSelect<Patient> = {
    firstName: true,
    lastName: true,
    email: true,
    contact: true,
    address: true,
    profilePicture: true,
};
