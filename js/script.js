const BASE_URL = 'https://panoramic-figure-mushroom.ngrok-free.dev';

// Interface Elements
const selectTipo = document.getElementById('selectTipo');
const selectAcao = document.getElementById('selectAcao');
const containerNome = document.getElementById('containerNome');
const inputIdentificador = document.getElementById('inputIdentificador');
const imagemInput = document.getElementById('imagemInput');
const previewContainer = document.getElementById('previewContainer');
const btnConfirmar = document.getElementById('btnConfirmar');
const resultadoContainer = document.getElementById('resultado');

// Camera
const cameraContainer = document.getElementById('cameraContainer');
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const btnAbrirCamera = document.getElementById('btnAbrirCamera');
const btnCapturar = document.getElementById('btnCapturar');
const btnFecharCamera = document.getElementById('btnFecharCamera');

// Modais (Recorte e Fundo)
const cropperModal = document.getElementById('cropperModal');
const cropperImage = document.getElementById('cropperImage');
const btnCancelarRecorte = document.getElementById('btnCancelarRecorte');
const btnAvançarFundo = document.getElementById('btnAvançarFundo');

const fundoModal = document.getElementById('fundoModal');
const fundoCanvas = document.getElementById('fundoCanvas');
const sliderAgressividade = document.getElementById('sliderAgressividade');
const agressividadeValor = document.getElementById('agressividadeValor');
const corAlvoDisplay = document.getElementById('corAlvoDisplay');
const btnPularFundo = document.getElementById('btnPularFundo');
const btnConfirmarFundo = document.getElementById('btnConfirmarFundo');

// Estado e Controle
let imagensSelecionadas = [];
let filaArquivos = []; 
let arquivoAtual = null;
let cropperInstance = null;
let streamDeVideo = null;
const LIMITE_IMAGENS = 5;

// Variaveis da Edição de Fundo Manual
let fundoOriginalCanvas = null; 
let fundoCtx = null;
let corAlvo = null; // {r, g, b}

// UX: Ação (Cadastro vs Reconhecimento)
selectAcao.addEventListener('change', () => {
    if (selectAcao.value === 'cadastro') {
        containerNome.classList.remove('card-hidden');
        btnConfirmar.innerText = 'Confirmar Cadastro';
    } else {
        containerNome.classList.add('card-hidden');
        btnConfirmar.innerText = 'Confirmar Reconhecimento';
    }
});
selectAcao.dispatchEvent(new Event('change'));

// ==========================================
// FLUXO DE ADIÇÃO DE IMAGENS E CORTES
// ==========================================
imagemInput.addEventListener('change', (e) => {
    adicionarImagensFila(Array.from(e.target.files));
    imagemInput.value = ''; 
});

function adicionarImagensFila(novosArquivos) {
    if (imagensSelecionadas.length + novosArquivos.length > LIMITE_IMAGENS) {
        alert(`Limite de ${LIMITE_IMAGENS} imagens. Cortando excedentes...`);
        novosArquivos = novosArquivos.slice(0, LIMITE_IMAGENS - imagensSelecionadas.length);
    }
    filaArquivos = [...filaArquivos, ...novosArquivos];
    processarProximaImagem();
}

function processarProximaImagem() {
    if (filaArquivos.length === 0) return;
    if (imagensSelecionadas.length >= LIMITE_IMAGENS) { filaArquivos = []; return; }

    arquivoAtual = filaArquivos.shift();
    const urlTemporaria = URL.createObjectURL(arquivoAtual);
    
    cropperImage.onload = () => {
        if (cropperInstance) cropperInstance.destroy();
        cropperInstance = new Cropper(cropperImage, {
            viewMode: 1, autoCropArea: 0.9, responsive: true,
            restore: false, checkCrossOrigin: false, aspectRatio: NaN
        });
    };
    cropperImage.src = urlTemporaria;
    cropperModal.style.display = 'flex';
}

btnCancelarRecorte.addEventListener('click', () => {
    fecharModalRecorte();
    processarProximaImagem();
});

function fecharModalRecorte() {
    cropperModal.style.display = 'none';
    if (cropperInstance) cropperInstance.destroy();
    cropperInstance = null;
    if (cropperImage.src) { URL.revokeObjectURL(cropperImage.src); cropperImage.src = ''; }
}

// ==========================================
// FLUXO DE REMOÇÃO DE FUNDO MANUAL (CANVAS)
// ==========================================
btnAvançarFundo.addEventListener('click', () => {
    if (!cropperInstance) return;

    const canvasCortado = cropperInstance.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 });

    // Salva a imagem intocada em memória
    fundoOriginalCanvas = document.createElement('canvas');
    fundoOriginalCanvas.width = canvasCortado.width;
    fundoOriginalCanvas.height = canvasCortado.height;
    const ctxOrig = fundoOriginalCanvas.getContext('2d', { willReadFrequently: true });
    ctxOrig.drawImage(canvasCortado, 0, 0);

    // Prepara a tela de preview visível
    fundoCanvas.width = canvasCortado.width;
    fundoCanvas.height = canvasCortado.height;
    fundoCtx = fundoCanvas.getContext('2d', { willReadFrequently: true });
    fundoCtx.drawImage(canvasCortado, 0, 0);

    // Resgata a cor do primeiro pixel útil (canto superior esquerdo) para iniciar
    const pixelTopLeft = ctxOrig.getImageData(2, 2, 1, 1).data;
    corAlvo = { r: pixelTopLeft[0], g: pixelTopLeft[1], b: pixelTopLeft[2] };
    corAlvoDisplay.style.backgroundColor = `rgb(${corAlvo.r}, ${corAlvo.g}, ${corAlvo.b})`;
    
    sliderAgressividade.value = 40;
    agressividadeValor.innerText = 40;
    
    aplicarFundoMagico(); // Aplica a primeira limpeza

    fecharModalRecorte();
    fundoModal.style.display = 'flex';
});

// Captura o Clique do Usuário para trocar a Cor do Fundo
fundoCanvas.addEventListener('click', (e) => {
    const rect = fundoCanvas.getBoundingClientRect();
    const scaleX = fundoCanvas.width / rect.width;
    const scaleY = fundoCanvas.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    const ctxOrig = fundoOriginalCanvas.getContext('2d', { willReadFrequently: true });
    const pixel = ctxOrig.getImageData(x, y, 1, 1).data;
    
    corAlvo = { r: pixel[0], g: pixel[1], b: pixel[2] };
    corAlvoDisplay.style.backgroundColor = `rgb(${corAlvo.r}, ${corAlvo.g}, ${corAlvo.b})`;
    
    aplicarFundoMagico();
});

// Modifica a agressividade instantaneamente
sliderAgressividade.addEventListener('input', () => {
    agressividadeValor.innerText = sliderAgressividade.value;
    aplicarFundoMagico();
});

// O Coração da Remoção em Tempo Real:
function aplicarFundoMagico() {
    if (!corAlvo || !fundoOriginalCanvas) return;
    
    const width = fundoOriginalCanvas.width;
    const height = fundoOriginalCanvas.height;
    const ctxOrig = fundoOriginalCanvas.getContext('2d', { willReadFrequently: true });
    
    // Lê sempre da imagem original para não perder dados ao mudar a barra
    const imgData = ctxOrig.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;
    
    const agressividade = parseInt(sliderAgressividade.value);
    const margemFeather = agressividade + 20; // margem de suavização (anti-aliasing de borda)
    
    for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const originalAlpha = data[i + 3];
        
        // Distância Euclidiana 3D para definir a diferença entre as cores
        const distancia = Math.sqrt(
            Math.pow(r - corAlvo.r, 2) + 
            Math.pow(g - corAlvo.g, 2) + 
            Math.pow(b - corAlvo.b, 2)
        );
        
        if (distancia <= agressividade) {
            data[i + 3] = 0; // Apaga tudo dentro da agressividade exata (Fundo)
        } else if (distancia <= margemFeather) {
            // Transição suave para os pixels próximos do corte (Evita bordas serrilhadas)
            const opacidadePercentual = ((distancia - agressividade) / 20);
            data[i + 3] = Math.floor(originalAlpha * opacidadePercentual);
        }
    }
    
    fundoCtx.putImageData(imgData, 0, 0); // Desenha super rápido no Canvas Visual
}

// CONFIRMAÇÕES FINAIS DO MODAL
btnConfirmarFundo.addEventListener('click', () => {
    // Salva como PNG para respeitar as bordas transparentes cortadas
    fundoCanvas.toBlob((blob) => {
        const finalBlob = new File([blob], `processado_${Date.now()}.png`, { type: 'image/png' });
        salvarEProsseguir(finalBlob);
    }, 'image/png');
});

btnPularFundo.addEventListener('click', () => {
    // Salva a versão original sem o filtro, usando o formato JPG
    fundoOriginalCanvas.toBlob((blob) => {
        const finalBlob = new File([blob], `original_${Date.now()}.jpg`, { type: 'image/jpeg' });
        salvarEProsseguir(finalBlob);
    }, 'image/jpeg', 0.9);
});

function salvarEProsseguir(arquivoFinal) {
    imagensSelecionadas.push(arquivoFinal);
    atualizarInterface();
    fundoModal.style.display = 'none';
    fundoOriginalCanvas = null;
    processarProximaImagem(); 
}

// ==========================================
// CÂMERA E INTEGRAÇÃO DE BOTOES RESTANTES
// ==========================================
if (btnAbrirCamera) {
    btnAbrirCamera.addEventListener('click', async () => {
        try {
            streamDeVideo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            videoElement.srcObject = streamDeVideo;
            cameraContainer.classList.remove('card-hidden');
            btnAbrirCamera.disabled = true;
        } catch (erro) { alert("Erro de Câmera."); }
    });
}

if (btnFecharCamera) btnFecharCamera.addEventListener('click', fecharCamera);

function fecharCamera() {
    if (streamDeVideo) streamDeVideo.getTracks().forEach(t => t.stop());
    cameraContainer.classList.add('card-hidden');
    btnAbrirCamera.disabled = false;
}

if (btnCapturar) {
    btnCapturar.addEventListener('click', () => {
        canvasElement.width = videoElement.videoWidth; canvasElement.height = videoElement.videoHeight;
        canvasElement.getContext('2d').drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        canvasElement.toBlob((blob) => {
            adicionarImagensFila([new File([blob], `cam_${Date.now()}.jpg`, { type: 'image/jpeg' })]);
            fecharCamera();
        }, 'image/jpeg', 0.9);
    });
}

// Atualização Visual (Thumbnail Viewer)
function atualizarInterface() {
    if (imagensSelecionadas.length === 0) {
        previewContainer.innerHTML = '<span id="textoPreview">Nenhuma imagem selecionada</span>';
        btnConfirmar.disabled = true; return;
    }
    btnConfirmar.disabled = false; previewContainer.innerHTML = ''; 
    imagensSelecionadas.forEach((arquivo, i) => {
        const wrapper = document.createElement('div'); wrapper.className = 'preview-wrapper';
        const img = document.createElement('img'); img.src = URL.createObjectURL(arquivo); img.className = 'preview-img';
        const btn = document.createElement('button'); btn.innerHTML = '✕'; btn.className = 'btn-remover';
        btn.onclick = () => { imagensSelecionadas.splice(i, 1); atualizarInterface(); };
        wrapper.appendChild(img); wrapper.appendChild(btn); previewContainer.appendChild(wrapper);
    });
}

// Submissão API Final
btnConfirmar.addEventListener('click', async () => {
    const acao = selectAcao.value; const tipo = selectTipo.value;
    const formData = new FormData();

    if (acao === 'cadastro') {
        const ident = inputIdentificador.value.trim();
        if (!ident) return alert("Digite um nome para cadastrar!");
        formData.append('nome', ident);
    }

    btnConfirmar.disabled = true; btnConfirmar.innerText = "Processando...";
    resultadoContainer.innerHTML = `<p class='loading-text'>Processando ${acao}... aguarde.</p>`;
    imagensSelecionadas.forEach(arq => formData.append('files', arq));

    const endpoint = acao === 'cadastro' 
        ? (tipo === 'rosto' ? '/api/cadastrar' : '/api/cadastrar-tatuagem')
        : (tipo === 'rosto' ? '/api/reconhecer' : '/api/reconhecer-tatuagem');

    try {
        const resp = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', body: formData, headers: { 'ngrok-skip-browser-warning': 'true' } });
        if (!resp.ok) throw new Error("Erro na resposta do servidor");
        const dados = await resp.json();
        
        resultadoContainer.innerHTML = "";
        dados.resultados.forEach(res => {
            const div = document.createElement('div'); div.classList.add('resultado-item');
            if (res.status === "sucesso") {
                div.classList.add('sucesso');
                div.innerHTML = acao === 'reconhecimento' 
                    ? `<div class="resultado-header">✅ Identificado</div><strong>${res.arquivo}</strong> -> <span class="highlight-text">${res.nome_identificado}</span>`
                    : `<div class="resultado-header">✅ Cadastro</div><strong>${res.arquivo}</strong> cadastrado!`;
            } else {
                div.classList.add('erro'); div.innerHTML = `<div class="resultado-header">❌ Erro/Falha</div><strong>${res.arquivo}</strong>: ${res.mensagem || 'Falha na IA'}`;
            }
            resultadoContainer.appendChild(div);
        });
        
        if (acao === 'cadastro') { inputIdentificador.value = ''; imagensSelecionadas = []; }
    } catch (err) {
        resultadoContainer.innerHTML = `<div class="resultado-item erro">❌ Falha: ${err.message}</div>`;
    } finally {
        btnConfirmar.innerText = acao === 'cadastro' ? "Confirmar Cadastro" : "Confirmar Reconhecimento";
        atualizarInterface(); 
    }
});

atualizarInterface();