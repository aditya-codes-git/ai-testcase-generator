# Use the official Node.js image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --only=production

# Bundle app source
COPY . .

# Bind to PORT 8080 (Cloud Run default)
ENV PORT=8080
EXPOSE 8080

# Command to run the application
CMD [ "npm", "start" ]
