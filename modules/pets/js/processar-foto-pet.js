const TAMANHO_MAXIMO_ORIGINAL = 5 * 1024 * 1024;
const TAMANHO_MAXIMO_ENVIO = 3 * 1024 * 1024;
const LADO_MAXIMO = 2048;

async function decodificarImagem(arquivo) {
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
        } catch {
            // Usa a decodificação do navegador como alternativa em versões antigas.
        }
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(arquivo);
        const imagem = new Image();

        imagem.addEventListener('load', () => {
            URL.revokeObjectURL(url);
            resolve(imagem);
        }, { once: true });
        imagem.addEventListener('error', () => {
            URL.revokeObjectURL(url);
            reject(new Error('Não foi possível abrir essa imagem.'));
        }, { once: true });
        imagem.src = url;
    });
}

function criarBlob(canvas, qualidade) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Não foi possível preparar essa imagem.'));
        }, 'image/webp', qualidade);
    });
}

function blobComoDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.addEventListener('load', () => resolve(String(leitor.result)), { once: true });
        leitor.addEventListener('error', () => {
            reject(new Error('Não foi possível ler a imagem selecionada.'));
        }, { once: true });
        leitor.readAsDataURL(blob);
    });
}

// Reduz as fotos no navegador para que o Base64 caiba no limite da API da Vercel.
export async function prepararFotoPet(arquivo) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo?.type)) {
        throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
    }
    if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) {
        throw new Error('Escolha uma imagem de até 5 MB.');
    }

    const imagem = await decodificarImagem(arquivo);
    const canvas = document.createElement('canvas');
    const contexto = canvas.getContext('2d');

    if (!contexto) {
        imagem.close?.();
        throw new Error('Não foi possível preparar essa imagem.');
    }

    let escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    let qualidade = 0.86;

    try {
        for (let tentativa = 0; tentativa < 6; tentativa++) {
            canvas.width = Math.max(1, Math.round(imagem.width * escala));
            canvas.height = Math.max(1, Math.round(imagem.height * escala));
            contexto.clearRect(0, 0, canvas.width, canvas.height);
            contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);

            const blob = await criarBlob(canvas, qualidade);
            if (blob.size <= TAMANHO_MAXIMO_ENVIO) {
                return await blobComoDataUrl(blob);
            }

            escala *= 0.8;
            qualidade = Math.max(0.55, qualidade - 0.06);
        }
    } finally {
        imagem.close?.();
        canvas.width = 0;
        canvas.height = 0;
    }

    throw new Error('Não foi possível reduzir a imagem para enviar. Tente outra foto.');
}
