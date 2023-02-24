FROM node:14.19.0-alpine
WORKDIR /app

ARG NODE_ENV

ENV NODE_ENV=$NODE_ENV
ENV PORT 3000

COPY . .
RUN npm install

EXPOSE 3000
CMD ["npm", "run", "docker:prod"]