// URL base da API
const BASE_URL = 'https://panoramic-figure-mushroom.ngrok-free.dev';

// Seleciona os elementos do HTML
const imagemInput = document.getElementById('imagemInput');
const previewContainer = document.getElementById('previewContainer');
const btnAnalisar = document.getElementById('btnAnalisar');
const btnCadastrar = document.getElementById('btnCadastrar');
const inputNome = document.getElementById('inputNome');
const resultadoContainer = document.getElementById('resultado');

// Elementos da Câmera
const cameraContainer = document.getElementById('cameraContainer');
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const btnAbrirCamera = document.getElementById('btnAbrirCamera');
const btnCapturar = document.getElementById('btnCapturar');
const btnFecharCamera = document.getElementById('btnFecharCamera');

// Estado global: guarda as imagens que serão enviadas
let imagensSelecionadas = [];
let streamDeVideo = null;
const LIMITE_IMAGENS = 5;

// --- 1. LÓGICA DE UPLOAD DE ARQUIVOS ---
imagemInput.addEventListener('change', (evento) => {
    const arquivos = Array.from(evento.target.files);
    adicionarImagens(arquivos);
    imagemInput.value = ''; 
});

function adicionarImagens(novosArquivos) {
    if (imagensSelecionadas.length + novosArquivos.length > LIMITE_IMAGENS) {
        alert(`Você só pode enviar até ${LIMITE_IMAGENS} imagens no total.`);
        const vagasRestantes = LIMITE_IMAGENS - imagensSelecionadas.length;
        novosArquivos = novosArquivos.slice(0, vagasRestantes);
    }

    imagensSelecionadas = [...imagensSelecionadas, ...novosArquivos];
    atualizarInterface();
}

// --- 2. LÓGICA DA CÂMERA ---
if (btnAbrirCamera) {
    btnAbrirCamera.addEventListener('click', async () => {
        try {
            streamDeVideo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            videoElement.srcObject = streamDeVideo;
            cameraContainer.style.display = 'block';
            btnAbrirCamera.disabled = true;
        } catch (erro) {
            alert("Erro ao aceder à câmera. Verifique as permissões do navegador.");
            console.error(erro);
        }
    });
}

if (btnFecharCamera) {
    btnFecharCamera.addEventListener('click', fecharCamera);
}

function fecharCamera() {
    if (streamDeVideo) {
        streamDeVideo.getTracks().forEach(track => track.stop());
    }
    cameraContainer.style.display = 'none';
    btnAbrirCamera.disabled = false;
}

if (btnCapturar) {
    btnCapturar.addEventListener('click', () => {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        const contexto = canvasElement.getContext('2d');
        contexto.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        
        canvasElement.toBlob((blob) => {
            const arquivoCamera = new File([blob], `foto_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            adicionarImagens([arquivoCamera]);
            fecharCamera();
        }, 'image/jpeg', 0.9);
    });
}

// --- 3. LÓGICA DE PREVIEW ---
function atualizarInterface() {
    if (imagensSelecionadas.length === 0) {
        previewContainer.innerHTML = '<span id="textoPreview">Nenhuma imagem selecionada</span>';
        btnAnalisar.disabled = true;
        btnCadastrar.disabled = true;
        return;
    }

    btnAnalisar.disabled = false;
    btnCadastrar.disabled = false;
    previewContainer.innerHTML = ''; 
    
    imagensSelecionadas.forEach((arquivo, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-wrapper';

        const img = document.createElement('img');
        img.src = URL.createObjectURL(arquivo);
        img.className = 'preview-img';

        const btnRemover = document.createElement('button');
        btnRemover.innerHTML = '✕';
        btnRemover.className = 'btn-remover';
        btnRemover.title = 'Remover imagem';
        btnRemover.onclick = () => {
            imagensSelecionadas.splice(index, 1);
            atualizarInterface();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(btnRemover);
        previewContainer.appendChild(wrapper);
    });
}

// --- 4. COMUNICAÇÃO COM A API ---

// Função genérica para tratar os cards de resultado
function renderizarResultados(dados, tipo) {
    resultadoContainer.innerHTML = "";
    dados.resultados.forEach(res => {
        const divItem = document.createElement('div');
        divItem.classList.add('resultado-item');

        if (res.status === "sucesso") {
            divItem.classList.add('sucesso');
            if (tipo === 'reconhecer') {
                const distanciaFormatada = res.distancia.toFixed(4);
                divItem.innerHTML = `
                    <strong>✅ Arquivo enviado:</strong> ${res.arquivo} <br>
                    <strong>Identificação:</strong> ${res.caminho_imagem} <br>
                    <small>Distância (Confiança): ${distanciaFormatada}</small>
                `;
            } else {
                // Cadastro
                divItem.innerHTML = `
                    <strong>✅ Arquivo cadastrado:</strong> ${res.arquivo} <br>
                    <strong>Status:</strong> ${res.mensagem}
                `;
            }
        } else if (res.status === "erro") {
            divItem.classList.add('erro');
            divItem.innerHTML = `
                <strong>⚠️ Arquivo:</strong> ${res.arquivo} <br>
                <strong>Erro:</strong> ${res.mensagem}
            `;
        } else {
            divItem.classList.add('falha');
            divItem.innerHTML = `
                <strong>❓ Arquivo:</strong> ${res.arquivo} <br>
                <strong>Resultado:</strong> Rosto não encontrado no banco de dados.
            `;
        }

        resultadoContainer.appendChild(divItem);
    });
}

// 4.1 Ação de CADASTRAR
btnCadastrar.addEventListener('click', async () => {
    const nome = inputNome.value.trim();
    if (!nome) {
        resultadoContainer.innerHTML = "<p style='color: red; text-align: center;'>Por favor, digite um nome para cadastrar!</p>";
        inputNome.focus();
        return;
    }

    btnCadastrar.disabled = true;
    btnAnalisar.disabled = true;
    btnCadastrar.innerText = "Cadastrando...";
    resultadoContainer.innerHTML = "<p style='text-align: center;'>A cadastrar rosto(s)... aguarde.</p>";

    const formData = new FormData();
    formData.append('nome', nome);
    imagensSelecionadas.forEach(arquivo => formData.append('files', arquivo));

    try {
        const resposta = await fetch(`${BASE_URL}/api/cadastrar`, { 
            method: 'POST', 
            body: formData,
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!resposta.ok) {
            const erroJson = await resposta.json().catch(() => null);
            throw new Error(erroJson?.detail || "Erro na resposta do servidor");
        }

        const dados = await resposta.json();
        renderizarResultados(dados, 'cadastrar');
        
        // Limpar os campos após o cadastro com sucesso
        inputNome.value = '';
        imagensSelecionadas = [];
        atualizarInterface();

    } catch (erro) {
        console.error(erro);
        resultadoContainer.innerHTML = `<p style='color: red; text-align: center;'>❌ Erro: ${erro.message}</p>`;
    } finally {
        btnCadastrar.innerText = "Cadastrar Rosto";
        atualizarInterface(); // Reavalia botões baseados nas imagens restantes
    }
});

// 4.2 Ação de RECONHECER
btnAnalisar.addEventListener('click', async () => {
    btnAnalisar.disabled = true;
    btnCadastrar.disabled = true;
    btnAnalisar.innerText = "Processando...";
    resultadoContainer.innerHTML = "<p style='text-align: center;'>A analisar rostos... aguarde.</p>";

    const formData = new FormData();
    imagensSelecionadas.forEach(arquivo => formData.append('files', arquivo));

    try {
        const resposta = await fetch(`${BASE_URL}/api/reconhecer`, { 
            method: 'POST', 
            body: formData,
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!resposta.ok) {
            const erroJson = await resposta.json().catch(() => null);
            throw new Error(erroJson?.detail || "Erro na resposta do servidor");
        }

        const dados = await resposta.json();
        renderizarResultados(dados, 'reconhecer');

    } catch (erro) {
        console.error(erro);
        resultadoContainer.innerHTML = `<p style='color: red; text-align: center;'>❌ Erro: ${erro.message}</p>`;
    } finally {
        btnAnalisar.innerText = "Reconhecer Imagens";
        atualizarInterface(); // Reavalia botões
    }
});

// Inicialização
atualizarInterface();