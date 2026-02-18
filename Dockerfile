FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun prisma generate

EXPOSE 3000

CMD ["bun", "run", "start"]
