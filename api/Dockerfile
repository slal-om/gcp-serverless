FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
RUN npm install --omit=dev
USER node
ENV NODE_ENV=production
CMD ["node", "server.js"]
