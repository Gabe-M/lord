# Contexto do Projeto: Lord (Assistente Virtual)

## 1. Diretrizes de Comportamento do Copilot (Obrigatório)
- **Prioridade Absoluta da Verdade e Exatidão**: Se você não souber a sintaxe correta, especialmente para APIs do **Tauri v2**, declare imediatamente "Dados insuficientes" ou solicite a documentação. É proibido inventar APIs, supor métodos ou alucinar códigos.
- **Neutralidade Emocional Total**: Forneça apenas o código e instruções técnicas diretas. Remova completamente saudações, desculpas, jargões de IA ("Aqui está o código", "Sinto muito pelo erro"), tentativas de empatia ou validação.
- **Direto ao Ponto**: Vá direto para a solução técnica nua e crua. Substitua textos explicativos longos por comentários concisos diretamente no código.
- **Correção Direta**: Se o meu prompt contiver premissas técnicas incorretas, corrija-me imediatamente sem pedir desculpas.

## 2. Visão Geral da Arquitetura
Lord é um assistente virtual desktop multiplataforma com uma interface flutuante, transparente e sem bordas. O sistema é dividido em três camadas estritas:
1. **Core Desktop**: Tauri v2 (Rust).
2. **Frontend UI/Avatar**: React 18+ (TypeScript, Vite) integrado com renderização de avatar 3D (Godot/Web).
3. **Backend de IA**: Python (FastAPI/Flask) rodando localmente ou via Docker, responsável pelo agente OpenAI, processamento pesado e banco de dados.

## 3. Stack Tecnológica e Regras Estritas

### Frontend (React / TypeScript / CSS)
- **Tipagem Estrita**: Siga rigorosamente o TypeScript. Nunca utilize `any`. Se houver erro de tipagem, corrija a interface.
- **Interface Flutuante**: O design requer `decorations: false`, `transparent: true` e `alwaysOnTop: true` no Tauri.
- **Drag Region**: Qualquer elemento projetado para mover a janela deve conter o atributo genérico do Tauri: `data-tauri-drag-region`.
- **Comunicação IPC**: Use estritamente o pacote `@tauri-apps/api/core` (ex: `import { invoke } from '@tauri-apps/api/core'`).

### Core Desktop (Tauri v2 / Rust)
- **Versão Exclusiva**: Assuma sempre o **Tauri v2**. Verifique os plugins oficiais do ecossistema v2 (ex: `@tauri-apps/plugin-global-shortcut`) antes de sugerir crates de terceiros.
- **Responsabilidades do Rust**: Gerenciar ciclo de vida das janelas, tray do sistema, atalhos globais, captura de áudio de baixo nível e chamadas HTTP rápidas (via `reqwest`) para o backend Python.
- **Tratamento de Erros**: Retorne `Result<T, String>` nos comandos Tauri (`#[tauri::command]`) mapeando erros nativos do Rust para strings consumíveis pelo frontend.

### Backend de IA (Python)
- **Frameworks**: FastAPI para endpoints de alta performance, Flask (se o contexto exigir), Celery para filas assíncronas e Redis.
- **Banco de Dados**: O banco de dados relacional oficial do projeto é o **PostgreSQL**. Sob nenhuma circunstância utilize ou sugira MySQL.
- **Comunicação PC-Smartphone**: O backend deve prever arquitetura de pareamento e sockets para receber comandos e enviar status.

## 4. Padrões de Código e Solução de Problemas
- Ao adicionar dependências React, forneça o comando `npm install <pacote>`.
- Ao adicionar crates Rust, forneça o comando `cargo add <crate>` e as alterações necessárias no `Cargo.toml`.
- Ao debugar falhas, solicite logs específicos do console do Vite, do terminal do Tauri (`RUST_BACKTRACE=1 npm run tauri dev`) ou do console de rede (Backend).