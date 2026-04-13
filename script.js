// Seleciona os elementos do HTML
const imagemInput = document.getElementById('imagemInput');
const previewContainer = document.getElementById('previewContainer');
const btnAnalisar = document.getElementById('btnAnalisar');
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
    
    // Limpa o valor do input para permitir selecionar o mesmo arquivo novamente
    imagemInput.value = ''; 
});

function adicionarImagens(novosArquivos) {
    if (imagensSelecionadas.length + novosArquivos.length > LIMITE_IMAGENS) {
        alert(`Você só pode enviar até ${LIMITE_IMAGENS} imagens no total.`);
        const vagasRestantes = LIMITE_IMAGENS - imagensSelecionadas.length;
        novosArquivos = novosArquivos.slice(0, vagasRestantes);
    }

    // Junta as imagens antigas com as novas
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
            alert("Erro ao acessar a câmera. Verifique as permissões do navegador.");
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
        return;
    }

    btnAnalisar.disabled = false;
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

// --- 4. COMUNICAÇÃO COM A API (INTEGRADO) ---
btnAnalisar.addEventListener('click', async () => {
    if (imagensSelecionadas.length === 0) {
        resultadoContainer.innerHTML = "<p style='color: red; text-align: center;'>Por favor, selecione pelo menos uma imagem!</p>";
        return;
    }

    btnAnalisar.disabled = true;
    btnAnalisar.innerText = "Processando...";
    resultadoContainer.innerHTML = "<p style='text-align: center;'>Analisando rostos... aguarde.</p>";

    const formData = new FormData();
    
    // Anexa os arquivos do array global, usando 'files' para o backend
    imagensSelecionadas.forEach(arquivo => {
        formData.append('files', arquivo); 
    });

    try {
        const resposta = await fetch('http://localhost:8000/api/reconhecer', { 
            method: 'POST', 
            body: formData 
        });

        if (!resposta.ok) {
            const erroJson = await resposta.json().catch(() => null);
            throw new Error(erroJson?.detail || "Erro na resposta do servidor");
        }

        const dados = await resposta.json();
        resultadoContainer.innerHTML = "";

        dados.resultados.forEach(res => {
            const divItem = document.createElement('div');
            divItem.classList.add('resultado-item');

            if (res.status === "sucesso") {
                divItem.classList.add('sucesso');
                const distanciaFormatada = res.distancia.toFixed(4);

                divItem.innerHTML = `
                    <strong>✅ Arquivo enviado:</strong> ${res.arquivo} <br>
                    <strong>Caminho/Identificação:</strong> ${res.caminho_imagem} <br>
                    <small>Métrica de Distância: ${distanciaFormatada} (Quanto menor, maior a semelhança)</small>
                `;
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

    } catch (erro) {
        console.error(erro);
        resultadoContainer.innerHTML = `<p style='color: red; text-align: center;'>❌ Erro: ${erro.message}</p>`;
    } finally {
        btnAnalisar.disabled = false;
        btnAnalisar.innerText = "Analisar Imagens";
        
        // Opcional: Limpar as imagens após o envio bem-sucedido
        // imagensSelecionadas = [];
        // atualizarInterface();
    }
});

// Inicialização
atualizarInterface();