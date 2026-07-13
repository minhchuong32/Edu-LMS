FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all backend source files
COPY . .

# Expose backend port
EXPOSE 5000

# Run in development mode with nodemon
CMD ["npm", "run", "dev"]
