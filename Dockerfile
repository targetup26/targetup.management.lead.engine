FROM node:18-alpine

WORKDIR /usr/src/app

# Copy mapping
COPY package*.json ./

# Install packages
RUN npm ci --only=production

# Copy worker and services
COPY . .

# Lead Engine doesn't expose a listening port, but the BullMQ connects to Redis
# CMD executes the main Node process
CMD ["npm", "start"]
