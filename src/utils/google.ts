import path from "path";
import { google } from "googleapis";
import { Appointment } from "../models/appointment";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const KEY_PATH = path.join(process.cwd(), "firebase_service_key.json");

const API_KEY = process.env.GOOGLE_API_KEY;


export async function authorize() {
  const client = new google.auth.JWT({
    scopes: SCOPES,
    keyFile: KEY_PATH,
  });
  return client;
}

export async function createEvent(auth, appointment: Appointment) {
  return new Promise((resolve, reject) => {
    const calendar = google.calendar({ version: "v3", auth: API_KEY });

    const event = {
      summary: "Zomujo Consultation",
      description: `Consultation with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName} and ${appointment.patient.firstName} ${appointment.patient.lastName}`,
      start: {
        dateTime: new Date(
          `${appointment.appointmentDate}T${appointment.startTime}`
        ).toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: new Date(
          `${appointment.appointmentDate}T${appointment.endTime}`
        ).toISOString(),
        timeZone: "UTC",
      },
      attendees: [
        { email: appointment.doctor.email },
        { email: appointment.patient.email },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 10 },
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(7),
        },
      },
    };

    calendar.events.insert(
      {
        auth: auth,
        calendarId: "primary",
        requestBody: event,
        conferenceDataVersion: 1,
        sendNotifications: true,
      },
      function (err, event) {
        if (err) {
          reject(err);
          return;
        }
        const meetLink = event.data.conferenceData.entryPoints[0].uri;
        resolve(meetLink);
      }
    );
  });
}
