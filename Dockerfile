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
ARG REACT_APP_API_URL=https://aisa.se.jku.at
# Auth0 (required for the SPA bundle — set via compose build args or `docker build --build-arg ...`)
ARG REACT_APP_AUTH0_DOMAIN
ARG REACT_APP_AUTH0_CLIENT_ID
ARG REACT_APP_AUTH0_AUDIENCE

# Set environment variables for build
ENV NODE_ENV=$NODE_ENV
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_AUTH0_DOMAIN=$REACT_APP_AUTH0_DOMAIN
ENV REACT_APP_AUTH0_CLIENT_ID=$REACT_APP_AUTH0_CLIENT_ID
ENV REACT_APP_AUTH0_AUDIENCE=$REACT_APP_AUTH0_AUDIENCE

# Fail fast if Auth0 vars were not passed into the build stage
RUN if [ -z "$REACT_APP_AUTH0_DOMAIN" ] || [ -z "$REACT_APP_AUTH0_CLIENT_ID" ]; then \
      echo "Build error: set REACT_APP_AUTH0_DOMAIN and REACT_APP_AUTH0_CLIENT_ID as build-args (see docker-compose.yml / docker.env.example)."; \
      exit 1; \
    fi

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
