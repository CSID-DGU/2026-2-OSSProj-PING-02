# npm 버전을 고정한다 (#64). node:22-alpine 기본 npm(10)은 npm 11 로 만든 package-lock.json 을 거부해서
# 빌드가 깨진 적이 있다. npm 11 은 npm 10·11 어느 쪽으로 만든 lockfile 도 받아들인다.
# 바꿀 때는 scripts/update-lockfile.sh 와 Doc/배포_체크리스트.md 도 같이 본다.
ARG NPM_VERSION=11.12.1

# ---- build ----
FROM node:22-alpine AS build
ARG NPM_VERSION
RUN npm install -g npm@${NPM_VERSION} && npm cache clean --force
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:22-alpine AS runtime
ARG NPM_VERSION
RUN npm install -g npm@${NPM_VERSION} && npm cache clean --force
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 5010
CMD ["node", "dist/main"]
