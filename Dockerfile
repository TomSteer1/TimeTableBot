FROM node:16.13.1-alpine
LABEL org.opencontainers.image.source https://github.com/TomSteer1/TimeTableBot
WORKDIR /app
COPY src .
RUN npm install
VOLUME ["/app/timetables"]
CMD ["node", "index.js"]