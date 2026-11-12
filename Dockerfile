FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./package.json
RUN npm install
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY backend/package.json ./backend/package.json
RUN cd backend && npm install --omit=dev
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
EXPOSE 8080
CMD ["node", "backend/server.js"]
