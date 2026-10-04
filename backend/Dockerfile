FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production
EXPOSE 4000
USER node
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "src/index.js"]
