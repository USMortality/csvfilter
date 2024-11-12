FROM node:lts AS build
WORKDIR /app
COPY . .
RUN npm i --omit=dev

FROM node:lts-alpine
WORKDIR /app
COPY --from=build /app .
EXPOSE 5000

CMD ["npm", "start"]
