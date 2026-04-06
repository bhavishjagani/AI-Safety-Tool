# Use official Node.js LTS image
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all backend files
COPY . .

# Expose the port that Express will listen on
EXPOSE 3000

# Use environment variable PORT if provided (Render sets this)
CMD ["node", "server.js"] 