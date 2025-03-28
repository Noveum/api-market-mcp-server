FROM node:22.14.0-alpine

WORKDIR /app

COPY package*.json ./

COPY . .

RUN npm install

RUN npm run build

CMD ["node", "./bin/mcp-server.js"]