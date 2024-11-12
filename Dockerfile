# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json .

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Stage 2: Run
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app .

# Expose the port your app runs on
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
