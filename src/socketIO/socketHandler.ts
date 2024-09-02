import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Messeges } from "../models/messages";
import { dataSource } from "../data-source";
import { Broadcast } from "../models/broadcast";

const messagesRepository = dataSource.getRepository(Messeges);
const broadcastRepository = dataSource.getRepository(Broadcast);

export default async function SocketHandler(
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
) {
  socket.on("subscribe-init", (data: {
    serviceMode: "PATIENT" | "DOCTOR",
    userId: string,
  }) => {
    socket.join(data.userId);
    socket.join('broadcasts')
    socket.join(`broadcasts-${data.serviceMode}`)
  });

  socket.on("SubscribeConsultation", (consultationId) => {
    socket.join(consultationId);
  })
  socket.on("UnsubscribeConsultation", (consultationId) => {
    socket.leave(consultationId);
  })

  socket.on("ConsultationChatEvent", async (data) => {
    try {
      const newMessage = messagesRepository.create({
        consultationId: data.consultationId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        message: data.message,
        fileUrl: data.fileUrl,
      });
      await messagesRepository.save(newMessage)
      socket.to(data.consultationId).emit("ConsultationEvent", newMessage);
    } catch (error) {
      console.log(error);
    }
  })

  socket.on("BroadcastEvent", async (data:{
    message: string,
    scope: "PATIENT" | "DOCTOR" | "ALL",
    adminId: string,
  }) => {
    try {
      const broadcast = broadcastRepository.create({
        message: data.message,
        scope: data.scope,
        admin: {
          id: data.adminId
        }
      });
      const newBroadcast = await broadcastRepository.save(broadcast);

      switch (data.scope) {
        case "PATIENT":
          socket.to('broadcasts-PATIENT').emit("BroadcastEvent", newBroadcast);
          break;
        case "DOCTOR":
          socket.to('broadcasts-DOCTOR').emit("BroadcastEvent", newBroadcast);
          break;
        default:
          socket.to('broadcasts').emit("BroadcastEvent", newBroadcast);
          break;
      }
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("ConsultationStartEvent", (data: {
    patientId: string;
    consultationId: string;
    doctorId: string;
  }) => {
    socket.to(data.patientId).emit("ConsultationEventAction", {
      type: "start",
      id: data.consultationId,
      userId: data.doctorId,
    });
  });

  socket.on("ConsultationEndEvent", (data) => {
    socket.to(data.patientId).emit("ConsultationEventAction", {
      type: "end",
    });
  });

}
