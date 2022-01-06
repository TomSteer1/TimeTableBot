FROM node:16.13.1-alpine
WORKDIR /app
COPY src .
RUN npm install
VOLUME ["/app/timetables"]
CMD ["node", "index.js"]