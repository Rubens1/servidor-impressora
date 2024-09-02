const express = require('express');
const multer = require('multer');
const fs = require('fs'); // Use fs tradicional
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const printer = require('pdf-to-printer');
const { PDFDocument, rgb } = require('pdf-lib');

const app = express();
const port = 5555;

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'pdf'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4();
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

app.post('/print', upload.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        // Caminho do arquivo temporário salvo pelo Multer
        const pdfFilePath = req.file.path;

        // Verifica se o arquivo existe
        fs.access(pdfFilePath, fs.constants.F_OK, (err) => {
            if (err) {
                return res.status(404).json({ error: 'Arquivo não encontrado' });
            }

            // Carrega o PDF enviado pelo cliente
            fs.readFile(pdfFilePath, async (readErr, existingPdfBytes) => {
                if (readErr) {
                    return res.status(500).json({ error: 'Erro ao ler o arquivo PDF' });
                }

                try {
                    const existingPdfDoc = await PDFDocument.load(existingPdfBytes);

                    // Adiciona (ou modifica) o conteúdo do PDF, se necessário
                    const pdfDoc = await PDFDocument.create();
                    const [existingPage] = await pdfDoc.copyPages(existingPdfDoc, [0]);
                    pdfDoc.addPage(existingPage);

                    // (Opcional) Adicionar uma nova página com conteúdo personalizado
                    const page = pdfDoc.addPage([500, 400]);
                    const { width, height } = page.getSize();
                    page.drawText('Este é um novo texto!', {
                        x: 50,
                        y: height - 50,
                        size: 30,
                        color: rgb(0, 0.53, 0.71),
                    });

                    // Salva o PDF modificado
                    const modifiedPdfBytes = await pdfDoc.save();
                    const uniqueSuffix = uuidv4();
                    const pdfOutputPath = path.join(__dirname, `pdf/${uniqueSuffix}.pdf`);

                    fs.writeFile(pdfOutputPath, modifiedPdfBytes, async (writeErr) => {
                        if (writeErr) {
                            return res.status(500).json({ error: 'Erro ao salvar o PDF modificado' });
                        }

                        try {
                            // Imprime o PDF
                            await printer.print(pdfOutputPath, { printer: 'Coibeu' });

                            // Após enviar para a impressora, remove o arquivo
                            fs.unlink(pdfOutputPath, (unlinkErr) => {
                                if (unlinkErr) {
                                    console.error('Erro ao remover arquivo modificado: ', unlinkErr);
                                }
                            });

                            // Listar impressoras disponíveis
                            const printers = await printer.getPrinters();
                            console.log('Impressoras disponíveis: ', printers);

                            // Envia resposta ao cliente
                            res.status(200).json({ message: 'Arquivo PDF enviado para impressão com sucesso.' });
                        } catch (printErr) {
                            console.error('Erro ao enviar para impressão: ', printErr);
                            res.status(500).json({ error: 'Erro ao enviar para impressão' });
                        }
                    });
                } catch (processErr) {
                    console.error('Erro ao processar o PDF: ', processErr);
                    res.status(500).json({ error: 'Erro ao processar o PDF' });
                } finally {
                    // Remoção do arquivo temporário do upload
                    fs.unlink(pdfFilePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error('Erro ao remover arquivo temporário:', unlinkErr);
                        }
                    });
                }
            });
        });
    } catch (err) {
        console.error('Erro no processamento do arquivo:', err);
        res.status(500).json({ error: 'Erro no processamento do arquivo.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
