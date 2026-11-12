# Decisoes de janelas

## Contexto

O Lord tera personagens, baloes de fala e interfaces como menus e chat. A janela principal deve ser transparente e pode precisar permitir que cliques atravessem areas sem interacao.

## Diretriz atual

- Usar uma janela de cena transparente para personagens e elementos visuais relacionados, dimensionada para a area ocupada por eles.
- Abrir janelas separadas para interfaces interativas, como menus ou chat, quando necessario.
- Nao manter uma janela de tela inteira junto com varias janelas pequenas por padrao. Uma sobreposicao de tela inteira so deve ser considerada para um recurso que realmente precise ocupar a tela.
- Tratar o passthrough por janela como uma limitacao de projeto: transparencia visual nao garante que os cliques atravessem a janela.

## Em aberto

- Definir como personagens e baloes serao organizados e posicionados dentro da janela de cena.
- Verificar o comportamento de passthrough e hit-testing nas plataformas suportadas, especialmente se for necessario interagir com personagens e deixar o restante da area sem captura de cliques.
- Decidir se menus e chat serao janelas nativas separadas ou interfaces exibidas na janela de cena.

## Escopo

Esta e uma diretriz inicial baseada nas conversas de 2026-11-11, nao uma decisao final de implementacao. Validar o comportamento nas plataformas alvo antes de definir a arquitetura definitiva.
