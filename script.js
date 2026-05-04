// URL base da API
const BASE_URL = 'https://panoramic-figure-mushroom.ngrok-free.dev';

// Seleciona os elementos do HTML
const imagemInput = document.getElementById('imagemInput');
const previewContainer = document.getElementById('previewContainer');
const btnAnalisar = document.getElementById('btnAnalisar');
const btnCadastrar = document.getElementById('btnCadastrar');
const inputIdentificador = document.getElementById('inputIdentificador');
const resultadoContainer = document.getElementById('resultado');

// Elementos da Câmera
const cameraContainer = document.getElementById('cameraContainer');
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const btnAbrirCamera = document.getElementById('btnAbrirCamera');
const btnCapturar = document.getElementById('btnCapturar');
const btnFecharCamera = document.getElementById('btnFecharCamera');

// Estado global
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
            cameraContainer.classList.remove('card-hidden');
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
    cameraContainer.classList.add('card-hidden');
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

function renderizarResultados(dados, acao) {
    resultadoContainer.innerHTML = "";
    dados.resultados.forEach(res => {
        const divItem = document.createElement('div');
        divItem.classList.add('resultado-item');

        if (res.status === "sucesso") {
            divItem.classList.add('sucesso');
            if (acao === 'reconhecer') {
                // Formatação condicional baseada no tipo (rosto vs objeto geral)
                const icone = res.tipo === 'rosto' ? '👤 Rosto' : '🖼️ Objeto/Tattoo';
                const metrica = res.tipo === 'rosto' 
                    ? `Distância Facial: <strong>${res.distancia.toFixed(4)}</strong>`
                    : `Similaridade Visual: <strong>${(res.similaridade * 100).toFixed(1)}%</strong>`;

                divItem.innerHTML = `
                    <div class="resultado-header">✅ ${icone} Identificado</div>
                    <strong>Arquivo:</strong> ${res.arquivo} <br>
                    <strong>Registro Encontrado:</strong> <span class="highlight-text">${res.caminho_imagem}</span> <br>
                    <small>${metrica}</small>
                `;
            } else {
                divItem.innerHTML = `
                    <div class="resultado-header">✅ Cadastro Concluído</div>
                    <strong>Arquivo:</strong> ${res.arquivo} <br>
                    <strong>Status:</strong> ${res.mensagem}
                `;
            }
        } else if (res.status === "erro") {
            divItem.classList.add('erro');
            divItem.innerHTML = `
                <div class="resultado-header">⚠️ Erro</div>
                <strong>Arquivo:</strong> ${res.arquivo} <br>
                <strong>Detalhe:</strong> ${res.mensagem}
            `;
        } else {
            divItem.classList.add('falha');
            const razao = res.mensagem || "Nenhuma correspondência encontrada no banco de dados.";
            divItem.innerHTML = `
                <div class="resultado-header">❓ Não Reconhecido</div>
                <strong>Arquivo:</strong> ${res.arquivo} <br>
                <strong>Resultado:</strong> ${razao}
            `;
        }

        resultadoContainer.appendChild(divItem);
    });
}

// 4.1 Ação de CADASTRAR
btnCadastrar.addEventListener('click', async () => {
    const identificador = inputIdentificador.value.trim();
    if (!identificador) {
        resultadoContainer.innerHTML = "<p style='color: #dc3545; text-align: center; font-weight: bold;'>Por favor, digite um identificador para cadastrar!</p>";
        inputIdentificador.focus();
        return;
    }

    btnCadastrar.disabled = true;
    btnAnalisar.disabled = true;
    btnCadastrar.innerText = "Cadastrando...";
    resultadoContainer.innerHTML = "<p class='loading-text'>A cadastrar imagem(ns)... aguarde.</p>";

    const formData = new FormData();
    formData.append('identificador', identificador); // Alterado para bater com o novo Backend
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
        
        inputIdentificador.value = '';
        imagensSelecionadas = [];
        atualizarInterface();

    } catch (erro) {
        console.error(erro);
        resultadoContainer.innerHTML = `<div class="resultado-item erro">❌ Erro de conexão: ${erro.message}</div>`;
    } finally {
        btnCadastrar.innerText = "Cadastrar Imagem";
        atualizarInterface(); 
    }
});

// 4.2 Ação de RECONHECER
btnAnalisar.addEventListener('click', async () => {
    btnAnalisar.disabled = true;
    btnCadastrar.disabled = true;
    btnAnalisar.innerText = "Processando...";
    resultadoContainer.innerHTML = "<p class='loading-text'>A analisar imagem(ns)... aguarde.</p>";

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
        resultadoContainer.innerHTML = `<div class="resultado-item erro">❌ Erro de conexão: ${erro.message}</div>`;
    } finally {
        btnAnalisar.innerText = "Reconhecer Imagem";
        atualizarInterface(); 
    }
});

// Inicialização
atualizarInterface();