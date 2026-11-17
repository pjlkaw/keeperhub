const MAXIMO_PAGINAS_POR_ARQUIVO = 3;
const LARGURA_MAXIMA = 1400;
const ALTURA_MAXIMA = 1800;

let bibliotecaPdf;

async function obterBibliotecaPdf() {
    if (!bibliotecaPdf) {
        bibliotecaPdf = import(new URL("../assets/pdfjs/pdf.min.mjs", import.meta.url).href);
        const pdfjs = await bibliotecaPdf;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "../assets/pdfjs/pdf.worker.min.mjs",
            import.meta.url,
        ).href;
    }
    return bibliotecaPdf;
}

function converterCanvasEmArquivo(canvas, nome) {
    return new Promise((resolver, rejeitar) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                rejeitar(new Error("Não foi possível converter uma página do PDF para imagem."));
                return;
            }
            resolver(new File([blob], nome, { type: "image/jpeg" }));
        }, "image/jpeg", 0.78);
    });
}

export async function renderizarPaginasPdf(arquivo, limitePaginas) {
    const pdfjs = await obterBibliotecaPdf();
    const tarefa = pdfjs.getDocument({
        data: await arquivo.arrayBuffer(),
        isEvalSupported: false,
    });
    const documento = await tarefa.promise;
    const limite = Math.min(
        MAXIMO_PAGINAS_POR_ARQUIVO,
        Math.max(0, limitePaginas),
        documento.numPages,
    );
    const possuiMaisPaginas = documento.numPages > limite;
    const paginas = [];

    try {
        for (let numero = 1; numero <= limite; numero += 1) {
            const pagina = await documento.getPage(numero);
            const viewportOriginal = pagina.getViewport({ scale: 1 });
            const escala = Math.min(
                2,
                LARGURA_MAXIMA / viewportOriginal.width,
                ALTURA_MAXIMA / viewportOriginal.height,
            );
            const viewport = pagina.getViewport({ scale: escala });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            try {
                const contexto = canvas.getContext("2d", { alpha: false });
                if (!contexto) {
                    throw new Error("Não foi possível preparar a leitura do PDF neste navegador.");
                }
                await pagina.render({ canvasContext: contexto, viewport }).promise;
                paginas.push(await converterCanvasEmArquivo(
                    canvas,
                    `${arquivo.name}-pagina-${numero}.jpg`,
                ));
            } finally {
                canvas.width = 0;
                canvas.height = 0;
                pagina.cleanup();
            }
        }
    } finally {
        await documento.destroy();
    }

    return {
        arquivos: paginas,
        possuiMaisPaginas,
    };
}
