# Sistema Biométrico Multimodal 👁️🎨

Uma aplicação web (Frontend) projetada para realizar o **cadastro e reconhecimento** de rostos humanos e tatuagens/padrões. A interface permite o envio de imagens via upload de arquivos ou captura direta pela webcam, oferecendo ferramentas integradas de edição (recorte e remoção mágica de fundo) antes do envio para a API de Inteligência Artificial.

---

## 🚀 Funcionalidades

* **Multimodalidade:** Suporte para identificação e cadastro de **Rostos Humanos** e **Tatuagens**.
* **Ações Duplas:** Interface adaptável para **Reconhecimento** de uma imagem existente ou **Cadastro** de uma nova identidade no banco de dados.
* **Captura Flexível:** * Upload de múltiplas imagens (até 5 arquivos de uma vez).
    * Integração com a câmera do dispositivo (webcam/mobile) para tirar fotos em tempo real.
* **Edição Avançada no Navegador:**
    * **Recorte Preciso:** Utiliza o *Cropper.js* para focar exatamente no rosto ou na tatuagem.
    * **Remoção de Fundo Mágica:** Ferramenta customizada via Canvas que permite clicar em uma cor de fundo para removê-la, com um *slider* ajustável de agressividade/tolerância em tempo real.
* **Feedback Visual:** Sistema de pré-visualização de imagens selecionadas (thumbnails) e cards coloridos com o status da requisição (Sucesso, Falha ou Erro).

---

## 🛠️ Tecnologias Utilizadas

* **HTML5** (Estruturação semântica)
* **CSS3** (Estilização responsiva, variáveis CSS, animações e layout Flexbox)
* **JavaScript (Vanilla)** (Lógica de manipulação do DOM, manipulação de arquivos via API `File/Blob`, controle de câmera via `navigator.mediaDevices` e requisições HTTP nativas com `fetch`).
* **[Cropper.js](https://fengyuanchen.github.io/cropperjs/)** (Biblioteca externa via CDN para o recorte de imagens).

---

## 📂 Estrutura do Projeto

O código foi componentizado para facilitar a manutenção e escalabilidade:

```text
/
├── index.html   # Estrutura principal da página e modais
├── style.css    # Regras visuais e de interface do usuário
└── script.js    # Lógica de negócio, câmera, edição em canvas e chamadas de API
```

---

## ⚙️ Como Executar o Projeto

Como este é um projeto focado no *Frontend*, sua execução é extremamente simples e não requer a instalação de pacotes como o `npm` (Node.js) para rodar a interface.

1. **Clone ou baixe o repositório** para a sua máquina.
2. Certifique-se de que os três arquivos (`index.html`, `style.css` e `script.js`) estão na mesma pasta.
3. Dê um duplo clique no arquivo `index.html` para abri-lo no seu navegador padrão (Chrome, Firefox, Edge, Safari).
    * *Nota:* O uso da câmera e ferramentas de canvas avançadas pode exigir que a página seja servida por um servidor local em alguns navegadores devido a políticas de CORS e segurança (ex: extensão *Live Server* do VSCode).

---

## 🔌 Configuração da API (Backend)

Atualmente, o projeto está configurado para se comunicar com um backend hospedado em um túnel do **Ngrok**. Para que o sistema funcione com o seu próprio servidor ou uma nova URL, você precisará atualizar a variável base no arquivo de script.

### Como alterar a URL da API:
Abra o arquivo `script.js` e localize a primeira linha do código:

```javascript
const BASE_URL = '[https://sua-url-aqui.com](https://sua-url-aqui.com)';
```

### Endpoints Consumidos:
O frontend espera que o backend responda aos seguintes endpoints via método `POST`, enviando dados através de `FormData` (com campos `files` e `nome`):

* `/api/cadastrar` - Cadastra um novo rosto.
* `/api/reconhecer` - Identifica um rosto existente.
* `/api/cadastrar-tatuagem` - Cadastra uma nova tatuagem.
* `/api/reconhecer-tatuagem` - Identifica uma tatuagem existente.

**Formato de Resposta Esperado (JSON):**
```json
{
  "resultados": [
    {
      "status": "sucesso",
      "arquivo": "nome_do_arquivo.jpg",
      "nome_identificado": "Joao_Silva"
    }
  ]
}
```

---
*Desenvolvido para sistemas de verificação de identidade e análise biométrica inteligente.*
