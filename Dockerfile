# Etapa 1: build
FROM node:22-alpine AS builder

WORKDIR /app

# Habilitar pnpm mediante corepack
RUN corepack enable

# Copiar archivos necesarios
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias exactas
RUN pnpm install --frozen-lockfile

# Copiar proyecto
COPY . .

# Build de producción
RUN pnpm build

# Etapa 2: producción
FROM node:22-alpine

WORKDIR /app

RUN corepack enable

# Copiar aplicación compilada
COPY --from=builder /app ./

EXPOSE 3000

CMD ["pnpm", "start"]
