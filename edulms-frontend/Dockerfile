FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Vite frontend port
EXPOSE 5173

# Run Vite in development mode binding to all network interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
