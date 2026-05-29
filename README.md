# 📖 Documentação do Frontend - Sistema Biométrico Multimodal

## 📌 Visão Geral
Este é o frontend da aplicação de Reconhecimento Biométrico, focado em identificar rostos humanos e tatuagens. Desenvolvido com HTML5, CSS3 e Vanilla JavaScript (sem frameworks complexos), ele oferece uma interface moderna, responsiva e amigável para interagir com a API de biometria baseada em FastAPI e ChromaDB.

## ✨ Principais Funcionalidades
* **Seleção Flexível de Imagens:** Suporte para envio de arquivos via explorador do sistema ou captura em tempo real usando a câmera do dispositivo (webcam ou câmera traseira de celulares).
* **Validação Integrada:** Restrição automática para formatos suportados (`.jpg`, `.jpeg`, `.png`) e limite de envio de até 5 imagens por requisição.
* **Recorte Inteligente (Crop):** Integração com a biblioteca `Cropper.js` que abre um modal automático para que o usuário isole o rosto ou a tatuagem, removendo o fundo e melhorando a precisão da IA.
* **Feedback Visual:** Área de "Dropzone" para pré-visualização das imagens selecionadas, botões de remoção individual e exibição de carregamento (loading) durante o processamento.
* **Tratamento de Resultados:** Exibição detalhada dos retornos da API em cards coloridos (Sucesso, Falha, Erro), incluindo a métrica de distância matemática e o limiar (threshold) exigido.

## 🛠 Tecnologias Utilizadas
* **HTML5 & CSS3:** Estrutura semântica com design moderno, utilizando variáveis CSS, gradientes, `backdrop-filter` (efeito vidro) e animações suaves.
* **Vanilla JavaScript (ES6+):** Manipulação do DOM, controle da câmera via `navigator.mediaDevices` e consumo da API via `Fetch API`.
* **Cropper.js (v1.6.2):** Biblioteca externa via CDN utilizada para o modal de recorte de imagens.

## ⚙️ Configuração
A única configuração necessária no frontend é apontar para a URL correta do seu backend. 

Abra o arquivo `index.html`, vá até a tag `<script>` (próximo à linha 400) e edite a constante `BASE_URL`:

```javascript
// Exemplo usando Ngrok (para testes externos)
const BASE_URL = '[https://seu-link-aqui.ngrok-free.dev](https://seu-link-aqui.ngrok-free.dev)';

// Exemplo rodando localmente sem Ngrok
// const BASE_URL = '[http://127.0.0.1:8000](http://127.0.0.1:8000)';
```

## 🔄 Fluxo de Funcionamento (User Flow)
1. **Escolha do Tipo:** O usuário seleciona no menu suspenso se deseja processar um "Rosto Humano" ou uma "Tatuagem / Padrão".
2. **Captura da Imagem:** Clica em "Escolher Arquivos" ou "Usar Câmera".
3. **Recorte (Opcional):** Se as imagens forem carregadas, um modal de recorte se abrirá para cada imagem. O usuário pode confirmar o recorte da região de interesse ou cancelar/ignorar.
4. **Ação (Cadastro ou Análise):**
   * **Cadastrar:** O usuário digita um nome identificador (sem espaços) e clica em "Cadastrar Imagem".
   * **Reconhecer:** O usuário clica em "Reconhecer Imagem" (não exige digitação de nome).
5. **Resultado:** O sistema formata um objeto `FormData`, envia via requisição `POST` para a API e exibe os cards de resultado na tela.

## 🔌 Integração com a API
O frontend se comunica com 4 rotas principais do backend, dependendo das escolhas do usuário:
* `POST /api/cadastrar`: Envia características faciais para salvar no banco.
* `POST /api/reconhecer`: Busca correspondência de um rosto.
* `POST /api/cadastrar-tatuagem`: Salva o padrão de uma tatuagem.
* `POST /api/reconhecer-tatuagem`: Busca correspondência de uma tatuagem.

**Nota sobre o Ngrok:**
As requisições `fetch` no código incluem o cabeçalho `{'ngrok-skip-browser-warning': 'true'}`. Isso é crucial quando a API está sendo exposta pelo Ngrok, pois impede que o Ngrok bloqueie a requisição JSON exibindo sua página HTML de aviso padrão.
