import { dataSource } from "../data-source";
import { Between, LessThan } from "typeorm";
import { Appointment } from "../models/appointment";
import { addDays } from "date-fns";

const appointmentRepository = dataSource.getRepository(Appointment);

export default async function AutoCancelAppointments(now: Date) {
  try {
    const appointmentsBase = await appointmentRepository.find({
      where: {
        status: "accepted",
        appointmentDate: LessThan(now),
      },
      order: {
        appointmentDate: "ASC"
      }
    });

    const remainingAppointments = appointmentsBase.filter(appointment => {
      let appointmentEnd = addDays(new Date(
        `${appointment.appointmentDate}T${appointment.endTime}`
      ), 1);

      return now.getTime() > appointmentEnd.getTime();
    });

    for (const appointment of remainingAppointments) {
      appointment.status = "cancelled";
      await appointmentRepository.save(appointment);
    }
  } catch (error) {
    console.log(error.message);
  }
}