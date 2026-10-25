FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY scripts ./scripts
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js weather.js web-search.js cloud.js ./
COPY public ./public
ENV NODE_ENV=production PORT=3000
USER node
EXPOSE 3000
CMD ["node", "--use-env-proxy", "server.js"]
