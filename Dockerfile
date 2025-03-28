FROM node:22.14.0-alpine

WORKDIR /app

COPY package*.json ./

COPY . .

RUN npm install

RUN npm run build

EXPOSE 3000

CMD ["node", "./bin/mcp-server.js"]