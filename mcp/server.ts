import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const maxReadableFileBytes = 64 * 1024;
const validationTimeoutMs = 120_000;
const blockedPathSegments = new Set([".git", ".next", "node_modules"]);
const blockedFilePatterns = [/^\.env(?:\.(?!example$).*)?$/i, /\.db(?:-.+)?$/i];
const secretEnvironmentPattern = /(API_KEY|PASSWORD|PRIVATE_KEY|SECRET|TOKEN)/i;
const allowedChecks = {
  typecheck: ["run", "typecheck"],
  lint: ["run", "lint"],
  test: ["test"],
  build: ["run", "build"],
} as const;

async function readRepositoryText(filePath: string) {
  const candidate = resolve(repositoryRoot, filePath);
  const [realRepositoryRoot, realCandidate] = await Promise.all([
    realpath(repositoryRoot),
    realpath(candidate),
  ]);
  const pathFromRoot = relative(realRepositoryRoot, realCandidate);

  if (isAbsolute(pathFromRoot) || pathFromRoot.startsWith("..")) {
    throw new Error("O caminho deve estar dentro do repositório.");
  }
  const pathSegments = pathFromRoot.split(/[\\/]/);
  if (
    pathSegments.some((segment) => blockedPathSegments.has(segment)) ||
    blockedFilePatterns.some((pattern) => pattern.test(pathSegments.at(-1) ?? ""))
  ) {
    throw new Error("Este arquivo é sensível ou não deve ser analisado pelo MCP.");
  }

  const fileStats = await stat(realCandidate);
  if (!fileStats.isFile()) {
    throw new Error("O caminho informado não é um arquivo.");
  }
  if (fileStats.size > maxReadableFileBytes) {
    throw new Error(`O arquivo excede o limite de ${maxReadableFileBytes} bytes.`);
  }

  return readFile(realCandidate, "utf8");
}

function toolError(error: unknown) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: error instanceof Error ? error.message : "Não foi possível concluir a operação.",
      },
    ],
  };
}

function safeValidationEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !secretEnvironmentPattern.test(key)),
  ) as NodeJS.ProcessEnv;
}

const server = new McpServer({
  name: "engenharia-local",
  version: "1.0.0",
});

server.registerPrompt(
  "melhorar_codigo_com_mcps",
  {
    description: "Orienta uma melhoria de código coordenada entre os MCPs do projeto.",
    argsSchema: z.object({
      objetivo: z.string().min(1).describe("Objetivo da melhoria de engenharia"),
    }),
  },
  ({ objetivo }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            `Objetivo: ${objetivo}`,
            "",
            "Coordene esta tarefa nesta ordem:",
            "1. Use engenharia-local para ler o protocolo, analisar os arquivos relevantes e validar o projeto.",
            "2. Use Context7 para consultar a documentação atual de bibliotecas, frameworks ou APIs envolvidas.",
            "3. Use Sequential Thinking para formular uma hipótese, escolher a menor mudança e revisar os riscos.",
            "4. Para TDD, use a skill local mattpock/tdd.md; para bugs, mattpock/diagnosing-bugs.md; para revisão, mattpock/code-review.md; para arquitetura, mattpock/improve-codebase-architecture.md.",
            "5. Consolide os resultados antes de editar e execute uma validação focada após cada alteração.",
          ].join("\n"),
        },
      },
    ],
  }),
);

server.registerTool(
  "ler_protocolo",
  {
    description: "Lê o protocolo de engenharia definido em mcp.md.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      return { content: [{ type: "text", text: await readRepositoryText("mcp.md") }] };
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "analisar_arquivo",
  {
    description: "Lê um arquivo do repositório para análise de engenharia.",
    inputSchema: z.object({
      caminho: z.string().min(1),
    }),
  },
  async ({ caminho }) => {
    try {
      return { content: [{ type: "text", text: await readRepositoryText(caminho) }] };
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "validar_projeto",
  {
    description: "Executa uma validação segura e predefinida do projeto.",
    inputSchema: z.object({
      verificacao: z.enum(["typecheck", "lint", "test", "build"]),
    }),
  },
  async ({ verificacao }) => {
    const [command, ...args] = allowedChecks[verificacao];

    try {
      const result = await execFileAsync("npm", [command, ...args], {
        cwd: repositoryRoot,
        env: safeValidationEnvironment(),
        maxBuffer: 1024 * 1024 * 4,
        timeout: validationTimeoutMs,
        killSignal: "SIGTERM",
      });

      return {
        content: [{ type: "text", text: `${result.stdout}${result.stderr}` }],
      };
    } catch (error) {
      const commandError = error as { stdout?: string; stderr?: string; message?: string };
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `${commandError.stdout ?? ""}${commandError.stderr ?? ""}${commandError.message ?? "Falha na validação."}`,
          },
        ],
      };
    }
  },
);

async function main() {
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});