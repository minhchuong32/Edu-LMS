FROM node:20-alpine
RUN mkdir -p /app && chown node:node /app
WORKDIR /app
USER node
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]