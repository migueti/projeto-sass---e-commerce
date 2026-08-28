import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const stateDirectory = join(process.cwd(), ".git", "agent-coordination");
const input = await readInput();
const sessionId = input.sessionId ?? input.conversationId ?? input.agentSessionId;
const now = new Date().toISOString();
const sessions = readSessions();

if (sessionId) {
  mkdirSync(stateDirectory, { recursive: true });
  const sessionPath = join(
    stateDirectory,
    `${createHash("sha256").update(sessionId).digest("hex")}.json`,
  );
  writeFileSync(sessionPath, `${JSON.stringify({ id: sessionId, lastSeenAt: now })}\n`, "utf8");
  sessions.unshift({ id: sessionId, lastSeenAt: now });
}

const activeSessions = sessions
  .map((session) => `${session.id} (${session.lastSeenAt})`)
  .join(", ") || "nenhuma identificada";

process.stdout.write(
  JSON.stringify({
    continue: true,
    systemMessage: [
      "Coordenação entre abas ativa.",
      "Consulte o diff e o estado atual antes de editar; preserve alterações de outras sessões.",
      "Registre mentalmente o escopo da tarefa e valide antes de finalizar.",
      `Sessões registradas: ${activeSessions}.`,
      sessionId
        ? `Sessão atual: ${sessionId}.`
        : "A entrada não forneceu um identificador; o estado não foi registrado para esta execução.",
    ].join(" "),
  }),
);

async function readInput() {
  let content = "";
  for await (const chunk of process.stdin) content += chunk;
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function readSessions() {
  if (!existsSync(stateDirectory)) return [];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const sessions = [];

  for (const fileName of readdirSync(stateDirectory)) {
    if (!fileName.endsWith(".json")) continue;
    const sessionPath = join(stateDirectory, fileName);
    try {
      const session = JSON.parse(readFileSync(sessionPath, "utf8"));
      if (!session.id || Date.parse(session.lastSeenAt) < cutoff) {
        unlinkSync(sessionPath);
        continue;
      }
      sessions.push(session);
    } catch {
      unlinkSync(sessionPath);
    }
  }

  return sessions.sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
}
