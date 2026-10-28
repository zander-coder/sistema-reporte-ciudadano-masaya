# API Masaya Reporta — imagen para VPS / plataformas con contenedores
FROM node:22-slim
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend ./backend
COPY database ./database
ENV NODE_ENV=production PORT=3000 DB_PATH=/data/masaya.db UPLOADS_DIR=/data/uploads
VOLUME /data
EXPOSE 3000
WORKDIR /app/backend
CMD ["node", "src/server.js"]
