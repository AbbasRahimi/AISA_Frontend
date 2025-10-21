# Multi-stage build for React application
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci 

# Copy source code
COPY . .

# Accept build arguments
ARG NODE_ENV=production
ARG REACT_APP_API_URL=https://aisa.se.jku.at/api

# Set environment variables for build
ENV NODE_ENV=$NODE_ENV
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
