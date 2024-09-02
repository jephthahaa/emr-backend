import { Server } from "socket.io";
import type {IncomingMessage, ServerResponse, Server as HttpServer} from "http";

export function getSocketIO(
  server: HttpServer<typeof IncomingMessage, typeof ServerResponse>,
) {
  return new Server(server, {
    cors: {
      origin: "*",
    },
  });
}
