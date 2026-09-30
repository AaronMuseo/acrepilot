FROM node:24-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@11.19.0
COPY . .
RUN pnpm install --frozen-lockfile
ENV API_HOST=0.0.0.0
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["pnpm", "dev:api"]
