FROM node:18-alpine

WORKDIR /app

COPY . .

EXPOSE 9000

CMD ["npm", "run", "start"]